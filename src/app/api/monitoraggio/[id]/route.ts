// src/app/api/monitoraggio/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';
// Import rimossi perché non utilizzati



// GET: Ottiene un singolo viaggio con le sue immagini
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Query per ottenere il viaggio con le sue immagini
    const [viaggi] = await pool.execute(`
      SELECT t.*, 
             ti.id as imageId, ti.filename, ti.url, ti.type, ti.size, ti.mimeType, 
             ti.createdAt as imageCreatedAt, ti.updatedAt as imageUpdatedAt
      FROM travels t
      LEFT JOIN travel_images ti ON t.id = ti.travelid
      WHERE t.id = ?
      ORDER BY ti.createdAt DESC
    `, [id]) as [any[], any];

    if (!viaggi || viaggi.length === 0) {
      return NextResponse.json(
        { error: 'Viaggio non trovato' },
        { status: 404 }
      );
    }

    // Riorganizza i dati per separare il viaggio dalle immagini
    const viaggioData = {
      id: viaggi[0].id,
      deposito: viaggi[0].deposito,
      numeroViaggio: viaggi[0].numeroViaggio,
      nominativoId: viaggi[0].nominativoId,
      affiancatoDaId: viaggi[0].affiancatoDaId,
      totaleColli: viaggi[0].totaleColli,
      dataOraInizioViaggio: viaggi[0].dataOraInizioViaggio,
      dataOraFineViaggio: viaggi[0].dataOraFineViaggio,
      targaMezzoId: viaggi[0].targaMezzoId,
      kmIniziali: viaggi[0].kmIniziali,
      kmFinali: viaggi[0].kmFinali,
      kmAlRifornimento: viaggi[0].kmAlRifornimento,
      litriRiforniti: viaggi[0].litriRiforniti,
      euroLitro: viaggi[0].euroLitro,
      haiEffettuatoRitiri: viaggi[0].haiEffettuatoRitiri,
      kmEffettivi: viaggi[0].kmEffettivi,
      oreEffettive: viaggi[0].oreEffettive,
      updatedAt: viaggi[0].updatedAt,
      createdAt: viaggi[0].createdAt
    };

    // Estrai le immagini
    const images = viaggi
      .filter(row => row.imageId) // Solo righe con immagini
      .map(row => ({
        id: row.imageId,
        travelid: row.id,
        filename: row.filename,
        url: row.url,
        type: row.type,
        size: row.size,
        mimeType: row.mimeType,
        createdAt: row.imageCreatedAt,
        updatedAt: row.imageUpdatedAt
      }));

    const viaggio = {
      ...viaggioData,
      images
    };

    return NextResponse.json({
      success: true,
      viaggio
    });

  } catch (error) {
    console.error('❌ Errore nel recupero del viaggio:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT: Aggiorna un viaggio esistente
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    console.log('🔍 API - Dati ricevuti:', {
      id,
      body,
      deposito: body.deposito,
      numeroViaggio: body.numeroViaggio,
      nominativoId: body.nominativoId
    });
    
    // Validazione campi obbligatori
    const requiredFields = ['numeroViaggio', 'deposito', 'nominativoId'];
    for (const field of requiredFields) {
      console.log(`🔍 Validazione campo ${field}:`, body[field]);
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        console.log(`❌ Campo ${field} non valido:`, body[field]);
        return NextResponse.json(
          { error: `Campo obbligatorio mancante o vuoto: ${field}` },
          { status: 400 }
        );
      }
    }
    
    console.log('✅ Validazione API superata, procedo con l\'aggiornamento');

    // Query di aggiornamento
    const [result] = await pool.execute(`
      UPDATE travels SET
        numeroViaggio = ?,
        deposito = ?,
        nominativoId = ?,
        affiancatoDaId = ?,
        totaleColli = ?,
        dataOraInizioViaggio = ?,
        dataOraFineViaggio = ?,
        targaMezzoId = ?,
        kmIniziali = ?,
        kmFinali = ?,
        kmAlRifornimento = ?,
        litriRiforniti = ?,
        euroLitro = ?,
        haiEffettuatoRitiri = ?,
        updatedAt = NOW()
      WHERE id = ?
    `, [
      body.numeroViaggio,
      body.deposito,
      body.nominativoId,
      body.affiancatoDaId || null,
      body.totaleColli || null,
      body.dataOraInizioViaggio || null,
      body.dataOraFineViaggio || null,
      body.targaMezzoId || null,
      body.kmIniziali || null,
      body.kmFinali || null,
      body.kmAlRifornimento || null,
      body.litriRiforniti || null,
      body.euroLitro || null,
      body.haiEffettuatoRitiri || false,
      id
    ]) as [any, any];

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Viaggio non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Viaggio aggiornato con successo'
    });

  } catch (error) {
    console.error('❌ Errore nell\'aggiornamento del viaggio:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}