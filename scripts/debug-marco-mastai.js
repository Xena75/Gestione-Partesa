const mysql = require('mysql2/promise');

async function debugMarcoMastai() {
  let connection;
  
  try {
    // Connessione al database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'viaggi_db'
    });

    console.log('=== CONNESSIONE DATABASE STABILITA ===\n');

    // 1. Cerca i dati dell'employee nella tabella employees
    console.log('=== DATI EMPLOYEE DALLA TABELLA employees ===');
    const [employees] = await connection.execute(
      `SELECT id, nome, cognome, active 
       FROM employees 
       WHERE (nome LIKE '%Marco%' AND cognome LIKE '%Mastai%') 
          OR (nome LIKE '%Mastai%' AND cognome LIKE '%Marco%')
       ORDER BY id DESC`
    );
    
    console.log('Employees trovati:', employees.length);
    employees.forEach((emp, index) => {
      console.log(`Employee ${index + 1}:`);
      console.log(`  ID: "${emp.id}"`);
      console.log(`  Nome: "${emp.nome}"`);
      console.log(`  Cognome: "${emp.cognome}"`);
      console.log(`  Active: ${emp.active}`);
      console.log(`  Active: ${emp.active}`);
      console.log('');
    });

    // 2. Cerca le richieste di ferie nella tabella employee_leave_requests
    console.log('=== RICHIESTE FERIE DALLA TABELLA employee_leave_requests ===');
    const [leaveRequests] = await connection.execute(
      `SELECT employee_id, leave_type, days_requested, status, start_date, end_date, created_at
       FROM employee_leave_requests 
       WHERE employee_id LIKE '%Marco%Mastai%'
          OR employee_id LIKE '%Mastai%Marco%'
       ORDER BY created_at DESC`
    );
    
    console.log('Richieste ferie trovate:', leaveRequests.length);
    leaveRequests.forEach((req, index) => {
      console.log(`Richiesta ${index + 1}:`);
      console.log(`  Employee_ID: "${req.employee_id}"`);
      console.log(`  Tipo: ${req.leave_type}`);
      console.log(`  Giorni: ${req.days_requested}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Periodo: ${req.start_date} - ${req.end_date}`);
      console.log(`  Created: ${req.created_at}`);
      console.log('');
    });

    // 3. Cerca i bilanci nella tabella employee_leave_balance
    console.log('=== BILANCI FERIE DALLA TABELLA employee_leave_balance ===');
    const [leaveBalances] = await connection.execute(
      `SELECT employee_id, year, vacation_days_total, vacation_days_used, 
              sick_days_used, personal_days_used, last_updated
       FROM employee_leave_balance 
       WHERE employee_id LIKE '%Marco%Mastai%'
          OR employee_id LIKE '%Mastai%Marco%'
       ORDER BY year DESC, last_updated DESC`
    );
    
    console.log('Bilanci ferie trovati:', leaveBalances.length);
    leaveBalances.forEach((balance, index) => {
      console.log(`Bilancio ${index + 1}:`);
      console.log(`  Employee_ID: "${balance.employee_id}"`);
      console.log(`  Anno: ${balance.year}`);
      console.log(`  Ferie totali: ${balance.vacation_days_total}`);
      console.log(`  Ferie utilizzate: ${balance.vacation_days_used}`);
      console.log(`  Giorni malattia: ${balance.sick_days_used}`);
      console.log(`  Permessi: ${balance.personal_days_used}`);
      console.log(`  Ultimo aggiornamento: ${balance.last_updated}`);
      console.log('');
    });

    // 4. Verifica la corrispondenza tra i campi
    console.log('=== ANALISI CORRISPONDENZE ===');
    if (employees.length > 0 && leaveRequests.length > 0) {
      const employee = employees[0];
      const request = leaveRequests[0];
      
      console.log('Confronto formati nomi:');
      console.log(`  Employee.id: "${employee.id}"`);
      console.log(`  Request.employee_id: "${request.employee_id}"`);
      console.log(`  Employee nome+cognome: "${employee.nome} ${employee.cognome}"`);
      console.log(`  Request nome+cognome: "${request.nome} ${request.cognome}"`);
      console.log(`  Employee cognome+nome: "${employee.cognome}, ${employee.nome}"`);
      console.log(`  Request cognome+nome: "${request.cognome}, ${request.nome}"`);
      
      // Verifica se ci sono spazi extra
      console.log('\nVerifica spazi extra:');
      console.log(`  Employee.nome length: ${employee.nome.length} chars`);
      console.log(`  Employee.cognome length: ${employee.cognome.length} chars`);
      console.log(`  Request.nome length: ${request.nome.length} chars`);
      console.log(`  Request.cognome length: ${request.cognome.length} chars`);
      console.log(`  Request.employee_id length: ${request.employee_id.length} chars`);
    }

  } catch (error) {
    console.error('Errore durante l\'esecuzione:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n=== CONNESSIONE DATABASE CHIUSA ===');
    }
  }
}

// Esegui lo script
debugMarcoMastai().catch(console.error);