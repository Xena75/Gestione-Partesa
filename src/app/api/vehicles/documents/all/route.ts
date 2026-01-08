import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera tutti i documenti con informazioni veicolo
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const documentType = searchParams.get('document_type') || '';
    const expiryStatus = searchParams.get('expiry_status') || '';
    const proprieta = searchParams.get('proprieta') || '';
    const tipoPatente = searchParams.get('tipo_patente') || '';
    const active = searchParams.get('active') || '';
    const sortBy = searchParams.get('sort_by') || 'uploaded_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    const offset = (page - 1) * limit;
    const connection = await mysql.createConnection(dbConfig);

    // Verifica se il campo is_archived esiste nella tabella
    let hasArchivedField = false;
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'vehicle_documents' 
        AND COLUMN_NAME = 'is_archived'
      `, [dbConfig.database]);
      hasArchivedField = Array.isArray(columns) && columns.length > 0;
    } catch (err) {
      console.warn('Errore verifica campo is_archived:', err);
    }

    // Costruisci la query base
    let whereConditions = ['v.active = 1'];
    let queryParams: any[] = [];

    // Filtro ricerca per targa o nome file
    if (search) {
      whereConditions.push('(v.targa LIKE ? OR vd.file_name LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Filtro tipo documento
    if (documentType) {
      whereConditions.push('vd.document_type = ?');
      queryParams.push(documentType);
    }

    // Filtro mostra archiviati (solo se il campo esiste)
    if (hasArchivedField) {
      const showArchived = searchParams.get('show_archived');
      if (showArchived === 'false' || !showArchived) {
        // Nascondi archiviati di default
        whereConditions.push('(COALESCE(vd.is_archived, 0) = 0)');
      } else if (showArchived === 'only') {
        // Mostra solo archiviati
        whereConditions.push('COALESCE(vd.is_archived, 0) = 1');
      }
      // Se showArchived === 'true', mostra tutti (inclusi archiviati)
    }

    // Filtro stato scadenza
    if (expiryStatus) {
      switch (expiryStatus) {
        case 'archived':
          if (hasArchivedField) {
            whereConditions.push('COALESCE(vd.is_archived, 0) = 1');
          }
          break;
        case 'expired':
          if (hasArchivedField) {
            whereConditions.push('vd.expiry_date < CURDATE() AND (COALESCE(vd.is_archived, 0) = 0)');
          } else {
            whereConditions.push('vd.expiry_date < CURDATE()');
          }
          break;
        case 'expiring_soon':
          if (hasArchivedField) {
            whereConditions.push('vd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND (COALESCE(vd.is_archived, 0) = 0)');
          } else {
            whereConditions.push('vd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
          }
          break;
        case 'valid':
          if (hasArchivedField) {
            whereConditions.push('(vd.expiry_date IS NULL OR vd.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY)) AND (COALESCE(vd.is_archived, 0) = 0)');
          } else {
            whereConditions.push('(vd.expiry_date IS NULL OR vd.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY))');
          }
          break;
      }
    }

    // Filtro proprietà
    if (proprieta) {
      whereConditions.push('v.proprieta = ?');
      queryParams.push(proprieta);
    }

    // Filtro tipo patente
    if (tipoPatente) {
      whereConditions.push('v.tipo_patente = ?');
      queryParams.push(tipoPatente);
    }

    // Filtro stato attivo
    if (active) {
      whereConditions.push('v.active = ?');
      queryParams.push(parseInt(active));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query per contare il totale
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      ${whereClause}
    `;

    const [countResult] = await connection.execute(countQuery, queryParams);
    const total = (countResult as any[])[0]?.total || 0;

    // Query principale con paginazione
    const isArchivedSelect = hasArchivedField 
      ? 'COALESCE(vd.is_archived, 0) as is_archived' 
      : '0 as is_archived';
    const archivedCase = hasArchivedField 
      ? "WHEN COALESCE(vd.is_archived, 0) = 1 THEN 'archived'"
      : '';
    
    const documentsQuery = `
      SELECT 
        vd.id,
        vd.vehicle_id,
        vd.document_type,
        vd.file_name,
        vd.file_path,
        vd.file_size,
        DATE_FORMAT(vd.expiry_date, '%Y-%m-%d') as expiry_date,
        vd.uploaded_at,
        vd.notes,
        ${isArchivedSelect},
        v.targa,
        v.marca,
        v.modello,
        CASE 
          ${archivedCase}
          WHEN vd.expiry_date IS NULL THEN 'no_expiry'
          WHEN vd.expiry_date < CURDATE() THEN 'expired'
          WHEN vd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
          ELSE 'valid'
        END as expiry_status
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const [documentsRows] = await connection.execute(documentsQuery, [...queryParams, limit, offset]);
    
    // Debug logging per il veicolo DL291XJ
    const dl291xjDocs = (documentsRows as any[]).filter(doc => doc.targa === 'DL291XJ');
    if (dl291xjDocs.length > 0) {
      console.log('=== DEBUG DL291XJ DOCUMENTS ===');
      dl291xjDocs.forEach(doc => {
        console.log(`Document ID: ${doc.id}`);
        console.log(`Expiry Date: ${doc.expiry_date}`);
        console.log(`Expiry Status: ${doc.expiry_status}`);
        console.log(`Document Type: ${doc.document_type}`);
        console.log('---');
      });
      console.log('=== END DEBUG ===');
    }
    await connection.end();

    return NextResponse.json({
      success: true,
      documents: documentsRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero documenti' },
      { status: 500 }
    );
  }
}