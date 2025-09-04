import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';

// GET: Recupera i dati di un viaggio specifico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID viaggio richiesto' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM tab_viaggi WHERE Viaggio = ?',
      [id]
    );

    if (!rows || (rows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Viaggio non trovato' },
        { status: 404 }
      );
    }

    const viaggio = (rows as any[])[0];
    return NextResponse.json(viaggio);

  } catch (error) {
    console.error('Errore nel recupero del viaggio:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT: Aggiorna i dati di un viaggio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID viaggio richiesto' },
        { status: 400 }
      );
    }

    // Verifica che il viaggio esista
    const [existingRows] = await pool.query(
      'SELECT Viaggio FROM tab_viaggi WHERE Viaggio = ?',
      [id]
    );

    if (!existingRows || (existingRows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Viaggio non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna tutti i campi della tabella tab_viaggi
    const updateSql = `
      UPDATE tab_viaggi SET
        \`Magazzino di partenza\` = ?,
        \`Data\` = ?,
        \`Nome Trasportatore\` = ?,
        \`Data Inizio\` = ?,
        \`Data Fine\` = ?,
        \`Ore PoD\` = ?,
        \`Tipo_Vettore\` = ?,
        \`Azienda_Vettore\` = ?,
        \`Cognome_Vettore\` = ?,
        \`Nome_Vettore\` = ?,
        \`Nominativo\` = ?,
        \`Ora Inizio\` = ?,
        \`Ora Fine\` = ?,
        \`Ore\` = ?,
        \`Colli\` = ?,
        \`Peso (Kg)\` = ?,
        \`Targa\` = ?,
        \`Tipo Patente\` = ?,
        \`Km\` = ?,
        \`Km Iniziali Viaggio\` = ?,
        \`Km Finali Viaggio\` = ?,
        \`Km Viaggio\` = ?,
        \`Km al Rifornimento\` = ?,
        \`Litri Riforniti\` = ?,
        \`€/lt\` = ?,
        \`Toccate\` = ?,
        \`Ordini\` = ?,
        \`Mese\` = ?,
        \`Trimestre\` = ?,
        \`Sett\` = ?,
        \`Giorno\` = ?,
        \`euro_rifornimento\` = ?
      WHERE Viaggio = ?
    `;

    const values = [
      body['Magazzino di partenza'] || null,
      body['Data'] || null,
      body['Nome Trasportatore'] || null,
      body['Data Inizio'] || null,
      body['Data Fine'] || null,
      body['Ore PoD'] || null,
      body['Tipo_Vettore'] || null,
      body['Azienda_Vettore'] || null,
      body['Cognome_Vettore'] || null,
      body['Nome_Vettore'] || null,
      body['Nominativo'] || null,
      body['Ora Inizio'] || null,
      body['Ora Fine'] || null,
      body['Ore'] || null,
      body['Colli'] || null,
      body['Peso (Kg)'] || null,
      body['Targa'] || null,
      body['Tipo Patente'] || null,
      body['Km'] || null,
      body['Km Iniziali Viaggio'] || null,
      body['Km Finali Viaggio'] || null,
      body['Km Viaggio'] || null,
      body['Km al Rifornimento'] || null,
      body['Litri Riforniti'] || null,
      body['€/lt'] || null,
      body['Toccate'] || null,
      body['Ordini'] || null,
      body['Mese'] || null,
      body['Trimestre'] || null,
      body['Sett'] || null,
      body['Giorno'] || null,
      body['euro_rifornimento'] || null,
      id
    ];

    await pool.query(updateSql, values);

    return NextResponse.json({ 
      message: 'Viaggio aggiornato con successo',
      viaggio: id 
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento del viaggio:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
