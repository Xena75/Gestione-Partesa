import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';
import pool from '@/lib/db-gestione';
import type { PoolConnection } from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';
import { cacheKeys } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs';

// Mapping automatico colonne Excel -> database
const COLUMN_MAPPING: Record<string, string> = {
  'appalto': 'appalto',
  'ordine': 'ordine',
  'cod_vettore': 'cod_vettore',
  'descr_vettore': 'descr_vettore',
  'viaggio': 'viaggio',
  'consegna_num': 'consegna_num',
  'cod_cliente': 'cod_cliente',
  'ragione_sociale': 'ragione_sociale',
  'cod_articolo': 'cod_articolo',
  'descr_articolo': 'descr_articolo',
  'gr_stat': 'gr_stat',
  'descr_gruppo_st': 'descr_gruppo_st',
  'classe_prod': 'classe_prod',
  'descr_classe_prod': 'descr_classe_prod',
  'classe_tariffa': 'classe_tariffa',
  'anomalia': 'anomalia',
  'data_mov_merce': 'data_mov_merce',
  'colli': 'colli',
  'tariffa': 'tariffa',
  'tariffa_vuoti': 'tariffa_vuoti',
  'compenso': 'compenso',
  'tr_cons': 'tr_cons',
  'tot_compenso': 'tot_compenso',
  'bu': 'bu',
  'div': 'div',
  'dep': 'dep',
  'tipologia': 'tipologia',
  'cod_em_fat': 'cod_em_fat',
  'emittente_fattura': 'emittente_fattura',
  'oda': 'oda',
};

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
  if (typeof value === 'number') {
    // Gestisci precisione per numeri decimali
    return Math.round(value * 100) / 100;
  }
  // Rimuovi spazi e caratteri non numerici, poi converti
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  // Arrotonda a 2 decimali per evitare problemi di precisione
  return Math.round(num * 100) / 100;
}

// GET - Lista file disponibili nelle cartelle
export async function GET(request: NextRequest) {
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
      const cleanPath = customPath.trim();
      
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
      files: excelFiles.map(f => ({ name: f }))
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
        { error: 'Nome file obbligatorio' },
        { status: 400 }
      );
    }
    
    let selectedFolder: string;
    
    // Se è specificato un percorso personalizzato, usalo
    if (customPath && customPath.trim() !== '') {
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
    const fileBuffer = await readFile(filePath);
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
    
    // Ottieni connessione
    connection = await pool.getConnection();
    
    // 🗑️ Elimina record esistenti dello stesso file per evitare duplicati
    // Questo permette di riimportare file aggiornati senza creare duplicati
    // Controlla se nel file Excel c'è una colonna source_name con valori specifici
    const firstRow = data[0] || {};
    const hasSourceNameColumn = firstRow.source_name !== undefined && 
                                firstRow.source_name !== null && 
                                String(firstRow.source_name).trim() !== '';
    
    // Se c'è una colonna source_name con valori, elimina i record con quel source_name
    // Altrimenti elimina i record con il nome del file
    const sourceNameToDelete = hasSourceNameColumn ? String(firstRow.source_name).trim() : fileName;
    
    try {
      const [deleteResult] = await connection.execute(
        'DELETE FROM fatt_delivery WHERE source_name = ?',
        [sourceNameToDelete]
      );
      const deletedCount = (deleteResult as any).affectedRows || 0;
      if (deletedCount > 0) {
        console.log(`🗑️ Eliminati ${deletedCount} record esistenti con source_name "${sourceNameToDelete}" per evitare duplicati`);
      }
    } catch (deleteError: any) {
      console.warn(`⚠️ Avviso: impossibile eliminare record esistenti: ${deleteError.message}`);
      // Continua comunque con l'importazione
    }
    
    // Estrai mese e anno di fatturazione dal nome del file
    // Pattern supportati:
    // - Fut_01_2026.xlsx → mese 1, anno 2026
    // - Futura_Aprile.xlsx → mese 4, anno dalla data_mov_merce o corrente
    const extractFatturazioneFromFileName = (fileName: string, dataMovMerce?: string | null): { mese: number | null, anno: number | null } => {
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
          // Se c'è una data_mov_merce, usa l'anno da quella, altrimenti usa l'anno corrente
          let anno: number | null = null;
          if (dataMovMerce) {
            try {
              const date = new Date(dataMovMerce);
              if (!isNaN(date.getTime())) {
                anno = date.getFullYear();
              }
            } catch (e) {
              // Ignora
            }
          }
          // Se non abbiamo l'anno dalla data, usa l'anno corrente
          if (!anno) {
            anno = new Date().getFullYear();
          }
          
          return {
            mese: numeroMese,
            anno: anno
          };
        }
      }
      
      return { mese: null, anno: null };
    };
    
    // Prepara la query di inserimento (usa backtick per parole riservate)
    const insertQuery = `
      INSERT INTO fatt_delivery (
        source_name,
        appalto,
        ordine,
        cod_vettore,
        descr_vettore,
        viaggio,
        consegna_num,
        cod_cliente,
        ragione_sociale,
        cod_articolo,
        descr_articolo,
        gr_stat,
        descr_gruppo_st,
        classe_prod,
        descr_classe_prod,
        classe_tariffa,
        anomalia,
        data_mov_merce,
        colli,
        tariffa,
        tariffa_vuoti,
        compenso,
        tr_cons,
        tot_compenso,
        bu,
        \`div\`,
        dep,
        tipologia,
        cod_em_fat,
        emittente_fattura,
        oda,
        mese_fatturazione,
        anno_fatturazione
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 1000; // Stessa logica di handling
    
    // Processa i dati in batch
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchValues: any[] = [];
      
      for (const row of batch) {
        try {
          // Gestisci source_name: se è una stringa valida usa quella, altrimenti usa il nome del file
          let sourceNameValue: string | null = null;
          if (row.source_name !== undefined && row.source_name !== null) {
            const sourceNameStr = String(row.source_name);
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
          
          // Funzione helper per convertire stringhe vuote in null
          const toNullIfEmpty = (value: any): string | null => {
            if (value === null || value === undefined) return null;
            const str = String(value).trim();
            return str === '' ? null : str;
          };
          
          // Estrai mese/anno di fatturazione per questo record specifico
          // (può variare se source_name è diverso per ogni riga)
          const dataMovMerceValue = convertDate(row.data_mov_merce);
          const { mese: meseFattRecord, anno: annoFattRecord } = extractFatturazioneFromFileName(
            sourceNameValue || fileName,
            dataMovMerceValue
          );
          
          const values = [
            sourceNameValue, // source_name - dalla colonna del file Excel (o nome file se non valido)
            toNullIfEmpty(row.appalto),
            toNullIfEmpty(row.ordine),
            convertNumber(row.cod_vettore),
            toNullIfEmpty(row.descr_vettore),
            toNullIfEmpty(row.viaggio), // Converti stringhe vuote in null
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
            toNullIfEmpty(row.anomalia), // Opzionale, può essere vuoto
            dataMovMerceValue,
            convertNumber(row.colli),
            convertNumber(row.tariffa),
            convertNumber(row.tariffa_vuoti),
            convertNumber(row.compenso),
            convertNumber(row.tr_cons),
            convertNumber(row.tot_compenso),
            toNullIfEmpty(row.bu),
            toNullIfEmpty(row.div),
            toNullIfEmpty(row.dep || row.Deposito), // Supporta sia "dep" che "Deposito"
            toNullIfEmpty(row.tipologia),
            toNullIfEmpty(row.cod_em_fat),
            toNullIfEmpty(row.emittente_fattura),
            toNullIfEmpty(row.oda),
            meseFattRecord, // Mese di fatturazione estratto dal nome del file (o source_name)
            annoFattRecord, // Anno di fatturazione estratto dal nome del file (o source_name)
          ];
          
          batchValues.push(values);
        } catch (error: any) {
          errorCount++;
          const rowNum = i + batchValues.length + 1;
          const errorMsg = `Riga ${rowNum}: ${error.message}`;
          errors.push(errorMsg);
          // Log dettagliato per i record problematici
          console.error(`❌ Errore preparazione riga ${rowNum}:`, {
            error: error.message,
            stack: error.stack,
            row: {
              consegna_num: row.consegna_num || row['consegna_num'],
              viaggio: row.viaggio || row['viaggio'],
              ordine: row.ordine || row['ordine'],
              data_mov_merce: row.data_mov_merce || row['data_mov_merce'],
              tot_compenso: row.tot_compenso || row['tot_compenso']
            }
          });
        }
      }
      
      // Inserisci il batch
      if (batchValues.length > 0 && connection) {
        try {
          const placeholders = batchValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flatValues = batchValues.flat();
          
          await connection.execute(
            insertQuery.replace('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', `VALUES ${placeholders}`),
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
              const errorMsg = `Riga ${importedCount + errorCount}: ${singleError.message}`;
              errors.push(errorMsg);
              // Log dettagliato per debug
              console.error(`❌ Errore inserimento singolo (riga ${importedCount + errorCount}):`, {
                error: singleError.message,
                code: singleError.code,
                errno: singleError.errno,
                sqlState: singleError.sqlState,
                values: values.slice(0, 10) // Mostra solo i primi 10 valori per non intasare il log
              });
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Import completato:`);
    console.log(`   Righe importate: ${importedCount}`);
    console.log(`   Errori: ${errorCount}`);

    // Invalida la cache dei filtri per aggiornare i mesi disponibili
    invalidateCache(cacheKeys.FILTERS);
    console.log('🗑️ Cache filtri invalidata per aggiornare i mesi disponibili');

    return NextResponse.json({
      success: true,
      importedRows: importedCount,
      totalRows: data.length,
      errors: errors.length > 0 ? errors.slice(0, 50) : [], // Mostra fino a 50 errori invece di 10
      errorCount: errorCount,
      warning: errorCount > 0 ? `⚠️ ${errorCount} errori durante l'importazione. Controlla i log del server per dettagli.` : null
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
