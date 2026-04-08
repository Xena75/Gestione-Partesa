import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getViaggiRowsForExport, type ViaggiListFilters } from '@/lib/data-viaggi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function formatDt(v: string | null): string {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${h}:${m}`;
  } catch {
    return v;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sortBy = searchParams.get('sortBy') || 'dataOraInizioViaggio';
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';

    const filters: ViaggiListFilters = {
      dataDa: searchParams.get('dataDa') || undefined,
      dataA: searchParams.get('dataA') || undefined,
      deposito: searchParams.get('deposito') || undefined,
      nominativoId: searchParams.get('nominativoId') || undefined,
      numeroViaggio: searchParams.get('numeroViaggio') || undefined,
      targaMezzoId: searchParams.get('targaMezzoId') || undefined,
      mese: searchParams.get('mese') || undefined,
    };

    const maxRows = Math.min(
      250_000,
      Math.max(1, parseInt(searchParams.get('maxRows') || '100000', 10) || 100_000)
    );

    const rows = await getViaggiRowsForExport(sortBy, sortOrder, filters, maxRows);

    const sheetRows = rows.map((r) => {
      const litri = r.litriRiforniti != null ? Number(r.litriRiforniti) : null;
      const euroL = r.euroLitro != null ? Number(r.euroLitro) : null;
      const euroRif =
        litri != null && euroL != null && !isNaN(litri) && !isNaN(euroL)
          ? Number((litri * euroL).toFixed(2))
          : '';

      return {
        ID: r.id,
        Deposito: r.deposito ?? '',
        'N. viaggio': r.numeroViaggio ?? '',
        Nominativo: r.nominativoId ?? '',
        'Affiancato da': r.affiancatoDaId ?? '',
        'Tot. colli': r.totaleColli ?? '',
        'Data/ora inizio': formatDt(r.dataOraInizioViaggio),
        'Data/ora fine': formatDt(r.dataOraFineViaggio),
        'Ore effettive': r.oreEffettive ?? '',
        'Targa mezzo': r.targaMezzoId ?? '',
        'KM iniziali': r.kmIniziali ?? '',
        'KM finali': r.kmFinali ?? '',
        'KM effettivi': r.kmEffettivi ?? '',
        'KM al rifornimento': r.kmAlRifornimento ?? '',
        'Litri riforniti': r.litriRiforniti ?? '',
        '€/litro': r.euroLitro ?? '',
        '€ rifornimento': euroRif,
        'Ritiri effettuati': r.haiEffettuatoRitiri === true ? 'Sì' : r.haiEffettuatoRitiri === false ? 'No' : '',
        'Escluso da pending': r.exclude_from_pending === true ? 'Sì' : r.exclude_from_pending === false ? 'No' : '',
        Mese: r.mese ?? '',
        'Aggiornato il': formatDt(r.updatedAt),
        'Creato il': formatDt(r.createdAt),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Viaggi');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const targa = filters.targaMezzoId
      ? `_${String(filters.targaMezzoId).replace(/[^\w.-]+/g, '_')}`
      : '';
    const filename = `Monitoraggio_viaggi${targa}_${stamp}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('Export monitoraggio:', e);
    return NextResponse.json(
      { error: 'Errore durante la generazione del file Excel' },
      { status: 500 }
    );
  }
}
