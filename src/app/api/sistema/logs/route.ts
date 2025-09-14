import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'backup_management',
  port: parseInt(process.env.MYSQL_PORT || '3306')
};

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'access' | 'backup' | 'error' | 'import' | 'system';
  user: string;
  action: string;
  details: string;
  ip_address?: string;
  status: 'success' | 'error' | 'warning';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Filtri
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const type = searchParams.get('type');
    const user = searchParams.get('user');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const exportCsv = searchParams.get('export') === 'csv';

    const connection = await mysql.createConnection(dbConfig);

    // Costruisci la query con i filtri
    let whereConditions = [];
    let queryParams: any[] = [];

    if (dateFrom) {
      whereConditions.push('timestamp >= ?');
      queryParams.push(dateFrom + ' 00:00:00');
    }

    if (dateTo) {
      whereConditions.push('timestamp <= ?');
      queryParams.push(dateTo + ' 23:59:59');
    }

    if (type) {
      whereConditions.push('type = ?');
      queryParams.push(type);
    }

    if (user) {
      whereConditions.push('user LIKE ?');
      queryParams.push(`%${user}%`);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push('(action LIKE ? OR details LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    if (exportCsv) {
      // Esporta tutti i log che corrispondono ai filtri
      const [rows] = await connection.execute(
        `SELECT * FROM system_logs ${whereClause} ORDER BY timestamp DESC`,
        queryParams
      );

      await connection.end();

      // Converti in CSV
      const logs = rows as LogEntry[];
      const csvHeader = 'Data/Ora,Tipo,Utente,Azione,Dettagli,IP,Stato\n';
      const csvData = logs.map(log => 
        `"${new Date(log.timestamp).toLocaleString('it-IT')}","${log.type}","${log.user}","${log.action}","${log.details.replace(/"/g, '""')}","${log.ip_address || ''}","${log.status}"`
      ).join('\n');

      return new NextResponse(csvHeader + csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="logs_sistema_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Query per il conteggio totale
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM system_logs ${whereClause}`,
      queryParams
    );
    const total = (countResult as any)[0].total;
    const totalPages = Math.ceil(total / limit);

    // Query per i dati paginati
    const [rows] = await connection.execute(
      `SELECT * FROM system_logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    await connection.end();

    return NextResponse.json({
      logs: rows,
      total,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages
    });

  } catch (error) {
    console.error('Errore nel recupero dei log:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST per creare nuovi log (per uso interno dell'applicazione)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, user, action, details, ip_address, status = 'success' } = body;

    if (!type || !user || !action) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      `INSERT INTO system_logs (type, user, action, details, ip_address, status, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [type, user, action, details || '', ip_address || null, status]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      id: (result as any).insertId
    });

  } catch (error) {
    console.error('Errore nella creazione del log:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Funzione helper per creare log di sistema (da usare in altre API)
export async function createSystemLog(
  type: 'access' | 'backup' | 'error' | 'import' | 'system',
  user: string,
  action: string,
  details: string = '',
  ip_address?: string,
  status: 'success' | 'error' | 'warning' = 'success'
) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    await connection.execute(
      `INSERT INTO system_logs (type, user, action, details, ip_address, status, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [type, user, action, details, ip_address || null, status]
    );
    
    await connection.end();
  } catch (error) {
    console.error('Errore nella creazione del log di sistema:', error);
  }
}