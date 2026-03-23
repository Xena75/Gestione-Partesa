import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2/promise';
import pool from '@/lib/db-gestione';
import { verifyUserAccess } from '@/lib/auth';

// POST: Inserimento batch di più righe prodotto per una bolla
export async function POST(request: NextRequest) {
  let conn: Awaited<ReturnType<typeof pool.getConnection>> | null = null;

  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const body = await request.json();
    
    // Validazione struttura
    if (!body.bolla || !body.righe || !Array.isArray(body.righe) || body.righe.length === 0) {
      return NextResponse.json(
        { error: 'Struttura dati non valida: bolla e righe (array) sono richiesti' },
        { status: 400 }
      );
    }

    const { bolla, righe } = body;

    // Validazione dati bolla
    if (!bolla.Deposito || !bolla.Cod_Cliente || !bolla.Data_rif_ddt) {
      return NextResponse.json(
        { error: 'Campi obbligatori bolla mancanti: Deposito, Cod_Cliente, Data_rif_ddt' },
        { status: 400 }
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Recupera dati cliente una volta per tutte le righe
    const [clienteRows] = await conn.execute(
      `SELECT DISTINCT \`div\`, classe_tariffa, ragione_sociale 
       FROM fatt_delivery 
       WHERE cod_cliente = ? 
       LIMIT 1`,
      [bolla.Cod_Cliente]
    ) as [any[], any];

    if (!clienteRows || clienteRows.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: `Cliente ${bolla.Cod_Cliente} non trovato in fatt_delivery` },
        { status: 400 }
      );
    }

    const div = clienteRows[0]['div'];
    const classe_tariffa = clienteRows[0].classe_tariffa;
    const ragione_sociale = clienteRows[0].ragione_sociale || null;

    // Processa ogni riga prodotto
    const values: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < righe.length; i++) {
      const riga = righe[i];
      const Cod_Prod = String(riga.Cod_Prod).toUpperCase().trim();
      const Colli = parseInt(riga.Colli);

      if (!Cod_Prod || Colli <= 0) {
        errors.push(`Riga ${i + 1}: Cod_Prod e Colli sono obbligatori`);
        continue;
      }

      // Recupera dati prodotto - preferisce versione senza spazi quando ci sono duplicati
      const [prodRows] = await conn.execute(
        `SELECT 
           MAX(classe_prod) as classe_prod,
           MAX(descr_articolo) as descr_articolo
         FROM fatt_delivery 
         WHERE TRIM(UPPER(cod_articolo)) = ?
         GROUP BY TRIM(cod_articolo)
         ORDER BY MIN(LENGTH(cod_articolo)) ASC
         LIMIT 1`,
        [Cod_Prod.toUpperCase()]
      ) as [any[], any];

      if (!prodRows || prodRows.length === 0) {
        errors.push(`Riga ${i + 1}: Prodotto ${Cod_Prod} non trovato in fatt_delivery`);
        continue;
      }

      const classe_prod = prodRows[0].classe_prod;
      const descr_articolo = prodRows[0].descr_articolo || null;

      // Calcola ID_TARIFFA
      const idTariffa = `${div}-${classe_tariffa}-${classe_prod}`;

      // Recupera Tariffa
      const [tariffaRows] = await conn.execute(
        `SELECT Tariffa 
         FROM tab_tariffe 
         WHERE ID_Fatt = ? 
         LIMIT 1`,
        [idTariffa]
      ) as [any[], any];

      const tariffa = tariffaRows && tariffaRows.length > 0 ? parseFloat(tariffaRows[0].Tariffa) : null;
      
      // Calcola Totale_compenso
      const totaleCompenso = tariffa !== null && !isNaN(tariffa) ? Colli * tariffa : null;

      // Prepara valori per inserimento - assicura che Cod_Prod sia sempre pulito (maiuscolo, senza spazi)
      const Cod_Prod_Clean = Cod_Prod.trim().toUpperCase();
      
      values.push([
        bolla.Riferimento || null,
        bolla.Data_rif_ddt,
        bolla.ddt || null,
        bolla.Cod_Cliente,
        ragione_sociale,
        bolla.VETTORE || null,
        Cod_Prod_Clean, // Sempre pulito: maiuscolo e senza spazi
        descr_articolo,
        bolla.Deposito,
        Colli,
        bolla.Data_Ritiro || null,
        idTariffa,
        tariffa,
        totaleCompenso
      ]);
    }

    if (errors.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: 'Errori di validazione', details: errors },
        { status: 400 }
      );
    }

    if (values.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: 'Nessuna riga valida da inserire' },
        { status: 400 }
      );
    }

    // Costruisci la query con placeholder corretti per inserimento multiplo
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = values.flat();
    
    // Inserisci tutte le righe in batch
    const [result] = await conn.execute(
      `INSERT INTO resi_vuoti_non_fatturati 
       (Riferimento, Data_rif_ddt, ddt, Cod_Cliente, ragione_sociale, VETTORE, Cod_Prod, descr_articolo, Deposito, Colli, Data_Ritiro, ID_TARIFFA, Tariffa, Totale_compenso)
       VALUES ${placeholders}`,
      flatValues
    ) as [ResultSetHeader, any];

    await conn.commit();

    return NextResponse.json({
      success: true,
      message: `${values.length} record inseriti con successo`,
      inserted: values.length,
      ids: Array.from({ length: values.length }, (_, i) => result.insertId + i)
    });

  } catch (error: any) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        /* ignore */
      }
    }
    console.error('Errore inserimento batch resi vuoti:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'inserimento' },
      { status: 500 }
    );
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

