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

// GET - Recupera statistiche globali dei documenti
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const connection = await mysql.createConnection(dbConfig);

    // Statistiche generali
    const [totalDocsResult] = await connection.execute(`
      SELECT COUNT(*) as total_documents
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE v.active = 1
    `);

    const [expiredDocsResult] = await connection.execute(`
      SELECT COUNT(*) as expired_documents
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE v.active = 1 AND vd.expiry_date < CURDATE()
    `);

    const [expiringSoonResult] = await connection.execute(`
      SELECT COUNT(*) as expiring_soon
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE v.active = 1 
      AND vd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    `);

    const [validDocsResult] = await connection.execute(`
      SELECT COUNT(*) as valid_documents
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE v.active = 1 
      AND (vd.expiry_date IS NULL OR vd.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY))
    `);

    // Statistiche per tipo di documento
    const [docTypeStatsResult] = await connection.execute(`
      SELECT 
        vd.document_type,
        COUNT(*) as count,
        SUM(CASE WHEN vd.expiry_date < CURDATE() THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN vd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as expiring_soon
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE v.active = 1
      GROUP BY vd.document_type
      ORDER BY count DESC
    `);

    // Dimensione totale dei file
    const [fileSizeResult] = await connection.execute(`
      SELECT COALESCE(SUM(vd.file_size), 0) as total_file_size
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE v.active = 1
    `);

    // Documenti caricati nell'ultimo mese
    const [recentDocsResult] = await connection.execute(`
      SELECT COUNT(*) as recent_uploads
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE v.active = 1 
      AND vd.uploaded_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    `);

    // Veicoli senza documenti
    const [vehiclesWithoutDocsResult] = await connection.execute(`
      SELECT COUNT(*) as vehicles_without_docs
      FROM vehicles v
      LEFT JOIN vehicle_documents vd ON v.id = vd.vehicle_id
      WHERE v.active = 1 AND vd.id IS NULL
    `);

    await connection.end();

    const stats = {
      total_documents: (totalDocsResult as any[])[0]?.total_documents || 0,
      expired_documents: (expiredDocsResult as any[])[0]?.expired_documents || 0,
      expiring_soon: (expiringSoonResult as any[])[0]?.expiring_soon || 0,
      valid_documents: (validDocsResult as any[])[0]?.valid_documents || 0,
      total_file_size: (fileSizeResult as any[])[0]?.total_file_size || 0,
      recent_uploads: (recentDocsResult as any[])[0]?.recent_uploads || 0,
      vehicles_without_docs: (vehiclesWithoutDocsResult as any[])[0]?.vehicles_without_docs || 0,
      document_types: docTypeStatsResult as any[]
    };

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Errore nel recupero statistiche documenti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero statistiche documenti' },
      { status: 500 }
    );
  }
}