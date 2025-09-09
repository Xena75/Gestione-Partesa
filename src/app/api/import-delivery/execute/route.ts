import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getFileFromBlob } from '../upload/route';

// Configurazione database gestionelogistica con timeout estesi
const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  // Configurazioni per connessioni lunghe
  acquireTimeout: 60000, // 60 secondi per acquisire connessione
  timeout: 60000, // 60 secondi timeout query
  reconnect: true, // Riconnessione automatica
  keepAliveInitialDelay: 0,
  enableKeepAlive: true
};

// Importa la Map condivisa del progresso
import { updateImportProgress, cleanupImportProgress, getImportProgress } from '@/lib/import-progress-db';

// Funzione per verificare e riconnettere la connessione se necessario
async function ensureConnection(connection: mysql.Connection | null): Promise<mysql.Connection> {
  if (!connection || connection.state === 'disconnected') {
    console.log('🔄 Riconnessione al database...');
    return await mysql.createConnection(dbConfig);
  }
  return connection;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, mapping, blobUrl, originalName } = body;

    if (!fileId || !mapping || !blobUrl) {
      return NextResponse.json(
        { error: 'File ID, mapping e Blob URL sono obbligatori' },
        { status: 400 }
      );
    }

    // Controlla se l'importazione è già in corso
    const existingProgress = await getImportProgress(fileId);
    if (existingProgress && !existingProgress.completed) {
      console.log('⚠️ Importazione già in corso per fileId:', fileId);
      return NextResponse.json({ 
        error: 'Importazione già in corso per questo file',
        inProgress: true 
      }, { status: 409 });
    }

    // Inizializza il progresso nel database
    await updateImportProgress(fileId, 0, 'Inizializzazione...', false);

    // Avvia l'importazione in background
    executeDeliveryImport(fileId, mapping, blobUrl, originalName);

    return NextResponse.json({
      success: true,
      message: 'Importazione avviata',
      fileId: fileId
    });

  } catch (error) {
    console.error('Errore durante l\'avvio dell\'importazione:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'avvio dell\'importazione' },
      { status: 500 }
    );
  }
}

async function executeDeliveryImport(fileId: string, mapping: Record<string, string>, blobUrl: string, originalName?: string) {
  const startTime = Date.now();
  let connection: mysql.Connection | null = null;
  
  // Timeout di 2 ore per file grandi
  const timeout = 2 * 60 * 60 * 1000; // 2 ore
  const timeoutId = setTimeout(async () => {
    console.error(`⏰ Timeout raggiunto per import ${fileId} dopo ${timeout/1000/60} minuti`);
    await updateImportProgress(fileId, 100, 'Importazione interrotta per timeout', true, {
      success: false,
      totalRows: 0,
      importedRows: 0,
      errors: ['Timeout: Importazione interrotta dopo 30 minuti'],
      sessionId: fileId,
      duration: Math.round((Date.now() - startTime) / 1000)
    });
  }, timeout);
  
  try {
    console.log(`🚀 Avvio importazione delivery per fileId: ${fileId} (timeout: ${timeout/1000/60} minuti)`);
    
    // Connessione al database
    await updateImportProgress(fileId, 5, 'Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database gestionelogistica');

    // Leggi il file Excel
    await updateImportProgress(fileId, 10, 'Lettura file Excel...');
    const fileBuffer = await getFileFromBlob(blobUrl);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length <= 1) {
      throw new Error('Il file Excel non contiene dati validi');
    }

    const headers = data[0] as string[];
    const rows = data.slice(1) as (string | number | null)[][];
    const totalRows = rows.length;
    
    console.log(`📊 File Excel analizzato: ${totalRows} righe, ${headers.length} colonne`);

    // Validazione mapping
    await updateImportProgress(fileId, 15, 'Validazione mapping...');
    const validMapping = validateMapping(mapping, headers);
    console.log(`✅ Mapping validato: ${Object.keys(validMapping).length} campi mappati`);

    // Prepara la query di inserimento
    await updateImportProgress(fileId, 20, 'Preparazione query...');
    const insertQuery = prepareInsertQuery(validMapping);
    console.log(`✅ Query preparata: ${insertQuery}`);

    // Inizia l'importazione
    await updateImportProgress(fileId, 25, 'Inizio importazione dati...');
    let importedRows = 0;
    const errors: string[] = [];
    const batchSize = 1000; // Aumentato per velocità ottimale
    const totalBatches = Math.ceil(totalRows / batchSize);

    console.log(`📊 Inizio importazione: ${totalRows} righe in ${totalBatches} batch da ${batchSize} righe`);

    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      const batchProgress = 25 + ((i / totalRows) * 65); // 25% - 90%
      
      await updateImportProgress(fileId, batchProgress, `Importazione batch ${currentBatch}/${totalBatches} (${batch.length} righe)...`);

      try {
        // Verifica e riconnetta la connessione prima di ogni batch
        connection = await ensureConnection(connection);
        
        const batchStartTime = Date.now();
        const batchResults = await processBatch(connection, batch, headers, validMapping, insertQuery, originalName);
        const batchDuration = Date.now() - batchStartTime;
        
        importedRows += batchResults.imported;
        errors.push(...batchResults.errors);
        
        console.log(`📦 Batch ${currentBatch}/${totalBatches}: ${batchResults.imported}/${batch.length} righe importate in ${batchDuration}ms`);
        
        // Pausa minima tra batch per stabilità
        if (currentBatch < totalBatches) {
          console.log(`⏸️ Pausa 50ms prima del prossimo batch...`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (batchError) {
        console.error(`❌ Errore nel batch ${currentBatch}:`, batchError);
        errors.push(`Batch ${currentBatch}: ${batchError instanceof Error ? batchError.message : 'Errore sconosciuto'}`);
        
        // Continua con il prossimo batch anche se questo fallisce
        console.log(`⚠️ Continuo con il prossimo batch...`);
      }
    }

    // Completamento
    const duration = Math.round((Date.now() - startTime) / 1000);
    await updateImportProgress(fileId, 100, 'Importazione completata', true, {
      success: errors.length === 0,
      totalRows,
      importedRows,
      errors: errors.slice(0, 100), // Limita a 100 errori
      sessionId: fileId,
      duration
    });

    // Cancella il timeout
    clearTimeout(timeoutId);
    
    // NON pulire immediatamente il progresso - lascialo per il frontend
    // Il progresso verrà pulito automaticamente dal database dopo 1 ora
    console.log(`✅ Importazione completata: ${importedRows}/${totalRows} righe importate in ${duration}s`);
    console.log(`📋 Progresso mantenuto nel database per il frontend: ${fileId}`);

  } catch (error) {
    console.error('❌ Errore durante l\'importazione:', error);
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    await updateImportProgress(fileId, 100, 'Importazione fallita', true, {
      success: false,
      totalRows: 0,
      importedRows: 0,
      errors: [error instanceof Error ? error.message : 'Errore sconosciuto'],
      sessionId: fileId,
      duration
    });

    // Cancella il timeout anche in caso di errore
    clearTimeout(timeoutId);
    
    // NON pulire immediatamente il progresso anche in caso di errore
    // Il progresso verrà pulito quando il frontend lo leggerà
    console.log(`❌ Importazione fallita per ${fileId}, progresso mantenuto per il frontend`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

function validateMapping(mapping: Record<string, string>, headers: string[]): Record<string, string> {
  const validMapping: Record<string, string> = {};
  
  Object.entries(mapping).forEach(([excelHeader, dbField]) => {
    if (headers.includes(excelHeader) && dbField && dbField !== 'skip') {
      validMapping[excelHeader] = dbField;
    }
  });
  
  return validMapping;
}

function prepareInsertQuery(mapping: Record<string, string>): string {
  const fields = ['source_name']; // Solo source_name è automatico, mese e settimana sono calcolati dal DB
  const values = ['?'];
  
  // Aggiungi campi mappati
  Object.values(mapping).forEach(field => {
    if (field !== 'auto_filename' && field !== 'auto_calculated' && field !== 'auto_current_date') {
      fields.push(`\`${field}\``); // Raccoglie i nomi dei campi tra backtick per evitare conflitti con parole riservate
      values.push('?');
    }
  });
  
  return `INSERT INTO fatt_delivery (${fields.join(', ')}) VALUES (${values.join(', ')})`;
}

async function processBatch(
  connection: mysql.Connection, 
  batch: (string | number | null)[][], 
  headers: string[], 
  mapping: Record<string, string>, 
  insertQuery: string,
  originalName?: string
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  
  console.log(`🔍 Processando batch di ${batch.length} righe`);
  
  // Prepara tutte le righe del batch
  const batchValues: any[][] = [];
  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    try {
      const values = prepareRowValues(row, headers, mapping, originalName);
      batchValues.push(values);
    } catch (error) {
      const rowNum = i + 1;
      const errorMsg = `Riga ${rowNum}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`;
      console.error(`❌ Errore preparazione riga ${rowNum}:`, error);
      errors.push(errorMsg);
    }
  }
  
  // Inserisci le righe in batch multipli per velocità ottimale
  if (batchValues.length > 0) {
    try {
      // Verifica e riconnetta la connessione se necessario
      connection = await ensureConnection(connection);
      
      // Usa INSERT multipli per velocità massima
      const multiInsertQuery = insertQuery.replace('VALUES (?)', `VALUES ${batchValues.map(() => '(?)').join(', ')}`);
      const flatValues = batchValues.flat();
      
      await connection.execute(multiInsertQuery, flatValues);
      imported = batchValues.length;
      
      console.log(`✅ Batch completato: ${imported}/${batch.length} righe importate in un singolo INSERT`);
    } catch (error) {
      console.error(`❌ Errore INSERT multiplo, fallback a inserimenti singoli:`, error);
      
      // Fallback a inserimenti singoli se il batch fallisce
      for (let i = 0; i < batchValues.length; i++) {
        try {
          // Verifica e riconnetta la connessione per ogni riga nel fallback
          connection = await ensureConnection(connection);
          await connection.execute(insertQuery, batchValues[i]);
          imported++;
        } catch (singleError) {
          const rowNum = i + 1;
          const errorMsg = `Riga ${rowNum}: ${singleError instanceof Error ? singleError.message : 'Errore sconosciuto'}`;
          console.error(`❌ Errore inserimento riga ${rowNum}:`, singleError);
          errors.push(errorMsg);
        }
      }
      
      console.log(`✅ Batch completato (fallback): ${imported}/${batch.length} righe importate, ${errors.length} errori`);
    }
  }
  
  return { imported, errors };
}

function prepareRowValues(row: (string | number | null)[], headers: string[], mapping: Record<string, string>, originalName?: string): any[] {
  const values: any[] = [];
  
  // source_name (nome file originale)
  values.push(originalName || 'import_delivery.xlsx');
  
  // Campi mappati (mese e settimana sono calcolati automaticamente dal database)
  Object.entries(mapping).forEach(([excelHeader, dbField]) => {
    if (dbField === 'auto_filename' || dbField === 'auto_calculated' || dbField === 'auto_current_date') {
      return; // Saltato
    }
    
    const headerIndex = headers.indexOf(excelHeader);
    if (headerIndex >= 0) {
      let value = row[headerIndex];
      
      // Conversione tipi
      if (dbField === 'data_mov_merce' && value !== undefined && value !== null && value !== '') {
        value = convertExcelDate(value) as any;
      } else if (['cod_vettore', 'colli', 'compenso', 'tariffa', 'tariffa_vuoti', 'tr_cons', 'tot_compenso'].includes(dbField)) {
        value = (value !== undefined && value !== null && value !== '') ? Number(value) : null;
      }
      
      // Converti undefined in null per MySQL
      values.push(value === undefined ? null : value);
    } else {
      values.push(null);
    }
  });
  
  return values;
}

function convertExcelDate(value: any): Date | null {
  if (!value) return null;
  
  try {
    if (typeof value === 'number') {
      // Excel date (numero di giorni dal 1 gennaio 1900)
      return new Date((value - 25569) * 86400 * 1000);
    } else if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  } catch {
    return null;
  }
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}

