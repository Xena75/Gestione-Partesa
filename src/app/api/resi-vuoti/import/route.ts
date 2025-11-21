import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  charset: 'utf8mb4'
};

// Funzione per convertire seriale Excel in data SQL
function convertExcelDateToSQL(excelSerial: number): string | null {
  if (!excelSerial || isNaN(excelSerial)) return null;
  
  // Excel conta i giorni dal 1 gennaio 1900, ma ha un bug: considera il 1900 come anno bisestile
  // Quindi sottraiamo 2 giorni invece di 1
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (excelSerial - 2) * 24 * 60 * 60 * 1000);
  
  // Verifica che la data sia valida
  if (isNaN(jsDate.getTime())) return null;
  
  // Formato SQL DATE: YYYY-MM-DD
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file fornito' },
        { status: 400 }
      );
    }

    // Verifica tipo file
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo di file non supportato. Usa file Excel (.xlsx o .xls)' },
        { status: 400 }
      );
    }

    console.log('📄 Inizio import file:', file.name);

    // Leggi il file Excel
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Usa il primo foglio
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length <= 1) {
      return NextResponse.json(
        { error: 'Il file Excel non contiene dati validi' },
        { status: 400 }
      );
    }

    const headers = data[0] as string[];
    const rows = data.slice(1) as any[];
    
    console.log(`📊 Righe da importare: ${rows.length}`);

    // Connessione al database
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    let imported = 0;
    let errors: string[] = [];
    const batchSize = 100;

    // Processa le righe in batch
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values: any[] = [];

      for (const row of batch) {
        try {
          // Mappa le colonne del file Excel
          const riferimento = row[headers.indexOf('Riferimento')] || null;
          const dataRifDdtRaw = row[headers.indexOf('Data rif/ddt')];
          const ddt = row[headers.indexOf('ddt')] ? String(row[headers.indexOf('ddt')]) : null;
          const codCliente = row[headers.indexOf('Cod_Cliente')] ? String(row[headers.indexOf('Cod_Cliente')]) : null;
          const vettore = row[headers.indexOf('VETTORE')] ? String(row[headers.indexOf('VETTORE')]) : null;
          const codProdRaw = row[headers.indexOf('Cod. Prod.')] ? String(row[headers.indexOf('Cod. Prod.')]) : null;
          const codProd = codProdRaw ? codProdRaw.toUpperCase().trim() : null;
          const colli = row[headers.indexOf('Colli')] ? parseInt(String(row[headers.indexOf('Colli')])) : null;
          const dataRitiroRaw = row[headers.indexOf('Data Ritiro')];

          // Validazione campi obbligatori
          if (!codCliente || !codProd || colli === null || colli === undefined) {
            errors.push(`Riga ${i + 1}: Campi obbligatori mancanti (Cod_Cliente, Cod_Prod, Colli)`);
            continue;
          }

          // Converti date da seriale Excel
          const dataRifDdt = dataRifDdtRaw ? convertExcelDateToSQL(Number(dataRifDdtRaw)) : null;
          const dataRitiro = dataRitiroRaw ? convertExcelDateToSQL(Number(dataRitiroRaw)) : null;

          if (!dataRifDdt) {
            errors.push(`Riga ${i + 1}: Data rif/ddt non valida`);
            continue;
          }

          // Recupera dati da fatt_delivery per Cod_Cliente (DISTINCT)
          // Nota: div è una parola riservata, quindi va quotata con backtick
          const [clienteRows] = await connection.execute(
            `SELECT DISTINCT \`div\`, classe_tariffa, ragione_sociale 
             FROM fatt_delivery 
             WHERE cod_cliente = ? 
             LIMIT 1`,
            [codCliente]
          ) as [any[], any];

          if (!clienteRows || clienteRows.length === 0) {
            errors.push(`Riga ${i + 1}: Cliente ${codCliente} non trovato in fatt_delivery`);
            continue;
          }

          const div = clienteRows[0]['div'];
          const classe_tariffa = clienteRows[0].classe_tariffa;
          const ragione_sociale = clienteRows[0].ragione_sociale || null;

          // Recupera dati da fatt_delivery per Cod_Prod (DISTINCT)
          const [prodRows] = await connection.execute(
            `SELECT DISTINCT classe_prod, descr_articolo 
             FROM fatt_delivery 
             WHERE cod_articolo = ? 
             LIMIT 1`,
            [codProd]
          ) as [any[], any];

          if (!prodRows || prodRows.length === 0) {
            errors.push(`Riga ${i + 1}: Prodotto ${codProd} non trovato in fatt_delivery`);
            continue;
          }

          const classe_prod = prodRows[0].classe_prod;
          const descr_articolo = prodRows[0].descr_articolo || null;

          // Calcola ID_TARIFFA
          const idTariffa = `${div}-${classe_tariffa}-${classe_prod}`;

          // Recupera Deposito da tab_deposito
          // Nota: DIV è una parola riservata, quindi va quotata con backtick
          const [depositoRows] = await connection.execute(
            `SELECT Deposito 
             FROM tab_deposito 
             WHERE \`DIV\` = ? 
             LIMIT 1`,
            [div]
          ) as [any[], any];

          const deposito = depositoRows && depositoRows.length > 0 ? depositoRows[0].Deposito : null;

          // Recupera Tariffa da tab_tariffe
          const [tariffaRows] = await connection.execute(
            `SELECT Tariffa 
             FROM tab_tariffe 
             WHERE ID_Fatt = ? 
             LIMIT 1`,
            [idTariffa]
          ) as [any[], any];

          const tariffa = tariffaRows && tariffaRows.length > 0 ? parseFloat(tariffaRows[0].Tariffa) : null;
          
          // Calcola Totale_compenso
          const totaleCompenso = tariffa !== null && !isNaN(tariffa) ? colli * tariffa : null;

          // Prepara valori per inserimento
          values.push([
            riferimento,
            dataRifDdt,
            ddt,
            codCliente,
            ragione_sociale,
            vettore,
            codProd,
            descr_articolo,
            deposito,
            colli,
            dataRitiro,
            idTariffa,
            tariffa,
            totaleCompenso
          ]);

        } catch (error: any) {
          errors.push(`Riga ${i + 1}: ${error.message}`);
          console.error(`Errore riga ${i + 1}:`, error);
        }
      }

      // Inserisci batch
      if (values.length > 0) {
        await connection.query(
          `INSERT INTO resi_vuoti_non_fatturati 
           (Riferimento, Data_rif_ddt, ddt, Cod_Cliente, ragione_sociale, VETTORE, Cod_Prod, descr_articolo, Deposito, Colli, Data_Ritiro, ID_TARIFFA, Tariffa, Totale_compenso)
           VALUES ?`,
          [values]
        );
        imported += values.length;
        console.log(`✅ Importate ${imported} righe su ${rows.length}`);
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      imported,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Errore durante l\'import:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'import', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

