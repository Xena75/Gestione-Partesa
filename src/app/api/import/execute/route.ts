import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
// import { existsSync } from 'fs'; // Non utilizzato
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

// Store per il progresso (in produzione usare Redis o database)
const importProgress = new Map<string, {
  progress: number;
  currentStep: string;
  completed: boolean;
  result?: {
    success: boolean;
    totalRows: number;
    importedRows: number;
    errors: string[];
    sessionId: string;
    duration: number;
  };
}>();

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

    // Connessione al database
    const connection = await mysql.createConnection(dbConfig);
    
    // Genera session_id
    const sessionId = `import_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    updateProgress(fileId, 40, 'Preparazione inserimento dati...');

    // Prepara la query di inserimento
    const mappedFields = Object.values(mapping).filter(field => 
      field !== 'skip' && !field.startsWith('auto_')
    );
    
    const placeholders = mappedFields.map(() => '?').join(', ');
    const insertSql = `INSERT INTO viaggi_pod (${mappedFields.join(', ')}, session_id) VALUES (${placeholders}, ?)`;

    updateProgress(fileId, 50, 'Inserimento dati nel database...');

    // Inserisci i dati
    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i];
        const values: (string | number | null)[] = [];

        // Mappa i valori secondo il mapping
        for (const [excelHeader, dbField] of Object.entries(mapping)) {
          if (dbField === 'skip') continue;
          
          const headerIndex = headers.indexOf(excelHeader);
          let value = headerIndex >= 0 ? row[headerIndex] : null;

          // Gestisci valori speciali
          if (dbField.startsWith('auto_')) {
            switch (dbField) {
              case 'auto_filename':
                value = targetFile;
                break;
              case 'auto_current_date':
                value = new Date().toISOString();
                break;
              case 'auto_calculated':
                // Calcoli automatici (es. Ore_Pod, Data, Mese, etc.)
                value = calculateAutoValue(dbField, row, headers, mapping);
                break;
            }
          }

          // Valida e converte i tipi
          value = validateAndConvertValue(dbField, value);
          
          if (dbField !== 'skip' && !dbField.startsWith('auto_')) {
            values.push(value);
          }
        }

        // Aggiungi session_id
        values.push(sessionId);

        // Esegui l'inserimento
        await connection.execute(insertSql, values);
        importedRows++;

        // Aggiorna progresso ogni 10 righe
        if (i % 10 === 0) {
          const progress = 50 + Math.floor((i / dataRows.length) * 40);
          updateProgress(fileId, progress, `Importazione riga ${i + 1} di ${dataRows.length}...`);
        }

      } catch (rowError) {
        const errorMsg = `Riga ${i + 1}: ${(rowError as Error).message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
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
    updateProgress(fileId, 100, 'Importazione completata', true, result);

  } catch (error) {
    console.error('Errore durante l\'importazione:', error);
    const result = {
      success: false,
      totalRows,
      importedRows,
      errors: [...errors, `Errore generale: ${(error as Error).message}`],
      sessionId: `error_${Date.now()}`,
      duration: Math.round((Date.now() - startTime) / 1000)
    };
    
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
  switch (field) {
    case 'auto_calculated':
      // Esempio: calcola Ore_Pod dalla differenza tra Data Fine e Data Inizio
      const dataInizioIndex = headers.indexOf(Object.keys(mapping).find(k => mapping[k] === 'Data Inizio') || '');
      const dataFineIndex = headers.indexOf(Object.keys(mapping).find(k => mapping[k] === 'Data Fine') || '');
      
      if (dataInizioIndex >= 0 && dataFineIndex >= 0) {
        const dataInizioValue = row[dataInizioIndex];
        const dataFineValue = row[dataFineIndex];
        
        if (dataInizioValue && dataFineValue) {
          const dataInizio = new Date(dataInizioValue);
          const dataFine = new Date(dataFineValue);
          if (!isNaN(dataInizio.getTime()) && !isNaN(dataFine.getTime())) {
            const diffHours = (dataFine.getTime() - dataInizio.getTime()) / (1000 * 60 * 60);
            return Math.round(diffHours * 100) / 100; // Arrotonda a 2 decimali
          }
        }
      }
      return null;
    default:
      return null;
  }
}

function validateAndConvertValue(field: string, value: string | number | null): string | number | null {
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
      if (value && typeof value === 'object' && 'toISOString' in value) return (value as Date).toISOString();
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
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
