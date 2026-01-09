import { NextRequest, NextResponse } from 'next/server';
import { cache, invalidateCache, cacheKeys } from '@/lib/cache';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key) {
      // Invalida solo una chiave specifica
      invalidateCache(key);
      console.log(`🧹 Cache invalidata per chiave: ${key}`);
      
      return NextResponse.json({ 
        message: `Cache invalidata per chiave: ${key}`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Pulisce tutta la cache
      cache.clear();
      console.log('🧹 Cache pulita manualmente');
      
      return NextResponse.json({ 
        message: 'Cache pulita con successo',
        timestamp: new Date().toISOString()
      });
    }
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
