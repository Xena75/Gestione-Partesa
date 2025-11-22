import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  charset: 'utf8mb4'
};

// GET: Lookup cliente o prodotto
export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'cliente' o 'prodotto'
    const code = searchParams.get('code')?.trim();

    if (!type || !code) {
      return NextResponse.json(
        { error: 'Parametri mancanti: type (cliente/prodotto) e code sono richiesti' },
        { status: 400 }
      );
    }

    connection = await mysql.createConnection(dbConfig);

    if (type === 'cliente') {
      // Lookup cliente
      const [rows] = await connection.execute(
        `SELECT DISTINCT cod_cliente, ragione_sociale, \`div\`, classe_tariffa 
         FROM fatt_delivery 
         WHERE cod_cliente = ? 
         LIMIT 1`,
        [code]
      ) as [any[], any];

      if (!rows || rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Cliente non trovato'
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          cod_cliente: rows[0].cod_cliente,
          ragione_sociale: rows[0].ragione_sociale,
          div: rows[0]['div'],
          classe_tariffa: rows[0].classe_tariffa
        }
      });

    } else if (type === 'prodotto') {
      // Lookup prodotto - gestisce spazi finali nel database e preferisce versione senza spazi
      // Pulisci il codice ricevuto da eventuali spazi e converti in maiuscolo
      const codeClean = code.trim().toUpperCase();
      
      console.log(`[Lookup Prodotto API] Codice ricevuto: "${code}" (lunghezza: ${code.length}), pulito: "${codeClean}"`);
      
      // Query migliorata: cerca tutte le varianti e preferisce quella senza spazi
      // Usa GROUP BY con MIN per ottenere la versione più corta (senza spazi) quando ci sono duplicati
      const [rows] = await connection.execute(
        `SELECT 
           TRIM(cod_articolo) as cod_articolo,
           MAX(descr_articolo) as descr_articolo,
           MAX(classe_prod) as classe_prod,
           MIN(LENGTH(cod_articolo)) as min_length
         FROM fatt_delivery 
         WHERE TRIM(UPPER(cod_articolo)) = ?
         GROUP BY TRIM(cod_articolo)
         ORDER BY min_length ASC
         LIMIT 1`,
        [codeClean]
      ) as [any[], any];

      console.log(`[Lookup Prodotto API] Query esatta (TRIM+UPPER=): ${rows.length} risultati`);

      // Se non trovato con TRIM, prova con LIKE come fallback
      let resultRows = rows;
      if (!resultRows || resultRows.length === 0) {
        console.log(`[Lookup Prodotto API] Nessun risultato con query esatta, provo LIKE fallback...`);
        [resultRows] = await connection.execute(
          `SELECT 
             TRIM(cod_articolo) as cod_articolo,
             MAX(descr_articolo) as descr_articolo,
             MAX(classe_prod) as classe_prod,
             MIN(LENGTH(cod_articolo)) as min_length
           FROM fatt_delivery 
           WHERE UPPER(cod_articolo) LIKE ?
           GROUP BY TRIM(cod_articolo)
           ORDER BY min_length ASC
           LIMIT 1`,
          [`${codeClean}%`]
        ) as [any[], any];
        
        console.log(`[Lookup Prodotto API] Query LIKE fallback: ${resultRows.length} risultati`);
      }

      if (!resultRows || resultRows.length === 0) {
        console.log(`[Lookup Prodotto API] ❌ Prodotto "${codeClean}" non trovato`);
        return NextResponse.json({
          success: false,
          message: 'Prodotto non trovato'
        });
      }

      const result = resultRows[0];
      console.log(`[Lookup Prodotto API] ✅ Prodotto trovato:`);
      console.log(`   cod_articolo: "${result.cod_articolo}"`);
      console.log(`   descr_articolo: "${result.descr_articolo?.substring(0, 60)}..."`);
      console.log(`   classe_prod: "${result.classe_prod}"`);

      const responseData = {
        success: true,
        data: {
          cod_articolo: result.cod_articolo?.trim() || result.cod_articolo,
          descr_articolo: result.descr_articolo?.trim() || result.descr_articolo || '',
          classe_prod: result.classe_prod?.trim() || result.classe_prod
        }
      };
      
      console.log(`[Lookup Prodotto API] Risposta inviata:`, {
        cod_articolo: responseData.data.cod_articolo,
        descr_articolo: responseData.data.descr_articolo?.substring(0, 60),
        classe_prod: responseData.data.classe_prod
      });

      return NextResponse.json(responseData);

    } else {
      return NextResponse.json(
        { error: 'Tipo non valido. Usa "cliente" o "prodotto"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Errore lookup:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il lookup' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

