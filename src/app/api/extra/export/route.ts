import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getCadHocByBeneficiary, type ExtraTripFilters } from '@/lib/data-extra';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const sp = new URL(request.url).searchParams;
    const filters: ExtraTripFilters = {
      dataDa: sp.get('dataDa') || undefined,
      dataA: sp.get('dataA') || undefined,
      archived: (sp.get('archived') as ExtraTripFilters['archived']) || 'all',
      search: sp.get('search') || undefined,
      beneficiaryId: sp.get('beneficiaryId') || undefined,
    };

    const rows = await getCadHocByBeneficiary(filters);

    const data = rows.map((r: any) => ({
      Beneficiario: r.beneficiary_name || '',
      Viaggi: r.trips || 0,
      Buoni: r.vouchers || 0,
      Importo: Number(r.amount) || 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 30 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Riepilogo Cad-hoc');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `extra-cadhoc-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('GET /api/extra/export:', error);
    return NextResponse.json({ success: false, error: 'Errore nell\'esportazione' }, { status: 500 });
  }
}
