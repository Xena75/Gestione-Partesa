import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import pool from './db-auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user';
}

export interface AuthResult {
  success: boolean;
  user?: User;
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

// Genera JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verifica JWT token
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}

// Autentica utente
export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, email, role FROM users WHERE username = ?',
      [username]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return { success: false, message: 'Credenziali non valide' };
    }

    const user = users[0];
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return { success: false, message: 'Credenziali non valide' };
    }

    const userObj: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = generateToken(userObj);

    // Salva sessione nel database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore
    await pool.execute(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    return {
      success: true,
      user: userObj,
      token
    };
  } catch (error) {
    console.error('Errore autenticazione:', error);
    return { success: false, message: 'Errore interno del server' };
  }
}

// Verifica sessione attiva
export async function verifySession(token: string): Promise<User | null> {
  try {
    // Verifica JWT
    const user = verifyToken(token);
    if (!user) {
      return null;
    }

    // Verifica sessione nel database
    const [rows] = await pool.execute(
      'SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    const sessions = rows as any[];
    if (sessions.length === 0) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Errore verifica sessione:', error);
    return null;
  }
}

// Logout - invalida sessione
export async function logoutUser(token: string): Promise<boolean> {
  try {
    await pool.execute(
      'DELETE FROM user_sessions WHERE token = ?',
      [token]
    );
    return true;
  } catch (error) {
    console.error('Errore logout:', error);
    return false;
  }
}

// Estrai token dalla richiesta
export function getTokenFromRequest(request: NextRequest): string | null {
  // Prova dal cookie
  const cookieToken = request.cookies.get('auth-token')?.value;
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

// Verifica accesso utente autenticato
export async function verifyUserAccess(request: NextRequest): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return { success: false, message: 'Token di autenticazione mancante' };
    }

    const user = await verifySession(token);
    if (!user) {
      return { success: false, message: 'Sessione non valida o scaduta' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Errore verifica accesso utente:', error);
    return { success: false, message: 'Errore interno del server' };
  }
}

// Verifica accesso admin
export async function verifyAdminAccess(request: NextRequest): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return { success: false, message: 'Token di autenticazione mancante' };
    }

    const user = await verifySession(token);
    if (!user) {
      return { success: false, message: 'Sessione non valida o scaduta' };
    }

    if (user.role !== 'admin') {
      return { success: false, message: 'Accesso negato: privilegi amministratore richiesti' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Errore verifica accesso admin:', error);
    return { success: false, message: 'Errore interno del server' };
  }
}