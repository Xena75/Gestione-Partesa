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
  '/backup-dashboard',
  '/autisti/dashboard'
];



export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Escludi le route API di autenticazione dal middleware per evitare loop
  const authApiRoutes = ['/api/auth/login', '/api/auth/verify', '/api/auth/logout', '/api/auth/clear-all-sessions', '/api/auth/force-logout'];
  if (authApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Meccanismo anti-loop: controlla se c'è un header che indica un loop
  const loopCounter = parseInt(request.headers.get('x-redirect-count') || '0');
  if (loopCounter > 3) {
    console.error('Loop di reindirizzamento rilevato, interrompo:', pathname);
    // Reindirizza a una pagina di errore specifica per i loop
    const errorUrl = new URL('/error', request.url);
    errorUrl.searchParams.set('code', 'redirect_loop');
    errorUrl.searchParams.set('path', pathname);
    return NextResponse.redirect(errorUrl);
  }
  
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
          const response = NextResponse.redirect(loginUrl);
          response.headers.set('x-redirect-count', (loopCounter + 1).toString());
          return response;
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
          const response = NextResponse.redirect(loginUrl);
          response.headers.set('x-redirect-count', (loopCounter + 1).toString());
          return response;
        }
      }

      // Verifica che l'utente sia admin basandosi solo sul token JWT
      if (decoded.role !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { message: 'Accesso riservato agli amministratori' },
            { status: 403 }
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
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('x-redirect-count', (loopCounter + 1).toString());
    return response;
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
     * - api/auth (authentication API routes - handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * But include specific API routes that need protection
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
    '/api/backup/:path*'
  ]
}