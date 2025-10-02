import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Verificando statistiche veicoli...');

    // 1. Conta veicoli totali (senza filtro temporale)
    const [totalVehiclesRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as total
      FROM vehicles
    `) as [any[], any];

    // 2. Conta veicoli creati negli ultimi 14 giorni
    const [vehicles14DaysRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as count_14_days
      FROM vehicles
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `) as [any[], any];

    // 3. Conta veicoli creati negli ultimi 30 giorni
    const [vehicles30DaysRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as count_30_days
      FROM vehicles
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as [any[], any];

    // 4. Primi 5 veicoli con date di creazione
    const [firstVehiclesRows] = await poolViaggi.execute(`
      SELECT id, targa, marca, modello, createdAt, active
      FROM vehicles
      ORDER BY createdAt ASC
      LIMIT 5
    `) as [any[], any];

    // 5. Scadenze attive totali (senza filtro temporale)
    const [activeSchedulesRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as active_schedules
      FROM vehicle_schedules
      WHERE (
        (booking_date IS NOT NULL AND booking_date >= CURDATE()) OR 
        (booking_date IS NULL AND data_scadenza >= CURDATE())
      ) AND status = 'pending'
    `) as [any[], any];

    // 6. Scadenze scadute totali (senza filtro temporale)
    const [overdueSchedulesRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as overdue_schedules
      FROM vehicle_schedules
      WHERE (
        (booking_date IS NOT NULL AND booking_date < CURDATE()) OR 
        (booking_date IS NULL AND data_scadenza < CURDATE())
      ) AND status = 'pending'
    `) as [any[], any];

    // 7. Preventivi aperti totali (senza filtro temporale)
    const [openQuotesRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as open_quotes
      FROM maintenance_quotes
      WHERE status = 'pending'
    `) as [any[], any];

    // 8. Intervention types attivi totali (senza filtro temporale)
    const [interventionTypesRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as intervention_types
      FROM intervention_types 
      WHERE active = TRUE
    `) as [any[], any];

    const debugData = {
      vehicles: {
        total: totalVehiclesRows[0]?.total || 0,
        last_14_days: vehicles14DaysRows[0]?.count_14_days || 0,
        last_30_days: vehicles30DaysRows[0]?.count_30_days || 0,
        first_5_vehicles: firstVehiclesRows || []
      },
      schedules: {
        active_total: activeSchedulesRows[0]?.active_schedules || 0,
        overdue_total: overdueSchedulesRows[0]?.overdue_schedules || 0
      },
      quotes: {
        open_total: openQuotesRows[0]?.open_quotes || 0
      },
      intervention_types: {
        active_total: interventionTypesRows[0]?.intervention_types || 0
      },
      analysis: {
        problem_identified: totalVehiclesRows[0]?.total > 0 && vehicles14DaysRows[0]?.count_14_days === 0,
        message: totalVehiclesRows[0]?.total > 0 && vehicles14DaysRows[0]?.count_14_days === 0 
          ? "PROBLEMA IDENTIFICATO: Ci sono veicoli nel database ma nessuno creato negli ultimi 14 giorni. Il filtro temporale nelle statistiche causa il problema degli zero."
          : totalVehiclesRows[0]?.total === 0 
            ? "Nessun veicolo presente nel database."
            : "Veicoli presenti e alcuni creati negli ultimi 14 giorni."
      }
    };

    console.log('🔍 Debug risultati:', debugData);

    return NextResponse.json({
      success: true,
      debug_data: debugData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore nel debug veicoli:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recuperare dati debug veicoli',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}