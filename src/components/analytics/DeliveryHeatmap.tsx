// src/components/analytics/DeliveryHeatmap.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface HeatmapData {
  deposito: string;
  giorno: string;
  valore: number;
  tooltip: string;
}

interface DeliveryHeatmapProps {
  data: HeatmapData[] | null | undefined;
  loading?: boolean;
}

export default function DeliveryHeatmap({ data, loading }: DeliveryHeatmapProps) {
  // Giorni della settimana in italiano
  const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  
  // Traduci i giorni abbreviati in forma completa
  const translateDay = (day: string): string => {
    const dayMap: { [key: string]: string } = {
      'Lun': 'Lunedì',
      'Mar': 'Martedì', 
      'Mer': 'Mercoledì',
      'Gio': 'Giovedì',
      'Ven': 'Venerdì',
      'Sab': 'Sabato',
      'Dom': 'Domenica',
      // Fallback per inglese (caso non dovrebbe verificarsi)
      'Monday': 'Lunedì',
      'Tuesday': 'Martedì', 
      'Wednesday': 'Mercoledì',
      'Thursday': 'Giovedì',
      'Friday': 'Venerdì',
      'Saturday': 'Sabato',
      'Sunday': 'Domenica'
    };
    return dayMap[day] || day;
  };

  // Controlla se data è null o undefined
  const safeData = data || [];

  // Early return se loading o nessun dato
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-2 text-muted">Caricamento heatmap...</p>
        </div>
      </div>
    );
  }

  
  // Usa sempre i dati reali
  let workingData = safeData;
  let showingExample = false;

  // Se non ci sono dati, mostra errore dettagliato
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
        <div className="text-center">
          <div className="alert alert-danger">
            <h5>❌ Errore Dati Heatmap</h5>
            <p className="mb-2">I dati non arrivano al componente:</p>
            <ul className="text-start">
              <li>• data prop: {data === null ? 'null' : data === undefined ? 'undefined' : typeof data}</li>
              <li>• Array.isArray: {Array.isArray(data) ? 'true' : 'false'}</li>
              <li>• data.length: {data?.length || 'N/A'}</li>
            </ul>
            <small className="text-muted">
              Controlla la console del browser per più dettagli
            </small>
          </div>
        </div>
      </div>
    );
  }

  // Filtra dati validi
  const validData = workingData.filter(item => item && item.deposito && item.giorno);

  // Ottieni depositi unici
  const depositi = [...new Set(validData.map(d => d.deposito))].filter(Boolean).sort();
  
  // Trova valore massimo per normalizzazione colori
  const maxValue = validData.length > 0 ? Math.max(...validData.map(d => d.valore || 0), 1) : 1;
  
  // Crea matrice dati
  const heatmapMatrix: { [key: string]: { [key: string]: HeatmapData } } = {};
  
  validData.forEach(item => {
    const dayIta = translateDay(item.giorno);
    if (!heatmapMatrix[item.deposito]) {
      heatmapMatrix[item.deposito] = {};
    }
    heatmapMatrix[item.deposito][dayIta] = item;
  });

  // Funzione per ottenere colore basato sul valore (scala moderna)
  const getColor = (valore: number): string => {
    if (valore === 0) return '#f8fafc'; // Grigio molto chiaro
    
    const intensity = valore / maxValue;
    
    // Scala colori moderna: da blu chiaro a blu scuro/viola
    if (intensity >= 0.9) return '#1e1b4b'; // Indigo molto scuro
    if (intensity >= 0.8) return '#3730a3'; // Indigo scuro
    if (intensity >= 0.7) return '#4f46e5'; // Indigo
    if (intensity >= 0.6) return '#6366f1'; // Indigo chiaro
    if (intensity >= 0.5) return '#8b5cf6'; // Viola
    if (intensity >= 0.4) return '#a78bfa'; // Viola chiaro
    if (intensity >= 0.3) return '#c4b5fd'; // Viola molto chiaro
    if (intensity >= 0.2) return '#ddd6fe'; // Lavanda
    if (intensity >= 0.1) return '#ede9fe'; // Lavanda molto chiaro
    return '#f3f4f6'; // Grigio chiaro
  };

  // Funzione per ottenere colore del testo (migliore contrasto)
  const getTextColor = (valore: number): string => {
    if (valore === 0) return '#6b7280'; // Grigio medio per valori zero
    
    const intensity = valore / maxValue;
    return intensity >= 0.5 ? '#ffffff' : '#374151'; // Bianco per intensità alta, grigio scuro per bassa
  };

  return (
    <div>
      {showingExample && (
        <div className="alert alert-info mb-3">
          <small>
            ⚠️ <strong>Dati di esempio:</strong> Nessun dato reale trovato, visualizzazione con dati dimostrativi.
          </small>
        </div>
      )}

      <div className="p-3">
        {/* Header migliorato */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-1 text-dark fw-semibold">Distribuzione Colli per Deposito e Giorno</h6>
              <small className="text-muted">Valore massimo: <strong>{new Intl.NumberFormat('it-IT').format(maxValue)} colli</strong></small>
            </div>
          </div>
        </div>

        {/* Tabella heatmap moderna */}
        <div className="table-responsive">
          <table className="table table-sm table-borderless" style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                <th className="bg-light text-muted fw-semibold" style={{ width: '150px', padding: '12px', borderRadius: '8px 0 0 8px' }}>
                  Deposito
                </th>
                {giorni.map((giorno, index) => (
                  <th key={giorno} className={`bg-light text-muted fw-semibold text-center ${index === giorni.length - 1 ? 'rounded-end' : ''}`} style={{ padding: '12px' }}>
                    <div className="d-flex flex-column">
                      <span className="fw-bold" style={{ fontSize: '13px' }}>{giorno.substring(0, 3)}</span>
                      <small style={{ fontSize: '10px', opacity: '0.7' }}>{giorno.substring(3)}</small>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depositi.map(deposito => (
                <tr key={deposito}>
                  {/* Nome deposito */}
                  <td className="align-middle fw-medium text-dark" style={{ padding: '8px 12px' }}>
                    <div className="text-truncate" style={{ maxWidth: '130px' }}>
                      <small className="fw-semibold">{deposito.replace('Partesa ', '')}</small>
                    </div>
                  </td>
                  
                  {/* Celle per ogni giorno */}
                  {giorni.map(giorno => {
                    const item = heatmapMatrix[deposito]?.[giorno];
                    const valore = item?.valore || 0;
                    const backgroundColor = getColor(valore);
                    const textColor = getTextColor(valore);
                    
                    return (
                      <td
                        key={`${deposito}-${giorno}`}
                        className="text-center position-relative"
                        style={{ padding: '6px' }}
                      >
                        <div
                          className="rounded d-flex flex-column justify-content-center align-items-center position-relative"
                          style={{ 
                            backgroundColor,
                            color: textColor,
                            minHeight: '55px',
                            padding: '8px 6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(0,0,0,0.08)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                          title={item?.tooltip || `${deposito} - ${giorno}: 0 colli`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                            e.currentTarget.style.zIndex = '10';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                            e.currentTarget.style.zIndex = '1';
                          }}
                        >
                          <div className="fw-bold" style={{ fontSize: '12px', lineHeight: '1.1' }}>
                            {valore > 0 ? new Intl.NumberFormat('it-IT').format(valore) : '0'}
                          </div>
                          {valore > 0 && (
                            <div style={{ fontSize: '9px', opacity: '0.85', marginTop: '2px' }}>
                              colli
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda moderna */}
      <div className="mt-4 pt-3 border-top">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <small className="text-muted fw-medium">Scala Intensità:</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted">Bassa</small>
            <div className="d-flex align-items-center gap-1">
              {[
                '#f3f4f6', '#ede9fe', '#ddd6fe', '#c4b5fd', 
                '#a78bfa', '#8b5cf6', '#6366f1', '#4f46e5', 
                '#3730a3', '#1e1b4b'
              ].map((color, index) => (
                <div 
                  key={index}
                  style={{ 
                    width: '14px', 
                    height: '14px', 
                    backgroundColor: color, 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '3px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                ></div>
              ))}
            </div>
            <small className="text-muted">Alta</small>
          </div>
        </div>
        <div className="text-center mt-2">
          <small className="text-muted">
            Range: <strong>0</strong> - <strong>{new Intl.NumberFormat('it-IT').format(maxValue)}</strong> colli
          </small>
        </div>
      </div>
    </div>
  );
}
