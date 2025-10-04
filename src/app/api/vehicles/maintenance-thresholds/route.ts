import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

// GET - Recupera le soglie di manutenzione
export async function GET() {
  try {
    
    const [rows] = await pool.execute(`
      SELECT 
        id,
        threshold_type,
        km_value,
        description,
        updated_at
      FROM maintenance_thresholds 
      ORDER BY 
        CASE threshold_type 
          WHEN 'warning' THEN 1 
          WHEN 'critical' THEN 2 
          ELSE 3 
        END
    `);

    return NextResponse.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Errore nel recupero soglie manutenzione:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nel recupero delle soglie di manutenzione' 
      },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna le soglie di manutenzione
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { thresholds } = body;

    if (!thresholds || !Array.isArray(thresholds)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dati soglie non validi' 
        },
        { status: 400 }
      );
    }

    // Validazione soglie
    const warningThreshold = thresholds.find(t => t.threshold_type === 'warning');
    const criticalThreshold = thresholds.find(t => t.threshold_type === 'critical');

    if (!warningThreshold || !criticalThreshold) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Devono essere specificate entrambe le soglie (warning e critical)' 
        },
        { status: 400 }
      );
    }

    if (warningThreshold.km_value >= criticalThreshold.km_value) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La soglia di avviso deve essere inferiore alla soglia critica' 
        },
        { status: 400 }
      );
    }

    if (warningThreshold.km_value <= 0 || criticalThreshold.km_value <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'I valori delle soglie devono essere positivi' 
        },
        { status: 400 }
      );
    }


    
    // Aggiorna le soglie
    for (const threshold of thresholds) {
      await pool.execute(`
        UPDATE maintenance_thresholds 
        SET 
          km_value = ?,
          description = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE threshold_type = ?
      `, [
        threshold.km_value,
        threshold.description,
        threshold.threshold_type
      ]);
    }

    // Recupera le soglie aggiornate
    const [updatedRows] = await pool.execute(`
      SELECT 
        id,
        threshold_type,
        km_value,
        description,
        updated_at
      FROM maintenance_thresholds 
      ORDER BY 
        CASE threshold_type 
          WHEN 'warning' THEN 1 
          WHEN 'critical' THEN 2 
          ELSE 3 
        END
    `);

    return NextResponse.json({
      success: true,
      message: 'Soglie aggiornate con successo',
      data: updatedRows
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento soglie manutenzione:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nell\'aggiornamento delle soglie di manutenzione' 
      },
      { status: 500 }
    );
  }
}