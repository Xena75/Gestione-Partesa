import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione usando cookies
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    let stats = {
      total_vehicles: 0,
      active_schedules: 0,
      overdue_schedules: 0,
      open_quotes: 0,
      monthly_maintenance_cost: 0,
      upcoming_deadlines: 0
    };

    try {
      // Recupera statistiche dalla tabella vehicles
      const [vehiclesResult] = await poolViaggi.execute(
        'SELECT COUNT(*) as total_vehicles FROM vehicles'
      );
      stats.total_vehicles = (vehiclesResult as any[])[0]?.total_vehicles || 0;
    } catch (error) {
      console.error('Errore nel contare i veicoli:', error);
      stats.total_vehicles = 0;
    }

    try {
      // Prova a recuperare statistiche dalle altre tabelle se esistono
      const [activeSchedulesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as active_schedules 
         FROM vehicle_schedules 
         WHERE status = 'pending' AND data_scadenza >= CURDATE()`
      );
      stats.active_schedules = (activeSchedulesResult as any[])[0]?.active_schedules || 0;

      const [overdueSchedulesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as overdue_schedules 
         FROM vehicle_schedules 
         WHERE status = 'pending' AND data_scadenza < CURDATE()`
      );
      stats.overdue_schedules = (overdueSchedulesResult as any[])[0]?.overdue_schedules || 0;

      const [openQuotesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as open_quotes 
         FROM maintenance_quotes 
         WHERE status IN ('pending', 'approved')`
      );
      stats.open_quotes = (openQuotesResult as any[])[0]?.open_quotes || 0;

      // Query per costo mensile manutenzione - temporaneamente disabilitata
      // fino a quando non si verifica la struttura corretta della tabella
      stats.monthly_maintenance_cost = 0;

      const [upcomingDeadlinesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as upcoming_deadlines 
         FROM vehicle_schedules 
         WHERE status = 'pending' 
         AND data_scadenza BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
      );
      stats.upcoming_deadlines = (upcomingDeadlinesResult as any[])[0]?.upcoming_deadlines || 0;
    } catch (error) {
      console.error('Errore nel recuperare statistiche delle tabelle aggiuntive:', error);
      // Le tabelle potrebbero non esistere ancora
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Errore nel recupero statistiche veicoli:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}