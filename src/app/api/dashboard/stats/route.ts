import { NextRequest, NextResponse } from 'next/server';
import poolGestione from '@/lib/db-gestione';
import poolViaggi from '@/lib/db-viaggi';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    // Statistiche parallele per performance
    const [viaggiStats, clientiStats, fornitoriStats, fatturazioneStats, importStats, sistemaStats, veicoliStats] = await Promise.all([
      getViaggiStats(),
      getClientiStats(),
      getFornitoriStats(),
      getFatturazioneStats(),
      getImportStats(),
      getSistemaStats(),
      getVeicoliStats()
    ]);

    return NextResponse.json({
      viaggi: viaggiStats,
      anagrafiche: {
        clients: clientiStats.total,
        suppliers: fornitoriStats.total,
        users: sistemaStats.users
      },
      fatturazione: fatturazioneStats,
      import: importStats,
      sistema: sistemaStats,
      veicoli: veicoliStats
    });

  } catch (error) {
    console.error('Errore nel recuperare le statistiche dashboard:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Statistiche viaggi
async function getViaggiStats() {
  try {
    // Statistiche da tab_viaggi (database gestionelogistica)
    const [tabViaggiRows] = await poolGestione.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(Data) = CURDATE() THEN 1 END) as today,
        COUNT(CASE WHEN WEEK(Data) = WEEK(CURDATE()) AND YEAR(Data) = YEAR(CURDATE()) THEN 1 END) as thisWeek,
        COUNT(CASE WHEN MONTH(Data) = MONTH(CURDATE()) AND YEAR(Data) = YEAR(CURDATE()) THEN 1 END) as thisMonth
      FROM tab_viaggi
    `) as [any[], any];

    // Statistiche da viaggi_pod (database viaggi_db)
    const [viaggiPodRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN \`Data Inizio\` >= CURDATE() THEN 1 END) as active
      FROM viaggi_pod
    `) as [any[], any];

    // Conta viaggi completati dalla tabella tab_viaggi del database gestionelogistica
    const [viaggiCompletatiRows] = await poolGestione.execute(`
      SELECT COUNT(*) as completed
      FROM tab_viaggi
    `) as [any[], any];

    // Calcola viaggi_pod non presenti in tab_viaggi (aggiornato)
    const [viaggiPodPendingRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as viaggi_pod_mancanti
      FROM viaggi_pod vp
      LEFT JOIN gestionelogistica.tab_viaggi tv ON vp.\`Viaggio\` = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
    `) as [any[], any];

    // Calcola viaggi in monitoraggio (travels) non ancora presenti in tab_viaggi
    const [monitoraggioRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as monitoraggi_aperti
      FROM travels t
      LEFT JOIN gestionelogistica.tab_viaggi tv ON t.numeroViaggio = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
    `) as [any[], any];

    const tabViaggi = tabViaggiRows[0] || { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
    const viaggiPod = viaggiPodRows[0] || { total: 0, active: 0 };
    const viaggiCompletati = viaggiCompletatiRows[0] || { completed: 0 };
    const monitoraggio = monitoraggioRows[0] || { monitoraggi_aperti: 0 };
    const viaggiPodPending = viaggiPodPendingRows[0] || { viaggi_pod_mancanti: 0 };

    return {
      active: monitoraggio.monitoraggi_aperti || 0,
      completed: viaggiCompletati.completed || 0,
      pending: viaggiPodPending.viaggi_pod_mancanti || 0,
      total: tabViaggi.total || 0,
      today: tabViaggi.today || 0,
      thisWeek: tabViaggi.thisWeek || 0,
      thisMonth: tabViaggi.thisMonth || 0
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche viaggi:', error);
    return { active: 0, completed: 0, pending: 0, total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
  }
}

// Statistiche clienti
async function getClientiStats() {
  try {
    // Verifica se esiste una tabella clienti
    const [tables] = await poolGestione.execute(
      "SHOW TABLES LIKE 'clienti'"
    ) as [any[], any];

    if (tables.length > 0) {
      const [rows] = await poolGestione.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as recent
        FROM clienti
      `) as [any[], any];
      
      return rows[0] || { total: 0, recent: 0 };
    }

    // Fallback: conta clienti distinti da tab_viaggi
    const [rows] = await poolGestione.execute(`
      SELECT COUNT(DISTINCT \`Nome Trasportatore\`) as total
      FROM tab_viaggi 
      WHERE \`Nome Trasportatore\` IS NOT NULL AND \`Nome Trasportatore\` != ''
    `) as [any[], any];

    return { total: rows[0]?.total || 0, recent: 0 };
  } catch (error) {
    console.error('Errore nel recuperare statistiche clienti:', error);
    return { total: 0, recent: 0 };
  }
}

// Statistiche fornitori
async function getFornitoriStats() {
  try {
    // Usa la tabella suppliers dal database VIAGGI_DB
    const [rows] = await poolViaggi.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN active = 1 THEN 1 END) as active,
        COUNT(CASE WHEN active = 0 THEN 1 END) as inactive
      FROM suppliers
    `) as [any[], any];
    
    return rows[0] || { total: 0, active: 0, inactive: 0 };
  } catch (error) {
    console.error('Errore nel recuperare statistiche fornitori:', error);
    
    // Fallback: conta vettori distinti da tab_viaggi
    try {
      const [fallbackRows] = await poolGestione.execute(`
        SELECT COUNT(DISTINCT \`Azienda_Vettore\`) as total
        FROM tab_viaggi 
        WHERE \`Azienda_Vettore\` IS NOT NULL AND \`Azienda_Vettore\` != ''
      `) as [any[], any];

      return { total: fallbackRows[0]?.total || 0, active: 0, inactive: 0 };
    } catch (fallbackError) {
      console.error('Errore nel fallback statistiche fornitori:', fallbackError);
      return { total: 0, active: 0, inactive: 0 };
    }
  }
}

// Statistiche fatturazione
async function getFatturazioneStats() {
  try {
    // Verifica se esiste una tabella fatturazione
    const [tables] = await poolGestione.execute(
      "SHOW TABLES LIKE 'fatturazione'"
    ) as [any[], any];

    if (tables.length > 0) {
      const [rows] = await poolGestione.execute(`
        SELECT 
          COUNT(*) as completed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) THEN amount END), 0) as monthly
        FROM fatturazione
      `) as [any[], any];
      
      const result = rows[0] || { completed: 0, pending: 0, monthly: 0 };
      return {
        monthly: `€${(result.monthly / 1000).toFixed(1)}k`,
        pending: `€${(result.pending * 100).toFixed(1)}`,
        completed: result.completed
      };
    }

    // Fallback: statistiche simulate basate sui viaggi
    const [rows] = await poolGestione.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN MONTH(Data) = MONTH(CURDATE()) THEN 1 END) as thisMonth
      FROM tab_viaggi
    `) as [any[], any];

    const result = rows[0] || { total: 0, thisMonth: 0 };
    return {
      monthly: `€${(result.thisMonth * 150 / 1000).toFixed(1)}k`,
      pending: `€${(result.total * 20).toFixed(0)}`,
      completed: result.total
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche fatturazione:', error);
    return { monthly: '€0k', pending: '€0', completed: 0 };
  }
}

// Statistiche import
async function getImportStats() {
  try {
    const [rows] = await poolGestione.execute(`
      SELECT 
        COUNT(*) as files,
        COUNT(CASE WHEN type = 'import' AND status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN type = 'import' AND status = 'error' THEN 1 END) as errors
      FROM system_logs 
      WHERE type = 'import' AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as [any[], any];

    const result = rows[0] || { files: 0, success: 0, errors: 0 };
    return {
      files: result.files || 0,
      pending: Math.max(0, result.files - result.success - result.errors),
      errors: result.errors || 0
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche import:', error);
    return { files: 0, pending: 0, errors: 0 };
  }
}

// Statistiche sistema
async function getSistemaStats() {
  try {
    // Conta configurazioni
    const [configRows] = await poolGestione.execute(`
      SELECT COUNT(*) as configs
      FROM system_config
    `) as [any[], any];

    // Conta log recenti
    const [logRows] = await poolGestione.execute(`
      SELECT COUNT(*) as logs
      FROM system_logs 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `) as [any[], any];

    // Conta utenti (verifica se esiste tabella users)
    let userCount = 0;
    try {
      const [userTables] = await poolGestione.execute(
        "SHOW TABLES LIKE 'users'"
      ) as [any[], any];

      if (userTables.length > 0) {
        const [userRows] = await poolGestione.execute(`
          SELECT COUNT(*) as users FROM users
        `) as [any[], any];
        userCount = userRows[0]?.users || 0;
      }
    } catch (error) {
      console.error('Errore nel contare gli utenti:', error);
    }

    return {
      configs: configRows[0]?.configs || 0,
      logs: `${(logRows[0]?.logs || 0)}`,
      users: userCount
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche sistema:', error);
    return { configs: 0, logs: '0', users: 0 };
  }
}

// Statistiche veicoli
async function getVeicoliStats() {
  try {
    // Conta veicoli totali dal database VIAGGI_DB
    const [veicoliRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as total
      FROM vehicles
    `) as [any[], any];

    // Conta scadenze attive
    const [scadenzeRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as active_schedules
      FROM vehicle_schedules
      WHERE data_scadenza >= CURDATE() AND status = 'pending'
    `) as [any[], any];

    // Conta preventivi aperti
    const [preventiviRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as open_quotes
      FROM maintenance_quotes
      WHERE status = 'pending'
    `) as [any[], any];

    return {
      total: veicoliRows[0]?.total || 0,
      activeSchedules: scadenzeRows[0]?.active_schedules || 0,
      openQuotes: preventiviRows[0]?.open_quotes || 0
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche veicoli:', error);
    return { total: 0, activeSchedules: 0, openQuotes: 0 };
  }
}