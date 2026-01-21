const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

async function checkBommaritoFerie2026() {
  let connection;
  
  try {
    console.log('🔌 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database\n');
    
    // Cerca il dipendente Bommarito Francesco
    console.log('🔍 Ricerca dipendente Bommarito Francesco...');
    const [employees] = await connection.execute(
      `SELECT id, nome, cognome FROM employees 
       WHERE nome LIKE '%Francesco%' AND cognome LIKE '%Bommarito%' 
       AND active = true`
    );
    
    if (employees.length === 0) {
      console.log('❌ Dipendente non trovato');
      return;
    }
    
    const employee = employees[0];
    console.log(`✅ Dipendente trovato: ${employee.nome} ${employee.cognome} (ID: ${employee.id})\n`);
    
    // Cerca tutte le richieste di ferie approvate per il 2026
    console.log('📊 Ricerca richieste ferie approvate per il 2026...');
    const [requests2026] = await connection.execute(
      `SELECT 
        id,
        leave_type,
        start_date,
        end_date,
        days_requested,
        status,
        created_at
       FROM employee_leave_requests
       WHERE employee_id = ?
         AND leave_type = 'ferie'
         AND status = 'approved'
         AND YEAR(start_date) = 2026
       ORDER BY start_date ASC`,
      [employee.id]
    );
    
    console.log(`\n📋 Trovate ${requests2026.length} richieste di ferie approvate per il 2026:\n`);
    
    let totalDays2026 = 0;
    requests2026.forEach((req, index) => {
      console.log(`${index + 1}. Richiesta ID ${req.id}:`);
      console.log(`   Periodo: ${req.start_date} - ${req.end_date}`);
      console.log(`   Giorni richiesti: ${req.days_requested}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Creata il: ${req.created_at}\n`);
      totalDays2026 += req.days_requested || 0;
    });
    
    console.log(`\n✅ TOTALE GIORNI FERIE UTILIZZATI NEL 2026: ${totalDays2026} giorni\n`);
    
    // Verifica anche tutte le richieste di ferie (tutti gli anni) per vedere se ci sono problemi
    console.log('📊 Verifica TUTTE le richieste di ferie approvate (tutti gli anni)...');
    const [allRequests] = await connection.execute(
      `SELECT 
        id,
        leave_type,
        start_date,
        end_date,
        days_requested,
        status,
        YEAR(start_date) as year,
        created_at
       FROM employee_leave_requests
       WHERE employee_id = ?
         AND leave_type = 'ferie'
         AND status = 'approved'
       ORDER BY start_date ASC`,
      [employee.id]
    );
    
    console.log(`\n📋 Trovate ${allRequests.length} richieste di ferie approvate (tutti gli anni):\n`);
    
    allRequests.forEach((req, index) => {
      console.log(`${index + 1}. Richiesta ID ${req.id} (Anno ${req.year}):`);
      console.log(`   Periodo: ${req.start_date} - ${req.end_date}`);
      console.log(`   Giorni richiesti: ${req.days_requested}`);
      console.log(`   Status: ${req.status}\n`);
    });
    
    // Verifica anche le richieste di malattia
    console.log('📊 Verifica richieste di MALATTIA approvate per il 2026...');
    const [sickRequests] = await connection.execute(
      `SELECT 
        id,
        leave_type,
        start_date,
        end_date,
        days_requested,
        status,
        created_at
       FROM employee_leave_requests
       WHERE employee_id = ?
         AND leave_type = 'malattia'
         AND status = 'approved'
         AND YEAR(start_date) = 2026
       ORDER BY start_date ASC`,
      [employee.id]
    );
    
    console.log(`\n📋 Trovate ${sickRequests.length} richieste di MALATTIA approvate per il 2026:\n`);
    
    let totalSickDays = 0;
    sickRequests.forEach((req, index) => {
      console.log(`${index + 1}. Richiesta ID ${req.id}:`);
      console.log(`   Periodo: ${req.start_date} - ${req.end_date}`);
      console.log(`   Giorni richiesti: ${req.days_requested}`);
      console.log(`   Status: ${req.status}\n`);
      totalSickDays += req.days_requested || 0;
    });
    
    console.log(`\n✅ TOTALE GIORNI MALATTIA UTILIZZATI NEL 2026: ${totalSickDays} giorni\n`);
    
    // Calcola i giorni lavorativi nel 2026 per la richiesta che si estende dal 2025
    console.log('📊 Calcolo giorni lavorativi nel 2026 per richieste che si estendono dal 2025...\n');
    
    const calculateWorkingDaysInYear = (startDateStr, endDateStr, targetYear) => {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 0;
      }
      
      // Limita le date all'anno specificato
      const yearStart = new Date(targetYear, 0, 1);
      const yearEnd = new Date(targetYear, 11, 31);
      
      const effectiveStart = startDate > yearStart ? startDate : yearStart;
      const effectiveEnd = endDate < yearEnd ? endDate : yearEnd;
      
      // Se le date non si sovrappongono con l'anno target, ritorna 0
      if (effectiveStart > yearEnd || effectiveEnd < yearStart) {
        return 0;
      }
      
      // Conta i giorni lavorativi nell'intervallo effettivo
      let count = 0;
      const current = new Date(effectiveStart);
      
      while (current <= effectiveEnd) {
        const dayOfWeek = current.getDay();
        // Escludi sabato (6) e domenica (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateStr = current.toISOString().split('T')[0];
          console.log(`   - ${dateStr} (${['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][dayOfWeek]})`);
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      
      return count;
    };
    
    // Trova richieste che si estendono nel 2026
    const [extendedRequests] = await connection.execute(
      `SELECT 
        id,
        leave_type,
        start_date,
        end_date,
        days_requested,
        status
       FROM employee_leave_requests
       WHERE employee_id = ?
         AND leave_type = 'ferie'
         AND status = 'approved'
         AND (
           (YEAR(start_date) = 2025 AND YEAR(end_date) = 2026) OR
           (YEAR(start_date) = 2026 AND YEAR(end_date) = 2026)
         )
       ORDER BY start_date ASC`,
      [employee.id]
    );
    
    console.log(`\n📋 Richieste che interessano il 2026:\n`);
    let totalDays2026Calculated = 0;
    extendedRequests.forEach((req, index) => {
      const daysIn2026 = calculateWorkingDaysInYear(req.start_date, req.end_date, 2026);
      console.log(`${index + 1}. Richiesta ID ${req.id}:`);
      console.log(`   Periodo: ${req.start_date} - ${req.end_date}`);
      console.log(`   Giorni lavorativi nel 2026: ${daysIn2026}`);
      console.log(`   Giorni totali richiesti: ${req.days_requested}\n`);
      totalDays2026Calculated += daysIn2026;
    });
    
    console.log(`\n✅ TOTALE GIORNI LAVORATIVI NEL 2026 (calcolato): ${totalDays2026Calculated} giorni\n`);
    
    // Verifica anche il bilancio nel database
    console.log('📊 Verifica bilancio nel database...');
    const [balances] = await connection.execute(
      `SELECT 
        year,
        month,
        vacation_days_used,
        sick_days_used,
        personal_days_used,
        last_updated
       FROM employee_leave_balance
       WHERE employee_id = ? AND year = 2026
       ORDER BY month DESC
       LIMIT 1`,
      [employee.id]
    );
    
    if (balances.length > 0) {
      const balance = balances[0];
      console.log(`\n📋 Bilancio nel database (anno ${balance.year}, mese ${balance.month}):`);
      console.log(`   Ferie utilizzate (DB): ${balance.vacation_days_used} giorni`);
      console.log(`   Malattia utilizzata (DB): ${balance.sick_days_used} giorni`);
      console.log(`   Permessi utilizzati (DB): ${balance.personal_days_used} giorni`);
      console.log(`   Ultimo aggiornamento: ${balance.last_updated}\n`);
      
      if (balance.vacation_days_used !== totalDays) {
        console.log(`⚠️  DISCREPANZA: Il database mostra ${balance.vacation_days_used} giorni, ma le richieste approvate sommano ${totalDays} giorni`);
      }
    } else {
      console.log('\n⚠️  Nessun bilancio trovato nel database per il 2026');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connessione chiusa.');
    }
  }
}

checkBommaritoFerie2026()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
  });
