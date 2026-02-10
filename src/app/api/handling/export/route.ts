import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import * as XLSX from 'xlsx';
import { convertItalianToISO } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const filters: any = {};
    for (const [key, value] of searchParams.entries()) {
      filters[key] = value;
    }

    connection = await pool.getConnection();

    let query = 'SELECT * FROM `fatt_handling` WHERE 1=1';
    const queryParams: (string | number)[] = [];

    if (filters.bu && filters.bu !== 'Tutti') {
      query += ' AND `bu` = ?';
      queryParams.push(filters.bu);
    }
    if (filters.div && filters.div !== 'Tutte') {
      query += ' AND `div` = ?';
      queryParams.push(filters.div);
    }
    if (filters.dep && filters.dep !== 'Tutti') {
      query += ' AND `dep` = ?';
      queryParams.push(filters.dep);
    }
    if (filters.tipo_movimento && filters.tipo_movimento !== 'Tutti') {
      query += ' AND `tipo_movimento` = ?';
      queryParams.push(filters.tipo_movimento);
    }
    if (filters.doc_acq) {
      query += ' AND `doc_acq` LIKE ?';
      queryParams.push(`%${filters.doc_acq}%`);
    }
    if (filters.data_mov_m) {
      // Converti la data da formato italiano (gg/mm/aaaa) a formato ISO (yyyy-mm-dd) se necessario
      let dateValue = filters.data_mov_m;
      if (dateValue.includes('/')) {
        dateValue = convertItalianToISO(dateValue);
      }
      query += ' AND DATE(`data_mov_m`) = ?';
      queryParams.push(dateValue);
    }
    if (filters.tipo_imb && filters.tipo_imb !== 'Tutti') {
      query += ' AND `tipo_imb` = ?';
      queryParams.push(filters.tipo_imb);
    }
    if (filters.mese && filters.mese !== 'Tutti') {
      // Usa mese_fatturazione se disponibile, altrimenti mese (basato su data_mov_m)
      query += ' AND (mese_fatturazione = ? OR (mese_fatturazione IS NULL AND mese = ?))';
      queryParams.push(parseInt(filters.mese), parseInt(filters.mese));
    }
    if (filters.anno && filters.anno !== 'Tutti') {
      // Usa anno_fatturazione se disponibile, altrimenti YEAR(data_mov_m)
      query += ' AND (anno_fatturazione = ? OR (anno_fatturazione IS NULL AND YEAR(data_mov_m) = ?))';
      queryParams.push(parseInt(filters.anno), parseInt(filters.anno));
    }

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