import { NextRequest, NextResponse } from 'next/server';
import poolGestione from '@/lib/db-gestione';
import poolViaggi from '@/lib/db-viaggi';

export async function POST(_request: NextRequest) {
  try {
    console.log('🔄 Avvio sincronizzazione tab_viaggi...');

    // Verifica che la tabella tab_viaggi esista nel database gestionelogistica
    const [tables] = await poolGestione.execute(
      "SHOW TABLES LIKE 'tab_viaggi'"
    ) as [any[], any];

    if (tables.length === 0) {
      return NextResponse.json({ 
        error: 'Tabella tab_viaggi non trovata nel database gestionelogistica' 
      }, { status: 404 });
    }

    // Verifica che la tabella viaggi_pod esista nel database viaggi_db
    const [tablesViaggi] = await poolViaggi.execute(
      "SHOW TABLES LIKE 'viaggi_pod'"
    ) as [any[], any];

    if (tablesViaggi.length === 0) {
      return NextResponse.json({ 
        error: 'Tabella viaggi_pod non trovata nel database viaggi_db' 
      }, { status: 404 });
    }

    // Query di sincronizzazione
    const syncQuery = `
      INSERT INTO tab_viaggi (
        Viaggio,
        \`Nome Trasportatore\`,
        \`Magazzino di partenza\`,
        Data,
        \`Data Inizio\`,
        \`Data Fine\`,
        \`Ore PoD\`,
        Tipo_Vettore,
        Azienda_Vettore,
        Cognome_Vettore,
        Nome_Vettore,
        Nominativo,
        \`Ora Inizio\`,
        \`Ora Fine\`,
        Ore,
        Colli,
        \`Peso (Kg)\`,
        Targa,
        \`Tipo Patente\`,
        Km,
        \`Km Iniziali Viaggio\`,
        \`Km Finali Viaggio\`,
        \`Km Viaggio\`,
        \`Km al Rifornimento\`,
        \`Litri Riforniti\`,
        \`€/lt\`,
        Toccate,
        Ordini,
        Mese,
        Sett,
        Giorno,
        Trimestre
      )
      SELECT
        viaggi_pod.Viaggio,
        viaggi_pod.\`Nome Trasportatore\`,
        viaggi_pod.\`Magazzino di partenza\`,
        viaggi_pod.Data,
        viaggi_pod.\`Data Inizio\`,
        viaggi_pod.\`Data Fine\`,
        viaggi_pod.Ore_Pod,
        tab_vettori.Tipo_Vettore,
        tab_vettori.Azienda_Vettore,
        tab_vettori.Cognome_Vettore,
        tab_vettori.Nome_Vettore,
        travels.nominativoId,
        travels.dataOraInizioViaggio,
        travels.dataOraFineViaggio,
        travels.oreEffettive,
        viaggi_pod.Colli,
        viaggi_pod.\`Peso (Kg)\`,
        travels.targaMezzoId,
        vehicles.tipo_patente,
        viaggi_pod.Km,
        travels.kmIniziali,
        travels.kmFinali,
        travels.kmEffettivi,
        travels.kmAlRifornimento,
        travels.litriRiforniti,
        travels.euroLitro,
        viaggi_pod.Toccate,
        viaggi_pod.Ordini,
        viaggi_pod.Mese,
        viaggi_pod.Sett,
        viaggi_pod.Giorno,
        viaggi_pod.Trimestre
      FROM
        (
          (
            viaggi_pod
            LEFT JOIN travels ON viaggi_pod.Viaggio = travels.numeroViaggio
          )
          LEFT JOIN tab_vettori ON viaggi_pod.\`Nome Trasportatore\` = tab_vettori.Descr_Vettore
        )
        LEFT JOIN vehicles ON travels.targaMezzoId = vehicles.id
      WHERE
        tab_vettori.Tipo_Vettore <> 'Terzista'
    `;

    // Esegui la query di sincronizzazione
    const [result] = await poolGestione.execute(syncQuery) as [any, any];

    console.log('✅ Sincronizzazione completata:', result.affectedRows, 'righe inserite');

    return NextResponse.json({
      success: true,
      message: `Sincronizzazione completata con successo! ${result.affectedRows} righe inserite in tab_viaggi.`,
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
    
    return NextResponse.json({
      error: 'Errore durante la sincronizzazione',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
