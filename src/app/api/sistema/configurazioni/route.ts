import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';


const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'backup_management',
  port: parseInt(process.env.MYSQL_PORT || '3306')
};

interface SystemConfig {
  id?: number;
  category: 'general' | 'backup' | 'notifications' | 'security';
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
  updated_by?: string;
}

// GET - Recupera tutte le configurazioni
export async function GET(request: NextRequest) {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      'SELECT * FROM system_config ORDER BY category, `key`'
    );

    await connection.end();

    const configs = rows as SystemConfig[];
    
    // Organizza le configurazioni per categoria
    const organizedConfigs: Record<string, Record<string, any>> = {
      general: {},
      backup: {},
      notifications: {},
      security: {}
    };

    configs.forEach(config => {
      const category = config.category as keyof typeof organizedConfigs;
      if (organizedConfigs[category]) {
        // Converti il valore in base al tipo
        let value: any = config.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(Number(value)) && value !== '') value = Number(value);
        
        organizedConfigs[category][config.key] = value;
      }
    });

    return NextResponse.json(organizedConfigs);

  } catch (error) {
    console.error('Errore nel recupero delle configurazioni:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Salva le configurazioni
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { general, backup, notifications, security } = body;
    
    // Ottieni informazioni utente dall'header (se disponibile)
    const userHeader = request.headers.get('x-user-info');
    const user = userHeader ? JSON.parse(userHeader).username : 'system';
    const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const connection = await mysql.createConnection(dbConfig);
    
    // Inizia una transazione
    await connection.beginTransaction();

    try {
      const configsToSave = [
        ...Object.entries(general || {}).map(([key, value]) => ({ category: 'general', key, value: String(value) })),
        ...Object.entries(backup || {}).map(([key, value]) => ({ category: 'backup', key, value: String(value) })),
        ...Object.entries(notifications || {}).map(([key, value]) => ({ category: 'notifications', key, value: String(value) })),
        ...Object.entries(security || {}).map(([key, value]) => ({ category: 'security', key, value: String(value) }))
      ];

      for (const config of configsToSave) {
        await connection.execute(
          `INSERT INTO system_config (category, \`key\`, value, updated_by, updated_at) 
           VALUES (?, ?, ?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE 
           value = VALUES(value), 
           updated_by = VALUES(updated_by), 
           updated_at = VALUES(updated_at)`,
          [config.category, config.key, config.value, user]
        );
      }

      await connection.commit();
      await connection.end();

      // Log dell'operazione
      console.log(`Sistema: ${user} ha aggiornato configurazioni: ${configsToSave.map(c => `${c.category}.${c.key}`).join(', ')} da IP ${userIp}`);

      return NextResponse.json({
        success: true,
        message: 'Configurazioni salvate con successo'
      });

    } catch (error) {
      await connection.rollback();
      await connection.end();
      throw error;
    }

  } catch (error) {
    console.error('Errore nel salvataggio delle configurazioni:', error);
    
    // Log dell'errore
    const userHeader = request.headers.get('x-user-info');
    const user = userHeader ? JSON.parse(userHeader).username : 'system';
    const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    console.error(`Errore configurazioni: ${user} da IP ${userIp} - ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);

    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna una singola configurazione
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, key, value, description } = body;

    if (!category || !key || value === undefined) {
      return NextResponse.json(
        { error: 'Parametri obbligatori mancanti' },
        { status: 400 }
      );
    }

    const userHeader = request.headers.get('x-user-info');
    const user = userHeader ? JSON.parse(userHeader).username : 'system';
    const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const connection = await mysql.createConnection(dbConfig);

    await connection.execute(
      `INSERT INTO system_config (category, \`key\`, value, description, updated_by, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE 
       value = VALUES(value), 
       description = VALUES(description),
       updated_by = VALUES(updated_by), 
       updated_at = VALUES(updated_at)`,
      [category, key, String(value), description || null, user]
    );

    await connection.end();

    // Log dell'operazione
    console.log(`Sistema: ${user} ha aggiornato configurazione ${category}.${key} = ${value} da IP ${userIp}`);

    return NextResponse.json({
      success: true,
      message: 'Configurazione aggiornata con successo'
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento della configurazione:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina una configurazione
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const key = searchParams.get('key');

    if (!category || !key) {
      return NextResponse.json(
        { error: 'Parametri category e key obbligatori' },
        { status: 400 }
      );
    }

    const userHeader = request.headers.get('x-user-info');
    const user = userHeader ? JSON.parse(userHeader).username : 'system';
    const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      'DELETE FROM system_config WHERE category = ? AND `key` = ?',
      [category, key]
    );

    await connection.end();

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Configurazione non trovata' },
        { status: 404 }
      );
    }

    // Log dell'operazione
    console.log(`Sistema: ${user} ha eliminato configurazione ${category}.${key} da IP ${userIp}`);

    return NextResponse.json({
      success: true,
      message: 'Configurazione eliminata con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione della configurazione:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}