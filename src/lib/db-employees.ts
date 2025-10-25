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
  document_type: 'patente' | 'carta_identita' | 'codice_fiscale' | 'contratto' | 'certificato_medico' | 'altro';
  document_name: string;
  file_path: string;
  file_size?: number;
  expiry_date?: string;
  upload_date: string;
  uploaded_by: string;
  notes?: string;
  is_active: boolean;
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
      'SELECT * FROM employee_documents WHERE employee_id = ? AND is_active = true ORDER BY upload_date DESC',
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
        employee_id, document_type, document_name, file_path, file_size,
        expiry_date, upload_date, uploaded_by, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.employee_id, document.document_type, document.document_name,
        document.file_path, document.file_size, document.expiry_date,
        document.upload_date, document.uploaded_by, document.notes, document.is_active
      ]
    );
    
    return (result as any).insertId;
  } finally {
    await connection.end();
  }
}

export async function getExpiringDocuments(days: number = 30): Promise<EmployeeDocument[]> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT ed.*, e.nome, e.cognome 
       FROM employee_documents ed 
       JOIN employees e ON ed.employee_id COLLATE utf8mb4_general_ci = e.id COLLATE utf8mb4_general_ci
       WHERE ed.expiry_date IS NOT NULL 
       AND ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND ed.is_active = true 
       ORDER BY ed.expiry_date ASC`,
      [days]
    );
    return rows as (EmployeeDocument & { nome: string; cognome: string })[];
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