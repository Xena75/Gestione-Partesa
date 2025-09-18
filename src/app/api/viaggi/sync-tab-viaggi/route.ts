import { NextRequest, NextResponse } from 'next/server';
import poolGestione from '@/lib/db-gestione';
import poolViaggi from '@/lib/db-viaggi';

export async function POST(request: NextRequest) {
  try {
    // Controlla parametri query
    const { searchParams } = new URL(request.url);
    const isDryRun = searchParams.get('dry_run') === 'true';
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : null;
    
    console.log('🔄 Avvio sincronizzazione tab_viaggi...', isDryRun ? '(MODALITÀ DRY-RUN)' : '');
    if (days) {
      console.log(`📅 Filtro attivo: ultimi ${days} giorni`);
    }
    console.log('🔄 Connessione al database gestionelogistica...');

    // Verifica che la tabella tab_viaggi esista nel database gestionelogistica
    const [tables] = await poolGestione.execute(
      "SHOW TABLES LIKE 'tab_viaggi'"
    ) as [any[], any];

    if (tables.length === 0) {
      console.log('❌ Tabella tab_viaggi non trovata nel database gestionelogistica');
      return NextResponse.json({ 
        error: 'Tabella tab_viaggi non trovata nel database gestionelogistica' 
      }, { status: 404 });
    }
    console.log('✅ Tabella tab_viaggi trovata nel database gestionelogistica');

    // Verifica che la tabella viaggi_pod esista nel database viaggi_db
    const [tablesViaggi] = await poolViaggi.execute(
      "SHOW TABLES LIKE 'viaggi_pod'"
    ) as [any[], any];

    if (tablesViaggi.length === 0) {
      console.log('❌ Tabella viaggi_pod non trovata nel database viaggi_db');
      return NextResponse.json({ 
        error: 'Tabella viaggi_pod non trovata nel database viaggi_db' 
      }, { status: 404 });
    }
    console.log('✅ Tabella viaggi_pod trovata nel database viaggi_db');

    // Estrai dati da viaggi_pod (database viaggi_db)
    console.log('🔄 Estrazione dati da viaggi_pod...');
    let viaggiPodQuery = `
      SELECT 
        Viaggio,
        \`Nome Trasportatore\`,
        \`Magazzino di partenza\`,
        Data,
        \`Data Inizio\`,
        \`Data Fine\`,
        Ore_Pod,
        Colli,
        \`Peso (Kg)\`,
        Km,
        Toccate,
        Ordini,
        Mese,
        Sett,
        Giorno,
        Trimestre
      FROM viaggi_pod
    `;
    
    if (days) {
      viaggiPodQuery += ` WHERE Data >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
    }
    
    const [viaggiPodData] = await poolViaggi.execute(viaggiPodQuery) as [any[], any];

    console.log('📊 Trovati', viaggiPodData.length, 'record in viaggi_pod');

    // Estrai dati da travels (database viaggi_db)
    console.log('🔄 Estrazione dati da travels...');
    let travelsQuery = `
      SELECT 
        numeroViaggio,
        nominativoId,
        dataOraInizioViaggio,
        dataOraFineViaggio,
        oreEffettive,
        targaMezzoId,
        kmIniziali,
        kmFinali,
        kmEffettivi,
        kmAlRifornimento,
        litriRiforniti,
        euroLitro
      FROM travels
    `;
    
    if (days) {
      travelsQuery += ` WHERE dataOraInizioViaggio >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
    }
    
    const [travelsData] = await poolViaggi.execute(travelsQuery) as [any[], any];

    console.log('📊 Trovati', travelsData.length, 'record in travels');

    // Estrai dati da tab_vettori (database gestionelogistica)
    console.log('🔄 Estrazione dati da tab_vettori...');
    const [vettoriData] = await poolGestione.execute(`
      SELECT 
        Descr_Vettore,
        Tipo_Vettore,
        Azienda_Vettore,
        Cognome_Vettore,
        Nome_Vettore
      FROM tab_vettori
      WHERE Tipo_Vettore <> 'Terzista'
    `) as [any[], any];

    console.log('📊 Trovati', vettoriData.length, 'record in tab_vettori');

    // Estrai dati da vehicles (database viaggi_db)
    console.log('🔄 Estrazione dati da vehicles...');
    const [vehiclesData] = await poolViaggi.execute(`
      SELECT 
        id,
        tipo_patente
      FROM vehicles
    `) as [any[], any];

    console.log('📊 Trovati', vehiclesData.length, 'record in vehicles');

    // Crea mappe per i JOIN
    const travelsMap = new Map(travelsData.map(t => [t.numeroViaggio, t]));
    const vettoriMap = new Map(vettoriData.map(v => [v.Descr_Vettore, v]));
    const vehiclesMap = new Map(vehiclesData.map(v => [v.id, v]));

    // Processa e inserisci i dati (solo nuovi, ignora duplicati)
    console.log('🔄 Elaborazione e inserimento dati (solo nuovi)...', isDryRun ? '(SIMULAZIONE)' : '');
    let insertedCount = 0;
    let skippedCount = 0;
    let sampleNewRecords: any[] = [];

    for (const viaggio of viaggiPodData) {
      const travel = travelsMap.get(viaggio.Viaggio);
      const vettore = vettoriMap.get(viaggio['Nome Trasportatore']);
      
      if (vettore && travel) { // Solo se non è terzista E ha corrispondenza in travels
        const vehicle = travel ? vehiclesMap.get(travel.targaMezzoId) : null;
        
        if (isDryRun) {
          // Modalità DRY-RUN: verifica se il record esiste già
          const checkQuery = `
            SELECT COUNT(*) as count FROM tab_viaggi 
            WHERE Viaggio = ? AND \`Nome Trasportatore\` = ? AND Data = ?
          `;
          const [checkResult] = await poolGestione.execute(checkQuery, [
            viaggio.Viaggio,
            viaggio['Nome Trasportatore'],
            viaggio.Data
          ]) as [any[], any];
          
          if (checkResult[0].count === 0) {
            insertedCount++;
            // Salva i primi 10 record che verrebbero inseriti
            if (sampleNewRecords.length < 10) {
              sampleNewRecords.push({
                Viaggio: viaggio.Viaggio,
                'Nome Trasportatore': viaggio['Nome Trasportatore'],
                'Magazzino di partenza': viaggio['Magazzino di partenza'],
                Data: viaggio.Data,
                Tipo_Vettore: vettore.Tipo_Vettore,
                Targa: travel?.targaMezzoId || null
              });
            }
            console.log('🆕 [DRY-RUN] Nuovo record:', viaggio.Viaggio, '-', viaggio['Nome Trasportatore']);
          } else {
            skippedCount++;
            console.log('⏭️ [DRY-RUN] Record esistente:', viaggio.Viaggio, '-', viaggio['Nome Trasportatore']);
          }
        } else {
          // Modalità normale: inserimento reale
          const insertQuery = `
            INSERT IGNORE INTO tab_viaggi (
              Viaggio, \`Nome Trasportatore\`, \`Magazzino di partenza\`, Data,
              \`Data Inizio\`, \`Data Fine\`, \`Ore PoD\`, Tipo_Vettore,
              Azienda_Vettore, Cognome_Vettore, Nome_Vettore, Nominativo,
              \`Ora Inizio\`, \`Ora Fine\`, Ore, Colli, \`Peso (Kg)\`, Targa,
              \`Tipo Patente\`, Km, \`Km Iniziali Viaggio\`, \`Km Finali Viaggio\`,
              \`Km Viaggio\`, \`Km al Rifornimento\`, \`Litri Riforniti\`, \`€/lt\`,
              Toccate, Ordini, Mese, Sett, Giorno, Trimestre
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          const values = [
            viaggio.Viaggio,
            viaggio['Nome Trasportatore'],
            viaggio['Magazzino di partenza'],
            viaggio.Data,
            viaggio['Data Inizio'],
            viaggio['Data Fine'],
            viaggio.Ore_Pod,
            vettore.Tipo_Vettore,
            vettore.Azienda_Vettore,
            vettore.Cognome_Vettore,
            vettore.Nome_Vettore,
            travel?.nominativoId || null,
            travel?.dataOraInizioViaggio || null,
            travel?.dataOraFineViaggio || null,
            travel?.oreEffettive || null,
            viaggio.Colli,
            viaggio['Peso (Kg)'],
            travel?.targaMezzoId || null,
            vehicle?.tipo_patente || null,
            viaggio.Km,
            travel?.kmIniziali || null,
            travel?.kmFinali || null,
            travel?.kmEffettivi || null,
            travel?.kmAlRifornimento || null,
            travel?.litriRiforniti || null,
            travel?.euroLitro || null,
            viaggio.Toccate,
            viaggio.Ordini,
            viaggio.Mese,
            viaggio.Sett,
            viaggio.Giorno,
            viaggio.Trimestre
          ];
          
          const [result] = await poolGestione.execute(insertQuery, values) as [any, any];
          if (result.affectedRows > 0) {
            insertedCount++;
          } else {
            skippedCount++;
          }
        }
      }
    }

    const logMessage = isDryRun 
      ? `✅ [DRY-RUN] Simulazione completata: ${insertedCount} righe verrebbero inserite, ${skippedCount} righe già esistenti`
      : `✅ Sincronizzazione completata: ${insertedCount} righe inserite, ${skippedCount} righe già esistenti`;
    
    console.log(logMessage);

    const filterMessage = days ? ` (filtro: ultimi ${days} giorni)` : '';
    const responseData: any = {
      success: true,
      isDryRun,
      daysFilter: days,
      message: isDryRun 
        ? `[DRY-RUN] Simulazione completata! ${insertedCount} righe verrebbero inserite, ${skippedCount} righe già esistenti${filterMessage}.`
        : `Sincronizzazione completata con successo! ${insertedCount} righe inserite, ${skippedCount} righe già esistenti${filterMessage}.`,
      totalProcessed: insertedCount + skippedCount,
      newRecords: insertedCount,
      existingRecords: skippedCount
    };

    if (isDryRun) {
      responseData.sampleNewRecords = sampleNewRecords;
      responseData.note = 'Questa è una simulazione. Nessun dato è stato effettivamente inserito nel database.';
    } else {
      responseData.affectedRows = insertedCount;
      responseData.skippedRows = skippedCount;
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
    
    return NextResponse.json({
      error: 'Errore durante la sincronizzazione',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
