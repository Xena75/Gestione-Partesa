const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

// Configurazione database
const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: process.env.DB_VIAGGI_PORT || 3306,
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
};

/**
 * Mappa i tipi di ferie ai campi del bilancio
 */
function mapLeaveTypeToBalanceField(leaveType) {
  switch (leaveType) {
    case 'ferie':
      return 'vacation_days_used';
    case 'malattia':
      return 'sick_days_used';
    case 'permesso':
    case 'congedo':
    case 'L. 104/92':
      return 'personal_days_used';
    default:
      return null;
  }
}

/**
 * Calcola i totali per dipendente e anno dalle richieste approvate
 */
async function calculateLeaveUsageFromRequests(connection) {
  console.log('📊 Analisi richieste ferie approvate...');
  
  const [rows] = await connection.execute(`
    SELECT 
      employee_id,
      YEAR(start_date) as year,
      leave_type,
      SUM(days_requested) as total_days
    FROM employee_leave_requests 
    WHERE status = 'approved' 
      AND days_requested > 0
    GROUP BY employee_id, YEAR(start_date), leave_type
    ORDER BY employee_id, year, leave_type
  `);
  
  console.log(`✅ Trovate ${rows.length} combinazioni dipendente/anno/tipo da elaborare`);
  
  // Raggruppa per dipendente e anno
  const employeeYearData = {};
  
  for (const row of rows) {
    const key = `${row.employee_id}_${row.year}`;
    
    if (!employeeYearData[key]) {
      employeeYearData[key] = {
        employee_id: row.employee_id,
        year: row.year,
        vacation_days_used: 0,
        sick_days_used: 0,
        personal_days_used: 0
      };
    }
    
    const balanceField = mapLeaveTypeToBalanceField(row.leave_type);
    if (balanceField) {
      employeeYearData[key][balanceField] += row.total_days;
      console.log(`   ${row.employee_id} (${row.year}) - ${row.leave_type}: ${row.total_days} giorni → ${balanceField}`);
    } else {
      console.log(`   ⚠️ Tipo ferie non riconosciuto: ${row.leave_type} per ${row.employee_id}`);
    }
  }
  
  return Object.values(employeeYearData);
}

/**
 * Ottiene i bilanci attuali dal database
 */
async function getCurrentBalances(connection) {
  console.log('📋 Recupero bilanci attuali...');
  
  const [rows] = await connection.execute(`
    SELECT 
      employee_id,
      year,
      vacation_days_used,
      sick_days_used,
      personal_days_used,
      vacation_days_total,
      vacation_hours_remaining,
      ex_holiday_hours_remaining,
      rol_hours_remaining
    FROM employee_leave_balance
    ORDER BY employee_id, year
  `);
  
  console.log(`✅ Trovati ${rows.length} bilanci esistenti`);
  
  const balances = {};
  for (const row of rows) {
    const key = `${row.employee_id}_${row.year}`;
    balances[key] = row;
  }
  
  return balances;
}

/**
 * Confronta i dati calcolati con quelli attuali
 */
function compareBalances(calculatedData, currentBalances) {
  console.log('\n🔍 Confronto dati calcolati vs attuali...');
  
  const updates = [];
  const creates = [];
  
  for (const calculated of calculatedData) {
    const key = `${calculated.employee_id}_${calculated.year}`;
    const current = currentBalances[key];
    
    if (!current) {
      // Nuovo record da creare
      creates.push({
        employee_id: calculated.employee_id,
        year: calculated.year,
        vacation_days_used: calculated.vacation_days_used,
        sick_days_used: calculated.sick_days_used,
        personal_days_used: calculated.personal_days_used,
        vacation_days_total: 26, // Default
        vacation_hours_remaining: 0,
        ex_holiday_hours_remaining: 0,
        rol_hours_remaining: 0
      });
      
      console.log(`➕ NUOVO: ${calculated.employee_id} (${calculated.year})`);
      console.log(`   Ferie: ${calculated.vacation_days_used}, Malattia: ${calculated.sick_days_used}, Permessi: ${calculated.personal_days_used}`);
      
    } else {
      // Verifica se serve aggiornamento
      const needsUpdate = 
        current.vacation_days_used !== calculated.vacation_days_used ||
        current.sick_days_used !== calculated.sick_days_used ||
        current.personal_days_used !== calculated.personal_days_used;
      
      if (needsUpdate) {
        updates.push({
          employee_id: calculated.employee_id,
          year: calculated.year,
          old_vacation_days_used: current.vacation_days_used,
          new_vacation_days_used: calculated.vacation_days_used,
          old_sick_days_used: current.sick_days_used,
          new_sick_days_used: calculated.sick_days_used,
          old_personal_days_used: current.personal_days_used,
          new_personal_days_used: calculated.personal_days_used,
          // Mantieni gli altri valori esistenti
          vacation_days_total: current.vacation_days_total,
          vacation_hours_remaining: current.vacation_hours_remaining,
          ex_holiday_hours_remaining: current.ex_holiday_hours_remaining,
          rol_hours_remaining: current.rol_hours_remaining
        });
        
        console.log(`🔄 AGGIORNA: ${calculated.employee_id} (${calculated.year})`);
        console.log(`   Ferie: ${current.vacation_days_used} → ${calculated.vacation_days_used}`);
        console.log(`   Malattia: ${current.sick_days_used} → ${calculated.sick_days_used}`);
        console.log(`   Permessi: ${current.personal_days_used} → ${calculated.personal_days_used}`);
      } else {
        console.log(`✅ OK: ${calculated.employee_id} (${calculated.year}) - già corretto`);
      }
    }
  }
  
  return { updates, creates };
}

/**
 * Esegue gli aggiornamenti nel database
 */
async function executeUpdates(connection, updates, creates) {
  let successCount = 0;
  let errorCount = 0;
  
  console.log('\n🔄 Esecuzione aggiornamenti...');
  
  // Aggiornamenti
  for (const update of updates) {
    try {
      await connection.execute(`
        UPDATE employee_leave_balance 
        SET 
          vacation_days_used = ?,
          sick_days_used = ?,
          personal_days_used = ?,
          last_updated = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND year = ?
      `, [
        update.new_vacation_days_used,
        update.new_sick_days_used,
        update.new_personal_days_used,
        update.employee_id,
        update.year
      ]);
      
      console.log(`✅ Aggiornato: ${update.employee_id} (${update.year})`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Errore aggiornamento ${update.employee_id} (${update.year}):`, error.message);
      errorCount++;
    }
  }
  
  // Nuovi record
  for (const create of creates) {
    try {
      await connection.execute(`
        INSERT INTO employee_leave_balance (
          employee_id, year, month, vacation_days_total, vacation_days_used,
          vacation_hours_remaining, ex_holiday_hours_remaining, rol_hours_remaining,
          sick_days_used, personal_days_used
        ) VALUES (?, ?, 12, ?, ?, ?, ?, ?, ?, ?)
      `, [
        create.employee_id,
        create.year,
        create.vacation_days_total,
        create.vacation_days_used,
        create.vacation_hours_remaining,
        create.ex_holiday_hours_remaining,
        create.rol_hours_remaining,
        create.sick_days_used,
        create.personal_days_used
      ]);
      
      console.log(`✅ Creato: ${create.employee_id} (${create.year})`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Errore creazione ${create.employee_id} (${create.year}):`, error.message);
      errorCount++;
    }
  }
  
  return { successCount, errorCount };
}

async function recalculateLeaveBalances() {
  let connection;
  
  try {
    console.log('🚀 Avvio script ricalcolo bilanci ferie...');
    console.log('📊 Configurazione database:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    });
    
    console.log('🔌 Tentativo di connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connessione al database stabilita');
    
    // 1. Calcola i totali dalle richieste approvate
    const calculatedData = await calculateLeaveUsageFromRequests(connection);
    
    if (calculatedData.length === 0) {
      console.log('ℹ️ Nessuna richiesta approvata trovata nel database');
      return;
    }
    
    // 2. Ottieni i bilanci attuali
    const currentBalances = await getCurrentBalances(connection);
    
    // 3. Confronta e identifica le modifiche necessarie
    const { updates, creates } = compareBalances(calculatedData, currentBalances);
    
    console.log(`\n📊 RIEPILOGO ANALISI:`);
    console.log(`   Dipendenti/anni analizzati: ${calculatedData.length}`);
    console.log(`   Bilanci da aggiornare: ${updates.length}`);
    console.log(`   Nuovi bilanci da creare: ${creates.length}`);
    console.log(`   Bilanci già corretti: ${calculatedData.length - updates.length - creates.length}`);
    
    if (updates.length === 0 && creates.length === 0) {
      console.log('✅ Tutti i bilanci sono già corretti!');
      return;
    }
    
    // Mostra dettaglio delle modifiche
    if (updates.length > 0) {
      console.log(`\n📋 DETTAGLIO AGGIORNAMENTI (${updates.length}):`);
      updates.forEach((update, index) => {
        console.log(`${index + 1}. ${update.employee_id} (${update.year})`);
        if (update.old_vacation_days_used !== update.new_vacation_days_used) {
          console.log(`   Ferie: ${update.old_vacation_days_used} → ${update.new_vacation_days_used}`);
        }
        if (update.old_sick_days_used !== update.new_sick_days_used) {
          console.log(`   Malattia: ${update.old_sick_days_used} → ${update.new_sick_days_used}`);
        }
        if (update.old_personal_days_used !== update.new_personal_days_used) {
          console.log(`   Permessi: ${update.old_personal_days_used} → ${update.new_personal_days_used}`);
        }
      });
    }
    
    if (creates.length > 0) {
      console.log(`\n📋 NUOVI BILANCI DA CREARE (${creates.length}):`);
      creates.forEach((create, index) => {
        console.log(`${index + 1}. ${create.employee_id} (${create.year})`);
        console.log(`   Ferie: ${create.vacation_days_used}, Malattia: ${create.sick_days_used}, Permessi: ${create.personal_days_used}`);
      });
    }
    
    // Chiedi conferma prima di procedere
    console.log(`\n⚠️ ATTENZIONE: Stai per modificare ${updates.length + creates.length} record nel database.`);
    console.log('   Premi CTRL+C per annullare o attendi 5 secondi per continuare...');
    
    // Attesa di 5 secondi
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Esegui le modifiche
    const { successCount, errorCount } = await executeUpdates(connection, updates, creates);
    
    console.log(`\n🎉 RICALCOLO COMPLETATO!`);
    console.log(`   Record aggiornati/creati con successo: ${successCount}`);
    console.log(`   Errori durante l'operazione: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('\n✅ I bilanci ferie sono stati ricalcolati correttamente!');
      console.log('   Puoi ora verificare i risultati nell\'interfaccia web.');
    }
    
  } catch (error) {
    console.error('💥 ERRORE GENERALE:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connessione database chiusa');
    }
  }
}

// Esegui lo script
if (require.main === module) {
  recalculateLeaveBalances().catch(console.error);
}

module.exports = { recalculateLeaveBalances };