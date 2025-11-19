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
      active_vehicles: 0,
      inactive_vehicles: 0,
      active_schedules: 0,
      overdue_schedules: 0,
      open_quotes: 0,
      monthly_maintenance_cost: 0,
      upcoming_deadlines: 0
    };

    try {
      // Recupera statistiche dalla tabella vehicles
      const [vehiclesResult] = await poolViaggi.execute(
        `SELECT 
          COUNT(*) as total_vehicles,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_vehicles,
          SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as inactive_vehicles
         FROM vehicles`
      );
      const vehicleData = (vehiclesResult as any[])[0];
      stats.total_vehicles = vehicleData?.total_vehicles || 0;
      stats.active_vehicles = vehicleData?.active_vehicles || 0;
      stats.inactive_vehicles = vehicleData?.inactive_vehicles || 0;
    } catch (error) {
      console.error('Errore nel contare i veicoli:', error);
      stats.total_vehicles = 0;
      stats.active_vehicles = 0;
      stats.inactive_vehicles = 0;
    }

    try {
      // Prova a recuperare statistiche dalle altre tabelle se esistono
      const [activeSchedulesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as active_schedules 
         FROM vehicle_schedules 
         WHERE status = 'pending' 
         AND (
           CASE 
             WHEN booking_date IS NOT NULL THEN booking_date >= CURDATE()
             ELSE data_scadenza >= CURDATE()
           END
         )`
      );
      stats.active_schedules = (activeSchedulesResult as any[])[0]?.active_schedules || 0;

      const [overdueSchedulesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as overdue_schedules 
         FROM vehicle_schedules 
         WHERE status = 'pending' 
         AND (
           CASE 
             WHEN booking_date IS NOT NULL THEN booking_date < CURDATE()
             ELSE data_scadenza < CURDATE()
           END
         )`
      );
      stats.overdue_schedules = (overdueSchedulesResult as any[])[0]?.overdue_schedules || 0;

      const [openQuotesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as open_quotes 
         FROM maintenance_quotes 
         WHERE status = 'pending'`
      );
      stats.open_quotes = (openQuotesResult as any[])[0]?.open_quotes || 0;

      // Query per costo mensile manutenzione (solo mese corrente)
      // Usa invoice_amount se disponibile (costo effettivo fatturato), altrimenti calcola da taxable_amount + tax_amount, altrimenti usa amount
      const [monthlyMaintenanceCostResult] = await poolViaggi.execute(
        `SELECT COALESCE(
          SUM(
            CASE 
              WHEN invoice_amount IS NOT NULL AND invoice_amount > 0 THEN invoice_amount
              WHEN taxable_amount IS NOT NULL AND tax_amount IS NOT NULL THEN (taxable_amount + tax_amount)
              ELSE COALESCE(amount, 0)
            END
          ), 0
        ) as monthly_cost 
         FROM maintenance_quotes 
         WHERE status = 'approved' 
         AND YEAR(approved_at) = YEAR(CURDATE())
         AND MONTH(approved_at) = MONTH(CURDATE())`
      );
      stats.monthly_maintenance_cost = (monthlyMaintenanceCostResult as any[])[0]?.monthly_cost || 0;

      const [upcomingDeadlinesResult] = await poolViaggi.execute(
        `SELECT COUNT(*) as upcoming_deadlines 
         FROM vehicle_schedules 
         WHERE status = 'pending' 
         AND (
           CASE 
             WHEN booking_date IS NOT NULL THEN booking_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
             ELSE data_scadenza BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
           END
         )`
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