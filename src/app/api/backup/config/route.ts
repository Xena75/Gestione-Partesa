import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess, verifyAdminAccess } from '@/lib/auth';
import mysql from 'mysql2/promise';
import { backupDbConfig } from '@/lib/db-backup';



// GET - Recupera configurazioni
export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per visualizzare le configurazioni' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeSensitive = searchParams.get('include_sensitive') === 'true';
    const configKey = searchParams.get('key');

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      let whereConditions = [];
      let queryParams = [];

      if (category) {
        whereConditions.push('category = ?');
        queryParams.push(category);
      }

      if (configKey) {
        whereConditions.push('config_key = ?');
        queryParams.push(configKey);
      }

      if (!includeSensitive) {
        whereConditions.push('is_sensitive = 0');
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const [configRows] = await connection.execute(`
        SELECT 
          id, config_key, config_value, config_type, category,
          description, is_sensitive, validation_rule, default_value,
          created_at, updated_at
        FROM backup_config 
        ${whereClause}
        ORDER BY category, config_key
      `, queryParams);

      const configs = (configRows as any[]).map(config => {
        let processedConfig = {
          ...config,
          is_sensitive: Boolean(config.is_sensitive)
        };

        // Nascondi valori sensibili se non esplicitamente richiesti
        if (config.is_sensitive && !includeSensitive) {
          processedConfig.config_value = '***HIDDEN***';
        } else {
          // Converti il valore in base al tipo
          switch (config.config_type) {
            case 'number':
              processedConfig.config_value = parseFloat(config.config_value);
              break;
            case 'boolean':
              processedConfig.config_value = config.config_value === 'true';
              break;
            case 'json':
              try {
                processedConfig.config_value = JSON.parse(config.config_value);
              } catch (_) {
                processedConfig.config_value = config.config_value;
              }
              break;
            // 'string' rimane come stringa
          }
        }

        return processedConfig;
      });

      // Se richiesta una chiave specifica, restituisci solo il valore
      if (configKey && configs.length === 1) {
        return NextResponse.json({
          key: configs[0].config_key,
          value: configs[0].config_value,
          type: configs[0].config_type
        });
      }

      // Raggruppa per categoria se non specificata
      if (!category) {
        const groupedConfigs = configs.reduce((acc, config) => {
          if (!acc[config.category]) {
            acc[config.category] = [];
          }
          acc[config.category].push(config);
          return acc;
        }, {} as Record<string, any[]>);

        return NextResponse.json({
          configs: groupedConfigs,
          total: configs.length
        });
      }

      return NextResponse.json({
        configs,
        total: configs.length
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero configurazioni:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Crea nuova configurazione
export async function POST(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: solo gli amministratori possono creare configurazioni' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      config_key,
      config_value,
      config_type = 'string',
      category = 'general',
      description,
      is_sensitive = false,
      validation_rule,
      default_value
    } = body;

    // Validazione input
    if (!config_key || config_key.trim().length === 0) {
      return NextResponse.json(
        { error: 'Chiave configurazione richiesta' },
        { status: 400 }
      );
    }

    if (config_value === undefined || config_value === null) {
      return NextResponse.json(
        { error: 'Valore configurazione richiesto' },
        { status: 400 }
      );
    }

    if (!['string', 'number', 'boolean', 'json'].includes(config_type)) {
      return NextResponse.json(
        { error: 'Tipo configurazione non valido' },
        { status: 400 }
      );
    }

    if (!['general', 'storage', 'notification', 'security', 'performance'].includes(category)) {
      return NextResponse.json(
        { error: 'Categoria non valida' },
        { status: 400 }
      );
    }

    // Validazione del valore in base al tipo
    let processedValue = config_value;
    try {
      switch (config_type) {
        case 'number':
          processedValue = parseFloat(config_value).toString();
          if (isNaN(parseFloat(processedValue))) {
            throw new Error('Valore numerico non valido');
          }
          break;
        case 'boolean':
          processedValue = Boolean(config_value).toString();
          break;
        case 'json':
          if (typeof config_value === 'object') {
            processedValue = JSON.stringify(config_value);
          } else {
            JSON.parse(config_value); // Verifica che sia JSON valido
            processedValue = config_value;
          }
          break;
        case 'string':
          processedValue = config_value.toString();
          break;
      }
    } catch (_) {
      return NextResponse.json(
        { error: `Valore non valido per il tipo ${config_type}` },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica che la chiave non esista già
      const [existingRows] = await connection.execute(
        'SELECT id FROM backup_config WHERE config_key = ?',
        [config_key.trim()]
      );

      if ((existingRows as any[]).length > 0) {
        return NextResponse.json(
          { error: 'Esiste già una configurazione con questa chiave' },
          { status: 409 }
        );
      }

      // Inserisci nuova configurazione
      const [result] = await connection.execute(`
        INSERT INTO backup_config (
          config_key, config_value, config_type, category,
          description, is_sensitive, validation_rule, default_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        config_key.trim(),
        processedValue,
        config_type,
        category,
        description || null,
        is_sensitive,
        validation_rule || null,
        default_value || null
      ]);

      const configId = (result as any).insertId;

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('config_created', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ 
          config_id: configId, 
          config_key, 
          category, 
          config_type,
          is_sensitive 
        })
      ]);

      return NextResponse.json({
        success: true,
        config: {
          id: configId,
          config_key,
          config_value: is_sensitive ? '***HIDDEN***' : processedValue,
          config_type,
          category,
          description,
          is_sensitive
        },
        message: 'Configurazione creata con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nella creazione configurazione:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna configurazione esistente
export async function PUT(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { config_key, config_value, description } = body;

    if (!config_key) {
      return NextResponse.json(
        { error: 'Chiave configurazione richiesta' },
        { status: 400 }
      );
    }

    if (config_value === undefined || config_value === null) {
      return NextResponse.json(
        { error: 'Valore configurazione richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Recupera configurazione esistente
      const [configRows] = await connection.execute(
        'SELECT id, config_type, validation_rule FROM backup_config WHERE config_key = ?',
        [config_key]
      );

      if ((configRows as any[]).length === 0) {
        return NextResponse.json(
          { error: 'Configurazione non trovata' },
          { status: 404 }
        );
      }

      const existingConfig = (configRows as any[])[0];
      
      // Validazione del nuovo valore
      let processedValue = config_value;
      try {
        switch (existingConfig.config_type) {
          case 'number':
            processedValue = parseFloat(config_value).toString();
            if (isNaN(parseFloat(processedValue))) {
              throw new Error('Valore numerico non valido');
            }
            break;
          case 'boolean':
            processedValue = Boolean(config_value).toString();
            break;
          case 'json':
            if (typeof config_value === 'object') {
              processedValue = JSON.stringify(config_value);
            } else {
              JSON.parse(config_value); // Verifica che sia JSON valido
              processedValue = config_value;
            }
            break;
          case 'string':
            processedValue = config_value.toString();
            break;
        }
      } catch (_) {
        return NextResponse.json(
          { error: `Valore non valido per il tipo ${existingConfig.config_type}` },
          { status: 400 }
        );
      }

      // Validazione personalizzata se presente
      if (existingConfig.validation_rule) {
        try {
          const regex = new RegExp(existingConfig.validation_rule);
          if (!regex.test(processedValue)) {
            return NextResponse.json(
              { error: 'Valore non rispetta la regola di validazione' },
              { status: 400 }
            );
          }
        } catch (_) {
          console.warn('Regola di validazione non valida:', existingConfig.validation_rule);
        }
      }

      // Aggiorna configurazione
      const updateFields = ['config_value = ?', 'updated_at = NOW()'];
      const updateValues = [processedValue];

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }

      updateValues.push(config_key);

      await connection.execute(
        `UPDATE backup_config SET ${updateFields.join(', ')} WHERE config_key = ?`,
        updateValues
      );

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('config_updated', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ 
          config_key, 
          old_value: '***HIDDEN***', // Non loggare valori sensibili
          new_value: '***HIDDEN***'
        })
      ]);

      return NextResponse.json({
        success: true,
        message: 'Configurazione aggiornata con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'aggiornamento configurazione:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina configurazione
export async function DELETE(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const configKey = searchParams.get('key');

    if (!configKey) {
      return NextResponse.json(
        { error: 'Chiave configurazione richiesta' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica che la configurazione esista
      const [configRows] = await connection.execute(
        'SELECT id, category FROM backup_config WHERE config_key = ?',
        [configKey]
      );

      if ((configRows as any[]).length === 0) {
        return NextResponse.json(
          { error: 'Configurazione non trovata' },
          { status: 404 }
        );
      }

      const config = (configRows as any[])[0];

      // Verifica che non sia una configurazione di sistema critica
      const criticalConfigs = [
        'backup.storage.path',
        'backup.database.host',
        'backup.database.port',
        'backup.retention.default_days'
      ];

      if (criticalConfigs.includes(configKey)) {
        return NextResponse.json(
          { error: 'Impossibile eliminare configurazione di sistema critica' },
          { status: 400 }
        );
      }

      // Elimina configurazione
      await connection.execute(
        'DELETE FROM backup_config WHERE config_key = ?',
        [configKey]
      );

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('config_deleted', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ config_key: configKey, category: config.category })
      ]);

      return NextResponse.json({
        success: true,
        message: 'Configurazione eliminata con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione configurazione:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}