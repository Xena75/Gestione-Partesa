import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import * as XLSX from 'xlsx';
import { convertItalianToISO } from '@/lib/date-utils';
import { buildHandlingWhereParts } from '@/lib/handling-filters-where';

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams: rawParams } = new URL(request.url);
    const searchParams = new URLSearchParams(rawParams);
    const dataMov = searchParams.get('data_mov_m');
    if (dataMov && dataMov.includes('/')) {
      searchParams.set('data_mov_m', convertItalianToISO(dataMov));
    }

    const { conditions, params: queryParams } = buildHandlingWhereParts(searchParams);

    connection = await pool.getConnection();

    const query = `SELECT * FROM \`fatt_handling\` WHERE ${conditions.join(' AND ')}`;

    const [rows] = await connection.execute(query, queryParams);
    
    const data = rows as any[];

    // Funzione per formattare le date in formato europeo
    const formatDateEuropean = (dateString: string | null | undefined) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return dateString;
      }
    };

    // Prepara i dati per l'export con formattazione delle date
    const formattedData = data.map(record => ({
      'ID': record.id,
      'BU': record.bu || '',
      'Divisione': record.div || '',
      'Deposito': record.dep || '',
      'Tipo Movimento': record.tipo_movimento || '',
      'Doc. Acquisto': record.doc_acq || '',
      'Data Movimento': formatDateEuropean(record.data_mov_m),
      'Tipo Imballo': record.tipo_imb || '',
      'Mese': record.mese || '',
      'Doc. Materiale': record.doc_mat || '',
      'Qta UMA': Number(record.qta_uma) || 0,
      'Tot Handling': Number(record.tot_hand) || 0,
      'Ragione Sociale': record.rag_soc || '',
      'T HF UMV': Number(record.t_hf_umv) || 0,
      'Imp HF UM': Number(record.imp_hf_um) || 0,
      'Imp Resi V': Number(record.imp_resi_v) || 0,
      'Imp Doc': Number(record.imp_doc) || 0
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    
    // Imposta larghezza colonne
    worksheet['!cols'] = [
      { wch: 8 },  // ID
      { wch: 10 }, // BU
      { wch: 15 }, // Divisione
      { wch: 15 }, // Deposito
      { wch: 15 }, // Tipo Movimento
      { wch: 15 }, // Doc. Acquisto
      { wch: 12 }, // Data Movimento
      { wch: 12 }, // Tipo Imballo
      { wch: 8 },  // Mese
      { wch: 15 }, // Doc. Materiale
      { wch: 10 }, // Qta UMA
      { wch: 12 }, // Tot Handling
      { wch: 25 }, // Ragione Sociale
      { wch: 10 }, // T HF UMV
      { wch: 12 }, // Imp HF UM
      { wch: 12 }, // Imp Resi V
      { wch: 12 }  // Imp Doc
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Handling Data');

    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    const filename = `handling_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Errore durante l\'export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore durante la generazione del file Excel' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}