import mysql from 'mysql2/promise';

// Configurazione database viaggi_db
const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
};

// Interfacce TypeScript
export interface Employee {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  login_email?: string;
  cellulare?: string;
  data_nascita?: string;
  codice_fiscale?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  data_assunzione?: string;
  contratto?: string;
  stipendio?: number;
  ore_settimanali?: number;
  ferie_annuali?: number;
  permessi_annuali?: number;
  qualifica?: string;
  is_driver: boolean;
  driver_license_number?: string;
  driver_license_expiry?: string;
  foto_url?: string;
  password_hash?: string;
  last_login?: string;
  active: boolean;
  company_id: number;
  company_name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  vat_number?: string;
  fiscal_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeDocument {
  id: number;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  expiry_date?: string;
  status: 'valido' | 'scaduto' | 'in_scadenza' | 'da_rinnovare';
  notes?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: string;
  leave_type: 'ferie' | 'permesso' | 'malattia' | 'congedo';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: string;
  year: number;
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_days_remaining: number;
  sick_days_used: number;
  personal_days_used: number;
  last_updated: string;
  created_at: string;
}

// Database connection
export async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Errore connessione database:', error);
    throw error;
  }
}

// EMPLOYEE CRUD OPERATIONS

export async function getAllEmployees(): Promise<Employee[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as company_name 
       FROM employees e 
       LEFT JOIN companies c ON e.company_id = c.id 
       ORDER BY e.cognome, e.nome`
    );
    return rows as Employee[];
  } finally {
    await connection.end();
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const connection = await getConnection();
  try {
    console.log('getEmployeeById - Cercando employee con ID:', id);
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as company_name 
       FROM employees e 
       LEFT JOIN companies c ON e.company_id = c.id 
       WHERE e.id = ?`,
      [id]
    );
    const employees = rows as Employee[];
    console.log('getEmployeeById - Risultati trovati:', employees.length);
    if (employees.length > 0) {
      console.log('getEmployeeById - Employee trovato:', employees[0].nome, employees[0].cognome);
    }
    return employees.length > 0 ? employees[0] : null;
  } catch (error) {
    console.error('Errore nella query getEmployeeById:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

export async function getEmployeeByLoginEmail(loginEmail: string): Promise<Employee | null> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as company_name 
       FROM employees e 
       LEFT JOIN companies c ON e.company_id = c.id 
       WHERE e.login_email = ? AND e.active = 1`,
      [loginEmail]
    );
    const employees = rows as Employee[];
    return employees.length > 0 ? employees[0] : null;
  } catch (error) {
    console.error('Errore nella query getEmployeeByLoginEmail:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

export async function createEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const connection = await getConnection();
  try {
    // Genera ID univoco
    const employeeId = `EMP${Date.now()}`;
    
    const [result] = await connection.execute(
      `INSERT INTO employees (
        id, nome, cognome, email, login_email, cellulare, data_nascita, codice_fiscale,
        indirizzo, citta, cap, provincia, data_assunzione, contratto,
        stipendio, ore_settimanali, ferie_annuali, permessi_annuali,
        is_driver, driver_license_number, driver_license_expiry,
        password_hash, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId, employee.nome, employee.cognome, employee.email,
        employee.login_email, employee.cellulare, employee.data_nascita, employee.codice_fiscale,
        employee.indirizzo, employee.citta, employee.cap, employee.provincia,
        employee.data_assunzione, employee.contratto, employee.stipendio,
        employee.ore_settimanali, employee.ferie_annuali, employee.permessi_annuali,
        employee.is_driver, employee.driver_license_number, employee.driver_license_expiry,
        employee.password_hash, employee.active
      ]
    );
    
    return employeeId;
  } finally {
    await connection.end();
  }
}

export async function updateEmployee(id: string, employee: Partial<Employee>): Promise<boolean> {
  const connection = await getConnection();
  try {
    console.log('updateEmployee chiamata con ID:', id);
    console.log('updateEmployee dati ricevuti:', employee);
    
    const fields = Object.keys(employee).filter(key => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt');
    const values = fields.map(field => employee[field as keyof Employee]);
    
    console.log('Campi da aggiornare:', fields);
    console.log('Valori da aggiornare:', values);
    
    if (fields.length === 0) {
      console.log('Nessun campo da aggiornare');
      return false;
    }
    
    // Validazione company_id se presente
    if (employee.company_id !== undefined && employee.company_id !== null) {
      const [companyCheck] = await connection.execute(
        'SELECT id FROM companies WHERE id = ?',
        [employee.company_id]
      );
      if ((companyCheck as any[]).length === 0) {
        console.error('company_id non valido:', employee.company_id);
        throw new Error(`La società con ID ${employee.company_id} non esiste`);
      }
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    // Aggiungi updatedAt con valore esplicito
    const now = new Date();
    const query = `UPDATE employees SET ${setClause}, updatedAt = ? WHERE id = ?`;
    const params = [...values, now, id];
    
    console.log('Query SQL:', query);
    console.log('Parametri query:', params);
    
    const [result] = await connection.execute(query, params);
    
    console.log('Risultato query:', result);
    
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Errore in updateEmployee:', error);
    // Gestione specifica per errori di foreign key
    if (error instanceof Error) {
      if (error.message.includes('foreign key constraint') || error.message.includes('fk_employees_company')) {
        throw new Error('La società selezionata non è valida');
      }
    }
    throw error;
  } finally {
    await connection.end();
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const connection = await getConnection();
  try {
    // Soft delete - imposta active = false
    const [result] = await connection.execute(
      'UPDATE employees SET active = false WHERE id = ?',
      [id]
    );
    
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
}

export async function getDrivers(): Promise<Employee[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM employees WHERE is_driver = true AND active = true ORDER BY cognome, nome'
    );
    return rows as Employee[];
  } finally {
    await connection.end();
  }
}

// DOCUMENT OPERATIONS

export async function getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId]
    );
    return rows as EmployeeDocument[];
  } finally {
    await connection.end();
  }
}

export async function createEmployeeDocument(document: Omit<EmployeeDocument, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const connection = await getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO employee_documents (
        employee_id, document_type, document_name, file_path, file_name, 
        file_size, file_type, expiry_date, status, notes, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.employee_id, document.document_type, document.document_name,
        document.file_path, document.file_name, document.file_size, document.file_type,
        document.expiry_date || null, document.status, document.notes || null, document.uploaded_by || null
      ]
    );
    
    return (result as any).insertId;
  } finally {
    await connection.end();
  }
}

export async function updateEmployeeDocument(id: number, document: Partial<EmployeeDocument>): Promise<boolean> {
  const connection = await getConnection();
  try {
    const fields = Object.keys(document).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    const values = fields.map(field => document[field as keyof EmployeeDocument]);
    
    if (fields.length === 0) return false;
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const [result] = await connection.execute(
      `UPDATE employee_documents SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
}

export async function deleteEmployeeDocument(id: number): Promise<boolean> {
  const connection = await getConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM employee_documents WHERE id = ?',
      [id]
    );
    
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
}

export async function getEmployeeDocumentById(id: number): Promise<EmployeeDocument | null> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM employee_documents WHERE id = ?',
      [id]
    );
    const documents = rows as EmployeeDocument[];
    return documents.length > 0 ? documents[0] : null;
  } finally {
    await connection.end();
  }
}

export interface DocumentStats {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  no_expiry: number;
  by_type: Record<string, number>;
}

export interface ExpiredDocument extends EmployeeDocument {
  nome: string;
  cognome: string;
  days_overdue: number;
  priority_level: 'critico' | 'alto' | 'medio';
}

export async function getExpiringDocuments(days: number = 30): Promise<(EmployeeDocument & { nome: string; cognome: string; employee_name: string; days_until_expiry: number })[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT ed.*, 
              e.nome, 
              e.cognome,
              CONCAT(e.nome, ' ', e.cognome) as employee_name,
              DATEDIFF(ed.expiry_date, CURDATE()) as days_until_expiry
       FROM employee_documents ed 
       JOIN employees e ON ed.employee_id = e.id
       WHERE e.active = 1 
       AND ed.expiry_date IS NOT NULL 
       AND ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND ed.expiry_date >= CURDATE()
       ORDER BY ed.expiry_date ASC`,
      [days]
    );
    return rows as (EmployeeDocument & { nome: string; cognome: string; employee_name: string; days_until_expiry: number })[];
  } finally {
    await connection.end();
  }
}

export async function getDocumentStats(): Promise<DocumentStats> {
  const connection = await getConnection();
  try {
    // Aggiorna prima gli stati dei documenti
    await updateDocumentStatus();
    
    // Statistiche generali
    const [statsRows] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'valido' THEN 1 END) as valid,
        COUNT(CASE WHEN status = 'in_scadenza' THEN 1 END) as expiring,
        COUNT(CASE WHEN status = 'scaduto' THEN 1 END) as expired,
        COUNT(CASE WHEN expiry_date IS NULL THEN 1 END) as no_expiry
      FROM employee_documents ed
      JOIN employees e ON ed.employee_id = e.id
      WHERE e.active = 1
    `);
    
    // Statistiche per tipo documento
    const [typeRows] = await connection.execute(`
      SELECT 
        document_type,
        COUNT(*) as count
      FROM employee_documents ed
      JOIN employees e ON ed.employee_id = e.id
      WHERE e.active = 1
      GROUP BY document_type
      ORDER BY count DESC
    `);
    
    const stats = (statsRows as any[])[0];
    const byType: Record<string, number> = {};
    
    (typeRows as any[]).forEach(row => {
      byType[row.document_type] = row.count;
    });
    
    return {
      total: stats.total || 0,
      valid: stats.valid || 0,
      expiring: stats.expiring || 0,
      expired: stats.expired || 0,
      no_expiry: stats.no_expiry || 0,
      by_type: byType
    };
  } finally {
    await connection.end();
  }
}

export async function getExpiredDocuments(sortBy: string = 'days_overdue', limit: number = 50): Promise<{
  documents: ExpiredDocument[];
  total_expired: number;
  critical_count: number;
}> {
  const connection = await getConnection();
  try {
    // Aggiorna prima gli stati dei documenti
    await updateDocumentStatus();
    
    // Validazione campo ordinamento
    const validSortFields = ['days_overdue', 'employee_name', 'document_type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'days_overdue';
    
    let orderClause = 'ORDER BY days_overdue DESC';
    if (sortField === 'employee_name') {
      orderClause = 'ORDER BY e.cognome, e.nome';
    } else if (sortField === 'document_type') {
      orderClause = 'ORDER BY ed.document_type, days_overdue DESC';
    }
    
    const [documentsRows] = await connection.execute(`
      SELECT 
        ed.*,
        e.nome,
        e.cognome,
        DATEDIFF(CURDATE(), ed.expiry_date) as days_overdue,
        CASE 
          WHEN DATEDIFF(CURDATE(), ed.expiry_date) > 90 THEN 'critico'
          WHEN DATEDIFF(CURDATE(), ed.expiry_date) > 30 THEN 'alto'
          ELSE 'medio'
        END as priority_level
      FROM employee_documents ed
      JOIN employees e ON ed.employee_id = e.id
      WHERE e.active = 1 
        AND ed.status = 'scaduto'
        AND ed.expiry_date IS NOT NULL
        AND ed.expiry_date < CURDATE()
      ${orderClause}
      LIMIT ?
    `, [limit]);
    
    // Conteggio totale documenti scaduti
    const [totalRows] = await connection.execute(`
      SELECT COUNT(*) as total_expired
      FROM employee_documents ed
      JOIN employees e ON ed.employee_id = e.id
      WHERE e.active = 1 
        AND ed.status = 'scaduto'
        AND ed.expiry_date IS NOT NULL
        AND ed.expiry_date < CURDATE()
    `);
    
    // Conteggio documenti critici (scaduti da più di 30 giorni)
    const [criticalRows] = await connection.execute(`
      SELECT COUNT(*) as critical_count
      FROM employee_documents ed
      JOIN employees e ON ed.employee_id = e.id
      WHERE e.active = 1 
        AND ed.status = 'scaduto'
        AND ed.expiry_date IS NOT NULL
        AND DATEDIFF(CURDATE(), ed.expiry_date) > 30
    `);
    
    const totalExpired = (totalRows as any[])[0]?.total_expired || 0;
    const criticalCount = (criticalRows as any[])[0]?.critical_count || 0;
    
    return {
      documents: documentsRows as ExpiredDocument[],
      total_expired: totalExpired,
      critical_count: criticalCount
    };
  } finally {
    await connection.end();
  }
}

export async function updateDocumentStatus(): Promise<void> {
  const connection = await getConnection();
  try {
    // Aggiorna automaticamente lo status dei documenti in base alla data di scadenza
    await connection.execute(`
      UPDATE employee_documents 
      SET status = CASE 
        WHEN expiry_date IS NULL THEN 'valido'
        WHEN expiry_date < CURDATE() THEN 'scaduto'
        WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'in_scadenza'
        ELSE 'valido'
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE employee_id IN (SELECT id FROM employees WHERE active = 1)
    `);
  } finally {
    await connection.end();
  }
}

// LEAVE OPERATIONS

export async function getEmployeeLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM employee_leave_requests WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId]
    );
    return rows as LeaveRequest[];
  } finally {
    await connection.end();
  }
}

export async function createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const connection = await getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO employee_leave_requests (
        employee_id, leave_type, start_date, end_date, days_requested,
        reason, status, approved_by, approved_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.employee_id, request.leave_type, request.start_date,
        request.end_date, request.days_requested, request.reason,
        request.status, request.approved_by, request.approved_at, request.notes
      ]
    );
    
    return (result as any).insertId;
  } finally {
    await connection.end();
  }
}

export async function updateLeaveRequestStatus(
  id: number, 
  status: 'approved' | 'rejected', 
  approvedBy: string, 
  notes?: string
): Promise<boolean> {
  const connection = await getConnection();
  try {
    // Prima ottieni i dettagli della richiesta
    const [requestRows] = await connection.execute(
      'SELECT * FROM employee_leave_requests WHERE id = ?',
      [id]
    );
    
    const request = (requestRows as LeaveRequest[])[0];
    if (!request) {
      return false;
    }
    
    // Aggiorna lo stato della richiesta
    const [result] = await connection.execute(
      `UPDATE employee_leave_requests 
       SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
       WHERE id = ?`,
      [status, approvedBy, notes || null, id]
    );
    
    // Se la richiesta è stata approvata, aggiorna il bilancio ferie
    if (status === 'approved' && (result as any).affectedRows > 0) {
      await updateLeaveBalanceAfterApproval(request, connection);
    }
    
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
}

// Funzione per aggiornare il bilancio ferie dopo l'approvazione
async function updateLeaveBalanceAfterApproval(request: LeaveRequest, connection: any): Promise<void> {
  const year = new Date(request.start_date).getFullYear();
  
  // Ottieni il bilancio attuale
  const [balanceRows] = await connection.execute(
    'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND year = ?',
    [request.employee_id, year]
  );
  
  let currentBalance = (balanceRows as LeaveBalance[])[0];
  
  // Se non esiste un bilancio per quest'anno, creane uno nuovo
  if (!currentBalance) {
    await connection.execute(
      `INSERT INTO employee_leave_balance (
        employee_id, year, vacation_days_total, vacation_days_used,
        vacation_days_remaining, sick_days_used, personal_days_used
      ) VALUES (?, ?, 26, 0, 26, 0, 0)`,
      [request.employee_id, year]
    );
    
    // Riottieni il bilancio appena creato
    const [newBalanceRows] = await connection.execute(
      'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND year = ?',
      [request.employee_id, year]
    );
    currentBalance = (newBalanceRows as LeaveBalance[])[0];
  }
  
  // Calcola i nuovi valori in base al tipo di richiesta
  let newVacationUsed = currentBalance.vacation_days_used;
  let newSickUsed = currentBalance.sick_days_used;
  let newPersonalUsed = currentBalance.personal_days_used;
  
  switch (request.leave_type) {
    case 'ferie':
      newVacationUsed += request.days_requested;
      break;
    case 'malattia':
      newSickUsed += request.days_requested;
      break;
    case 'permesso':
    case 'congedo':
      newPersonalUsed += request.days_requested;
      break;
  }
  
  const newVacationRemaining = currentBalance.vacation_days_total - newVacationUsed;
  
  // Aggiorna il bilancio
  await connection.execute(
    `UPDATE employee_leave_balance 
     SET vacation_days_used = ?, vacation_days_remaining = ?, 
         sick_days_used = ?, personal_days_used = ?,
         last_updated = CURRENT_TIMESTAMP
     WHERE employee_id = ? AND year = ?`,
    [newVacationUsed, newVacationRemaining, newSickUsed, newPersonalUsed, request.employee_id, year]
  );
}

export async function getEmployeeLeaveBalance(employeeId: string, year?: number): Promise<LeaveBalance | null> {
  const connection = await getConnection();
  try {
    const currentYear = year || new Date().getFullYear();
    const [rows] = await connection.execute(
      'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND year = ?',
      [employeeId, currentYear]
    );
    const balances = rows as LeaveBalance[];
    return balances.length > 0 ? balances[0] : null;
  } finally {
    await connection.end();
  }
}

export async function createOrUpdateLeaveBalance(balance: Omit<LeaveBalance, 'id' | 'created_at' | 'last_updated'>): Promise<boolean> {
  const connection = await getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO employee_leave_balance (
        employee_id, year, vacation_days_total, vacation_days_used,
        vacation_days_remaining, sick_days_used, personal_days_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        vacation_days_total = VALUES(vacation_days_total),
        vacation_days_used = VALUES(vacation_days_used),
        vacation_days_remaining = VALUES(vacation_days_remaining),
        sick_days_used = VALUES(sick_days_used),
        personal_days_used = VALUES(personal_days_used),
        last_updated = CURRENT_TIMESTAMP`,
      [
        balance.employee_id, balance.year, balance.vacation_days_total,
        balance.vacation_days_used, balance.vacation_days_remaining,
        balance.sick_days_used, balance.personal_days_used
      ]
    );
    
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
}

export async function getAllLeaveBalances(year?: number): Promise<(LeaveBalance & { nome: string; cognome: string })[]> {
  const connection = await getConnection();
  try {
    const currentYear = year || new Date().getFullYear();
    const [rows] = await connection.execute(
      `SELECT elb.*, e.nome, e.cognome 
       FROM employee_leave_balance elb 
       JOIN employees e ON elb.employee_id COLLATE utf8mb4_general_ci = e.id COLLATE utf8mb4_general_ci
       WHERE elb.year = ? AND e.active = true
       ORDER BY e.cognome, e.nome`,
      [currentYear]
    );
    return rows as (LeaveBalance & { nome: string; cognome: string })[];
  } finally {
    await connection.end();
  }
}

export async function getPendingLeaveRequests(): Promise<LeaveRequest[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT lr.*, e.nome, e.cognome 
       FROM employee_leave_requests lr 
       JOIN employees e ON lr.employee_id COLLATE utf8mb4_general_ci = e.id COLLATE utf8mb4_general_ci
       WHERE lr.status = 'pending' 
       ORDER BY lr.created_at ASC`
    );
    return rows as (LeaveRequest & { nome: string; cognome: string })[];
  } finally {
    await connection.end();
  }
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT lr.*, e.nome, e.cognome 
       FROM employee_leave_requests lr 
       JOIN employees e ON lr.employee_id COLLATE utf8mb4_general_ci = e.id COLLATE utf8mb4_general_ci
       ORDER BY lr.created_at DESC`
    );
    return rows as (LeaveRequest & { nome: string; cognome: string })[];
  } finally {
    await connection.end();
  }
}

// ==========================================
// FUNZIONI CRUD PER SOCIETÀ
// ==========================================

export async function getAllCompanies(): Promise<Company[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM companies ORDER BY name ASC'
    );
    return rows as Company[];
  } finally {
    await connection.end();
  }
}

export async function getCompanyById(id: number): Promise<Company | null> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM companies WHERE id = ?',
      [id]
    );
    const companies = rows as Company[];
    return companies.length > 0 ? companies[0] : null;
  } finally {
    await connection.end();
  }
}

export async function createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const connection = await getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO companies (name, code, address, phone, email, vat_number, fiscal_code) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        company.name,
        company.code,
        company.address || null,
        company.phone || null,
        company.email || null,
        company.vat_number || null,
        company.fiscal_code || null
      ]
    );
    return (result as any).insertId;
  } finally {
    await connection.end();
  }
}

export async function updateCompany(id: number, company: Partial<Company>): Promise<boolean> {
  const connection = await getConnection();
  try {
    const [result] = await connection.execute(
      `UPDATE companies 
       SET name = COALESCE(?, name),
           code = COALESCE(?, code),
           address = COALESCE(?, address),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           vat_number = COALESCE(?, vat_number),
           fiscal_code = COALESCE(?, fiscal_code),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        company.name || null,
        company.code || null,
        company.address || null,
        company.phone || null,
        company.email || null,
        company.vat_number || null,
        company.fiscal_code || null,
        id
      ]
    );
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
}

export async function deleteCompany(id: number): Promise<boolean> {
  const connection = await getConnection();
  try {
    // Verifica se ci sono dipendenti associati
    const [employeeCheck] = await connection.execute(
      'SELECT COUNT(*) as count FROM employees WHERE company_id = ?',
      [id]
    );
    
    const employeeCount = (employeeCheck as any)[0].count;
    if (employeeCount > 0) {
      throw new Error(`Impossibile eliminare la società: ci sono ${employeeCount} dipendenti associati`);
    }

    const [result] = await connection.execute(
      'DELETE FROM companies WHERE id = ?',
      [id]
    );
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
}

export async function getEmployeesByCompany(companyId: number): Promise<Employee[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as company_name 
       FROM employees e 
       LEFT JOIN companies c ON e.company_id = c.id 
       WHERE e.company_id = ? AND e.active = 1
       ORDER BY e.cognome, e.nome`,
      [companyId]
    );
    return rows as Employee[];
  } finally {
    await connection.end();
  }
}