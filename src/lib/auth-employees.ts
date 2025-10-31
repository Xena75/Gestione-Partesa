import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { getConnection } from './db-employees';
import pool from './db-auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface Employee {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  username_login?: string;
  role: 'employee';
  is_driver?: boolean;
}

export interface EmployeeAuthResult {
  success: boolean;
  user?: Employee;
  token?: string;
  message?: string;
}

// Hash password con bcrypt
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verifica password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Genera JWT token per dipendente
export function generateEmployeeToken(employee: Employee): string {
  return jwt.sign(
    { 
      id: employee.id, 
      nome: employee.nome,
      cognome: employee.cognome,
      email: employee.email,
      username_login: employee.username_login,
      role: employee.role,
      is_driver: employee.is_driver
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verifica JWT token per dipendente
export function verifyEmployeeToken(token: string): Employee | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      nome: decoded.nome,
      cognome: decoded.cognome,
      email: decoded.email,
      username_login: decoded.username_login,
      role: 'employee',
      is_driver: decoded.is_driver
    };
  } catch {
    return null;
  }
}

// Autentica dipendente usando prima tabella users poi employees
export async function authenticateEmployee(username: string, password: string): Promise<EmployeeAuthResult> {
  try {
    // Prima autentica l'utente nella tabella users
    const [userRows] = await pool.execute(
      'SELECT id, username, password_hash, email, role FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    const users = userRows as any[];
    if (users.length === 0) {
      return { success: false, message: 'Credenziali non valide' };
    }

    const user = users[0];
    
    // Verifica che sia un dipendente
    if (user.role !== 'employee') {
      return { success: false, message: 'Accesso non autorizzato per questo tipo di utente' };
    }

    // Verifica la password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return { success: false, message: 'Credenziali non valide' };
    }

    // Ora cerca i dati del dipendente nella tabella employees usando username_login
    const connection = await getConnection();
    try {
      const [employeeRows] = await connection.execute(
        `SELECT id, nome, cognome, email, username_login, is_driver 
         FROM employees 
         WHERE username_login = ?
         AND active = 1`,
        [user.username]
      );

      const employees = employeeRows as any[];
      if (employees.length === 0) {
        return { success: false, message: 'Dipendente non collegato a questo utente. Contattare l\'amministratore.' };
      }

      const employee = employees[0];

      const employeeObj: Employee = {
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome,
        email: employee.email,
        username_login: employee.username_login,
        role: 'employee',
        is_driver: employee.is_driver === 1
      };

      const token = generateEmployeeToken(employeeObj);

      return {
        success: true,
        user: employeeObj,
        token
      };
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Errore autenticazione dipendente:', error);
    return { success: false, message: 'Errore interno del server' };
  }
}

// Verifica sessione dipendente
export async function verifyEmployeeSession(token: string): Promise<Employee | null> {
  try {
    // Verifica JWT
    const employee = verifyEmployeeToken(token);
    if (!employee) {
      console.log('Token JWT dipendente non valido o scaduto');
      return null;
    }

    // Verifica che il dipendente esista ancora e sia attivo
    const connection = await getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, nome, cognome, email, username_login, is_driver FROM employees WHERE id = ? AND active = 1',
        [employee.id]
      );

      const employees = rows as any[];
      if (employees.length === 0) {
        console.log('Dipendente non trovato o non attivo:', employee.id);
        return null;
      }

      // Aggiorna i dati dal database
      const dbEmployee = employees[0];
      return {
        ...employee,
        email: dbEmployee.email,
        username_login: dbEmployee.username_login,
        is_driver: dbEmployee.is_driver === 1
      };
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Errore verifica sessione dipendente:', error);
    return null;
  }
}

// Estrai token dalla richiesta
export function getTokenFromRequest(request: NextRequest): string | null {
  // Prova dal cookie (manteniamo il nome driver-auth-token per compatibilità)
  const cookieToken = request.cookies.get('driver-auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Prova dall'header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// Verifica accesso dipendente autenticato
export async function verifyEmployeeAccess(request: NextRequest): Promise<{ success: boolean; user?: Employee; message?: string }> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log('Token di autenticazione dipendente mancante');
      return { success: false, message: 'Token di autenticazione mancante' };
    }

    console.log('Verifica accesso dipendente per token:', token.substring(0, 20) + '...');
    const employee = await verifyEmployeeSession(token);
    if (!employee) {
      console.log('Verifica sessione dipendente fallita per token:', token.substring(0, 20) + '...');
      return { success: false, message: 'Sessione non valida o scaduta' };
    }

    console.log('Accesso dipendente verificato con successo per:', employee.nome, employee.cognome);
    return { success: true, user: employee };
  } catch (error) {
    console.error('Errore verifica accesso dipendente:', error);
    return { success: false, message: 'Errore interno del server' };
  }
}

// Manteniamo le funzioni per compatibilità con il codice esistente
export async function verifyDriverAccess(request: NextRequest): Promise<{ success: boolean; user?: Employee; message?: string }> {
  return verifyEmployeeAccess(request);
}

// Alias per compatibilità
export const authenticateDriver = authenticateEmployee;
export const generateDriverToken = generateEmployeeToken;
export const verifyDriverToken = verifyEmployeeToken;
export const verifyDriverSession = verifyEmployeeSession;

// Alias per i tipi
export type Driver = Employee;
export type DriverAuthResult = EmployeeAuthResult;