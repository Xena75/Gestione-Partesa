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

// POST: Inserimento manuale
export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
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

    const {
      Riferimento,
      Data_rif_ddt,
      ddt,
      Cod_Cliente,
      VETTORE,
      Cod_Prod: Cod_ProdRaw,
      Colli,
      Data_Ritiro
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

    // Recupera dati da fatt_delivery per Cod_Prod (DISTINCT)
    const [prodRows] = await connection.execute(
      `SELECT DISTINCT classe_prod, descr_articolo 
       FROM fatt_delivery 
       WHERE cod_articolo = ? 
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

    // Recupera Deposito da tab_deposito
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
    const totaleCompenso = tariffa !== null && !isNaN(tariffa) ? Colli * tariffa : null;

    // Inserisci nella tabella
    const [result] = await connection.execute(
      `INSERT INTO resi_vuoti_non_fatturati 
       (Riferimento, Data_rif_ddt, ddt, Cod_Cliente, ragione_sociale, VETTORE, Cod_Prod, descr_articolo, Deposito, Colli, Data_Ritiro, ID_TARIFFA, Tariffa, Totale_compenso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Riferimento || null,
        Data_rif_ddt,
        ddt || null,
        Cod_Cliente,
        ragione_sociale,
        VETTORE || null,
        Cod_Prod,
        descr_articolo,
        deposito,
        Colli,
        Data_Ritiro || null,
        idTariffa,
        tariffa,
        totaleCompenso
      ]
    ) as [mysql.ResultSetHeader, any];

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'Record inserito con successo',
      id: result.insertId,
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
    console.error('Errore inserimento resi vuoti:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'inserimento' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// GET: Lista record (per visualizzazione)
export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';

    // Filtri
    const riferimento = searchParams.get('riferimento');
    const ddt = searchParams.get('ddt');
    const codCliente = searchParams.get('codCliente');
    const cliente = searchParams.get('cliente');
    const codProd = searchParams.get('codProd');
    const deposito = searchParams.get('deposito');
    const vettore = searchParams.get('vettore');
    const dataDa = searchParams.get('dataDa');
    const dataA = searchParams.get('dataA');

    connection = await mysql.createConnection(dbConfig);

    // Costruisci WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (riferimento) {
      whereConditions.push('Riferimento LIKE ?');
      queryParams.push(`%${riferimento}%`);
    }
    if (ddt) {
      whereConditions.push('ddt LIKE ?');
      queryParams.push(`%${ddt}%`);
    }
    if (codCliente) {
      whereConditions.push('Cod_Cliente LIKE ?');
      queryParams.push(`%${codCliente}%`);
    }
    if (cliente) {
      whereConditions.push('ragione_sociale LIKE ?');
      queryParams.push(`%${cliente}%`);
    }
    if (codProd) {
      whereConditions.push('Cod_Prod LIKE ?');
      queryParams.push(`%${codProd}%`);
    }
    if (deposito) {
      whereConditions.push('Deposito LIKE ?');
      queryParams.push(`%${deposito}%`);
    }
    if (vettore) {
      whereConditions.push('VETTORE LIKE ?');
      queryParams.push(`%${vettore}%`);
    }
    if (dataDa) {
      whereConditions.push('Data_rif_ddt >= ?');
      queryParams.push(dataDa);
    }
    if (dataA) {
      whereConditions.push('Data_rif_ddt <= ?');
      queryParams.push(dataA);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Valida sortBy per sicurezza
    const allowedSortFields = [
      'id', 'Riferimento', 'Data_rif_ddt', 'ddt', 'Cod_Cliente', 
      'ragione_sociale', 'VETTORE', 'Cod_Prod', 'descr_articolo', 
      'Deposito', 'Colli', 'Data_Ritiro', 'ID_TARIFFA', 'Tariffa',
      'Totale_compenso', 'created_at', 'updated_at'
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Conta totale record con filtri
    const countQuery = `SELECT COUNT(*) as total FROM resi_vuoti_non_fatturati ${whereClause}`;
    const [countResult] = await connection.execute(
      countQuery,
      queryParams
    ) as [any[], any];
    const total = countResult[0].total;

    // Calcola statistiche totali con filtri
    const statsQuery = `
      SELECT 
        SUM(Colli) as totale_colli,
        SUM(COALESCE(Totale_compenso, 0)) as totale_compenso
      FROM resi_vuoti_non_fatturati 
      ${whereClause}
    `;
    const [statsResult] = await connection.execute(
      statsQuery,
      queryParams
    ) as [any[], any];
    
    const stats = {
      totale_colli: statsResult[0].totale_colli || 0,
      totale_compenso: statsResult[0].totale_compenso || 0
    };

    // Recupera record paginati con filtri e ordinamento
    const dataQuery = `
      SELECT * FROM resi_vuoti_non_fatturati 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await connection.execute(
      dataQuery,
      [...queryParams, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: stats
    });

  } catch (error: any) {
    console.error('Errore recupero resi vuoti:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dei dati' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

