import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

interface JWTPayload {
  sub: string;
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

// Funzione per decodificare JWT usando Web Crypto API (compatibile con edge runtime)
async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [header, payload, signature] = parts;
  
  // Decodifica il payload
  const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  
  // Verifica la scadenza
  if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
    throw new Error('Token expired');
  }

  // Verifica la firma usando Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(`${header}.${payload}`);
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const isValid = await crypto.subtle.verify(
    'HMAC',
    secretKey,
    signatureBytes,
    data
  );

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  return decodedPayload as JWTPayload;
}

// Route che richiedono autenticazione
const protectedRoutes = [
  '/dashboard',
  '/gestione',
  '/viaggi',
  '/monitoraggio',
  '/fatturazione',
  '/backup-dashboard'
];



export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verifica se la route richiede protezione backup (admin only)
  const isBackupRoute = pathname.startsWith('/backup-dashboard') || pathname.startsWith('/api/backup');
  
  if (isBackupRoute) {
    try {
      // Estrai il token dall'header Authorization o dai cookie
      let token: string | null = null;
      
      // Prima prova dall'header Authorization
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      
      // Se non trovato nell'header, prova dai cookie
      if (!token) {
        token = request.cookies.get('auth-token')?.value || null;
      }
      
      if (!token) {
        // Redirect alle pagine dashboard, 401 per API
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { message: 'Token di autenticazione mancante' },
            { status: 401 }
          );
        } else {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }
      }

      // Verifica il token JWT
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      let decoded: JWTPayload;
      
      try {
        decoded = await verifyJWT(token, JWT_SECRET);
      } catch (jwtError) {
        console.error('Token JWT non valido:', jwtError);
        
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { message: 'Token non valido' },
            { status: 401 }
          );
        } else {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          loginUrl.searchParams.set('error', 'token_invalid');
          return NextResponse.redirect(loginUrl);
        }
      }

      // Se il token JWT è valido e contiene il ruolo admin, permetti l'accesso diretto
      if (decoded.role === 'admin') {
        return NextResponse.next();
      }

      // Se il ruolo non è presente nel token o non è admin, fai una verifica API
      try {
        const verifyResponse = await fetch(new URL('/api/auth/verify', request.url), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          }
        });
        
        if (!verifyResponse.ok) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              { message: 'Accesso negato' },
              { status: 403 }
            );
          } else {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }
        }
        
        const userData = await verifyResponse.json();
        
        // Verifica che l'utente sia admin
        if (!userData.user || userData.user.role !== 'admin') {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              { message: 'Accesso riservato agli amministratori' },
              { status: 403 }
            );
          } else {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        }
        
      } catch (error) {
        console.error('Error verifying admin access:', error);
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { message: 'Errore di verifica' },
            { status: 500 }
          );
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }

      // Continua con la richiesta
      return NextResponse.next();

    } catch (error) {
      console.error('Errore middleware backup auth:', error);
      
      // In caso di errore, nega l'accesso
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { message: 'Errore interno del server' },
          { status: 500 }
        );
      } else {
        const errorUrl = new URL('/error', request.url);
        errorUrl.searchParams.set('code', '500');
        return NextResponse.redirect(errorUrl);
      }
    }
  }
  
  // Controlla se la route è protetta (logica normale)
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Se non è una route protetta, continua
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Ottieni il token dal cookie
  const token = request.cookies.get('auth-token')?.value;
  
  // Se non c'è token, reindirizza al login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Se c'è un token, lascia che il client verifichi la validità
  // La verifica completa sarà fatta lato client nell'AuthContext
  return NextResponse.next();
}

/**
 * Configurazione del matcher per il middleware
 * Specifica quali route devono passare attraverso il middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * But include specific API routes that need protection
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/backup/:path*'
  ]
}