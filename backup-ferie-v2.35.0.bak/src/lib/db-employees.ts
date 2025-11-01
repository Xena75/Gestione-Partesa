import mysql from 'mysql2/promise';
import * as XLSX from 'xlsx';

// Configurazione database viaggi_db
const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
};

// Pool di connessioni
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;

// Interfacce TypeScript
export interface Employee {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  username_login?: string; // Campo per collegare con users.username
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
  hours_requested?: number; // Nuovo campo per ore richieste (permessi, mezze giornate)
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
  month: number; // Campo per mese di riferimento (1-12) per saldi mensili
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_hours_remaining?: number; // Campo per ore ferie rimanenti (import Excel)
  ex_holiday_hours_remaining?: number; // Campo per ore ex festività rimanenti (import Excel)
  rol_hours_remaining?: number; // Campo per ore ROL rimanenti (import Excel)
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

export async function getEmployeeByUsername(username: string): Promise<Employee | null> {
  const connection = await getConnection();
  try {
    console.log('getEmployeeByUsername - Cercando dipendente con username:', username);
    
    // STEP 1: Verifica che l'utente esista in gestionelogistica.users
    console.log('getEmployeeByUsername - Verifica esistenza utente in gestionelogistica.users');
    const [userRows] = await connection.execute(
      `SELECT username FROM gestionelogistica.users WHERE username = ?`,
      [username]
    );
    const users = userRows as any[];
    console.log('getEmployeeByUsername - Utente trovato in gestionelogistica.users:', users.length > 0);
    
    if (users.length === 0) {
      console.log('getEmployeeByUsername - Utente non trovato in gestionelogistica.users');
      return null;
    }
    
    // STEP 2: Cerca il dipendente in viaggi_db.employees usando username_login
    console.log('getEmployeeByUsername - Cerca dipendente in viaggi_db.employees con username_login:', username);
    const [rows1] = await connection.execute(
      `SELECT e.*, c.name as company_name 
       FROM employees e 
       LEFT JOIN companies c ON e.company_id = c.id 
       WHERE e.username_login = ?`,
      [username]
    );
    const employees1 = rows1 as Employee[];
    console.log('getEmployeeByUsername - Risultati ricerca per username_login:', employees1.length);
    
    if (employees1.length > 0) {
      console.log('getEmployeeByUsername - Dipendente trovato tramite username_login:', employees1[0].nome, employees1[0].cognome);
      return employees1[0];
    }
    
    // Fallback: cerca per email
    console.log('getEmployeeByUsername - Fallback: ricerca per email:', username);
    const [rows2] = await connection.execute(
      `SELECT e.*, c.name as company_name 
       FROM employees e 
       LEFT JOIN companies c ON e.company_id = c.id 
       WHERE e.email = ?`,
      [username]
    );
    const employees2 = rows2 as Employee[];
    console.log('getEmployeeByUsername - Risultati fallback email:', employees2.length);
    
    if (employees2.length > 0) {
      console.log('getEmployeeByUsername - Dipendente trovato tramite fallback email:', employees2[0].nome, employees2[0].cognome);
      return employees2[0];
    }
    
    console.log('getEmployeeByUsername - Nessun dipendente trovato per:', username);
    return null;
  } finally {
    await connection.end();
  }
}

export async function createEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const connection = await getConnection();
  try {
    // Genera ID univoco
    const employeeId = `EMP${Date.now()}`;
    
    const [_result] = await connection.execute(
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

export async function getEmployeeLeaveRequests(employeeId: string, status?: string): Promise<LeaveRequest[]> {
  const connection = await getConnection();
  try {
    console.log('getEmployeeLeaveRequests - Cercando richieste per employee_id:', employeeId, 'status:', status);
    
    let query = `SELECT 
      id, 
      employee_id, 
      leave_type, 
      DATE_FORMAT(start_date, '%d/%m/%Y') as start_date,
      DATE_FORMAT(end_date, '%d/%m/%Y') as end_date,
      days_requested,
      hours_requested,
      reason,
      status,
      approved_by,
      approved_at,
      notes,
      DATE_FORMAT(created_at, '%d/%m/%Y') as created_at,
      updated_at
      FROM employee_leave_requests WHERE employee_id = ?`;
    let params: any[] = [employeeId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    console.log('getEmployeeLeaveRequests - Query:', query);
    console.log('getEmployeeLeaveRequests - Params:', params);
    
    const [rows] = await connection.execute(query, params);
    const requests = rows as LeaveRequest[];
    
    console.log('getEmployeeLeaveRequests - Risultati trovati:', requests.length);
    if (requests.length > 0) {
      console.log('getEmployeeLeaveRequests - Prima richiesta:', {
        id: requests[0].id,
        employee_id: requests[0].employee_id,
        leave_type: requests[0].leave_type,
        start_date: requests[0].start_date,
        status: requests[0].status
      });
    }
    
    return requests;
  } finally {
    await connection.end();
  }
}

export async function createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const connection = await getConnection();
  try {
    console.log('createLeaveRequest - Dati ricevuti:', {
      employee_id: request.employee_id,
      leave_type: request.leave_type,
      start_date: request.start_date,
      end_date: request.end_date,
      days_requested: request.days_requested,
      hours_requested: request.hours_requested,
      reason: request.reason,
      status: request.status,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      notes: request.notes
    });

    // Converti le date in formato MySQL se sono oggetti Date
    const formatDateForMySQL = (date: any): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      if (typeof date === 'string') {
        // Se è già una stringa, verifica il formato
        if (date.includes('/')) {
          // Formato gg/mm/aaaa -> aaaa-mm-gg
          const parts = date.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
          }
        }
        return date; // Assume sia già nel formato corretto
      }
      return date;
    };

    const formattedStartDate = formatDateForMySQL(request.start_date);
    const formattedEndDate = formatDateForMySQL(request.end_date);

    console.log('createLeaveRequest - Date formattate:', {
      original_start: request.start_date,
      formatted_start: formattedStartDate,
      original_end: request.end_date,
      formatted_end: formattedEndDate
    });

    const [result] = await connection.execute(
      `INSERT INTO employee_leave_requests (
        employee_id, leave_type, start_date, end_date, days_requested, hours_requested,
        reason, status, approved_by, approved_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.employee_id, request.leave_type, formattedStartDate,
        formattedEndDate, request.days_requested, request.hours_requested,
        request.reason, request.status, request.approved_by, request.approved_at, request.notes
      ]
    );
    
    const insertId = (result as any).insertId;
    console.log('createLeaveRequest - Richiesta creata con successo, ID:', insertId);
    
    return insertId;
  } catch (error) {
    console.error('createLeaveRequest - ERRORE:', error);
    console.error('createLeaveRequest - Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
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
  const month = new Date(request.start_date).getMonth() + 1; // JavaScript months are 0-based (manteniamo per info)
  
  // Ottieni il bilancio attuale per l'anno
  const [balanceRows] = await connection.execute(
    'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND year = ?',
    [request.employee_id, year]
  );
  
  let currentBalance = (balanceRows as LeaveBalance[])[0];
  
  // Se non esiste un bilancio per questo anno, creane uno nuovo
  if (!currentBalance) {
    await connection.execute(
      `INSERT INTO employee_leave_balance (
        employee_id, year, month, vacation_days_total, vacation_days_used,
        sick_days_used, personal_days_used
      ) VALUES (?, ?, ?, 26, 0, 0, 0)`,
      [request.employee_id, year, month]
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
  
  // Aggiorna il bilancio
  await connection.execute(
    `UPDATE employee_leave_balance 
     SET vacation_days_used = ?, sick_days_used = ?, personal_days_used = ?,
         last_updated = CURRENT_TIMESTAMP
     WHERE employee_id = ? AND year = ?`,
    [newVacationUsed, newSickUsed, newPersonalUsed, request.employee_id, year]
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
        employee_id, year, month, vacation_days_total, vacation_days_used,
        vacation_hours_remaining, ex_holiday_hours_remaining,
        rol_hours_remaining, sick_days_used, personal_days_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        vacation_days_total = VALUES(vacation_days_total),
        vacation_days_used = VALUES(vacation_days_used),
        vacation_hours_remaining = VALUES(vacation_hours_remaining),
        ex_holiday_hours_remaining = VALUES(ex_holiday_hours_remaining),
        rol_hours_remaining = VALUES(rol_hours_remaining),
        sick_days_used = VALUES(sick_days_used),
        personal_days_used = VALUES(personal_days_used),
        last_updated = CURRENT_TIMESTAMP`,
      [
        balance.employee_id, balance.year, balance.month, balance.vacation_days_total,
        balance.vacation_days_used, balance.vacation_hours_remaining || 0, 
        balance.ex_holiday_hours_remaining || 0, balance.rol_hours_remaining || 0, 
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
    
    // Ora abbiamo un solo record per dipendente per anno
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
      `SELECT lr.id,
              lr.employee_id,
              lr.leave_type,
              DATE_FORMAT(lr.start_date, '%d/%m/%Y') as start_date,
              DATE_FORMAT(lr.end_date, '%d/%m/%Y') as end_date,
              lr.days_requested,
              lr.hours_requested,
              lr.reason,
              lr.status,
              lr.approved_by,
              lr.approved_at,
              lr.notes,
              DATE_FORMAT(lr.created_at, '%d/%m/%Y') as created_at,
              lr.updated_at,
              e.nome, 
              e.cognome, 
              CONCAT(e.nome, ' ', e.cognome) as employee_name
       FROM employee_leave_requests lr 
       JOIN employees e ON lr.employee_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci
       WHERE lr.status = 'pending' 
       ORDER BY lr.created_at ASC`
    );
    
    return rows as (LeaveRequest & { nome: string; cognome: string; employee_name: string })[];
  } finally {
    await connection.end();
  }
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT lr.id,
              lr.employee_id,
              lr.leave_type,
              DATE_FORMAT(lr.start_date, '%d/%m/%Y') as start_date,
              DATE_FORMAT(lr.end_date, '%d/%m/%Y') as end_date,
              lr.days_requested,
              lr.hours_requested,
              lr.reason,
              lr.status,
              lr.approved_by,
              lr.approved_at,
              lr.notes,
              DATE_FORMAT(lr.created_at, '%d/%m/%Y') as created_at,
              lr.updated_at,
              COALESCE(e1.nome, e2.nome, SUBSTRING_INDEX(lr.employee_id, ' ', 1)) as nome,
              COALESCE(e1.cognome, e2.cognome, SUBSTRING_INDEX(lr.employee_id, ' ', -1)) as cognome
       FROM employee_leave_requests lr 
       LEFT JOIN employees e1 ON lr.employee_id COLLATE utf8mb4_general_ci = e1.username_login COLLATE utf8mb4_general_ci
       LEFT JOIN employees e2 ON lr.employee_id COLLATE utf8mb4_general_ci = e2.id COLLATE utf8mb4_general_ci
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

// ==========================================
// FUNZIONE IMPORT EXCEL SALDI FERIE
// ==========================================

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  errors: string[];
  details: {
    employeeId: string;
    year: number;
    month: number;
    status: 'success' | 'error';
    message?: string;
  }[];
}

export async function importLeaveBalanceFromExcel(fileBuffer: Buffer): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    successfulImports: 0,
    errors: [],
    details: []
  };

  const connection = await getConnection();
  
  try {
    // Leggi il file Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converti in JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      result.errors.push('Il file Excel deve contenere almeno una riga di intestazione e una riga di dati');
      return result;
    }

    // Trova gli indici delle colonne
    const headers = data[0] as string[];
    
    // DEBUG: Log delle intestazioni trovate
    console.log('API import-leave-balance - Intestazioni trovate nel file Excel:', headers);
    
    // Funzione helper per ricerca flessibile delle colonne con priorità alle corrispondenze esatte
    const findColumnIndex = (patterns: string[], description: string) => {
      // Prima cerca corrispondenze esatte
      for (const pattern of patterns) {
        const index = headers.findIndex(h => {
          if (!h) return false;
          const headerStr = h.toString().toLowerCase().trim();
          const patternStr = pattern.toLowerCase().trim();
          return headerStr === patternStr;
        });
        if (index !== -1) {
          console.log(`API import-leave-balance - Colonna "${description}" trovata (corrispondenza esatta) all'indice ${index} con intestazione: "${headers[index]}"`);
          return index;
        }
      }
      
      // Se non trova corrispondenze esatte, cerca con includes ma con controlli più rigorosi
      for (const pattern of patterns) {
        const index = headers.findIndex(h => {
          if (!h) return false;
          const headerStr = h.toString().toLowerCase().trim();
          const patternStr = pattern.toLowerCase().trim();
          
          // Per pattern molto corti come "id", usa controlli più rigorosi
          if (patternStr.length <= 3) {
            // Deve essere una parola intera (separata da spazi, trattini, underscore)
            const wordBoundaryRegex = new RegExp(`\\b${patternStr}\\b`, 'i');
            return wordBoundaryRegex.test(headerStr);
          }
          
          // Per pattern più lunghi, usa includes normale
          return headerStr.includes(patternStr);
        });
        if (index !== -1) {
          console.log(`API import-leave-balance - Colonna "${description}" trovata (corrispondenza parziale) all'indice ${index} con intestazione: "${headers[index]}"`);
          return index;
        }
      }
      
      console.log(`API import-leave-balance - Colonna "${description}" NON trovata. Pattern cercati:`, patterns);
      return -1;
    };

    const columnIndexes = {
      id: findColumnIndex(['id', 'dipendente', 'employee', 'codice', 'matricola'], 'ID Dipendente'),
      anno: findColumnIndex(['anno', 'year', 'annualità'], 'Anno'),
      mese: findColumnIndex(['mese', 'month', 'periodo'], 'Mese'),
      ferieResidue: findColumnIndex(['ferie-residue', 'ferie residue', 'ferie', 'vacation', 'ore ferie'], 'Ferie Residue'),
      exFestResidue: findColumnIndex(['ex fest-f-residue', 'ex fest', 'festività', 'ex festività', 'ore ex fest'], 'Ex Festività'),
      rolResidue: findColumnIndex(['rol-r-residue', 'rol residue', 'rol', 'ore rol'], 'ROL Residue')
    };

    // DEBUG: Log della mappatura delle colonne
    console.log('API import-leave-balance - Mappatura colonne:', columnIndexes);

    // DEBUG: Mostra i primi 3 valori di ogni colonna per verificare la mappatura
    if (data.length > 1) {
      const sampleRows = data.slice(1, Math.min(4, data.length)) as any[][];
      console.log('API import-leave-balance - Campioni di dati per verifica mappatura:');
      Object.entries(columnIndexes).forEach(([key, index]) => {
        if (index !== -1) {
          const samples = sampleRows.map(row => row[index]).slice(0, 3);
          console.log(`  ${key} (colonna ${index}):`, samples);
        }
      });
    }

    // Verifica che tutte le colonne necessarie siano presenti
    const missingColumns = [];
    if (columnIndexes.id === -1) missingColumns.push('ID/Dipendente');
    if (columnIndexes.anno === -1) missingColumns.push('Anno/Year');
    if (columnIndexes.mese === -1) missingColumns.push('Mese/Month');
    if (columnIndexes.ferieResidue === -1) missingColumns.push('Ferie-Residue/Ferie');
    if (columnIndexes.exFestResidue === -1) missingColumns.push('EX FEST-F-Residue/Ex Festività');
    if (columnIndexes.rolResidue === -1) missingColumns.push('ROL-R-Residue/ROL');

    if (missingColumns.length > 0) {
      result.errors.push(`Colonne mancanti nel file Excel: ${missingColumns.join(', ')}. Intestazioni disponibili: ${headers.join(', ')}`);
      return result;
    }

    // Processa le righe di dati
    const dataRows = data.slice(1) as any[][];
    result.totalRows = dataRows.length;

    // Validazione preliminare dei dati ID per identificare problemi di mappatura
    console.log('API import-leave-balance - Validazione preliminare degli ID dipendenti...');
    const sampleIds = dataRows.slice(0, 5).map((row, index) => ({
      row: index + 2,
      value: row[columnIndexes.id],
      type: typeof row[columnIndexes.id],
      isNumeric: !isNaN(parseFloat(row[columnIndexes.id])) && isFinite(row[columnIndexes.id])
    }));
    console.log('API import-leave-balance - Campioni ID:', sampleIds);

    // Controlla se tutti gli ID sembrano essere valori numerici (possibile errore di mappatura)
    const numericIds = sampleIds.filter(sample => sample.isNumeric && sample.value !== null && sample.value !== undefined);
    if (numericIds.length === sampleIds.length && sampleIds.length > 0) {
      console.log('API import-leave-balance - ATTENZIONE: Tutti gli ID sembrano essere valori numerici, possibile errore di mappatura colonne');
      result.errors.push('ERRORE MAPPATURA: Gli ID dipendenti sembrano essere valori numerici invece di codici dipendente. Verificare la mappatura delle colonne.');
      return result;
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 perché partiamo dalla riga 1 (header) e aggiungiamo 1 per l'indice umano

      try {
        // Estrai i valori dalla riga
        const employeeId = row[columnIndexes.id]?.toString().trim();
        const year = parseInt(row[columnIndexes.anno]);
        const month = parseInt(row[columnIndexes.mese]);
        const vacationHours = parseFloat(row[columnIndexes.ferieResidue]) || 0;
        const exHolidayHours = parseFloat(row[columnIndexes.exFestResidue]) || 0;
        const rolHours = parseFloat(row[columnIndexes.rolResidue]) || 0;

        // Validazioni
        if (!employeeId) {
          result.errors.push(`Riga ${rowNumber}: ID dipendente mancante`);
          result.details.push({
            employeeId: 'N/A',
            year: year || 0,
            month: month || 0,
            status: 'error',
            message: 'ID dipendente mancante'
          });
          continue;
        }

        if (isNaN(year) || year < 2020 || year > 2030) {
          result.errors.push(`Riga ${rowNumber}: Anno non valido (${row[columnIndexes.anno]})`);
          result.details.push({
            employeeId,
            year: year || 0,
            month: month || 0,
            status: 'error',
            message: 'Anno non valido'
          });
          continue;
        }

        if (isNaN(month) || month < 1 || month > 12) {
          result.errors.push(`Riga ${rowNumber}: Mese non valido (${row[columnIndexes.mese]})`);
          result.details.push({
            employeeId,
            year,
            month: month || 0,
            status: 'error',
            message: 'Mese non valido'
          });
          continue;
        }

        // Verifica che il dipendente esista
        const [employeeCheck] = await connection.execute(
          'SELECT id FROM employees WHERE id = ? OR username_login = ?',
          [employeeId, employeeId]
        );

        if ((employeeCheck as any[]).length === 0) {
          result.errors.push(`Riga ${rowNumber}: Dipendente non trovato (${employeeId})`);
          result.details.push({
            employeeId,
            year,
            month,
            status: 'error',
            message: 'Dipendente non trovato'
          });
          continue;
        }

        // Inserisci o aggiorna il record (sovrascrive per employee_id + year)
        await connection.execute(
          `INSERT INTO employee_leave_balance 
           (employee_id, year, month, vacation_hours_remaining, ex_holiday_hours_remaining, rol_hours_remaining, vacation_days_total, vacation_days_used, sick_days_used, personal_days_used)
           VALUES (?, ?, ?, ?, ?, ?, 26, 0, 0, 0)
           ON DUPLICATE KEY UPDATE
           month = VALUES(month),
           vacation_hours_remaining = VALUES(vacation_hours_remaining),
           ex_holiday_hours_remaining = VALUES(ex_holiday_hours_remaining),
           rol_hours_remaining = VALUES(rol_hours_remaining),
           last_updated = CURRENT_TIMESTAMP`,
          [employeeId, year, month, vacationHours, exHolidayHours, rolHours]
        );

        result.successfulImports++;
        result.details.push({
          employeeId,
          year,
          month,
          status: 'success',
          message: `Saldi aggiornati: Ferie ${vacationHours}h, Ex Fest ${exHolidayHours}h, ROL ${rolHours}h`
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
        result.errors.push(`Riga ${rowNumber}: ${errorMessage}`);
        result.details.push({
          employeeId: row[columnIndexes.id]?.toString() || 'N/A',
          year: parseInt(row[columnIndexes.anno]) || 0,
          month: parseInt(row[columnIndexes.mese]) || 0,
          status: 'error',
          message: errorMessage
        });
      }
    }

    result.success = result.successfulImports > 0;
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto durante l\'elaborazione del file';
    result.errors.push(`Errore generale: ${errorMessage}`);
    return result;
  } finally {
    await connection.end();
  }
}