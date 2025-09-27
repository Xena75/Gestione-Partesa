import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { del } from '@vercel/blob';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db',
  charset: 'utf8mb4'
};

// DELETE - Elimina un documento specifico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string; id: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate, id } = await params;
    const connection = await mysql.createConnection(dbConfig);

    // Prima recupera l'ID del veicolo dalla targa
    const [vehicleRows] = await connection.execute(
      'SELECT id FROM vehicles WHERE targa = ? AND active = 1',
      [plate]
    );

    if (!Array.isArray(vehicleRows) || vehicleRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    const vehicleId = (vehicleRows[0] as any).id;

    const [documentRows] = await connection.execute(
      `SELECT vd.*, v.targa 
       FROM vehicle_documents vd 
       INNER JOIN vehicles v ON vd.vehicle_id = v.id 
       WHERE vd.id = ? AND v.targa = ?`,
      [id, plate]
    );

    if (!Array.isArray(documentRows) || documentRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    const document = documentRows[0] as any;

    // Elimina il file da Vercel Blob
    try {
      await del(document.file_path);
    } catch (blobError) {
      console.warn('Errore nell\'eliminazione del file da Blob:', blobError);
      // Continua comunque con l'eliminazione dal database
    }

    // Elimina il record dal database
    await connection.execute(
      'DELETE FROM vehicle_documents WHERE id = ?',
      [id]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Documento eliminato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione del documento' },
      { status: 500 }
    );
  }
}

// GET - Recupera un documento specifico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string; id: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate, id } = await params;
    const connection = await mysql.createConnection(dbConfig);

    // Prima recupera l'ID del veicolo dalla targa
    const [vehicleRows] = await connection.execute(
      'SELECT id FROM vehicles WHERE targa = ? AND active = 1',
      [plate]
    );

    if (!Array.isArray(vehicleRows) || vehicleRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    const vehicleId = (vehicleRows[0] as any).id;

    const [documentRows] = await connection.execute(
      `SELECT vd.*, v.targa 
       FROM vehicle_documents vd 
       INNER JOIN vehicles v ON vd.vehicle_id = v.id 
       WHERE vd.id = ? AND v.targa = ?`,
      [id, plate]
    );

    if (!Array.isArray(documentRows) || documentRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    const document = documentRows[0] as any;
    await connection.end();

    return NextResponse.json({
      success: true,
      document: documentRows[0]
    });
  } catch (error) {
    console.error('Errore nel recupero del documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero del documento' },
      { status: 500 }
    );
  }
}