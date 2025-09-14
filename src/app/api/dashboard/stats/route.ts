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
    const [viaggiStats, clientiStats, fornitoriStats, fatturazioneStats, importStats, sistemaStats] = await Promise.all([
      getViaggiStats(),
      getClientiStats(),
      getFornitoriStats(),
      getFatturazioneStats(),
      getImportStats(),
      getSistemaStats()
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
      sistema: sistemaStats
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
        COUNT(CASE WHEN \`Data Inizio\` >= CURDATE() THEN 1 END) as active,
        COUNT(CASE WHEN \`Data Fine\` < CURDATE() THEN 1 END) as completed
      FROM viaggi_pod
    `) as [any[], any];

    const tabViaggi = tabViaggiRows[0] || { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
    const viaggiPod = viaggiPodRows[0] || { total: 0, active: 0, completed: 0 };

    return {
      active: viaggiPod.active || 0,
      completed: viaggiPod.completed || 0,
      pending: viaggiPod.active || 0,
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
    // Verifica se esiste una tabella fornitori
    const [tables] = await poolGestione.execute(
      "SHOW TABLES LIKE 'fornitori'"
    ) as [any[], any];

    if (tables.length > 0) {
      const [rows] = await poolGestione.execute(`
        SELECT COUNT(*) as total
        FROM fornitori
      `) as [any[], any];
      
      return rows[0] || { total: 0 };
    }

    // Fallback: conta vettori distinti
    const [rows] = await poolGestione.execute(`
      SELECT COUNT(DISTINCT \`Azienda_Vettore\`) as total
      FROM tab_viaggi 
      WHERE \`Azienda_Vettore\` IS NOT NULL AND \`Azienda_Vettore\` != ''
    `) as [any[], any];

    return { total: rows[0]?.total || 0 };
  } catch (error) {
    console.error('Errore nel recuperare statistiche fornitori:', error);
    return { total: 0 };
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