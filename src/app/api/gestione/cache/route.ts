import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

export async function DELETE() {
  try {
    cache.clear();
    console.log('🧹 Cache pulita manualmente');
    
    return NextResponse.json({ 
      message: 'Cache pulita con successo',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nel pulire la cache:', error);
    return NextResponse.json(
      { error: 'Errore nel pulire la cache' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = cache.getStats();
    
    return NextResponse.json({
      cache: {
        size: stats.size,
        keys: stats.keys,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Errore nel recuperare le statistiche cache:', error);
    return NextResponse.json(
      { error: 'Errore nel recuperare le statistiche cache' },
      { status: 500 }
    );
  }
}
