import { NextRequest, NextResponse } from 'next/server';
import { importLeaveBalanceFromExcel } from '@/lib/db-employees';

export async function POST(request: NextRequest) {
  try {
    console.log('API import-leave-balance - Inizio elaborazione');

    // Verifica che sia stato inviato un file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('API import-leave-balance - Nessun file ricevuto');
      return NextResponse.json({
        success: false,
        error: 'Nessun file ricevuto'
      }, { status: 400 });
    }

    // Verifica che sia un file Excel
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // fallback per alcuni browser
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      console.log(`API import-leave-balance - Tipo file non valido: ${file.type}, nome: ${file.name}`);
      return NextResponse.json({
        success: false,
        error: 'Il file deve essere in formato Excel (.xlsx o .xls)'
      }, { status: 400 });
    }

    console.log(`API import-leave-balance - File ricevuto: ${file.name}, dimensione: ${file.size} bytes, tipo: ${file.type}`);

    // Converti il file in buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('API import-leave-balance - Inizio elaborazione Excel');

    // Chiama la funzione di import
    const result = await importLeaveBalanceFromExcel(buffer);

    console.log(`API import-leave-balance - Elaborazione completata. Successo: ${result.success}, Righe totali: ${result.totalRows}, Import riusciti: ${result.successfulImports}`);

    if (result.errors.length > 0) {
      console.log('API import-leave-balance - Errori durante l\'elaborazione:', result.errors);
    }

    // Restituisci il risultato
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Import completato con successo. ${result.successfulImports} su ${result.totalRows} righe elaborate.`
        : 'Import fallito. Controlla gli errori per i dettagli.',
      data: {
        totalRows: result.totalRows,
        successfulImports: result.successfulImports,
        errors: result.errors,
        details: result.details
      }
    }, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('API import-leave-balance - Errore generale:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto durante l\'import';
    
    return NextResponse.json({
      success: false,
      error: `Errore durante l'elaborazione del file: ${errorMessage}`
    }, { status: 500 });
  }
}

// Gestisci anche le richieste GET per fornire informazioni sull'endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/employees/import-leave-balance',
    method: 'POST',
    description: 'Endpoint per l\'import di saldi ferie da file Excel',
    requiredFields: {
      file: 'File Excel (.xlsx o .xls) con colonne: ID, Anno, Mese, Ferie-Residue, EX FEST-F-Residue, ROL-R-Residue'
    },
    response: {
      success: 'boolean',
      message: 'string',
      data: {
        totalRows: 'number',
        successfulImports: 'number',
        errors: 'string[]',
        details: 'object[]'
      }
    }
  });
}