import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { runRevisionChecker } from '../../../../../../scripts/cron/vehicle-revision-checker';

/**
 * =====================================================
 * API ENDPOINT - CONTROLLO MANUALE REVISIONI VEICOLI
 * Sistema Ibrido v2.22.0 - Gestione Partesa
 * =====================================================
 * 
 * Endpoint per il controllo manuale del sistema di automazione
 * revisioni veicoli. Permette di:
 * - Eseguire manualmente il controllo revisioni (normali e tachigrafo)
 * - Visualizzare i log di automazione
 * - Ottenere statistiche del sistema
 * - Monitorare stato revisioni normali e tachigrafo separatamente
 * 
 * Tipi di revisione supportati:
 * - 'revisione': Revisioni normali veicoli (1-2 anni in base alla patente)
 * - 'revisione tachigrafo': Revisioni tachigrafo (ogni 2 anni, esclusi patente B)
 * =====================================================
 */

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

/**
 * GET - Ottieni statistiche e log del sistema di automazione
 */
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    const limit = parseInt(searchParams.get('limit') || '50');
    const vehicleId = searchParams.get('vehicleId');
    
    connection = await mysql.createConnection(dbConfig);
    
    switch (action) {
      case 'stats':
        // Statistiche generali del sistema
        const [statsResult] = await connection.execute(`
          SELECT 
            operation_type,
            COUNT(*) as count,
            DATE(created_at) as date
          FROM automation_logs 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY operation_type, DATE(created_at)
          ORDER BY date DESC, operation_type
        `);
        
        const [summaryResult] = await connection.execute(`
          SELECT 
            operation_type,
            COUNT(*) as total_count,
            MAX(created_at) as last_execution
          FROM automation_logs 
          GROUP BY operation_type
        `);
        
        return NextResponse.json({
          success: true,
          data: {
            daily_stats: statsResult,
            summary: summaryResult
          }
        });
        
      case 'logs':
        // Log dettagliati
        let logsQuery = `
          SELECT 
            al.*,
            v.targa,
            v.tipo_patente
          FROM automation_logs al
          LEFT JOIN vehicles v ON CAST(al.vehicle_id AS CHAR) = CAST(v.id AS CHAR)
          WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (vehicleId) {
          logsQuery += ' AND al.vehicle_id = ?';
          queryParams.push(vehicleId);
        }
        
        logsQuery += ' ORDER BY al.created_at DESC LIMIT ?';
        queryParams.push(limit);
        
        const [logsResult] = await connection.execute(logsQuery, queryParams);
        
        return NextResponse.json({
          success: true,
          data: logsResult
        });
        
      case 'vehicles-status':
        // Stato revisioni per tutti i veicoli (solo quelli con data_scadenza_revisione valida)
        const [vehiclesResult] = await connection.execute(`
          SELECT 
            v.id,
            v.targa,
            v.tipo_patente,
            v.active,
            v.data_ultima_revisione,
            (
              SELECT COUNT(*) 
              FROM vehicle_schedules vs 
              WHERE vs.vehicle_id = v.id 
                AND vs.schedule_type = 'revisione' 
                AND vs.status = 'pending' 
                AND vs.data_scadenza > CURDATE()
            ) as future_revisions_count,
            (
              SELECT MIN(vs.data_scadenza) 
              FROM vehicle_schedules vs 
              WHERE vs.vehicle_id = v.id 
                AND vs.schedule_type = 'revisione' 
                AND vs.status = 'pending' 
                AND vs.data_scadenza > CURDATE()
            ) as next_revision_date,
            (
              SELECT MAX(vs.completed_date) 
              FROM vehicle_schedules vs 
              WHERE vs.vehicle_id = v.id 
                AND vs.schedule_type = 'revisione' 
                AND vs.status = 'completed'
            ) as last_completed_revision
          FROM vehicles v
          WHERE v.active = 1 AND v.data_ultima_revisione IS NOT NULL
          ORDER BY v.targa
        `);
        
        // Stato revisioni tachigrafo per tutti i veicoli (esclusi patente B)
        const [tachographResult] = await connection.execute(`
          SELECT 
            v.id,
            v.targa,
            v.tipo_patente,
            v.active,
            v.data_revisione_tachigrafo,
            (
              SELECT COUNT(*) 
              FROM vehicle_schedules vs 
              WHERE vs.vehicle_id = v.id 
                AND vs.schedule_type = 'revisione tachigrafo' 
                AND vs.status = 'pending' 
                AND vs.data_scadenza > CURDATE()
            ) as future_tachograph_revisions_count,
            (
              SELECT MIN(vs.data_scadenza) 
              FROM vehicle_schedules vs 
              WHERE vs.vehicle_id = v.id 
                AND vs.schedule_type = 'revisione tachigrafo' 
                AND vs.status = 'pending' 
                AND vs.data_scadenza > CURDATE()
            ) as next_tachograph_revision_date,
            (
              SELECT MAX(vs.completed_date) 
              FROM vehicle_schedules vs 
              WHERE vs.vehicle_id = v.id 
                AND vs.schedule_type = 'revisione tachigrafo' 
                AND vs.status = 'completed'
            ) as last_completed_tachograph_revision
          FROM vehicles v
          WHERE v.active = 1 AND v.data_revisione_tachigrafo IS NOT NULL AND v.tipo_patente != 'B'
          ORDER BY v.targa
        `);
        
        return NextResponse.json({
          success: true,
          data: {
            vehicles: vehiclesResult,
            tachograph_vehicles: tachographResult
          }
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Azione non riconosciuta'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Errore API automazione revisioni:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * POST - Esegui controllo manuale delle revisioni
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vehicleId } = body;
    
    switch (action) {
      case 'run-check':
        // Esegui il controllo completo delle revisioni
        console.log('Avvio controllo manuale revisioni...');
        
        try {
          await runRevisionChecker();
          
          return NextResponse.json({
            success: true,
            message: 'Controllo revisioni completato con successo',
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('Errore nel controllo revisioni:', error);
          
          return NextResponse.json({
            success: false,
            error: 'Errore durante il controllo revisioni',
            details: error instanceof Error ? error.message : 'Errore sconosciuto'
          }, { status: 500 });
        }
        
      case 'check-vehicle':
        // Controlla un singolo veicolo
        if (!vehicleId) {
          return NextResponse.json({
            success: false,
            error: 'ID veicolo richiesto per questa operazione'
          }, { status: 400 });
        }
        
        let connection;
        
        try {
          connection = await mysql.createConnection(dbConfig);
          
          // Recupera informazioni del veicolo (solo se ha data_ultima_revisione valida)
          const [vehicleResult] = await connection.execute(
            'SELECT id, targa, tipo_patente, data_ultima_revisione FROM vehicles WHERE id = ? AND data_ultima_revisione IS NOT NULL',
            [vehicleId]
          );
          
          if (!vehicleResult || vehicleResult.length === 0) {
            return NextResponse.json({
              success: false,
              error: 'Veicolo non trovato o non ha una data ultima revisione valida (escluso dal sistema di automazione)'
            }, { status: 404 });
          }
          
          const vehicle = vehicleResult[0];
          
          // Verifica revisioni future
          const [futureRevisions] = await connection.execute(
            `SELECT COUNT(*) as count FROM vehicle_schedules 
             WHERE vehicle_id = ? AND schedule_type = 'revisione' 
             AND status = 'pending' AND data_scadenza > CURDATE()`,
            [vehicleId]
          );
          
          const hasFutureRevision = futureRevisions[0].count > 0;
          
          return NextResponse.json({
            success: true,
            data: {
              vehicle: vehicle,
              hasFutureRevision: hasFutureRevision,
              message: hasFutureRevision 
                ? 'Veicolo ha già una revisione futura programmata'
                : 'Veicolo necessita di una nuova revisione'
            }
          });
          
        } finally {
          if (connection) {
            await connection.end();
          }
        }
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Azione non riconosciuta'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Errore POST API automazione revisioni:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

/**
 * DELETE - Pulisci log di automazione
 */
export async function DELETE(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');
    
    if (days < 7) {
      return NextResponse.json({
        success: false,
        error: 'Non è possibile eliminare log più recenti di 7 giorni'
      }, { status: 400 });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'DELETE FROM automation_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    
    return NextResponse.json({
      success: true,
      message: `Eliminati ${result.affectedRows} log più vecchi di ${days} giorni`,
      deletedRows: result.affectedRows
    });
    
  } catch (error) {
    console.error('Errore DELETE API automazione revisioni:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}