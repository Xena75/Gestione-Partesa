import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Configurazione database gestionelogistica (users)
const dbGestioneConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

// Configurazione database viaggi_db (employees)
const dbViaggiConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
};

export async function GET(request: NextRequest) {
  let gestioneConnection: mysql.Connection | null = null;
  let viaggiConnection: mysql.Connection | null = null;

  try {
    // Connessione al database gestionelogistica
    gestioneConnection = await mysql.createConnection(dbGestioneConfig);
    
    // Connessione al database viaggi_db
    viaggiConnection = await mysql.createConnection(dbViaggiConfig);

    // Recupera tutti gli utenti disponibili con ruolo "employee" e attivi
    const [users] = await gestioneConnection.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE role = ? AND (active IS NULL OR active = 1) ORDER BY username ASC',
      ['employee']
    );

    // Recupera gli username già collegati nella tabella employees
    const [linkedUsers] = await viaggiConnection.execute(
      'SELECT DISTINCT username_login FROM employees WHERE username_login IS NOT NULL AND username_login != ""'
    );

    const linkedUsernames = new Set(
      (linkedUsers as any[]).map(row => row.username_login?.toString().toLowerCase())
    );

    // Filtra gli utenti non ancora collegati
    const availableUsers = (users as any[]).filter(user => 
      !linkedUsernames.has(user.username?.toString().toLowerCase())
    );

    return NextResponse.json({
      success: true,
      users: availableUsers
    });

  } catch (error) {
    console.error('Errore nel recupero degli utenti disponibili:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero degli utenti disponibili' },
      { status: 500 }
    );
  } finally {
    if (gestioneConnection) {
      await gestioneConnection.end();
    }
    if (viaggiConnection) {
      await viaggiConnection.end();
    }
  }
}
