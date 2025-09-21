// src/app/api/analytics/delivery/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import { withCache } from '@/lib/cache';

// Tipi per le statistiche analytics
export interface DeliveryAnalytics {
  kpis: {
    totalConsegne: number;
    totalColli: number;
    totalFatturato: number;
    totalVettori: number;
    variazioneTrend: {
      consegne: number;
      colli: number;
      fatturato: number;
      vettori: number;
    };
  };
  timeSeriesData: {
    date: string;
    rawDate: string;
    consegne: number;
    colli: number;
    fatturato: number;
    type: string;
    period: number;
  }[];
  allVettori: {
    id: number;
    nome: string;
    consegne: number;
    colli: number;
    fatturato: number;
    percentuale: number;
    fatturatoMedio: number;
    colliMedio: number;
    giorniAttivi: number;
    efficienza: number;
    rank: number;
  }[];
  ripartizioneTipologie: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  heatmapData: {
    deposito: string;
    giorno: string;
    valore: number;
    tooltip: string;
  }[];
  topClienti: {
    nome: string;
    consegne: number;
    colli: number;
    fatturato: number;
  }[];
  ripartizioneDepositi: {
    name: string;
    value: number;
    percentage: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parametri di filtro
    const filters = {
      dataDa: searchParams.get('dataDa'),
      dataA: searchParams.get('dataA'),
      bu: searchParams.get('bu'),
      divisione: searchParams.get('divisione'),
      deposito: searchParams.get('deposito'),
      vettore: searchParams.get('vettore'),
      tipologia: searchParams.get('tipologia'),
      cliente: searchParams.get('cliente'),
      mese: searchParams.get('mese'),
    };

    // Costruisci WHERE clause
    let whereClause = '';
    let queryParams: any[] = [];
    const conditions: string[] = [];

    if (filters.dataDa) {
      conditions.push('data_mov_merce >= ?');
      queryParams.push(filters.dataDa);
    }
    if (filters.dataA) {
      conditions.push('data_mov_merce <= ?');
      queryParams.push(filters.dataA);
    }
    if (filters.bu && filters.bu !== 'Tutti') {
      conditions.push('bu = ?');
      queryParams.push(filters.bu);
    }
    if (filters.divisione && filters.divisione !== 'Tutte') {
      conditions.push('`div` = ?');
      queryParams.push(filters.divisione);
    }
    if (filters.deposito && filters.deposito !== 'Tutti') {
      conditions.push('dep = ?');
      queryParams.push(filters.deposito);
    }
    if (filters.vettore && filters.vettore !== 'Tutti') {
      conditions.push('descr_vettore = ?');
      queryParams.push(filters.vettore);
    }
    if (filters.tipologia && filters.tipologia !== 'Tutte') {
      conditions.push('tipologia = ?');
      queryParams.push(filters.tipologia);
    }
    if (filters.cliente) {
      conditions.push('ragione_sociale LIKE ?');
      queryParams.push(`%${filters.cliente}%`);
    }
    if (filters.mese && filters.mese !== 'Tutti') {
      conditions.push('mese = ?');
      queryParams.push(parseInt(filters.mese));
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Cache key basata sui filtri
    const cacheKey = `delivery-analytics:${JSON.stringify(filters)}`;

    const analyticsData = await withCache(
      cacheKey,
      async (): Promise<DeliveryAnalytics> => {
        // 1. KPI principali
        const [kpiResult] = await pool.query(`
          SELECT 
            COUNT(DISTINCT consegna_num) as totalConsegne,
            SUM(colli) as totalColli,
            SUM(tot_compenso) as totalFatturato,
            COUNT(DISTINCT descr_vettore) as totalVettori
          FROM fatt_delivery 
          ${whereClause}
        `, queryParams);

        const kpis = (kpiResult as any[])[0];

        // 2. Dati per calcolare trend (periodo precedente)
        let trendData = { consegne: 0, colli: 0, fatturato: 0, vettori: 0 };
        if (filters.dataDa && filters.dataA) {
          const startDate = new Date(filters.dataDa);
          const endDate = new Date(filters.dataA);
          const diffTime = endDate.getTime() - startDate.getTime();
          const prevStartDate = new Date(startDate.getTime() - diffTime);
          const prevEndDate = new Date(startDate.getTime() - 1);

          const prevParams = [...queryParams];
          // Sostituisci le date con quelle del periodo precedente
          if (conditions.some(c => c.includes('data_mov_merce >='))) {
            prevParams[0] = prevStartDate.toISOString().split('T')[0];
          }
          if (conditions.some(c => c.includes('data_mov_merce <='))) {
            const dateIndex = conditions.findIndex(c => c.includes('data_mov_merce <='));
            prevParams[dateIndex] = prevEndDate.toISOString().split('T')[0];
          }

          const [prevKpiResult] = await pool.query(`
            SELECT 
              COUNT(DISTINCT consegna_num) as totalConsegne,
              SUM(colli) as totalColli,
              SUM(tot_compenso) as totalFatturato,
              COUNT(DISTINCT descr_vettore) as totalVettori
            FROM fatt_delivery 
            ${whereClause}
          `, prevParams);

          const prevKpis = (prevKpiResult as any[])[0];
          
          trendData = {
            consegne: prevKpis.totalConsegne > 0 ? ((kpis.totalConsegne - prevKpis.totalConsegne) / prevKpis.totalConsegne * 100) : 0,
            colli: prevKpis.totalColli > 0 ? ((kpis.totalColli - prevKpis.totalColli) / prevKpis.totalColli * 100) : 0,
            fatturato: prevKpis.totalFatturato > 0 ? ((kpis.totalFatturato - prevKpis.totalFatturato) / prevKpis.totalFatturato * 100) : 0,
            vettori: prevKpis.totalVettori > 0 ? ((kpis.totalVettori - prevKpis.totalVettori) / prevKpis.totalVettori * 100) : 0,
          };
        }

        // 3. Serie temporale ADATTIVA (giornaliera/settimanale/mensile)
        
        // Calcola durata periodo per decidere aggregazione
        let startDate = new Date();
        let endDate = new Date();
        let daysDiff = 30; // Default 30 giorni
        
        if (filters.dataDa && filters.dataA) {
          startDate = new Date(filters.dataDa);
          endDate = new Date(filters.dataA);
          daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          // Default: ultimo mese
          startDate.setDate(startDate.getDate() - 30);
        }

        let timeSeriesQuery = '';
        let groupByClause = '';
        let dateFormat = '';
        let aggregationType = '';

        if (daysDiff <= 30) {
          // GIORNALIERA: ≤ 30 giorni
          groupByClause = 'GROUP BY DATE(data_mov_merce)';
          dateFormat = 'DATE(data_mov_merce)';
          aggregationType = 'daily';
        } else if (daysDiff <= 90) {
          // SETTIMANALE: 31-90 giorni  
          groupByClause = 'GROUP BY YEAR(data_mov_merce), WEEK(data_mov_merce)';
          dateFormat = 'CONCAT(YEAR(data_mov_merce), "-W", LPAD(WEEK(data_mov_merce), 2, "0"))';
          aggregationType = 'weekly';
        } else {
          // MENSILE: > 90 giorni
          groupByClause = 'GROUP BY YEAR(data_mov_merce), MONTH(data_mov_merce)';
          dateFormat = 'CONCAT(YEAR(data_mov_merce), "-", LPAD(MONTH(data_mov_merce), 2, "0"))';
          aggregationType = 'monthly';
        }

        timeSeriesQuery = `
          SELECT 
            ${dateFormat} as date,
            COUNT(DISTINCT consegna_num) as consegne,
            SUM(colli) as colli,
            SUM(tot_compenso) as fatturato,
            '${aggregationType}' as type
          FROM fatt_delivery 
          ${whereClause}
          ${groupByClause}
          ORDER BY ${dateFormat}
        `;

        const [timeSeriesResult] = await pool.query(timeSeriesQuery, queryParams);

        const timeSeriesData = (timeSeriesResult as any[] || []).map(row => {
          let formattedDate = row.date;
          
          if (aggregationType === 'weekly') {
            // Formato settimana: "2025-W34" → "Sett. 34/2025"
            const [year, week] = row.date.split('-W');
            formattedDate = `Sett. ${week}/${year}`;
          } else if (aggregationType === 'monthly') {
            // Formato mese: "2025-08" → "Ago 2025"
            const [year, month] = row.date.split('-');
            const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                               'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
            formattedDate = `${monthNames[parseInt(month) - 1]} ${year}`;
          } else {
            // Formato giornaliero: "2025-08-21" → "21/08"
            const date = new Date(row.date);
            formattedDate = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
          }

          return {
            date: formattedDate,
            rawDate: row.date,
            consegne: parseInt(row.consegne) || 0,
            colli: parseInt(row.colli) || 0,
            fatturato: parseFloat(row.fatturato) || 0,
            type: aggregationType,
            period: daysDiff
          };
        });

        // 4. TUTTI i Vettori (non limitato a top 10)
        const [allVettoriResult] = await pool.query(`
          SELECT 
            descr_vettore as nome,
            COUNT(DISTINCT consegna_num) as consegne,
            SUM(colli) as colli,
            SUM(tot_compenso) as fatturato,
            ROUND(SUM(tot_compenso) / COUNT(DISTINCT consegna_num), 2) as fatturato_medio,
            ROUND(SUM(colli) / COUNT(DISTINCT consegna_num), 1) as colli_medio,
            COUNT(DISTINCT DATE(data_mov_merce)) as giorni_attivi
          FROM fatt_delivery 
          ${whereClause}
          GROUP BY descr_vettore
          ORDER BY fatturato DESC
        `, queryParams);

        const totalFatturato = kpis.totalFatturato || 1;
        const allVettori = (allVettoriResult as any[] || []).map((row, index) => ({
          id: index + 1,
          nome: row.nome,
          consegne: parseInt(row.consegne) || 0,
          colli: parseInt(row.colli) || 0,
          fatturato: parseFloat(row.fatturato) || 0,
          percentuale: (parseFloat(row.fatturato) / totalFatturato * 100) || 0,
          fatturatoMedio: parseFloat(row.fatturato_medio) || 0,
          colliMedio: parseFloat(row.colli_medio) || 0,
          giorniAttivi: parseInt(row.giorni_attivi) || 0,
          efficienza: row.consegne > 0 ? (parseFloat(row.fatturato) / parseInt(row.consegne)) : 0,
          rank: index + 1
        }));

        // 5. Ripartizione per Tipologie
        const [tipologieResult] = await pool.query(`
          SELECT 
            tipologia as name,
            SUM(tot_compenso) as value
          FROM fatt_delivery 
          ${whereClause}
          GROUP BY tipologia
          ORDER BY value DESC
        `, queryParams);

        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
        const ripartizioneTipologie = (tipologieResult as any[] || []).map((row, index) => ({
          name: row.name,
          value: parseFloat(row.value) || 0,
          percentage: (parseFloat(row.value) / totalFatturato * 100) || 0,
          color: colors[index % colors.length],
        }));

        // Debug: Controlliamo se ci sono dati nella tabella
        const [debugResult] = await pool.query(`
          SELECT COUNT(*) as total_records,
                 COUNT(DISTINCT dep) as unique_depositi,
                 COUNT(DISTINCT DATE(data_mov_merce)) as unique_dates,
                 MIN(data_mov_merce) as min_date,
                 MAX(data_mov_merce) as max_date
          FROM fatt_delivery 
          ${whereClause}
        `, queryParams);
        
        console.log('Debug fatt_delivery:', debugResult);

        // 6. Heatmap Depositi vs Giorni settimana
        const [heatmapResult] = await pool.query(`
          SELECT 
            dep as deposito,
            CASE DAYOFWEEK(data_mov_merce)
              WHEN 1 THEN 'Dom'
              WHEN 2 THEN 'Lun'
              WHEN 3 THEN 'Mar'
              WHEN 4 THEN 'Mer'
              WHEN 5 THEN 'Gio'
              WHEN 6 THEN 'Ven'
              WHEN 7 THEN 'Sab'
              ELSE 'N/A'
            END as giorno,
            SUM(colli) as valore,
            COUNT(DISTINCT consegna_num) as consegne,
            COUNT(*) as record_count
          FROM fatt_delivery 
          ${whereClause}
          AND data_mov_merce IS NOT NULL
          AND dep IS NOT NULL
          GROUP BY dep, DAYOFWEEK(data_mov_merce)
          ORDER BY dep, DAYOFWEEK(data_mov_merce)
        `, queryParams);

        console.log('Heatmap query result:', heatmapResult);

        const heatmapData = (heatmapResult as any[] || []).map(row => ({
          deposito: row.deposito,
          giorno: row.giorno,
          valore: parseInt(row.valore) || 0,
          tooltip: `${row.deposito} - ${row.giorno}: ${new Intl.NumberFormat('it-IT').format(row.valore)} colli, ${row.consegne} consegne`,
        }));

        console.log('Processed heatmap data:', heatmapData.slice(0, 10));

        // 7. Top Clienti
        const [topClientiResult] = await pool.query(`
          SELECT 
            ragione_sociale as nome,
            COUNT(DISTINCT consegna_num) as consegne,
            SUM(colli) as colli,
            SUM(tot_compenso) as fatturato
          FROM fatt_delivery 
          ${whereClause}
          GROUP BY ragione_sociale
          ORDER BY fatturato DESC
          LIMIT 10
        `, queryParams);

        const topClienti = (topClientiResult as any[] || []).map(row => ({
          nome: row.nome,
          consegne: parseInt(row.consegne) || 0,
          colli: parseInt(row.colli) || 0,
          fatturato: parseFloat(row.fatturato) || 0,
        }));

        // 8. Ripartizione per Depositi
        const [depositiResult] = await pool.query(`
          SELECT 
            dep as name,
            SUM(tot_compenso) as value
          FROM fatt_delivery 
          ${whereClause}
          GROUP BY dep
          ORDER BY value DESC
        `, queryParams);

        const ripartizioneDepositi = (depositiResult as any[] || []).map(row => ({
          name: row.name,
          value: parseFloat(row.value) || 0,
          percentage: (parseFloat(row.value) / totalFatturato * 100) || 0,
        }));

        return {
          kpis: {
            totalConsegne: parseInt(kpis.totalConsegne) || 0,
            totalColli: parseInt(kpis.totalColli) || 0,
            totalFatturato: parseFloat(kpis.totalFatturato) || 0,
            totalVettori: parseInt(kpis.totalVettori) || 0,
            variazioneTrend: trendData,
          },
          timeSeriesData,
          allVettori,
          ripartizioneTipologie,
          heatmapData,
          topClienti,
          ripartizioneDepositi,
        };
      },
      2 * 60 * 1000 // Cache per 2 minuti
    );

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Errore API analytics delivery:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei dati analytics' },
      { status: 500 }
    );
  }
}
