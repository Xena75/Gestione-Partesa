import { NextRequest, NextResponse } from 'next/server';
import { BackupDatabase } from '@/lib/db-backup';
import poolViaggi from '@/lib/db-viaggi';
import type { RowDataPacket, FieldPacket } from 'mysql2/promise';

// GET: Test connessioni database
export async function GET(request: NextRequest) {
  try {
    const results = {
      backup_management: { status: 'disconnected', error: null as string | null, tables: [] as string[], configs_count: 0, configs: [] as string[] },
      viaggi_db: { status: 'disconnected', error: null as string | null, tables: [] as string[] }
    };

    // Test connessione database backup_management
    try {
      const backupConfigs = await BackupDatabase.getBackupConfigs();
      
      results.backup_management = {
        status: 'connected',
        error: null,
        tables: [],
        configs_count: backupConfigs.length,
        configs: backupConfigs.map(config => config.config_key)
      };
    } catch (error) {
      results.backup_management.error = error instanceof Error ? error.message : 'Errore sconosciuto';
    }

    // Test connessione database viaggi
    try {
      const [viaggiTables] = await poolViaggi.execute(`
        SHOW TABLES
      `) as [RowDataPacket[], FieldPacket[]];
      
      results.viaggi_db = {
        status: 'connected',
        error: null,
        tables: viaggiTables.map(row => Object.values(row)[0])
      };
    } catch (error) {
      results.viaggi_db.error = error instanceof Error ? error.message : 'Errore sconosciuto';
    }

    // Determina lo stato generale
    const allConnected = results.backup_management.status === 'connected' && 
                        results.viaggi_db.status === 'connected';

    return NextResponse.json({
      success: allConnected,
      message: allConnected ? 'Tutte le connessioni database sono attive' : 'Alcune connessioni database hanno problemi',
      databases: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore test database:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Errore interno del server',
        databases: null
      },
      { status: 500 }
    );
  }
}