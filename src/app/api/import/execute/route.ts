import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';
import mysql from 'mysql2/promise';

// Configurazione database
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db',
  port: 3306
};

// Importa la Map condivisa del progresso
import { importProgress } from '@/lib/import-progress';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, mapping } = body;

    if (!fileId || !mapping) {
      return NextResponse.json(
        { error: 'File ID e mapping sono obbligatori' },
        { status: 400 }
      );
    }

    // Controlla se l'importazione è già in corso
    const existingProgress = importProgress.get(fileId);
    if (existingProgress && !existingProgress.completed) {
      console.log('⚠️ Importazione già in corso per fileId:', fileId);
      return NextResponse.json({ 
        error: 'Importazione già in corso per questo file',
        inProgress: true 
      }, { status: 409 });
    }

    // Inizializza il progresso
    importProgress.set(fileId, {
      progress: 0,
      currentStep: 'Inizializzazione...',
      completed: false
    });

    // Avvia l'importazione in background
    executeImport(fileId, mapping);

    return NextResponse.json({
      success: true,
      message: 'Importazione avviata',
      fileId
    });

  } catch (error) {
    console.error('Errore durante l\'avvio importazione:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante l\'avvio dell\'importazione' },
      { status: 500 }
    );
  }
}

async function executeImport(fileId: string, mapping: Record<string, string>) {
  console.log('🚀 Inizio importazione per fileId:', fileId);
  const startTime = Date.now();
  let totalRows = 0;
  let importedRows = 0;
  const errors: string[] = [];

  try {
    // Aggiorna progresso
    updateProgress(fileId, 10, 'Lettura file Excel...');

    // Trova e leggi il file
    const uploadsDir = join(process.cwd(), 'uploads');
    const files = await import('fs/promises').then(fs => fs.readdir(uploadsDir));
    const targetFile = files.find(file => file.startsWith(fileId));
    
    if (!targetFile) {
      throw new Error('File non trovato');
    }

    const filePath = join(uploadsDir, targetFile);
    const buffer = await readFile(filePath);
    
    updateProgress(fileId, 20, 'Parsing dati Excel...');

    // Leggi il file Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converti in JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1) as (string | number | null)[][];
    
    totalRows = dataRows.length;
    updateProgress(fileId, 30, `Validazione ${totalRows} righe...`);

    // Connessione al database con timeout
    const connection = await mysql.createConnection({
      ...dbConfig,
      connectTimeout: 60000
    });
    
    // Genera session_id
    const sessionId = `import_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    updateProgress(fileId, 40, 'Preparazione inserimento dati...');

    // Prepara la query di inserimento
    const mappedFields = Object.values(mapping).filter(field => 
      field !== 'skip' && !field.startsWith('auto_')
    );
    
    // Aggiungi campi calcolati se presenti nel mapping
    const calculatedFields = ['Ore_Pod', 'Data', 'Mese', 'Giorno', 'Sett', 'Trimestre'];
    const fieldsToInsert = [...mappedFields];
    
    calculatedFields.forEach(field => {
      if (Object.values(mapping).includes(field) && !fieldsToInsert.includes(field)) {
        fieldsToInsert.push(field);
      }
    });
    
    const placeholders = fieldsToInsert.map(() => '?').join(', ');
    const insertSql = `INSERT IGNORE INTO viaggi_pod (\`${fieldsToInsert.join('`, `')}\`, session_id) VALUES (${placeholders}, ?)`;
    
    console.log('🔍 Campi da inserire:', fieldsToInsert);
    console.log('🔍 SQL Query:', insertSql);

    updateProgress(fileId, 50, 'Inserimento dati nel database...');

    // Inserisci i dati con timeout e gestione errori migliorata
    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i];
        const values: (string | number | null)[] = [];

        // Prepara i valori per tutti i campi da inserire
        for (const dbField of fieldsToInsert) {
          let value: string | number | null = null;
          
          console.log(`🔍 Elaborazione campo: ${dbField}`);
          
          // Trova la colonna Excel mappata a questo campo
          const excelHeader = Object.keys(mapping).find(key => mapping[key] === dbField);
          
          if (excelHeader) {
            const headerIndex = headers.indexOf(excelHeader);
            value = headerIndex >= 0 ? row[headerIndex] : null;
            console.log(`   - Excel Header: ${excelHeader}, Index: ${headerIndex}, Valore grezzo: ${value}`);
          } else {
            console.log(`   - Nessun mapping trovato per: ${dbField}`);
          }
          
          // Gestisci valori speciali e campi calcolati
          if (dbField.startsWith('auto_')) {
            switch (dbField) {
              case 'auto_filename':
                value = targetFile;
                break;
              case 'auto_current_date':
                value = new Date().toISOString();
                break;
              case 'auto_calculated':
                value = calculateAutoValue(dbField, row, headers, mapping);
                break;
            }
            console.log(`   - Campo auto: ${dbField} = ${value}`);
          }
          
          // Valida e converte i tipi PRIMA di calcolare i campi automatici
          const convertedValue = validateAndConvertValue(dbField, value);
          console.log(`   - Dopo conversione: ${value} -> ${convertedValue}`);
          
          // Ora calcola i campi automatici usando i valori già convertiti
          if (['Ore_Pod', 'Data', 'Mese', 'Giorno', 'Sett', 'Trimestre'].includes(dbField)) {
            // Campi calcolati automaticamente
            const calculatedValue = calculateAutoValue(dbField, row, headers, mapping);
            console.log(`   - Campo calcolato: ${dbField} = ${calculatedValue}`);
            values.push(calculatedValue);
          } else {
            // Campi normali (inclusi Data Inizio e Data Fine)
            values.push(convertedValue);
          }
        }

        // Aggiungi session_id
        values.push(sessionId);

        // Esegui l'inserimento con timeout
        const insertPromise = connection.execute(insertSql, values);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout inserimento')), 30000)
        );
        
        await Promise.race([insertPromise, timeoutPromise]);
        importedRows++;

        // Aggiorna progresso ogni 10 righe
        if (i % 10 === 0) {
          const progress = 50 + Math.floor((i / dataRows.length) * 40);
          updateProgress(fileId, progress, `Importazione riga ${i + 1} di ${dataRows.length}...`);
        }

        // Pausa breve per evitare sovraccarico
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (rowError) {
        const errorMsg = `Riga ${i + 1}: ${(rowError as Error).message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        
        // Se troppi errori, interrompi
        if (errors.length > 100) {
          throw new Error('Troppi errori, importazione interrotta');
        }
      }
    }

    await connection.end();

    updateProgress(fileId, 90, 'Completamento importazione...');

    // Calcola durata
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Risultato finale
    const result = {
      success: errors.length === 0,
      totalRows,
      importedRows,
      errors,
      sessionId,
      duration
    };

    // Salva il risultato
    console.log('✅ Importazione completata con successo!', result);
    updateProgress(fileId, 100, 'Importazione completata', true, result);

  } catch (error) {
    console.error('❌ Errore durante l\'importazione:', error);
    const result = {
      success: false,
      totalRows,
      importedRows,
      errors: [...errors, `Errore generale: ${(error as Error).message}`],
      sessionId: `error_${Date.now()}`,
      duration: Math.round((Date.now() - startTime) / 1000)
    };
    
    console.log('❌ Importazione fallita:', result);
    updateProgress(fileId, 100, 'Errore durante l\'importazione', true, result);
  }
}

function updateProgress(fileId: string, progress: number, step: string, completed = false, result?: {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: string[];
  sessionId: string;
  duration: number;
}) {
  console.log(`📊 Progresso ${fileId}: ${progress}% - ${step}${completed ? ' (COMPLETATO)' : ''}`);
  const current = importProgress.get(fileId);
  if (current) {
    current.progress = progress;
    current.currentStep = step;
    current.completed = completed;
    if (result) {
      current.result = result;
    }
    importProgress.set(fileId, current);
  }
}

function calculateAutoValue(field: string, row: (string | number | null)[], headers: string[], mapping: Record<string, string>): string | number | null {
  console.log(`⚙️ Tentativo di calcolare il campo: ${field}`);
  
  // Trova gli indici delle colonne mappate
  const dataInizioExcelHeader = Object.keys(mapping).find(k => mapping[k] === 'Data Inizio');
  const dataFineExcelHeader = Object.keys(mapping).find(k => mapping[k] === 'Data Fine');
  
  const dataInizioIndex = dataInizioExcelHeader ? headers.indexOf(dataInizioExcelHeader) : -1;
  const dataFineIndex = dataFineExcelHeader ? headers.indexOf(dataFineExcelHeader) : -1;
  
  console.log(`   - Mapping per Data Inizio: ${dataInizioExcelHeader}, Index: ${dataInizioIndex}`);
  console.log(`   - Mapping per Data Fine: ${dataFineExcelHeader}, Index: ${dataFineIndex}`);
  
  // Ottieni i valori grezzi dall'Excel
  const dataInizioRaw = dataInizioIndex >= 0 ? row[dataInizioIndex] : null;
  const dataFineRaw = dataFineIndex >= 0 ? row[dataFineIndex] : null;
  
  console.log(`   - Valori grezzi Excel - Data Inizio: ${dataInizioRaw}, Data Fine: ${dataFineRaw}`);
  
  // Converti i valori grezzi in date
  let dataInizio: Date | null = null;
  let dataFine: Date | null = null;
  
     if (dataInizioRaw) {
     if (typeof dataInizioRaw === 'number') {
       // È già un numero Excel date
       dataInizio = new Date((dataInizioRaw - 25569) * 86400 * 1000);
     } else {
       dataInizio = new Date(dataInizioRaw);
       if (isNaN(dataInizio.getTime())) {
         // Prova come Excel date (numero)
         const excelDate = parseFloat(String(dataInizioRaw));
         if (!isNaN(excelDate)) {
           dataInizio = new Date((excelDate - 25569) * 86400 * 1000);
         }
       }
     }
   }
   
   if (dataFineRaw) {
     if (typeof dataFineRaw === 'number') {
       // È già un numero Excel date
       dataFine = new Date((dataFineRaw - 25569) * 86400 * 1000);
     } else {
       dataFine = new Date(dataFineRaw);
       if (isNaN(dataFine.getTime())) {
         // Prova come Excel date (numero)
         const excelDate = parseFloat(String(dataFineRaw));
         if (!isNaN(excelDate)) {
           dataFine = new Date((excelDate - 25569) * 86400 * 1000);
         }
       }
     }
   }
  
  console.log(`   - Date convertite - Data Inizio: ${dataInizio?.toISOString()}, Data Fine: ${dataFine?.toISOString()}`);
  
  switch (field) {
    case 'Ore_Pod':
      // Calcola Ore_Pod dalla differenza tra Data Fine e Data Inizio
      if (dataInizio && dataFine) {
        if (!isNaN(dataInizio.getTime()) && !isNaN(dataFine.getTime())) {
          const diffMs = dataFine.getTime() - dataInizio.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          console.log(`   - Differenza in ore: ${diffHours}`);
          return parseFloat(diffHours.toFixed(2));
        } else {
          console.warn(`   - Errore: Data Inizio o Data Fine non valide per Ore_Pod`);
        }
      } else {
        console.warn(`   - Errore: Data Inizio o Data Fine mancanti per Ore_Pod`);
      }
      return null;
    
    case 'Data':
      // Estrai la data da Data Inizio
      if (dataInizio && !isNaN(dataInizio.getTime())) {
        return dataInizio.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      }
      return null;
      
    case 'Mese':
      // Estrai il mese da Data Inizio
      if (dataInizio && !isNaN(dataInizio.getTime())) {
        return dataInizio.getMonth() + 1; // getMonth() restituisce 0-11
      }
      return null;
      
    case 'Giorno':
      // Estrai il giorno della settimana da Data Inizio
      if (dataInizio && !isNaN(dataInizio.getTime())) {
        const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const giornoSettimana = giorni[dataInizio.getDay()];
        console.log(`   - Calcolato Giorno della settimana: ${giornoSettimana}`);
        return giornoSettimana;
      }
      return null;
    
    case 'Sett':
      // Calcola la settimana dell'anno da Data Inizio
      if (dataInizio && !isNaN(dataInizio.getTime())) {
        const start = new Date(dataInizio.getFullYear(), 0, 1);
        const days = Math.floor((dataInizio.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + start.getDay() + 1) / 7);
      }
      return null;
      
    case 'Trimestre':
      // Calcola il trimestre da Data Inizio
      if (dataInizio && !isNaN(dataInizio.getTime())) {
        return Math.ceil((dataInizio.getMonth() + 1) / 3);
      }
      return null;
    
    default:
      return null;
  }
}

function validateAndConvertValue(field: string, value: string | number | null): string | number | null {
  console.log(`🔧 validateAndConvertValue - Campo: ${field}, Valore: ${value}, Tipo: ${typeof value}`);
  if (value === null || value === undefined) return null;

  switch (field) {
    case 'ID':
    case 'Source#Name':
    case 'Viaggio':
    case 'Magazzino di partenza':
    case 'Nome Trasportatore':
    case 'Giorno':
      return String(value);
    
    case 'Data Inizio':
    case 'Data Fine':
    case 'Data':
      console.log(`   📅 Elaborazione data per campo: ${field}, valore: ${value}`);
      if (value && typeof value === 'object' && 'toISOString' in value) {
        const date = value as Date;
        const mysqlDate = date.toISOString().slice(0, 19).replace('T', ' ');
        console.log(`   ✅ Data da oggetto Date: ${value} -> ${mysqlDate}`);
        return mysqlDate; // Formato MySQL: YYYY-MM-DD HH:mm:ss
      }
      if (typeof value === 'string') {
        console.log(`   📅 Tentativo conversione stringa: ${value}`);
        // Gestisci diversi formati di data
        
        // Prova prima come ISO string
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const mysqlDate = date.toISOString().slice(0, 19).replace('T', ' ');
          console.log(`   ✅ Data convertita da stringa: ${value} -> ${mysqlDate}`);
          return mysqlDate;
        }
        
        // Prova come Excel date (numero)
        const excelDate = parseFloat(value);
        if (!isNaN(excelDate)) {
          // Converti da Excel date (giorni dal 1900-01-01) a JavaScript Date
          const excelEpoch = new Date(1900, 0, 1);
          const jsDate = new Date(excelEpoch.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000);
          const mysqlDate = jsDate.toISOString().slice(0, 19).replace('T', ' ');
          console.log(`   ✅ Excel date convertita: ${value} -> ${mysqlDate}`);
          return mysqlDate;
        }
        
        console.warn(`   ❌ Data non valida: ${value}`);
        return null;
      }
             if (typeof value === 'number') {
         console.log(`   📅 Tentativo conversione numero Excel: ${value}`);
         // Prova come Excel date (numero)
         const excelDate = value;
         if (!isNaN(excelDate)) {
           // Converti da Excel date usando il metodo corretto
           const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
           const mysqlDate = jsDate.toISOString().slice(0, 19).replace('T', ' ');
           console.log(`   ✅ Excel date convertita da numero: ${value} -> ${mysqlDate}`);
           return mysqlDate;
         }
       }
      console.warn(`   ❌ Data non valida o tipo non supportato: ${value} (${typeof value})`);
      return null;
    
    case 'Ore_Pod':
    case 'Peso (Kg)':
    case 'Km':
      const num = parseFloat(String(value));
      return isNaN(num) ? null : num;
    
    case 'Colli':
    case 'Toccate':
    case 'Ordini':
    case 'Mese':
    case 'Sett':
    case 'Trimestre':
      const int = parseInt(String(value));
      return isNaN(int) ? null : int;
    
    default:
      return value;
  }
}

// API per ottenere il progresso
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json(
      { error: 'File ID mancante' },
      { status: 400 }
    );
  }

  const progress = importProgress.get(fileId);
  if (!progress) {
    return NextResponse.json(
      { error: 'Progresso non trovato' },
      { status: 404 }
    );
  }

  return NextResponse.json(progress);
}
