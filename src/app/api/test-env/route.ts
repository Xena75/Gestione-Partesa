import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      DB_VIAGGI_HOST: !!process.env.DB_VIAGGI_HOST,
      DB_VIAGGI_USER: !!process.env.DB_VIAGGI_USER,
      DB_VIAGGI_PASS: !!process.env.DB_VIAGGI_PASS,
      DB_VIAGGI_NAME: !!process.env.DB_VIAGGI_NAME,
      DB_VIAGGI_PORT: !!process.env.DB_VIAGGI_PORT,
      DB_GESTIONE_HOST: !!process.env.DB_GESTIONE_HOST,
      DB_GESTIONE_USER: !!process.env.DB_GESTIONE_USER,
      DB_GESTIONE_PASS: !!process.env.DB_GESTIONE_PASS,
      DB_GESTIONE_NAME: !!process.env.DB_GESTIONE_NAME,
      DB_GESTIONE_PORT: !!process.env.DB_GESTIONE_PORT,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    };

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Test variabili d\'ambiente completato'
    });

  } catch (error) {
    console.error('❌ Errore test env:', error);
    return NextResponse.json(
      { error: 'Errore durante il test delle variabili d\'ambiente' },
      { status: 500 }
    );
  }
}
