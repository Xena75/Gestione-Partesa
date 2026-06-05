import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera tutti i veicoli
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const connection = await mysql.createConnection(dbConfig);

    const query = `
      SELECT 
        v.id,
        v.targa,
        v.marca,
        v.modello,
        v.proprieta,
        v.portata,
        v.n_palt,
        v.tipo_patente,
        v.pallet_kg,
        v.km_ultimo_tagliando,
        v.data_ultimo_tagliando,
        v.data_ultima_revisione,
        v.data_revisione_tachigrafo,
        v.active,
        v.note,
        v.createdAt,
        v.updatedAt,
        COALESCE(COUNT(vd.id), 0) as total_documents
      FROM vehicles v
      LEFT JOIN vehicle_documents vd ON v.id = vd.vehicle_id
      GROUP BY v.id, v.targa, v.marca, v.modello, v.proprieta, v.portata, v.n_palt, v.tipo_patente, v.pallet_kg, v.km_ultimo_tagliando, v.data_ultimo_tagliando, v.data_ultima_revisione, v.data_revisione_tachigrafo, v.active, v.note, v.createdAt, v.updatedAt
      ORDER BY v.targa ASC
    `;

    const [rows] = await connection.execute(query);
    await connection.end();

    return NextResponse.json({ 
      success: true, 
      vehicles: rows 
    });
  } catch (error) {
    console.error('Errore nel recupero veicoli:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei veicoli' },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo veicolo
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const body = await request.json();
    const {
      targa,
      marca,
      modello,
      proprieta,
      portata,
      n_palt,
      tipo_patente,
      pallet_kg,
      km_ultimo_tagliando,
      data_ultimo_tagliando,
      data_ultima_revisione,
      data_revisione_tachigrafo
    } = body;

    // Validazione campi obbligatori
    if (!targa || !marca || !modello || !proprieta || !portata || !n_palt || !tipo_patente || !pallet_kg) {
      return NextResponse.json(
        { success: false, error: 'Tutti i campi obbligatori devono essere compilati' },
        { status: 400 }
      );
    }

    const normalizedTarga = String(targa).trim().toUpperCase();

    const connection = await mysql.createConnection(dbConfig);

    // id è la chiave usata nei join con travels.targaMezzoId: deve coincidere con la targa normalizzata
    const checkQuery = 'SELECT id FROM vehicles WHERE targa = ? OR id = ?';
    const [existingVehicle] = await connection.execute(checkQuery, [normalizedTarga, normalizedTarga]);

    if (Array.isArray(existingVehicle) && existingVehicle.length > 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Un veicolo con questa targa esiste già' },
        { status: 400 }
      );
    }

    // Inserimento nuovo veicolo
    const insertQuery = `
      INSERT INTO vehicles (
        id,
        targa,
        marca,
        modello,
        proprieta,
        portata,
        n_palt,
        tipo_patente,
        pallet_kg,
        km_ultimo_tagliando,
        data_ultimo_tagliando,
        data_ultima_revisione,
        data_revisione_tachigrafo,
        active,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    await connection.execute(insertQuery, [
      normalizedTarga,
      normalizedTarga,
      marca,
      modello,
      proprieta,
      portata,
      n_palt,
      tipo_patente,
      pallet_kg,
      km_ultimo_tagliando || null,
      data_ultimo_tagliando || null,
      data_ultima_revisione || null,
      data_revisione_tachigrafo || null
    ]);

    await connection.end();

    return NextResponse.json({ 
      success: true, 
      message: 'Veicolo creato con successo',
      vehicleId: normalizedTarga
    });

  } catch (error) {
    console.error('Errore nella creazione del veicolo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella creazione del veicolo' },
      { status: 500 }
    );
  }
}