import { NextResponse } from 'next/server';
import poolGestione from '@/lib/db-gestione';
import poolViaggi from '@/lib/db-viaggi';
import poolBackup from '@/lib/db-backup';

// Funzione helper per calcolare trend
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Funzione helper per formattare valuta
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

export async function GET() {
  try {
    // Statistiche parallele per performance - STESSE IDENTICHE QUERY DELLA DASHBOARD PRINCIPALE
    const [viaggiStats, clientiStats, fornitoriStats, fatturazioneStats, importStats, sistemaStats, veicoliStats] = await Promise.all([
      getViaggiStats(),
      getClientiStats(),
      getFornitoriStats(),
      getFatturazioneStats(),
      getImportStats(),
      getSistemaStats(),
      getVeicoliStats()
    ]);

    // Calcola statistiche per ogni sezione usando i dati reali
    const anagraficheStats = [
      fornitoriStats.active || 0, // Usa fornitori ATTIVI dalla tabella suppliers in viaggi_db
      8, // Categorie - valore simulato
      sistemaStats.users || 0
    ];

    const analyticsStats = [
      clientiStats.total || 0, // Delivery Reports
      viaggiStats.completed || 0, // Viaggi Completati
      viaggiStats.completed > 0 ? Math.round((viaggiStats.completed / (viaggiStats.total || 1)) * 100) : 0, // Performance Score %
      1247 // Dashboard Views - simulato
    ];

    const fatturazioneStatsArray = [
      parseFloat(fatturazioneStats.monthly.replace(/[€k,]/g, '')) * 1000 || 0, // Ricavi Mensili
      fatturazioneStats.completed || 0, // Fatture Emesse
      Math.floor((fatturazioneStats.completed || 0) * 0.8), // Pagamenti (80% delle fatture)
      fornitoriStats.total || 0 // Vettori Terzi
    ];

    const importStatsArray = [
      importStats.files || 0, // File Importati Oggi
      viaggiStats.total || 0, // POD Elaborati (usa viaggi totali)
      clientiStats.total || 0, // Consegne Importate
      importStats.errors || 0 // Errori Import
    ];

    const veicoliStatsArray = [
      veicoliStats.total || 0, // Veicoli Attivi
      veicoliStats.activeSchedules || 0, // Scadenze Prossime
      veicoliStats.openQuotes || 0, // Preventivi Aperti
      veicoliStats.overdueSchedules || 0, // Revisioni Scadute
      veicoliStats.interventions || 0 // Intervention Types
    ];

    const sistemaStatsArray = [
      sistemaStats.backups || 0, // Backup Completati
      sistemaStats.uptime || 99, // Uptime Sistema %
      sistemaStats.connections || 0, // Connessioni Attive
      sistemaStats.configs || 0, // Configurazioni Sistema
      sistemaStats.users || 0 // Utenti Sistema
    ];

    const viaggiStatsArray = [
      viaggiStats.active || 0, // Monitoraggi Pending (travels non in tab_viaggi)
      viaggiStats.pending || 0, // Viaggi Pod Pending (viaggi_pod non in tab_viaggi)
      viaggiStats.completed || 0 // Viaggi Completati (tab_viaggi)
    ];

    // Struttura dati identica alla dashboard principale
    const dashboardData = {
      anagrafiche: [
        {
          title: "Fornitori Attivi",
          value: anagraficheStats[0].toString(),
          trend: calculateTrend(anagraficheStats[0], Math.max(1, anagraficheStats[0] - 1)),
          icon: "Building"
        },
        {
          title: "Categorie",
          value: anagraficheStats[1].toString(),
          trend: calculateTrend(anagraficheStats[1], Math.max(1, anagraficheStats[1] - 1)),
          icon: "Tag"
        }
      ],
      analytics: [
        {
          title: "Delivery Reports",
          value: analyticsStats[0].toString(),
          trend: calculateTrend(analyticsStats[0], Math.max(1, analyticsStats[0] - 50)),
          icon: "FileText"
        },
        {
          title: "Viaggi Completati",
          value: analyticsStats[1].toString(),
          trend: calculateTrend(analyticsStats[1], Math.max(1, analyticsStats[1] - 10)),
          icon: "MapPin"
        },
        {
          title: "Performance Score",
          value: `${analyticsStats[2]}%`,
          trend: calculateTrend(analyticsStats[2], Math.max(1, analyticsStats[2] - 5)),
          icon: "TrendingUp"
        },
        {
          title: "Dashboard Views",
          value: analyticsStats[3].toString(),
          trend: calculateTrend(analyticsStats[3], Math.max(1, analyticsStats[3] - 100)),
          icon: "Eye"
        }
      ],
      fatturazione: [
        {
          title: "Ricavi Mensili",
          value: formatCurrency(fatturazioneStatsArray[0]),
          trend: calculateTrend(fatturazioneStatsArray[0], Math.max(1, fatturazioneStatsArray[0] - 5000)),
          icon: "Euro"
        },
        {
          title: "Fatture Emesse",
          value: fatturazioneStatsArray[1].toString(),
          trend: calculateTrend(fatturazioneStatsArray[1], Math.max(1, fatturazioneStatsArray[1] - 5)),
          icon: "Receipt"
        },
        {
          title: "Pagamenti",
          value: fatturazioneStatsArray[2].toString(),
          trend: calculateTrend(fatturazioneStatsArray[2], Math.max(1, fatturazioneStatsArray[2] - 3)),
          icon: "CreditCard"
        },
        {
          title: "Vettori Terzi",
          value: fatturazioneStatsArray[3].toString(),
          trend: calculateTrend(fatturazioneStatsArray[3], Math.max(1, fatturazioneStatsArray[3] - 2)),
          icon: "Truck"
        }
      ],
      import: [
        {
          title: "File Importati Oggi",
          value: importStatsArray[0].toString(),
          trend: calculateTrend(importStatsArray[0], Math.max(1, importStatsArray[0] - 3)),
          icon: "Upload"
        },
        {
          title: "POD Elaborati",
          value: importStatsArray[1].toString(),
          trend: calculateTrend(importStatsArray[1], Math.max(1, importStatsArray[1] - 10)),
          icon: "Package"
        },
        {
          title: "Consegne Importate",
          value: importStatsArray[2].toString(),
          trend: calculateTrend(importStatsArray[2], Math.max(1, importStatsArray[2] - 20)),
          icon: "Download"
        },
        {
          title: "Errori Import",
          value: importStatsArray[3].toString(),
          trend: calculateTrend(importStatsArray[3], Math.max(1, importStatsArray[3] + 2)) * -1, // Negativo perché meno errori è meglio
          icon: "AlertTriangle"
        }
      ],
      veicoli: [
        {
          title: "Veicoli Attivi",
          value: veicoliStatsArray[0].toString(),
          trend: calculateTrend(veicoliStats.total, veicoliStats.totalPrevWeek),
          icon: "Car"
        },
        {
          title: "Scadenze Prossime",
          value: veicoliStatsArray[1].toString(),
          trend: calculateTrend(veicoliStats.activeSchedules, veicoliStats.activeSchedulesPrevWeek) * -1, // Negativo perché meno scadenze è meglio
          icon: "Calendar"
        },
        {
          title: "Preventivi Aperti",
          value: veicoliStatsArray[2].toString(),
          trend: calculateTrend(veicoliStats.openQuotes, veicoliStats.openQuotesPrevWeek),
          icon: "FileText"
        },
        {
          title: "Revisioni Scadute",
          value: veicoliStatsArray[3].toString(),
          trend: calculateTrend(veicoliStats.overdueSchedules, veicoliStats.overdueSchedulesPrevWeek) * -1, // Negativo perché meno scadenze è meglio
          icon: "AlertCircle"
        },
        {
          title: "Intervention Types",
          value: veicoliStatsArray[4].toString(),
          trend: calculateTrend(veicoliStats.interventions, veicoliStats.interventionsPrevWeek),
          icon: "Tool"
        }
      ],
      sistema: [
        {
          title: "Backup Completati",
          value: sistemaStatsArray[0].toString(),
          trend: calculateTrend(sistemaStats.backups, sistemaStats.backupsPrevWeek),
          icon: "HardDrive"
        },
        {
          title: "Uptime Sistema",
          value: `${sistemaStatsArray[1]}%`,
          trend: calculateTrend(sistemaStats.uptime, sistemaStats.uptimePrevWeek),
          icon: "Activity"
        },
        {
          title: "Connessioni Attive",
          value: sistemaStatsArray[2].toString(),
          trend: calculateTrend(sistemaStats.connections, sistemaStats.connectionsPrevWeek),
          icon: "Wifi"
        },
        {
          title: "Configurazioni Sistema",
          value: sistemaStatsArray[3].toString(),
          trend: calculateTrend(sistemaStats.configs, sistemaStats.configsPrevWeek),
          icon: "Settings"
        },
        {
          title: "Utenti Sistema",
          value: sistemaStatsArray[4].toString(),
          trend: calculateTrend(sistemaStats.users, sistemaStats.users),
          icon: "UserCheck"
        }
      ],
      supporto: [
        {
          title: "Ticket Aperti",
          value: "5", // Simulato - non abbiamo tabella supporto
          trend: -2,
          icon: "HelpCircle"
        },
        {
          title: "Guide Disponibili",
          value: "12", // Simulato - non abbiamo tabella guide
          trend: 1,
          icon: "FileText"
        },
        {
          title: "Documenti Tecnici",
          value: "8", // Simulato - non abbiamo tabella documenti
          trend: 0,
          icon: "Settings"
        }
      ],
      viaggi: [
        {
          title: "Monitoraggi Pending",
          value: viaggiStatsArray[0].toString(),
          trend: calculateTrend(viaggiStats.active, viaggiStats.activePrevWeek),
          icon: "Truck"
        },
        {
          title: "Viaggi Pod Pending",
          value: viaggiStatsArray[1].toString(),
          trend: calculateTrend(viaggiStats.pending, viaggiStats.pendingPrevWeek) * -1, // Negativo perché meno POD mancanti è meglio
          icon: "AlertTriangle"
        },
        {
          title: "Viaggi Completati",
          value: viaggiStatsArray[2].toString(),
          trend: calculateTrend(viaggiStats.completedThisWeek, viaggiStats.completedPrevWeek),
          icon: "CheckCircle"
        }
      ]
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Errore nel recupero delle statistiche dashboard:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// STESSE IDENTICHE FUNZIONI DELLA DASHBOARD PRINCIPALE

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

    // Conta viaggi completati con confronto settimanale
    const [viaggiCompletatiRows] = await poolGestione.execute(`
      SELECT 
        COUNT(*) as completed,
        COUNT(CASE WHEN WEEK(Data) = WEEK(CURDATE()) AND YEAR(Data) = YEAR(CURDATE()) THEN 1 END) as completed_this_week,
        COUNT(CASE WHEN WEEK(Data) = WEEK(CURDATE()) - 1 AND YEAR(Data) = YEAR(CURDATE()) THEN 1 END) as completed_prev_week
      FROM tab_viaggi
    `) as [any[], any];

    // Calcola viaggi_pod non presenti in tab_viaggi con confronto settimanale
    const [viaggiPodPendingRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(*) as viaggi_pod_mancanti,
        COUNT(CASE WHEN WEEK(vp.\`Data Inizio\`) = WEEK(CURDATE()) AND YEAR(vp.\`Data Inizio\`) = YEAR(CURDATE()) THEN 1 END) as viaggi_pod_mancanti_this_week,
        COUNT(CASE WHEN WEEK(vp.\`Data Inizio\`) = WEEK(CURDATE()) - 1 AND YEAR(vp.\`Data Inizio\`) = YEAR(CURDATE()) THEN 1 END) as viaggi_pod_mancanti_prev_week
      FROM viaggi_pod vp
      LEFT JOIN gestionelogistica.tab_viaggi tv ON vp.\`Viaggio\` = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
    `) as [any[], any];

    // Calcola viaggi in monitoraggio (travels) non ancora presenti in tab_viaggi con confronto settimanale
    const [monitoraggioRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(*) as monitoraggi_aperti,
        COUNT(CASE WHEN WEEK(t.dataOraInizioViaggio) = WEEK(CURDATE()) AND YEAR(t.dataOraInizioViaggio) = YEAR(CURDATE()) THEN 1 END) as monitoraggi_aperti_this_week,
        COUNT(CASE WHEN WEEK(t.dataOraInizioViaggio) = WEEK(CURDATE()) - 1 AND YEAR(t.dataOraInizioViaggio) = YEAR(CURDATE()) THEN 1 END) as monitoraggi_aperti_prev_week
      FROM travels t
      LEFT JOIN gestionelogistica.tab_viaggi tv ON t.numeroViaggio = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
    `) as [any[], any];

    const tabViaggi = tabViaggiRows[0] || { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
    const viaggiCompletati = viaggiCompletatiRows[0] || { completed: 0, completed_this_week: 0, completed_prev_week: 0 };
    const monitoraggio = monitoraggioRows[0] || { monitoraggi_aperti: 0, monitoraggi_aperti_this_week: 0, monitoraggi_aperti_prev_week: 0 };
    const viaggiPodPending = viaggiPodPendingRows[0] || { viaggi_pod_mancanti: 0, viaggi_pod_mancanti_this_week: 0, viaggi_pod_mancanti_prev_week: 0 };

    return {
      active: monitoraggio.monitoraggi_aperti || 0,
      activePrevWeek: monitoraggio.monitoraggi_aperti_prev_week || 0,
      completed: viaggiCompletati.completed || 0,
      completedThisWeek: viaggiCompletati.completed_this_week || 0,
      completedPrevWeek: viaggiCompletati.completed_prev_week || 0,
      pending: viaggiPodPending.viaggi_pod_mancanti || 0,
      pendingPrevWeek: viaggiPodPending.viaggi_pod_mancanti_prev_week || 0,
      total: tabViaggi.total || 0,
      today: tabViaggi.today || 0,
      thisWeek: tabViaggi.thisWeek || 0,
      thisMonth: tabViaggi.thisMonth || 0
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche viaggi:', error);
    return { 
      active: 0, activePrevWeek: 0, completed: 0, completedThisWeek: 0, completedPrevWeek: 0, 
      pending: 0, pendingPrevWeek: 0, total: 0, today: 0, thisWeek: 0, thisMonth: 0 
    };
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

// Statistiche fornitori - QUERY CORRETTA DAL DATABASE VIAGGI_DB
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
    // Conta configurazioni con confronto settimanale
    const [configRows] = await poolBackup.execute(`
      SELECT 
        COUNT(*) as configs,
        COUNT(CASE WHEN WEEK(updated_at) = WEEK(CURDATE()) AND YEAR(updated_at) = YEAR(CURDATE()) THEN 1 END) as configs_this_week,
        COUNT(CASE WHEN WEEK(updated_at) = WEEK(CURDATE()) - 1 AND YEAR(updated_at) = YEAR(CURDATE()) THEN 1 END) as configs_prev_week
      FROM backup_configs
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
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

    // Backup completati con confronto settimanale - DATI REALI dal database backup_management
    let backupCount = 0;
    let backupCountPrevWeek = 0;
    try {
      const [backupRows] = await poolBackup.execute(`
        SELECT 
          COUNT(*) as backups,
          COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as backups_this_week,
          COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) - 1 AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as backups_prev_week
        FROM backup_jobs 
        WHERE status = 'completed' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `) as [any[], any];
      backupCount = backupRows[0]?.backups_this_week || 0;
      backupCountPrevWeek = backupRows[0]?.backups_prev_week || 0;
      console.log(`Backup completati questa settimana: ${backupCount}, settimana precedente: ${backupCountPrevWeek}`);
    } catch (error) {
      console.error('Errore nel contare i backup dal database backup_management:', error);
      // Restituisce 0 se il database non è disponibile - NESSUN VALORE SIMULATO
      backupCount = 0;
      backupCountPrevWeek = 0;
    }

    // Calcola uptime sistema con confronto settimanale (percentuale di successo vs errori)
    let uptimePercentage = 99;
    let uptimePercentagePrevWeek = 99;
    try {
      const [uptimeRows] = await poolGestione.execute(`
        SELECT 
          SUM(CASE WHEN status = 'error' AND WEEK(timestamp) = WEEK(CURDATE()) AND YEAR(timestamp) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as errors_this_week,
          SUM(CASE WHEN WEEK(timestamp) = WEEK(CURDATE()) AND YEAR(timestamp) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as total_this_week,
          SUM(CASE WHEN status = 'error' AND WEEK(timestamp) = WEEK(CURDATE()) - 1 AND YEAR(timestamp) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as errors_prev_week,
          SUM(CASE WHEN WEEK(timestamp) = WEEK(CURDATE()) - 1 AND YEAR(timestamp) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as total_prev_week
        FROM system_logs 
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      `) as [any[], any];
      
      const errorsThisWeek = uptimeRows[0]?.errors_this_week || 0;
      const totalThisWeek = uptimeRows[0]?.total_this_week || 1;
      const errorsPrevWeek = uptimeRows[0]?.errors_prev_week || 0;
      const totalPrevWeek = uptimeRows[0]?.total_prev_week || 1;
      
      uptimePercentage = Math.round(((totalThisWeek - errorsThisWeek) / totalThisWeek) * 100);
      uptimePercentagePrevWeek = Math.round(((totalPrevWeek - errorsPrevWeek) / totalPrevWeek) * 100);
    } catch (error) {
      console.error('Errore nel calcolare uptime:', error);
    }

    // Connessioni attive con confronto settimanale (accessi unici)
    let activeConnections = 0;
    let activeConnectionsPrevWeek = 0;
    try {
      const [connectionRows] = await poolGestione.execute(`
        SELECT 
          COUNT(DISTINCT CASE WHEN WEEK(timestamp) = WEEK(CURDATE()) AND YEAR(timestamp) = YEAR(CURDATE()) THEN user END) as connections_this_week,
          COUNT(DISTINCT CASE WHEN WEEK(timestamp) = WEEK(CURDATE()) - 1 AND YEAR(timestamp) = YEAR(CURDATE()) THEN user END) as connections_prev_week
        FROM system_logs 
        WHERE type = 'access' 
        AND timestamp >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      `) as [any[], any];
      activeConnections = connectionRows[0]?.connections_this_week || 0;
      activeConnectionsPrevWeek = connectionRows[0]?.connections_prev_week || 0;
    } catch (error) {
      console.error('Errore nel contare connessioni attive:', error);
    }



    return {
      configs: configRows[0]?.configs || 0,
      configsPrevWeek: configRows[0]?.configs_prev_week || 0,
      logs: logRows[0]?.logs || 0,
      users: userCount,
      backups: backupCount,
      backupsPrevWeek: backupCountPrevWeek,
      uptime: uptimePercentage,
      uptimePrevWeek: uptimePercentagePrevWeek,
      connections: activeConnections,
      connectionsPrevWeek: activeConnectionsPrevWeek
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche sistema:', error);
    return { 
      configs: 0, 
      configsPrevWeek: 0,
      logs: 0, 
      users: 0, 
      backups: 0, 
      backupsPrevWeek: 0,
      uptime: 99, 
      uptimePrevWeek: 99,
      connections: 0,
      connectionsPrevWeek: 0
    };
  }
}

// Statistiche veicoli - QUERY DAL DATABASE VIAGGI_DB
async function getVeicoliStats() {
  try {
    // Conta veicoli totali (SENZA filtro temporale per il totale)
    const [veicoliTotalRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as total
      FROM vehicles
    `) as [any[], any];

    // Conta veicoli per trend settimanali (CON filtro temporale solo per i trend)
    const [veicoliTrendRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(CASE WHEN WEEK(createdAt) = WEEK(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE()) THEN 1 END) as vehicles_this_week,
        COUNT(CASE WHEN WEEK(createdAt) = WEEK(CURDATE()) - 1 AND YEAR(createdAt) = YEAR(CURDATE()) THEN 1 END) as vehicles_prev_week
      FROM vehicles
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `) as [any[], any];

    // Conta scadenze attive (SENZA filtro temporale per il totale)
    const [scadenzeTotalRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as active_schedules
      FROM vehicle_schedules
      WHERE (
        (booking_date IS NOT NULL AND booking_date >= CURDATE()) OR 
        (booking_date IS NULL AND data_scadenza >= CURDATE())
      ) AND status = 'pending'
    `) as [any[], any];

    // Conta scadenze attive per trend settimanali (CON filtro temporale solo per i trend)
    const [scadenzeTrendRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as schedules_this_week,
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) - 1 AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as schedules_prev_week
      FROM vehicle_schedules
      WHERE (
        (booking_date IS NOT NULL AND booking_date >= CURDATE()) OR 
        (booking_date IS NULL AND data_scadenza >= CURDATE())
      ) AND status = 'pending'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `) as [any[], any];

    // Conta scadenze scadute (SENZA filtro temporale per il totale)
    const [overdueTotalRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as overdue_schedules
      FROM vehicle_schedules
      WHERE (
        (booking_date IS NOT NULL AND booking_date < CURDATE()) OR 
        (booking_date IS NULL AND data_scadenza < CURDATE())
      ) AND status = 'pending'
    `) as [any[], any];

    // Conta scadenze scadute per trend settimanali (CON filtro temporale solo per i trend)
    const [overdueTrendRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as overdue_this_week,
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) - 1 AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as overdue_prev_week
      FROM vehicle_schedules
      WHERE (
        (booking_date IS NOT NULL AND booking_date < CURDATE()) OR 
        (booking_date IS NULL AND data_scadenza < CURDATE())
      ) AND status = 'pending'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `) as [any[], any];

    // Conta preventivi aperti (SENZA filtro temporale per il totale)
    const [preventiviTotalRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as open_quotes
      FROM maintenance_quotes
      WHERE status = 'pending'
    `) as [any[], any];

    // Conta preventivi aperti per trend settimanali (CON filtro temporale solo per i trend)
    const [preventiviTrendRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as quotes_this_week,
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) - 1 AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as quotes_prev_week
      FROM maintenance_quotes
      WHERE status = 'pending'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `) as [any[], any];

    // Conta intervention types attivi (SENZA filtro temporale per il totale)
    const [interventionTotalRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as intervention_types
      FROM intervention_types 
      WHERE active = TRUE
    `) as [any[], any];

    // Conta intervention types per trend settimanali (CON filtro temporale solo per i trend)
    const [interventionTrendRows] = await poolViaggi.execute(`
      SELECT 
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as interventions_this_week,
        COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) - 1 AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as interventions_prev_week
      FROM intervention_types 
      WHERE active = TRUE
      AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `) as [any[], any];

    const interventions = interventionTotalRows[0]?.intervention_types || 0;
    const interventionsThisWeek = interventionTrendRows[0]?.interventions_this_week || 0;
    const interventionsPrevWeek = interventionTrendRows[0]?.interventions_prev_week || 0;

    return {
      total: veicoliTotalRows[0]?.total || 0,
      totalPrevWeek: veicoliTrendRows[0]?.vehicles_prev_week || 0,
      activeSchedules: scadenzeTotalRows[0]?.active_schedules || 0,
      activeSchedulesPrevWeek: scadenzeTrendRows[0]?.schedules_prev_week || 0,
      overdueSchedules: overdueTotalRows[0]?.overdue_schedules || 0,
      overdueSchedulesPrevWeek: overdueTrendRows[0]?.overdue_prev_week || 0,
      openQuotes: preventiviTotalRows[0]?.open_quotes || 0,
      openQuotesPrevWeek: preventiviTrendRows[0]?.quotes_prev_week || 0,
      interventions,
      interventionsPrevWeek
    };
  } catch (error) {
    console.error('Errore nel recuperare statistiche veicoli:', error);
    return { 
      total: 0, 
      totalPrevWeek: 0,
      activeSchedules: 0, 
      activeSchedulesPrevWeek: 0,
      overdueSchedules: 0, 
      overdueSchedulesPrevWeek: 0,
      openQuotes: 0, 
      openQuotesPrevWeek: 0,
      interventions: 0, 
      interventionsPrevWeek: 0 
    };
  }
}