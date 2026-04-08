import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  getTabViaggiRowsForExport,
  type FiltriViaggi,
} from '@/lib/data-viaggi-tab';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function formatRowForExcel(row: Record<string, unknown>): Record<string, unknown> {
  const r = { ...row };
  const v = r.haiEffettuatoRitiri;
  if (v === 1 || v === true) r.haiEffettuatoRitiri = 'Sì';
  else if (v === 0 || v === false) r.haiEffettuatoRitiri = 'No';
  return r;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sortBy = searchParams.get('sortBy') || 'Data';
    const sortOrder = searchParams.get('sortOrder');

    const filters: FiltriViaggi = {
      aziendaVettore: searchParams.get('aziendaVettore'),
      nominativo: searchParams.get('nominativo'),
      trasportatore: searchParams.get('trasportatore'),
      numeroViaggio: searchParams.get('numeroViaggio'),
      targa: searchParams.get('targa'),
      magazzino: searchParams.get('magazzino'),
      haiEffettuatoRitiri: searchParams.get('haiEffettuatoRitiri'),
      mese: searchParams.get('mese'),
      trimestre: searchParams.get('trimestre'),
      dataDa: searchParams.get('dataDa'),
      dataA: searchParams.get('dataA'),
    };

    const rows = await getTabViaggiRowsForExport(sortBy, sortOrder, filters, 100_000);
    const sheetRows = rows.map(formatRowForExcel);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      sheetRows.length > 0 ? sheetRows : [{ Messaggio: 'Nessun record con i filtri attuali' }]
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Viaggi');

    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    });

    const filename = `viaggi_tab_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Errore export tab_viaggi:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore durante la generazione del file Excel' },
      { status: 500 }
    );
  }
}
