import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import pool from '@/lib/db-gestione';
import type { PoolConnection } from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';
import { cacheKeys } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs';

function convertDate(dateValue: any): string | null {
  if (!dateValue) return null;
  if (typeof dateValue === 'number') {
    try {
      const excelDate = XLSX.SSF.parse_date_code(dateValue);
      if (excelDate) {
        const year = excelDate.y;
        const month = String(excelDate.m).padStart(2, '0');
        const day = String(excelDate.d).padStart(2, '0');
        return `${year}-${month}-${day} 00:00:00`;
      }
    } catch (e) {
      // Ignora
    }
  }
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day} 00:00:00`;
    }
  }
  return null;
}

function convertNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

export async function POST(request: NextRequest) {
  const auth = await verifyUserAccess(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.message || 'Autenticazione richiesta' },
      { status: 401 }
    );
  }

  let connection: PoolConnection | null = null;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type non supportato. Usa multipart/form-data con campo "file"' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'File non fornito' }, { status: 400 });
    }

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    console.log(`📥 Import delivery - File: ${fileName}, Dimensione: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Il file Excel non contiene dati' },
        { status: 400 }
      );
    }

    console.log(`📊 Righe da importare: ${data.length}`);
    connection = await pool.getConnection();

    const firstRow = data[0] || {};
    const hasSourceNameColumn = firstRow.source_name !== undefined &&
      firstRow.source_name !== null &&
      String(firstRow.source_name).trim() !== '';
    const sourceNameToDelete = hasSourceNameColumn ? String(firstRow.source_name).trim() : fileName;

    try {
      const [deleteResult] = await connection.execute(
        'DELETE FROM fatt_delivery WHERE source_name = ?',
        [sourceNameToDelete]
      );
      const deletedCount = (deleteResult as any).affectedRows || 0;
      if (deletedCount > 0) {
        console.log(`🗑️ Eliminati ${deletedCount} record esistenti con source_name "${sourceNameToDelete}"`);
      }
    } catch (deleteError: any) {
      console.warn(`⚠️ Avviso: impossibile eliminare record esistenti: ${deleteError.message}`);
    }

    const extractFatturazioneFromFileName = (fName: string, dataMovMerce?: string | null): { mese: number | null, anno: number | null } => {
      let match = fName.match(/Fut_([0-9]{2})_([0-9]{4})/i) || fName.match(/([0-9]{2})_([0-9]{4})/);
      if (match) {
        return { mese: parseInt(match[1]), anno: parseInt(match[2]) };
      }
      const nomiMesi: Record<string, number> = {
        'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
        'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
        'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
      };
      for (const [nomeMese, numeroMese] of Object.entries(nomiMesi)) {
        if (fName.toLowerCase().includes(nomeMese.toLowerCase())) {
          let anno: number | null = null;
          if (dataMovMerce) {
            try {
              const date = new Date(dataMovMerce);
              if (!isNaN(date.getTime())) anno = date.getFullYear();
            } catch (e) {
              // Ignora
            }
          }
          if (!anno) anno = new Date().getFullYear();
          return { mese: numeroMese, anno };
        }
      }
      return { mese: null, anno: null };
    };

    const insertQuery = `
      INSERT INTO fatt_delivery (
        source_name, appalto, ordine, cod_vettore, descr_vettore, viaggio, consegna_num,
        cod_cliente, ragione_sociale, cod_articolo, descr_articolo, gr_stat, descr_gruppo_st,
        classe_prod, descr_classe_prod, classe_tariffa, anomalia, data_mov_merce, colli,
        tariffa, tariffa_vuoti, compenso, tr_cons, tot_compenso, bu, \`div\`, dep, tipologia,
        cod_em_fat, emittente_fattura, oda, mese_fatturazione, anno_fatturazione
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const toNullIfEmpty = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      const str = String(value).trim();
      return str === '' ? null : str;
    };

    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 1000;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchValues: any[] = [];

      for (const row of batch) {
        try {
          let sourceNameValue: string | null = null;
          if (row.source_name !== undefined && row.source_name !== null) {
            const sourceNameStr = String(row.source_name);
            if (sourceNameStr && !sourceNameStr.includes('\x80') && !sourceNameStr.includes('\x00') && sourceNameStr.trim() !== '') {
              sourceNameValue = sourceNameStr.trim();
            } else {
              sourceNameValue = fileName;
            }
          } else {
            sourceNameValue = fileName;
          }

          const dataMovMerceValue = convertDate(row.data_mov_merce);
          const { mese: meseFattRecord, anno: annoFattRecord } = extractFatturazioneFromFileName(
            sourceNameValue || fileName,
            dataMovMerceValue
          );

          const values = [
            sourceNameValue,
            toNullIfEmpty(row.appalto),
            toNullIfEmpty(row.ordine),
            convertNumber(row.cod_vettore),
            toNullIfEmpty(row.descr_vettore),
            toNullIfEmpty(row.viaggio),
            toNullIfEmpty(row.consegna_num),
            toNullIfEmpty(row.cod_cliente),
            toNullIfEmpty(row.ragione_sociale),
            toNullIfEmpty(row.cod_articolo),
            toNullIfEmpty(row.descr_articolo),
            toNullIfEmpty(row.gr_stat),
            toNullIfEmpty(row.descr_gruppo_st),
            toNullIfEmpty(row.classe_prod),
            toNullIfEmpty(row.descr_classe_prod),
            toNullIfEmpty(row.classe_tariffa),
            toNullIfEmpty(row.anomalia),
            dataMovMerceValue,
            convertNumber(row.colli),
            convertNumber(row.tariffa),
            convertNumber(row.tariffa_vuoti),
            convertNumber(row.compenso),
            convertNumber(row.tr_cons),
            convertNumber(row.tot_compenso),
            toNullIfEmpty(row.bu),
            toNullIfEmpty(row.div),
            toNullIfEmpty(row.dep || row.Deposito),
            toNullIfEmpty(row.tipologia),
            toNullIfEmpty(row.cod_em_fat),
            toNullIfEmpty(row.emittente_fattura),
            toNullIfEmpty(row.oda),
            meseFattRecord,
            annoFattRecord
          ];
          batchValues.push(values);
        } catch (error: any) {
          errorCount++;
          errors.push(`Riga ${i + batchValues.length + 1}: ${error.message}`);
        }
      }

      if (batchValues.length > 0 && connection) {
        try {
          const placeholders = batchValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flatValues = batchValues.flat();
          await connection.execute(
            insertQuery.replace('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', `VALUES ${placeholders}`),
            flatValues
          );
          importedCount += batchValues.length;
        } catch (error: any) {
          for (const values of batchValues) {
            try {
              await connection.execute(insertQuery, values);
              importedCount++;
            } catch (singleError: any) {
              errorCount++;
              errors.push(`Riga ${importedCount + errorCount}: ${singleError.message}`);
            }
          }
        }
      }
    }

    invalidateCache(cacheKeys.FILTERS);

    return NextResponse.json({
      success: true,
      importedRows: importedCount,
      totalRows: data.length,
      errors: errors.length > 0 ? errors.slice(0, 50) : [],
      errorCount: errorCount
    });
  } catch (error: any) {
    console.error('❌ Errore import delivery:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'import dei dati', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
