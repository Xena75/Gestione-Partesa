import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import pool from '@/lib/db-gestione';
import type { PoolConnection } from 'mysql2/promise';

export async function POST(request: NextRequest) {
  let connection: PoolConnection | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'File non fornito' },
        { status: 400 }
      );
    }
    
    console.log(`📥 Import handling - File: ${file.name}, Dimensione: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Leggi il file Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leggi i dati con header (il file ha già le intestazioni nella prima riga)
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
    
    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Il file Excel non contiene dati' },
        { status: 400 }
      );
    }
    
    console.log(`📊 Righe da importare: ${data.length}`);
    
    // Ottieni connessione dal pool
    connection = await pool.getConnection();
    
    // Estrai il nome del file e il mese dai dati per verificare duplicati
    const sourceName = data[0]?.source_name || file.name;
    const meseFromData = data[0]?.mese;
    
    // Verifica se questo file è già stato importato
    if (meseFromData) {
      const [existingRecords] = await connection.execute(
        'SELECT COUNT(*) as count FROM fatt_handling WHERE source_name = ? AND mese = ?',
        [sourceName, meseFromData]
      ) as [any[], any];
      
      const existingCount = existingRecords[0]?.count || 0;
      
      if (existingCount > 0) {
        connection.release();
        return NextResponse.json(
          { 
            error: 'File già importato',
            details: `Il file "${sourceName}" per il mese ${meseFromData} è già stato importato (${existingCount} record trovati).`,
            existingCount,
            sourceName,
            mese: meseFromData,
            duplicate: true
          },
          { status: 409 }
        );
      }
    }
    
    // Prepara la query di inserimento
    const insertQuery = `
      INSERT INTO fatt_handling (
        source_name,
        Appalto,
        BU,
        em_fatt,
        rag_soc,
        \`div\`,
        dep,
        mag,
        TMv,
        tipo_movimento,
        doc_mat,
        EsMat,
        pos,
        Materiale,
        descrizione_materiale,
        gr_m,
        \`comp\`,
        doc_acq,
        EsMat_1,
        Cliente,
        data_mov_m,
        quantita,
        UMO,
        qta_uma,
        tipo_imb,
        t_hf_umv,
        imp_hf_um,
        imp_resi_v,
        imp_doc,
        tot_hand,
        Mese
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Mappa per memorizzare i depositi già recuperati (cache)
    const depositoCache = new Map<string, string | null>();
    
    // Funzione per ottenere il deposito da tab_deposito
    async function getDeposito(div: string): Promise<string | null> {
      if (!div || !connection) return null;
      
      // Controlla la cache
      if (depositoCache.has(div)) {
        return depositoCache.get(div)!;
      }
      
      try {
        const [rows] = await connection.execute(
          'SELECT Deposito FROM tab_deposito WHERE TRIM(`DIV`) = TRIM(?) LIMIT 1',
          [div]
        ) as [any[], any];
        
        const deposito = rows.length > 0 ? rows[0].Deposito : null;
        depositoCache.set(div, deposito);
        return deposito;
      } catch (error) {
        console.error(`Errore recupero deposito per div=${div}:`, error);
        return null;
      }
    }
    
    // Funzione per convertire la data Excel in formato MySQL
    function convertDate(dateValue: any): string | null {
      if (!dateValue) return null;
      
      if (typeof dateValue === 'number') {
        // Excel date (numero di giorni dal 1 gennaio 1900)
        try {
          const excelDate = XLSX.SSF.parse_date_code(dateValue);
          if (excelDate) {
            const year = excelDate.y;
            const month = String(excelDate.m).padStart(2, '0');
            const day = String(excelDate.d).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        } catch (e) {
          // Se non è una data Excel valida, prova come timestamp
        }
      }
      
      if (typeof dateValue === 'string') {
        // Prova a parsare come data
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
        
        // Prova formato italiano gg/mm/aaaa
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }
      
      return null;
    }
    
    // Funzione per convertire valore numerico preservando la precisione
    function convertNumber(value: any): number | null {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') return value;
      const num = parseFloat(String(value));
      return isNaN(num) ? null : num;
    }
    
    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 1000;
    
    // Processa i dati in batch
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchValues: any[] = [];
      
      for (const row of batch) {
        try {
          // Ottieni il deposito dal JOIN con tab_deposito
          const div = String(row.div || '').trim();
          const deposito = await getDeposito(div);
          
          // Prepara i valori per l'inserimento
          const values = [
            row.source_name || null,
            row.appalto || null,
            row.bu || null,
            row.em_fatt || null,
            row.rag_soc || null,
            div || null,
            deposito, // Da tab_deposito tramite JOIN
            convertNumber(row.mag),
            convertNumber(row.tmv),
            row.tipo_movimento || null,
            convertNumber(row.doc_mat),
            convertNumber(row.esmat),
            convertNumber(row.pos),
            row.materiale || null,
            row.descrizione_materiale || null,
            row.gr_m || null,
            convertNumber(row['Comp.']), // Campo con caratteri speciali
            row.oda || null, // mappato a doc_acq
            convertNumber(row.esmat_1),
            row.cliente || null,
            convertDate(row.data_mov_m),
            convertNumber(row.quantita),
            row.umo || null,
            convertNumber(row.qta_uma),
            row.tipo_imb || null,
            convertNumber(row.t_hf_umv),
            convertNumber(row['Imp. H. UM']), // Campo con caratteri speciali
            convertNumber(row['Imp.Resi V']), // Campo con caratteri speciali
            convertNumber(row['Imp. Doc.']), // Campo con caratteri speciali
            convertNumber(row.tot_hand),
            convertNumber(row.mese)
          ];
          
          batchValues.push(values);
        } catch (error) {
          errorCount++;
          const errorMsg = `Riga ${i + batchValues.length + 1}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`;
          errors.push(errorMsg);
          console.error(`❌ Errore preparazione riga ${i + batchValues.length + 1}:`, error);
        }
      }
      
      // Inserisci il batch
      if (batchValues.length > 0 && connection) {
        try {
          // Usa INSERT multipli per velocità
          const placeholders = batchValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flatValues = batchValues.flat();
          
          await connection.execute(
            insertQuery.replace('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', `VALUES ${placeholders}`),
            flatValues
          );
          
          importedCount += batchValues.length;
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batchValues.length} righe importate (totale: ${importedCount}/${data.length})`);
        } catch (error) {
          // Fallback: inserisci una riga alla volta
          console.error(`❌ Errore inserimento batch, fallback a inserimenti singoli:`, error);
          
          if (connection) {
            for (const values of batchValues) {
              try {
                await connection.execute(insertQuery, values);
                importedCount++;
              } catch (singleError) {
                errorCount++;
                const errorMsg = `Riga ${importedCount + errorCount}: ${singleError instanceof Error ? singleError.message : 'Errore inserimento'}`;
                errors.push(errorMsg);
                console.error(`❌ Errore inserimento singola riga:`, singleError);
              }
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Import completato:`);
    console.log(`   Righe importate: ${importedCount}`);
    console.log(`   Errori: ${errorCount}`);
    
    return NextResponse.json({
      success: true,
      importedRows: importedCount,
      totalRows: data.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Mostra solo i primi 10 errori
      errorCount: errorCount
    });
    
  } catch (error) {
    console.error('❌ Errore durante l\'import:', error);
    return NextResponse.json(
      { 
        error: 'Errore durante l\'import dei dati',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

