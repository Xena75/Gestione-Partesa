import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

// Valori enum validi per la categoria
const VALID_CATEGORIES = [
  'meccanica',
  'elettrica',
  'carrozzeria',
  'pneumatici',
  'generale',
  'Spondista',
  'Teli',
  'altro'
];

// Funzione per validare la categoria
function validateCategory(category: string | null | undefined): string {
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return 'generale';
  }
  return category;
}

// GET - Recupera tutti i fornitori
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const category = searchParams.get('category');

    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params: any[] = [];

    if (active !== null) {
      query += ' AND active = ?';
      params.push(active === 'true');
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await pool.execute(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Errore nel recupero fornitori:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei fornitori' },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo fornitore
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      vat_number,
      category,
      rating,
      contact_person,
      website,
      mobile
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nome fornitore richiesto' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO suppliers (
        name, email, phone, address, vat_number, category, rating, contact_person, website, mobile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      name,
      email || null,
      phone || null,
      address || null,
      vat_number || null,
      validateCategory(category),
      rating || 0.00,
      contact_person || null,
      website || null,
      mobile || null
    ]);

    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId, ...body }
    });
  } catch (error) {
    console.error('Errore nella creazione fornitore:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella creazione del fornitore' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna un fornitore
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      email,
      phone,
      address,
      vat_number,
      category,
      rating,
      active,
      contact_person,
      website,
      mobile
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID fornitore richiesto' },
        { status: 400 }
      );
    }

    const query = `
      UPDATE suppliers SET
        name = ?,
        email = ?,
        phone = ?,
        address = ?,
        vat_number = ?,
        category = ?,
        rating = ?,
        active = ?,
        contact_person = ?,
        website = ?,
        mobile = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await pool.execute(query, [
      name,
      email || null,
      phone || null,
      address || null,
      vat_number || null,
      validateCategory(category),
      rating || 0.00,
      active !== undefined ? active : true,
      contact_person || null,
      website || null,
      mobile || null,
      id
    ]);

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Errore nell\'aggiornamento fornitore:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento del fornitore' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un fornitore (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID fornitore richiesto' },
        { status: 400 }
      );
    }

    if (force) {
      // Eliminazione definitiva (solo se non ci sono preventivi associati)
      const [quotesCheck] = await pool.execute(
        'SELECT COUNT(*) as count FROM maintenance_quotes WHERE supplier_id = ?',
        [id]
      );
      
      if ((quotesCheck as any[])[0].count > 0) {
        return NextResponse.json(
          { success: false, error: 'Impossibile eliminare: fornitore ha preventivi associati' },
          { status: 400 }
        );
      }
      
      await pool.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    } else {
      // Soft delete
      await pool.execute(
        'UPDATE suppliers SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione fornitore:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione del fornitore' },
      { status: 500 }
    );
  }
}