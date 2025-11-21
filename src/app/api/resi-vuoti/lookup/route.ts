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
      // Lookup prodotto - gestisce spazi finali nel database
      // Pulisci il codice ricevuto da eventuali spazi e converti in maiuscolo
      const codeClean = code.trim().toUpperCase();
      
      console.log(`[Lookup Prodotto] Codice ricevuto: "${code}" (lunghezza: ${code.length}), pulito: "${codeClean}"`);
      
      // Prova prima con TRIM e UPPER
      let [rows] = await connection.execute(
        `SELECT DISTINCT cod_articolo, descr_articolo, classe_prod 
         FROM fatt_delivery 
         WHERE TRIM(UPPER(cod_articolo)) = ? 
         LIMIT 1`,
        [codeClean]
      ) as [any[], any];

      console.log(`[Lookup Prodotto] Query TRIM(UPPER): ${rows.length} risultati`);

      // Se non trovato, prova con LIKE (gestisce spazi finali)
      if (!rows || rows.length === 0) {
        [rows] = await connection.execute(
          `SELECT DISTINCT cod_articolo, descr_articolo, classe_prod 
           FROM fatt_delivery 
           WHERE UPPER(cod_articolo) LIKE ? 
           LIMIT 1`,
          [`${codeClean}%`]
        ) as [any[], any];
        
        console.log(`[Lookup Prodotto] Query LIKE fallback: ${rows.length} risultati`);
      }

      if (!rows || rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Prodotto non trovato'
        });
      }

      console.log(`[Lookup Prodotto] Prodotto trovato: cod_articolo="${rows[0].cod_articolo}", descr="${rows[0].descr_articolo?.substring(0, 30)}...", classe_prod="${rows[0].classe_prod}"`);

      return NextResponse.json({
        success: true,
        data: {
          cod_articolo: rows[0].cod_articolo?.trim() || rows[0].cod_articolo,
          descr_articolo: rows[0].descr_articolo?.trim() || rows[0].descr_articolo || '',
          classe_prod: rows[0].classe_prod?.trim() || rows[0].classe_prod
        }
      });

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

