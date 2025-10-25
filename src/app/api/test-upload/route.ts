// Test endpoint per verificare la configurazione dell'upload
import { NextResponse } from 'next/server';

export async function GET() {
  const isVercel = process.env.VERCEL === '1';
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercelProduction = isVercel && isProduction;
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  
  return NextResponse.json({
    environment: {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      isVercel,
      isProduction,
      isVercelProduction,
      hasBlobToken,
      uploadMethod: isVercelProduction ? 'Vercel Blob Storage' : 'Local Filesystem'
    },
    message: isVercelProduction 
      ? 'Produzione: utilizzerà Vercel Blob Storage' 
      : 'Sviluppo: utilizzerà filesystem locale'
  });
}