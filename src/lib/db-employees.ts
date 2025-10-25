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
  is_driver: boolean;
  driver_license_number?: string;
  driver_license_expiry?: string;
  foto_url?: string;
  password_hash?: string;
  last_login?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
async function getConnection() {
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
      'SELECT * FROM employees ORDER BY cognome, nome'
    );
    return rows as Employee[];
  } finally {
    await connection.end();
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM employees WHERE id = ?',
      [id]
    );
    const employees = rows as Employee[];
    return employees.length > 0 ? employees[0] : null;
  } catch (error) {
    console.error('Errore nella query getEmployeeById:', error);
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
        id, nome, cognome, email, cellulare, data_nascita, codice_fiscale,
        indirizzo, citta, cap, provincia, data_assunzione, contratto,
        stipendio, ore_settimanali, ferie_annuali, permessi_annuali,
        is_driver, driver_license_number, driver_license_expiry,
        password_hash, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId, employee.nome, employee.cognome, employee.email,
        employee.cellulare, employee.data_nascita, employee.codice_fiscale,
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
    const fields = Object.keys(employee).filter(key => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt');
    const values = fields.map(field => employee[field as keyof Employee]);
    
    if (fields.length === 0) return false;
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const [result] = await connection.execute(
      `UPDATE employees SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    
    return (result as any).affectedRows > 0;
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

export async function getExpiringDocuments(days: number = 30): Promise<(EmployeeDocument & { nome: string; cognome: string })[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT ed.*, e.nome, e.cognome 
       FROM employee_documents ed 
       JOIN employees e ON ed.employee_id = e.id
       WHERE e.active = 1 
       AND ed.expiry_date IS NOT NULL 
       AND ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND ed.expiry_date >= CURDATE()
       ORDER BY ed.expiry_date ASC`,
      [days]
    );
    return rows as (EmployeeDocument & { nome: string; cognome: string })[];
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
    const [result] = await connection.execute(
      `UPDATE employee_leave_requests 
       SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
       WHERE id = ?`,
      [status, approvedBy, notes || null, id]
    );
    
    return (result as any).affectedRows > 0;
  } finally {
    await connection.end();
  }
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