import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

// Configurazione database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_PORT || '3306'),
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  let connection;
  
  try {
    const resolvedParams = await params;
    const travelId = decodeURIComponent(resolvedParams.id);
    const imageId = resolvedParams.imageId;

    console.log('DELETE Image - Travel ID:', travelId, 'Image ID:', imageId);

    // Connessione al database
    connection = await mysql.createConnection(dbConfig);

    // Recupera i dettagli dell'immagine prima di eliminarla
    const [imageRows] = await connection.execute(
      'SELECT * FROM travel_images WHERE id = ? AND travelId = ?',
      [imageId, travelId]
    );

    const images = imageRows as any[];
    if (images.length === 0) {
      return NextResponse.json(
        { error: 'Immagine non trovata' },
        { status: 404 }
      );
    }

    const image = images[0];
    console.log('Immagine da eliminare:', image);

    // Elimina l'immagine dal database
    const [deleteResult] = await connection.execute(
      'DELETE FROM travel_images WHERE id = ? AND travelId = ?',
      [imageId, travelId]
    );

    console.log('Risultato eliminazione database:', deleteResult);

    // Elimina il file fisico se esiste
    if (image.url && !image.url.startsWith('http')) {
      // File locale - elimina dal filesystem
      try {
        const filePath = path.join(process.cwd(), 'public', image.url);
        await fs.unlink(filePath);
        console.log('File eliminato:', filePath);
      } catch (fileError) {
        console.warn('Errore eliminazione file:', fileError);
        // Non bloccare l'operazione se il file non esiste
      }
    } else if (image.url && image.url.startsWith('http')) {
      // File su Vercel Blob - qui potresti aggiungere la logica per eliminare da Vercel Blob
      console.log('File su Vercel Blob, eliminazione non implementata:', image.url);
    }

    return NextResponse.json({
      success: true,
      message: 'Immagine eliminata con successo'
    });

  } catch (error) {
    console.error('Errore eliminazione immagine:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante l\'eliminazione dell\'immagine' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}