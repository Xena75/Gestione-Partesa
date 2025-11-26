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

// PUT: Aggiornamento record esistente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: mysql.Connection | null = null;
  
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID non valido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validazione campi obbligatori
    if (!body.Cod_Cliente || !body.Cod_Prod || body.Colli === undefined || body.Colli === null || !body.Data_rif_ddt) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti: Cod_Cliente, Cod_Prod, Colli, Data_rif_ddt' },
        { status: 400 }
      );
    }

    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    // Verifica che il record esista
    const [existingRows] = await connection.execute(
      `SELECT * FROM resi_vuoti_non_fatturati WHERE id = ?`,
      [id]
    ) as [any[], any];

    if (!existingRows || existingRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Record non trovato' },
        { status: 404 }
      );
    }

    const {
      Riferimento,
      Data_rif_ddt,
      ddt,
      Cod_Cliente,
      VETTORE,
      Cod_Prod: Cod_ProdRaw,
      Colli,
      Data_Ritiro,
      Deposito
    } = body;

    // Converti Cod_Prod in maiuscolo
    const Cod_Prod = Cod_ProdRaw ? String(Cod_ProdRaw).toUpperCase().trim() : null;

    // Recupera dati da fatt_delivery per Cod_Cliente (DISTINCT)
    const [clienteRows] = await connection.execute(
      `SELECT DISTINCT \`div\`, classe_tariffa, ragione_sociale 
       FROM fatt_delivery 
       WHERE cod_cliente = ? 
       LIMIT 1`,
      [Cod_Cliente]
    ) as [any[], any];

    if (!clienteRows || clienteRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: `Cliente ${Cod_Cliente} non trovato in fatt_delivery` },
        { status: 400 }
      );
    }

    const div = clienteRows[0]['div'];
    const classe_tariffa = clienteRows[0].classe_tariffa;
    const ragione_sociale = clienteRows[0].ragione_sociale || null;

    // Recupera dati da fatt_delivery per Cod_Prod - preferisce versione senza spazi quando ci sono duplicati
    if (!Cod_Prod) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Cod_Prod è obbligatorio' },
        { status: 400 }
      );
    }

    const [prodRows] = await connection.execute(
      `SELECT 
         MAX(classe_prod) as classe_prod,
         MAX(descr_articolo) as descr_articolo
       FROM fatt_delivery 
       WHERE TRIM(UPPER(cod_articolo)) = ?
       GROUP BY TRIM(cod_articolo)
       ORDER BY MIN(LENGTH(cod_articolo)) ASC
       LIMIT 1`,
      [Cod_Prod]
    ) as [any[], any];

    if (!prodRows || prodRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: `Prodotto ${Cod_Prod} non trovato in fatt_delivery` },
        { status: 400 }
      );
    }

    const classe_prod = prodRows[0].classe_prod;
    const descr_articolo = prodRows[0].descr_articolo || null;

    // Calcola ID_TARIFFA
    const idTariffa = `${div}-${classe_tariffa}-${classe_prod}`;

    // Se Deposito è fornito nel body, usalo, altrimenti recuperalo da tab_deposito
    let deposito = Deposito || null;
    if (!deposito) {
      const [depositoRows] = await connection.execute(
        `SELECT Deposito 
         FROM tab_deposito 
         WHERE \`DIV\` = ? 
         LIMIT 1`,
        [div]
      ) as [any[], any];

      deposito = depositoRows && depositoRows.length > 0 ? depositoRows[0].Deposito : null;
    }

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
    const totaleCompenso = tariffa !== null && !isNaN(tariffa) ? Colli * tariffa : null;

    // Assicura che Cod_Prod sia sempre pulito (maiuscolo, senza spazi)
    const Cod_Prod_Clean = Cod_Prod ? Cod_Prod.trim().toUpperCase() : null;
    
    // Aggiorna il record
    await connection.execute(
      `UPDATE resi_vuoti_non_fatturati 
       SET Riferimento = ?, 
           Data_rif_ddt = ?, 
           ddt = ?, 
           Cod_Cliente = ?, 
           ragione_sociale = ?, 
           VETTORE = ?, 
           Cod_Prod = ?, 
           descr_articolo = ?, 
           Deposito = ?, 
           Colli = ?, 
           Data_Ritiro = ?, 
           ID_TARIFFA = ?, 
           Tariffa = ?, 
           Totale_compenso = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        Riferimento || null,
        Data_rif_ddt,
        ddt || null,
        Cod_Cliente,
        ragione_sociale,
        VETTORE || null,
        Cod_Prod_Clean,
        descr_articolo,
        deposito,
        Colli,
        Data_Ritiro || null,
        idTariffa,
        tariffa,
        totaleCompenso,
        id
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'Record aggiornato con successo',
      data: {
        ID_TARIFFA: idTariffa,
        Tariffa: tariffa,
        Totale_compenso: totaleCompenso,
        ragione_sociale,
        descr_articolo,
        Deposito: deposito
      }
    });

  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Errore aggiornamento resi vuoti:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'aggiornamento' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

