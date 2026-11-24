import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getCadHocByBeneficiary, getCadHocDetailedTrips, listTrips, type ExtraTripFilters } from '@/lib/data-extra';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const sp = new URL(request.url).searchParams;
    const exportType = sp.get('type') || 'cadhoc';

    if (exportType === 'trips') {
      const filters: ExtraTripFilters = {
        dataDa: sp.get('dataDa') || undefined,
        dataA: sp.get('dataA') || undefined,
        archived: (sp.get('archived') as ExtraTripFilters['archived']) || 'all',
        isExtra: (sp.get('isExtra') as ExtraTripFilters['isExtra']) || 'all',
        amountPresence: (sp.get('amountPresence') as ExtraTripFilters['amountPresence']) || 'all',
        hasCadHoc: (sp.get('hasCadHoc') as ExtraTripFilters['hasCadHoc']) || 'all',
        search: sp.get('search') || undefined,
        beneficiaryId: sp.get('beneficiaryId') || undefined,
        sortBy: (sp.get('sortBy') as ExtraTripFilters['sortBy']) || 'trip_date',
        sortOrder: sp.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC',
        page: 1,
        pageSize: 10000,
      };

      const result = await listTrips(filters);

      const data = result.rows.map((r: any) => ({
        Data: r.trip_date ? new Date(r.trip_date).toLocaleDateString('it-IT') : '',
        Viaggio: r.trip_number || '',
        'Ordine/DDT': r.order_ref || '',
        Vettore: r.carrier_description || '',
        Colli: r.packages != null ? Math.round(Number(r.packages)) : '',
        'Note servizio': r.service_notes || '',
        Extra: r.is_extra ? 'Sì' : 'No',
        Importo: r.client_amount != null ? Number(r.client_amount) : '',
        'Note fatturazione': r.billing_notes || '',
        Stato: r.archived ? (r.is_extra ? 'Incassato' : 'Archiviato') : (r.is_extra ? 'Da incassare' : 'Servizio/costo'),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      ws['!cols'] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 8 },
        { wch: 30 },
        { wch: 8 },
        { wch: 12 },
        { wch: 25 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Extra Viaggi');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `extra-viaggi-${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      const filters: ExtraTripFilters = {
        dataDa: sp.get('dataDa') || undefined,
        dataA: sp.get('dataA') || undefined,
        archived: (sp.get('archived') as ExtraTripFilters['archived']) || 'all',
        search: sp.get('search') || undefined,
        beneficiaryId: sp.get('beneficiaryId') || undefined,
        sortBy: (sp.get('sortBy') as ExtraTripFilters['sortBy']) || 'trip_date',
        sortOrder: sp.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC',
      };

      const rows = await getCadHocDetailedTrips(filters);

      const data = rows.map((r: any) => ({
        Data: r.trip_date ? new Date(r.trip_date).toLocaleDateString('it-IT') : '',
        Viaggio: r.trip_number || '',
        'Ordine/DDT': r.order_ref || '',
        Vettore: r.carrier_description || '',
        Colli: r.packages != null ? Math.round(Number(r.packages)) : '',
        'Note servizio': r.service_notes || '',
        Beneficiario: r.beneficiary_name || '',
        Blocchetto: r.booklet_ref || '',
        'Numero Buoni': r.vouchers_count != null ? Number(r.vouchers_count) : '',
        '€/Buono': r.voucher_unit_value != null ? Number(r.voucher_unit_value) : '',
        'Importo Cad-hoc': r.cad_amount != null ? Number(r.cad_amount) : '',
        Extra: r.is_extra ? 'Sì' : 'No',
        Importo: r.client_amount != null ? Number(r.client_amount) : '',
        'Note fatturazione': r.billing_notes || '',
        Stato: r.archived ? (r.is_extra ? 'Incassato' : 'Archiviato') : (r.is_extra ? 'Da incassare' : 'Servizio/costo'),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      ws['!cols'] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 8 },
        { wch: 30 },
        { wch: 25 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 25 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Dettaglio Cad-hoc');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `extra-cadhoc-dettaglio-${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('GET /api/extra/export:', error);
    return NextResponse.json({ success: false, error: 'Errore nell\'esportazione' }, { status: 500 });
  }
}
