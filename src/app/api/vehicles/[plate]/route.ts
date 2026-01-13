import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera un veicolo specifico tramite targa
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate } = await params;
    const connection = await mysql.createConnection(dbConfig);

    // Query per recuperare il veicolo tramite targa
    const vehicleQuery = `
      SELECT 
        id,
        targa,
        marca,
        modello,
        proprieta,
        portata,
        n_palt,
        tipo_patente,
        pallet_kg,
        km_ultimo_tagliando,
        data_ultimo_tagliando,
        data_ultima_revisione,
        data_revisione_tachigrafo,
        note,
        active,
        createdAt,
        updatedAt
      FROM vehicles 
      WHERE targa = ?
    `;

    const [vehicleRows] = await connection.execute(vehicleQuery, [plate]);
    
    if (!Array.isArray(vehicleRows) || vehicleRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    const vehicle = vehicleRows[0] as any;
    
    if (vehicle.active === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non attivo' },
        { status: 403 }
      );
    }

    // Recupera le scadenze del veicolo
    const schedulesQuery = `
      SELECT 
        id,
        vehicle_id,
        schedule_type as type,
        description,
        data_scadenza,
        status,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM vehicle_schedules 
      WHERE vehicle_id = ? AND status = 'pending'
      ORDER BY data_scadenza ASC
    `;

    const [schedulesRows] = await connection.execute(schedulesQuery, [vehicle.id]);

    // Recupera i preventivi di manutenzione del veicolo con JOIN per ottenere il nome del fornitore
    const quotesQuery = `
      SELECT 
        mq.id,
        mq.schedule_id,
        mq.supplier_id,
        mq.amount as estimated_cost,
        mq.description,
        mq.status,
        mq.valid_until,
        mq.notes,
        mq.scheduled_date,
        mq.created_at as createdAt,
        mq.updated_at as updatedAt,
        mq.created_at as quote_date,
        s.name as supplier,
        'Manutenzione' as service_type
      FROM maintenance_quotes mq
      LEFT JOIN suppliers s ON mq.supplier_id = s.id
      WHERE mq.vehicle_id = ?
      ORDER BY mq.created_at DESC
    `;

    const [quotesRows] = await connection.execute(quotesQuery, [vehicle.id]);

    // Per ogni preventivo, recupera anche i documenti allegati
    const quotesWithDocuments = await Promise.all(
      (quotesRows as any[]).map(async (quote) => {
        const [docs] = await connection.execute(
          'SELECT * FROM quote_documents WHERE quote_id = ?',
          [quote.id]
        );
        return { ...quote, documents: docs };
      })
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      vehicle: {
        ...vehicle,
        schedules: schedulesRows,
        quotes: quotesWithDocuments
      }
    });
  } catch (error) {
    console.error('Errore nel recupero del veicolo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero del veicolo' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna un veicolo tramite targa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate } = await params;
    const body = await request.json();
    const connection = await mysql.createConnection(dbConfig);

    // Verifica che il veicolo esista
    const [existingVehicle] = await connection.execute(
      'SELECT id, active FROM vehicles WHERE targa = ?',
      [plate]
    );

    if (!Array.isArray(existingVehicle) || existingVehicle.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    const vehicle = existingVehicle[0] as any;

    // Costruisci la query di aggiornamento dinamicamente
    const updateFields = [];
    const updateValues = [];
    
    if (body.marca !== undefined) {
      updateFields.push('marca = ?');
      updateValues.push(body.marca);
    }
    if (body.modello !== undefined) {
      updateFields.push('modello = ?');
      updateValues.push(body.modello);
    }
    if (body.proprieta !== undefined) {
      updateFields.push('proprieta = ?');
      updateValues.push(body.proprieta);
    }
    if (body.portata !== undefined) {
      updateFields.push('portata = ?');
      updateValues.push(body.portata);
    }
    if (body.n_palt !== undefined) {
      updateFields.push('n_palt = ?');
      updateValues.push(body.n_palt);
    }
    if (body.tipo_patente !== undefined) {
      updateFields.push('tipo_patente = ?');
      updateValues.push(body.tipo_patente);
    }
    if (body.pallet_kg !== undefined) {
      updateFields.push('pallet_kg = ?');
      updateValues.push(body.pallet_kg);
    }
    if (body.active !== undefined) {
      updateFields.push('active = ?');
      updateValues.push(body.active ? 1 : 0);
    }
    if (body.km_ultimo_tagliando !== undefined) {
      updateFields.push('km_ultimo_tagliando = ?');
      updateValues.push(body.km_ultimo_tagliando);
    }
    if (body.data_ultimo_tagliando !== undefined) {
      updateFields.push('data_ultimo_tagliando = ?');
      updateValues.push(body.data_ultimo_tagliando);
    }
    if (body.data_ultima_revisione !== undefined) {
      updateFields.push('data_ultima_revisione = ?');
      updateValues.push(body.data_ultima_revisione);
    }
    if (body.data_revisione_tachigrafo !== undefined) {
      updateFields.push('data_revisione_tachigrafo = ?');
      updateValues.push(body.data_revisione_tachigrafo);
    }
    if (body.note !== undefined) {
      updateFields.push('note = ?');
      updateValues.push(body.note);
    }
    
    // Aggiungi sempre l'aggiornamento del timestamp
    updateFields.push('updatedAt = NOW()');
    updateValues.push(plate);
    
    if (updateFields.length === 1) { // Solo updatedAt
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Nessun campo da aggiornare fornito' },
        { status: 400 }
      );
    }
    
    const updateQuery = `
      UPDATE vehicles 
      SET ${updateFields.join(', ')}
      WHERE targa = ?
    `;

    await connection.execute(updateQuery, updateValues);

    // Se è stata aggiornata la data_revisione_tachigrafo, gestisci le scadenze
    if (body.data_revisione_tachigrafo !== undefined) {
      try {
        // Prima controlla se esistono scadenze tachigrafo pending
        const checkScheduleQuery = `
          SELECT COUNT(*) as count 
          FROM vehicle_schedules 
          WHERE vehicle_id = ? 
            AND schedule_type = 'revisione tachigrafo' 
            AND status = 'pending'
        `;
        
        const [checkResult] = await connection.execute(checkScheduleQuery, [vehicle.id]);
        const existingCount = (checkResult as any)[0].count;

        if (existingCount > 0) {
          // Aggiorna le scadenze tachigrafo esistenti con status pending
          const updateScheduleQuery = `
            UPDATE vehicle_schedules 
            SET 
              data_scadenza = ?,
              updated_at = NOW()
            WHERE vehicle_id = ? 
              AND schedule_type = 'revisione tachigrafo' 
              AND status = 'pending'
          `;
          
          const [updateResult] = await connection.execute(updateScheduleQuery, [
            body.data_revisione_tachigrafo,
            vehicle.id
          ]);

          console.log(`Aggiornate ${(updateResult as any).affectedRows} scadenze tachigrafo per veicolo ${plate}`);
        } else {
          // Crea una nuova scadenza tachigrafo se non ne esistono
          const insertScheduleQuery = `
            INSERT INTO vehicle_schedules (
              vehicle_id, 
              schedule_type, 
              data_scadenza, 
              status, 
              notes,
              created_at,
              updated_at
            ) VALUES (?, 'revisione tachigrafo', ?, 'pending', 'Scadenza creata automaticamente', NOW(), NOW())
          `;
          
          await connection.execute(insertScheduleQuery, [
            vehicle.id,
            body.data_revisione_tachigrafo
          ]);

          console.log(`Creata nuova scadenza tachigrafo per veicolo ${plate} con data ${body.data_revisione_tachigrafo}`);
        }
      } catch (scheduleError) {
        console.error('Errore nella gestione delle scadenze tachigrafo:', scheduleError);
        // Non bloccare l'aggiornamento del veicolo se la gestione delle scadenze fallisce
      }
    }

    // Se è stata aggiornata la data_ultima_revisione, gestisci le scadenze revisione normale
    if (body.data_ultima_revisione !== undefined) {
      try {
        // Prima controlla se esistono scadenze revisione pending
        const checkRevisionScheduleQuery = `
          SELECT COUNT(*) as count 
          FROM vehicle_schedules 
          WHERE vehicle_id = ? 
            AND schedule_type = 'revisione' 
            AND status = 'pending'
        `;
        
        const [checkRevisionResult] = await connection.execute(checkRevisionScheduleQuery, [vehicle.id]);
        const existingRevisionCount = (checkRevisionResult as any)[0].count;

        // Calcola la data di scadenza basata sul tipo di patente
        const dataUltimaRevisione = new Date(body.data_ultima_revisione);
        let dataScadenzaRevisione;
        
        // Recupera il tipo di patente del veicolo per calcolare la scadenza
        const [vehicleInfo] = await connection.execute(
          'SELECT tipo_patente FROM vehicles WHERE id = ?',
          [vehicle.id]
        );
        const tipoPatente = (vehicleInfo as any)[0]?.tipo_patente || 'C';
        
        if (tipoPatente === 'B') {
          // Patente B: revisione ogni 2 anni
          dataScadenzaRevisione = new Date(dataUltimaRevisione);
          dataScadenzaRevisione.setFullYear(dataScadenzaRevisione.getFullYear() + 2);
        } else {
          // Patente C, D, E: revisione ogni 1 anno
          dataScadenzaRevisione = new Date(dataUltimaRevisione);
          dataScadenzaRevisione.setFullYear(dataScadenzaRevisione.getFullYear() + 1);
        }
        
        const dataScadenzaFormatted = dataScadenzaRevisione.toISOString().split('T')[0];

        if (existingRevisionCount > 0) {
          // Aggiorna le scadenze revisione esistenti con status pending
          const updateRevisionScheduleQuery = `
            UPDATE vehicle_schedules 
            SET 
              data_scadenza = ?,
              updated_at = NOW()
            WHERE vehicle_id = ? 
              AND schedule_type = 'revisione' 
              AND status = 'pending'
          `;
          
          const [updateRevisionResult] = await connection.execute(updateRevisionScheduleQuery, [
            dataScadenzaFormatted,
            vehicle.id
          ]);

          console.log(`Aggiornate ${(updateRevisionResult as any).affectedRows} scadenze revisione per veicolo ${plate} (patente ${tipoPatente}) con data ${dataScadenzaFormatted}`);
        } else {
          // Crea una nuova scadenza revisione se non ne esistono
          const insertRevisionScheduleQuery = `
            INSERT INTO vehicle_schedules (
              vehicle_id, 
              schedule_type, 
              data_scadenza, 
              status, 
              notes,
              created_at,
              updated_at
            ) VALUES (?, 'revisione', ?, 'pending', 'Scadenza creata automaticamente', NOW(), NOW())
          `;
          
          await connection.execute(insertRevisionScheduleQuery, [
            vehicle.id,
            dataScadenzaFormatted
          ]);

          console.log(`Creata nuova scadenza revisione per veicolo ${plate} (patente ${tipoPatente}) con data ${dataScadenzaFormatted}`);
        }
      } catch (revisionScheduleError) {
        console.error('Errore nella gestione delle scadenze revisione:', revisionScheduleError);
        // Non bloccare l'aggiornamento del veicolo se la gestione delle scadenze fallisce
      }
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Veicolo aggiornato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del veicolo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento del veicolo' },
      { status: 500 }
    );
  }
}

// DELETE - Disattiva un veicolo (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate } = await params;
    const connection = await mysql.createConnection(dbConfig);

    // Verifica che il veicolo esista e sia attivo
    const [existingVehicle] = await connection.execute(
      'SELECT id FROM vehicles WHERE targa = ? AND active = 1',
      [plate]
    );

    if (!Array.isArray(existingVehicle) || existingVehicle.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato o già disattivato' },
        { status: 404 }
      );
    }

    // Disattiva il veicolo (soft delete)
    const deleteQuery = `
      UPDATE vehicles 
      SET 
        active = 0,
        updatedAt = NOW()
      WHERE targa = ? AND active = 1
    `;

    await connection.execute(deleteQuery, [plate]);
    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Veicolo disattivato con successo'
    });
  } catch (error) {
    console.error('Errore nella disattivazione del veicolo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella disattivazione del veicolo' },
      { status: 500 }
    );
  }
}