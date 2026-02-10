import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';
import pool from '@/lib/db-gestione';
import type { PoolConnection } from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs';

// Funzioni di conversione (copiate dall'API principale)
function convertDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'number') {
    try {
      const excelDate = XLSX.SSF.parse_date_code(dateValue);
      if (excelDate) {
        const year = excelDate.y;
        const month = String(excelDate.m).padStart(2, '0');
        const day = String(excelDate.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Ignora
    }
  }
  
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
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

function convertNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return isNaN(num) ? null : num;
}

async function getDeposito(connection: PoolConnection, div: string): Promise<string | null> {
  if (!div || !connection) return null;
  
  try {
    const [rows] = await connection.execute(
      'SELECT Deposito FROM tab_deposito WHERE TRIM(`DIV`) = TRIM(?) LIMIT 1',
      [div]
    ) as [any[], any];
    
    return rows.length > 0 ? rows[0].Deposito : null;
  } catch (error) {
    console.error(`Errore recupero deposito per div=${div}:`, error);
    return null;
  }
}

// GET - Lista file disponibili nelle cartelle
export async function GET(request: NextRequest) {
  // Verifica autenticazione
  const auth = await verifyUserAccess(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.message || 'Autenticazione richiesta' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'mensili'; // default: mensili
    const customPath = searchParams.get('customPath'); // percorso personalizzato
    
    let selectedFolder: string;
    
    // Se è specificato un percorso personalizzato, usalo
    if (customPath && customPath.trim() !== '') {
      // Validazione sicurezza: verifica che il path sia assoluto e non contenga sequenze pericolose
      const cleanPath = customPath.trim();
      
      // Permetti path assoluti Windows (C:\, D:\, \\server\share) o Unix (/path)
      if (!cleanPath.match(/^([a-zA-Z]:\\)|(\\\\[^\\]+)|(\/)/)) {
        return NextResponse.json(
          { error: 'Percorso non valido. Usa un percorso assoluto (es: C:\\Cartella o \\\\Server\\Cartella)' },
          { status: 400 }
        );
      }
      
      selectedFolder = cleanPath;
    } else {
      // Cartelle predefinite
      const folders: Record<string, string> = {
        'mensili': join(process.cwd(), 'import', 'Mensili'),
        'import': join(process.cwd(), 'import'),
        'handling': join(process.cwd(), 'uploads', 'handling'),
      };
      
      selectedFolder = folders[folder.toLowerCase()];
      
      if (!selectedFolder) {
        return NextResponse.json(
          { error: `Cartella non valida. Cartelle disponibili: ${Object.keys(folders).join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    const files = await readdir(selectedFolder);
    const excelFiles = files.filter(f => 
      f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls')
    );
    
    return NextResponse.json({
      success: true,
      folder: folder,
      folderPath: selectedFolder,
      files: excelFiles.map(f => ({
        name: f,
        path: join(selectedFolder, f)
      }))
    });
  } catch (error: any) {
    console.error('Errore lettura cartella:', error);
    return NextResponse.json(
      { error: 'Errore durante la lettura della cartella', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Importa un file dalla cartella
export async function POST(request: NextRequest) {
  // Verifica autenticazione
  const auth = await verifyUserAccess(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.message || 'Autenticazione richiesta' },
      { status: 401 }
    );
  }

  let connection: PoolConnection | null = null;
  
  try {
    const body = await request.json();
    const fileName = body.fileName;
    const folder = body.folder || 'mensili'; // default: mensili
    const customPath = body.customPath; // percorso personalizzato
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'Nome file non fornito' },
        { status: 400 }
      );
    }
    
    let selectedFolder: string;
    
    // Se è specificato un percorso personalizzato, usalo
    if (customPath && customPath.trim() !== '') {
      // Validazione sicurezza
      const cleanPath = customPath.trim();
      
      if (!cleanPath.match(/^([a-zA-Z]:\\)|(\\\\[^\\]+)|(\/)/)) {
        return NextResponse.json(
          { error: 'Percorso non valido. Usa un percorso assoluto' },
          { status: 400 }
        );
      }
      
      selectedFolder = cleanPath;
    } else {
      // Cartelle predefinite
      const folders: Record<string, string> = {
        'mensili': join(process.cwd(), 'import', 'Mensili'),
        'import': join(process.cwd(), 'import'),
        'handling': join(process.cwd(), 'uploads', 'handling'),
      };
      
      selectedFolder = folders[folder.toLowerCase()];
      
      if (!selectedFolder) {
        return NextResponse.json(
          { error: `Cartella non valida. Cartelle disponibili: ${Object.keys(folders).join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    const filePath = join(selectedFolder, fileName);
    
    // Leggi il file Excel
    console.log(`📥 Import handling da file: ${fileName}`);
    const fileBuffer = await readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Il file Excel non contiene dati' },
        { status: 400 }
      );
    }
    
    console.log(`📊 Righe da importare: ${data.length}`);
    
    // Ottieni connessione
    connection = await pool.getConnection();
    
    // Verifica duplicati
    const sourceName = (data[0] as any)?.source_name || fileName;
    const meseFromData = (data[0] as any)?.mese || (data[0] as any)?.Mese || (data[0] as any)?.['Mese'];
    
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
    
    // Estrai mese e anno di fatturazione dal nome del file
    // Pattern supportati:
    // - Fut_01_2026.xlsx → mese 1, anno 2026
    // - Futura_Aprile.xlsx → mese 4, anno dalla data_mov_m o corrente
    const extractFatturazioneFromFileName = (fileName: string, dataMovM?: string | null): { mese: number | null, anno: number | null } => {
      // Pattern 1: Fut_MM_YYYY.xlsx (con anno esplicito)
      let match = fileName.match(/Fut_([0-9]{2})_([0-9]{4})/i) || fileName.match(/([0-9]{2})_([0-9]{4})/);
      if (match) {
        return {
          mese: parseInt(match[1]),
          anno: parseInt(match[2])
        };
      }
      
      // Pattern 2: Futura_Mese.xlsx (senza anno, usa nome mese)
      const nomiMesi: Record<string, number> = {
        'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
        'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
        'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
      };
      
      for (const [nomeMese, numeroMese] of Object.entries(nomiMesi)) {
        if (fileName.toLowerCase().includes(nomeMese.toLowerCase())) {
          // Se c'è una data_mov_m, usa l'anno da quella
          let anno: number | null = null;
          if (dataMovM) {
            try {
              const date = new Date(dataMovM);
              if (!isNaN(date.getTime())) {
                anno = date.getFullYear();
              }
            } catch (e) {
              // Ignora
            }
          }
          
          // Se abbiamo l'anno dalla data, restituisci mese e anno
          if (anno) {
            return {
              mese: numeroMese,
              anno: anno
            };
          }
          // Se non abbiamo l'anno, restituisci solo il mese
          return {
            mese: numeroMese,
            anno: null
          };
        }
      }
      
      return { mese: null, anno: null };
    };
    
    // Prepara la query di inserimento
    const insertQuery = `
      INSERT INTO fatt_handling (
        source_name, Appalto, BU, em_fatt, rag_soc, \`div\`, dep, mag, TMv,
        tipo_movimento, doc_mat, EsMat, pos, Materiale, descrizione_materiale,
        gr_m, \`comp\`, doc_acq, EsMat_1, Cliente, data_mov_m, quantita, UMO,
        qta_uma, tipo_imb, t_hf_umv, imp_hf_um, imp_resi_v, imp_doc, tot_hand, Mese,
        mese_fatturazione, anno_fatturazione
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Cache depositi
    const depositoCache = new Map<string, string | null>();
    
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
          const rowData = row as any;
          const div = String(rowData.div || '').trim();
          
          // Recupera deposito (con cache)
          let deposito = depositoCache.get(div);
          if (deposito === undefined) {
            deposito = await getDeposito(connection, div);
            depositoCache.set(div, deposito);
          }
          
          // Gestisci source_name: se è una stringa valida usa quella, altrimenti usa il nome del file
          let sourceNameValue: string | null = null;
          if (rowData.source_name !== undefined && rowData.source_name !== null) {
            const sourceNameStr = String(rowData.source_name);
            // Verifica se è una stringa valida (non contiene caratteri binari)
            if (sourceNameStr && !sourceNameStr.includes('\x80') && !sourceNameStr.includes('\x00') && sourceNameStr.trim() !== '') {
              sourceNameValue = sourceNameStr.trim();
            } else {
              // Se contiene dati binari o non è valido, usa il nome del file
              sourceNameValue = fileName;
            }
          } else {
            // Se source_name non è presente, usa il nome del file
            sourceNameValue = fileName;
          }
          
          // Estrai mese/anno di fatturazione per questo record specifico
          const dataMovMValue = convertDate(rowData.data_mov_m);
          const { mese: meseFattRecord, anno: annoFattRecord } = extractFatturazioneFromFileName(
            sourceNameValue || fileName,
            dataMovMValue
          );
          
          const values = [
            sourceNameValue,
            rowData.appalto || null,
            rowData.bu || null,
            rowData.em_fatt || null,
            rowData.rag_soc || null,
            div || null,
            deposito,
            convertNumber(rowData.mag),
            convertNumber(rowData.tmv),
            rowData.tipo_movimento || null,
            convertNumber(rowData.doc_mat),
            convertNumber(rowData.esmat),
            convertNumber(rowData.pos),
            rowData.materiale || null,
            rowData.descrizione_materiale || null,
            rowData.gr_m || null,
            convertNumber(rowData['Comp.']),
            rowData.oda || null,
            convertNumber(rowData.esmat_1),
            rowData.cliente || null,
            dataMovMValue,
            convertNumber(rowData.quantita),
            rowData.umo || null,
            convertNumber(rowData.qta_uma),
            rowData.tipo_imb || null,
            convertNumber(rowData.t_hf_umv),
            convertNumber(rowData['Imp. H. UM']),
            convertNumber(rowData['Imp.Resi V']),
            convertNumber(rowData['Imp. Doc.']),
            convertNumber(rowData.tot_hand),
            convertNumber(rowData.mese || rowData.Mese || rowData['Mese']),
            meseFattRecord,
            annoFattRecord
          ];
          
          batchValues.push(values);
        } catch (error: any) {
          errorCount++;
          errors.push(`Riga ${i + batchValues.length + 1}: ${error.message}`);
        }
      }
      
      // Inserisci il batch
      if (batchValues.length > 0 && connection) {
        try {
          const placeholders = batchValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flatValues = batchValues.flat();
          
          await connection.execute(
            insertQuery.replace('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', `VALUES ${placeholders}`),
            flatValues
          );
          
          importedCount += batchValues.length;
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batchValues.length} righe importate (totale: ${importedCount}/${data.length})`);
        } catch (error: any) {
          console.error(`❌ Errore inserimento batch, fallback a inserimenti singoli:`, error.message);
          
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
    
    console.log(`\n✅ Import completato: ${importedCount} righe importate, ${errorCount} errori`);
    
    return NextResponse.json({
      success: true,
      importedRows: importedCount,
      totalRows: data.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      errorCount: errorCount
    });
    
  } catch (error: any) {
    console.error('❌ Errore durante l\'import:', error);
    return NextResponse.json(
      { 
        error: 'Errore durante l\'import dei dati',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
