import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';
import { RowDataPacket } from 'mysql2';

interface VehicleMaintenanceData extends RowDataPacket {
  id: string;
  targa: string;
  marca: string;
  modello: string;
  proprieta: string;
  km_ultimo_tagliando: number | null;
  data_ultimo_tagliando: string | null;
  kmFinali: number | null;
  data_viaggio: string | null;
  km_percorsi: number;
  stato_tagliando: string;
  giorni_ultimo_tagliando: number | null;
}

interface MaintenanceStats {
  totale_veicoli: number;
  veicoli_ok: number;
  veicoli_in_scadenza: number;
  veicoli_scaduti: number;
}

interface MaintenanceResponse {
  vehicles: VehicleMaintenanceData[];
  stats: MaintenanceStats;
}

interface MaintenanceThreshold extends RowDataPacket {
  threshold_type: string;
  km_value: number;
}

// Soglie di default (fallback)
const DEFAULT_KM_THRESHOLD_WARNING = 12000;
const DEFAULT_KM_THRESHOLD_CRITICAL = 15000;
const DAYS_THRESHOLD_WARNING = 330; // 11 mesi
const DAYS_THRESHOLD_CRITICAL = 365; // 12 mesi

async function getMaintenanceThresholds(): Promise<{ warning: number; critical: number }> {
  try {
    const [rows] = await pool.execute<MaintenanceThreshold[]>(
      'SELECT threshold_type, km_value FROM maintenance_thresholds WHERE threshold_type IN (?, ?)',
      ['warning', 'critical']
    );

    const thresholds = {
      warning: DEFAULT_KM_THRESHOLD_WARNING,
      critical: DEFAULT_KM_THRESHOLD_CRITICAL
    };

    rows.forEach(row => {
      if (row.threshold_type === 'warning') {
        thresholds.warning = row.km_value;
      } else if (row.threshold_type === 'critical') {
        thresholds.critical = row.km_value;
      }
    });

    return thresholds;
  } catch (error) {
    console.error('Errore nel recupero soglie manutenzione:', error);
    // Ritorna valori di default in caso di errore
    return {
      warning: DEFAULT_KM_THRESHOLD_WARNING,
      critical: DEFAULT_KM_THRESHOLD_CRITICAL
    };
  }
}

function calculateMaintenanceStatus(
  kmPercorsi: number | null, 
  giorniUltimoTagliando: number | null,
  kmThresholds: { warning: number; critical: number }
): string {
  // Se non abbiamo dati sui km, usiamo solo i giorni
  if (kmPercorsi === null || kmPercorsi < 0) {
    if (giorniUltimoTagliando === null) return 'Sconosciuto';
    if (giorniUltimoTagliando >= DAYS_THRESHOLD_CRITICAL) return 'Scaduto';
    if (giorniUltimoTagliando >= DAYS_THRESHOLD_WARNING) return 'In Scadenza';
    return 'OK';
  }

  // Se non abbiamo dati sui giorni, usiamo solo i km
  if (giorniUltimoTagliando === null) {
    if (kmPercorsi >= kmThresholds.critical) return 'Scaduto';
    if (kmPercorsi >= kmThresholds.warning) return 'In Scadenza';
    return 'OK';
  }

  // Se abbiamo entrambi i dati, usiamo il criterio più restrittivo
  const kmStatus = kmPercorsi >= kmThresholds.critical ? 'Scaduto' : 
                   kmPercorsi >= kmThresholds.warning ? 'In Scadenza' : 'OK';
  
  const dayStatus = giorniUltimoTagliando >= DAYS_THRESHOLD_CRITICAL ? 'Scaduto' :
                    giorniUltimoTagliando >= DAYS_THRESHOLD_WARNING ? 'In Scadenza' : 'OK';

  // Ritorna lo stato più critico
  if (kmStatus === 'Scaduto' || dayStatus === 'Scaduto') return 'Scaduto';
  if (kmStatus === 'In Scadenza' || dayStatus === 'In Scadenza') return 'In Scadenza';
  return 'OK';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stato = searchParams.get('stato'); // Filtro per stato: 'OK', 'In Scadenza', 'Scaduto'

    // Recupera le soglie dinamiche dal database
    const kmThresholds = await getMaintenanceThresholds();

    // Query principale con JOIN tra vehicles e travels
    // Prende l'ultimo viaggio per ogni veicolo basato sulla data più recente
    const query = `
      SELECT 
        v.id,
        v.targa,
        v.marca,
        v.modello,
        v.proprieta,
        v.km_ultimo_tagliando,
        v.data_ultimo_tagliando,
        latest_travel.kmFinali,
        latest_travel.data_viaggio,
        CASE 
          WHEN v.km_ultimo_tagliando IS NOT NULL AND latest_travel.kmFinali IS NOT NULL 
          THEN GREATEST(0, latest_travel.kmFinali - v.km_ultimo_tagliando)
          ELSE NULL 
        END as km_percorsi,
        CASE 
          WHEN v.data_ultimo_tagliando IS NOT NULL 
          THEN DATEDIFF(CURDATE(), v.data_ultimo_tagliando)
          ELSE NULL 
        END as giorni_ultimo_tagliando
      FROM vehicles v
      LEFT JOIN (
        SELECT 
          t.targaMezzoId,
          t.kmFinali,
          DATE(t.dataOraInizioViaggio) as data_viaggio,
          ROW_NUMBER() OVER (PARTITION BY t.targaMezzoId ORDER BY t.dataOraInizioViaggio DESC) as rn
        FROM travels t 
        WHERE t.targaMezzoId IS NOT NULL 
          AND t.kmFinali IS NOT NULL 
          AND t.dataOraInizioViaggio IS NOT NULL
      ) latest_travel ON v.id = latest_travel.targaMezzoId AND latest_travel.rn = 1
      WHERE v.active = 1 
        AND v.km_ultimo_tagliando IS NOT NULL
      ORDER BY v.marca, v.modello
    `;

    const [rows] = await pool.execute<VehicleMaintenanceData[]>(query);

    // Calcola lo stato del tagliando per ogni veicolo
    const vehiclesWithStatus = rows.map(vehicle => {
      const statoTagliando = calculateMaintenanceStatus(
        vehicle.km_percorsi, 
        vehicle.giorni_ultimo_tagliando,
        kmThresholds
      );
      
      return {
        ...vehicle,
        stato_tagliando: statoTagliando
      };
    });

    // Applica filtro per stato se specificato
    const filteredVehicles = stato 
      ? vehiclesWithStatus.filter(v => v.stato_tagliando === stato)
      : vehiclesWithStatus;

    // Calcola statistiche
    const stats: MaintenanceStats = {
      totale_veicoli: vehiclesWithStatus.length,
      veicoli_ok: vehiclesWithStatus.filter(v => v.stato_tagliando === 'OK').length,
      veicoli_in_scadenza: vehiclesWithStatus.filter(v => v.stato_tagliando === 'In Scadenza').length,
      veicoli_scaduti: vehiclesWithStatus.filter(v => v.stato_tagliando === 'Scaduto').length
    };

    const response: MaintenanceResponse = {
      vehicles: filteredVehicles,
      stats
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Errore nel recupero dati monitoraggio tagliandi:', error);
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      }, 
      { status: 500 }
    );
  }
}