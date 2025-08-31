import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      DB_HOST: !!process.env.DB_HOST,
      DB_USER: !!process.env.DB_USER,
      DB_PASSWORD: !!process.env.DB_PASSWORD,
      DB_NAME: !!process.env.DB_NAME,
      DB_PORT: !!process.env.DB_PORT,
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
