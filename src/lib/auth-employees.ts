import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { getConnection } from './db-employees';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface Employee {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  login_email?: string;
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
      login_email: employee.login_email,
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
      login_email: decoded.login_email,
      role: 'employee',
      is_driver: decoded.is_driver
    };
  } catch {
    return null;
  }
}

// Autentica dipendente usando tabella employees
export async function authenticateEmployee(username: string, password: string): Promise<EmployeeAuthResult> {
  const connection = await getConnection();
  
  try {
    // Cerca il dipendente per nome, cognome, login_email o email (tutti i dipendenti, non solo autisti)
    // Priorità: login_email > email > nome/cognome
    const [rows] = await connection.execute(
      `SELECT id, nome, cognome, email, login_email, password_hash, is_driver 
       FROM employees 
       WHERE (id = ? OR login_email = ? OR email = ? OR CONCAT(nome, ' ', cognome) = ? OR CONCAT(cognome, ' ', nome) = ?)
       AND active = 1
       ORDER BY 
         CASE 
           WHEN login_email = ? THEN 1
           WHEN email = ? THEN 2
           ELSE 3
         END`,
      [username, username, username, username, username, username, username]
    );

    const employees = rows as any[];
    if (employees.length === 0) {
      return { success: false, message: 'Credenziali non valide' };
    }

    const employee = employees[0];
    
    // Verifica se il dipendente ha una password impostata
    if (!employee.password_hash) {
      return { success: false, message: 'Password non impostata per questo dipendente. Contattare l\'amministratore.' };
    }

    const isValidPassword = await verifyPassword(password, employee.password_hash);

    if (!isValidPassword) {
      return { success: false, message: 'Credenziali non valide' };
    }

    const employeeObj: Employee = {
      id: employee.id,
      nome: employee.nome,
      cognome: employee.cognome,
      email: employee.email,
      login_email: employee.login_email,
      role: 'employee',
      is_driver: employee.is_driver === 1
    };

    const token = generateEmployeeToken(employeeObj);

    // Aggiorna last_login
    await connection.execute(
      'UPDATE employees SET last_login = NOW() WHERE id = ?',
      [employee.id]
    );

    return {
      success: true,
      user: employeeObj,
      token
    };
  } catch (error) {
    console.error('Errore autenticazione dipendente:', error);
    return { success: false, message: 'Errore interno del server' };
  } finally {
    await connection.end();
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
        'SELECT id, nome, cognome, email, login_email, is_driver FROM employees WHERE id = ? AND active = 1',
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
        login_email: dbEmployee.login_email,
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