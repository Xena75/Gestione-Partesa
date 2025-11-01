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
 * Calcola i giorni lavorativi tra due date (escludendo sabati e domeniche)
 */
function calculateWorkingDays(startDate, endDate) {
  function parseDate(dateString) {
    if (!dateString) return null;
    
    // Se è già in formato YYYY-MM-DD
    if (dateString.includes('-') && dateString.split('-')[0].length === 4) {
      return new Date(dateString);
    }
    
    // Se è in formato DD/MM/YYYY
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    
    return new Date(dateString);
  }
  
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error(`❌ Date non valide: start="${startDate}", end="${endDate}"`);
    return 0;
  }
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

async function recalculateLeaveRequestDays() {
  let connection;
  
  try {
    console.log('🚀 Avvio script ricalcolo giorni richieste ferie...');
    console.log('📊 Configurazione database:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    });
    
    console.log('🔌 Tentativo di connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connessione al database stabilita');
    
    const [rows] = await connection.execute(`
      SELECT 
        id, employee_id, leave_type, start_date, end_date, days_requested, status
      FROM employee_leave_requests 
      WHERE leave_type IN ('ferie', 'malattia', 'congedo')
      ORDER BY id ASC
    `);
    
    console.log(`📊 Trovate ${rows.length} richieste da analizzare`);
    
    if (rows.length === 0) {
      console.log('ℹ️ Nessuna richiesta trovata nel database');
      return;
    }
    
    const updates = [];
    let errorCount = 0;
    
    for (const request of rows) {
      try {
        const startDateStr = request.start_date instanceof Date 
          ? request.start_date.toISOString().split('T')[0] 
          : request.start_date;
        const endDateStr = request.end_date instanceof Date 
          ? request.end_date.toISOString().split('T')[0] 
          : request.end_date;
        
        const correctWorkingDays = calculateWorkingDays(startDateStr, endDateStr);
        const currentDaysRequested = request.days_requested;
        
        console.log(`📝 ID ${request.id}: ${startDateStr} → ${endDateStr}`);
        console.log(`   Giorni attuali: ${currentDaysRequested}, Giorni corretti: ${correctWorkingDays}`);
        
        if (correctWorkingDays !== currentDaysRequested && correctWorkingDays > 0) {
          updates.push({
            id: request.id,
            employee_id: request.employee_id,
            leave_type: request.leave_type,
            start_date: startDateStr,
            end_date: endDateStr,
            old_days: currentDaysRequested,
            new_days: correctWorkingDays,
            status: request.status
          });
          console.log(`   ⚠️ DIFFERENZA: ${currentDaysRequested} → ${correctWorkingDays}`);
        } else if (correctWorkingDays === 0) {
          console.log(`   ❌ ERRORE: Nessun giorno lavorativo calcolato`);
          errorCount++;
        } else {
          console.log(`   ✅ Giorni già corretti`);
        }
        
      } catch (error) {
        console.error(`❌ Errore ID ${request.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 RIEPILOGO ANALISI:`);
    console.log(`   Richieste analizzate: ${rows.length}`);
    console.log(`   Richieste da aggiornare: ${updates.length}`);
    console.log(`   Errori riscontrati: ${errorCount}`);
    
    if (updates.length === 0) {
      console.log('✅ Tutte le richieste hanno già il calcolo corretto dei giorni!');
      return;
    }
    
    // Mostra dettaglio degli aggiornamenti
    console.log(`\n📋 DETTAGLIO AGGIORNAMENTI:`);
    updates.forEach((update, index) => {
      console.log(`${index + 1}. ID ${update.id} (${update.employee_id}) - ${update.leave_type}`);
      console.log(`   Periodo: ${update.start_date} → ${update.end_date}`);
      console.log(`   Giorni: ${update.old_days} → ${update.new_days} (${update.status})`);
    });
    
    // Chiedi conferma prima di procedere con gli aggiornamenti
    console.log(`\n⚠️ ATTENZIONE: Stai per aggiornare ${updates.length} richieste nel database.`);
    console.log('   Premi CTRL+C per annullare o attendi 5 secondi per continuare...');
    
    // Attesa di 5 secondi
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔄 Avvio aggiornamenti...');
    
    let updatedCount = 0;
    
    // Esegui gli aggiornamenti
    for (const update of updates) {
      try {
        await connection.execute(
          'UPDATE employee_leave_requests SET days_requested = ? WHERE id = ?',
          [update.new_days, update.id]
        );
        
        console.log(`✅ Aggiornato ID ${update.id}: ${update.old_days} → ${update.new_days} giorni`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Errore aggiornamento ID ${update.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 AGGIORNAMENTO COMPLETATO!`);
    console.log(`   Richieste aggiornate con successo: ${updatedCount}`);
    console.log(`   Errori durante l'aggiornamento: ${errorCount}`);
    
    if (updatedCount > 0) {
      console.log('\n📋 RIEPILOGO MODIFICHE:');
      updates.slice(0, updatedCount).forEach((update, index) => {
        console.log(`${index + 1}. ID ${update.id}: ${update.old_days} → ${update.new_days} giorni`);
      });
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
  recalculateLeaveRequestDays()
    .then(() => {
      console.log('✅ Script completato con successo');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script fallito:', error);
      process.exit(1);
    });
}

module.exports = { calculateWorkingDays, recalculateLeaveRequestDays };