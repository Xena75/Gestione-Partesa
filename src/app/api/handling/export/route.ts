import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import * as XLSX from 'xlsx';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestionelogistica',
  port: 3306
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: any = {};
    for (const [key, value] of searchParams.entries()) {
      filters[key] = value;
    }

    const pool = await mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    let query = 'SELECT * FROM fatt_handling WHERE 1=1';
    const queryParams: (string | number)[] = [];

    if (filters.bu && filters.bu !== 'Tutti') {
      query += ' AND bu = ?';
      queryParams.push(filters.bu);
    }
    if (filters.div && filters.div !== 'Tutti') {
      query += ' AND div = ?';
      queryParams.push(filters.div);
    }
    if (filters.dep && filters.dep !== 'Tutti') {
      query += ' AND dep = ?';
      queryParams.push(filters.dep);
    }
    if (filters.tipo_movimento && filters.tipo_movimento !== 'Tutti') {
      query += ' AND tipo_movimento = ?';
      queryParams.push(filters.tipo_movimento);
    }
    if (filters.doc_acq) {
      query += ' AND doc_acq = ?';
      queryParams.push(filters.doc_acq);
    }
    if (filters.data_mov_m) {
      query += ' AND data_mov_m = ?';
      queryParams.push(filters.data_mov_m);
    }
    if (filters.tipo_imb && filters.tipo_imb !== 'Tutti') {
      query += ' AND tipo_imb = ?';
      queryParams.push(filters.tipo_imb);
    }
    if (filters.mese) {
      query += ' AND mese = ?';
      queryParams.push(filters.mese);
    }

    const [rows] = await connection.execute(query, queryParams);
    connection.release();

    const data = rows as any[];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Handling Data');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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
      { error: 'Errore durante la generazione del file Excel' },
      { status: 500 }
    );
  }
}