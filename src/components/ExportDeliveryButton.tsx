'use client';

import React, { useState } from 'react';
import { DeliveryFilters } from '@/lib/data-gestione';

interface ExportDeliveryButtonProps {
  filters: DeliveryFilters;
  disabled?: boolean;
}

export default function ExportDeliveryButton({ filters, disabled = false }: ExportDeliveryButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeStats: true,
    includeVettoreAnalysis: true
  });

  const handleExport = async () => {
    setIsExporting(true);

    console.log('🔍 ExportDeliveryButton - Filtri da inviare:', filters);

    try {
      const response = await fetch('/api/gestione/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters,
          ...exportOptions
        }),
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fatturazione_delivery_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setShowModal(false);
    } catch (error) {
      console.error('Errore durante l\'export:', error);
      alert('Errore durante la generazione del file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-success me-2"
        onClick={() => setShowModal(true)}
        disabled={disabled || isExporting}
      >
        {isExporting ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Generazione...
          </>
        ) : (
          <>
            <i className="bi bi-file-earmark-excel me-2"></i>
            Export Excel
          </>
        )}
      </button>

      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Opzioni Export Excel</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Seleziona i fogli da includere nel file Excel:</p>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeData"
                    checked={true} // Dati filtrati sempre inclusi
                    disabled
                  />
                  <label className="form-check-label" htmlFor="includeData">
                    Includi foglio "Dati Filtati" (sempre incluso)
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeStats"
                    checked={exportOptions.includeStats}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeStats: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="includeStats">
                    Includi foglio "Statistiche Generali"
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeVettoreAnalysis"
                    checked={exportOptions.includeVettoreAnalysis}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeVettoreAnalysis: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="includeVettoreAnalysis">
                    Includi foglio "Analisi per Vettore"
                  </label>
                </div>

                <div className="mb-3">
                  <h6>Contenuto File Excel:</h6>
                  <ul className="list-unstyled">
                    <li>📋 <strong>Dati Filtati</strong> - Tabella completa con tutti i dettagli delle consegne (23 campi)</li>
                    {exportOptions.includeStats && (
                      <li>📊 <strong>Statistiche Generali</strong> - KPI e totali</li>
                    )}
                    {exportOptions.includeVettoreAnalysis && (
                      <li>🚛 <strong>Analisi per Vettore</strong> - Dati aggregati per vettore</li>
                    )}
                  </ul>
                </div>

                <div className="alert alert-warning">
                  <small>
                    <strong>Nota:</strong> Il file Excel verrà scaricato automaticamente.
                    Per dataset molto grandi, l'export potrebbe richiedere alcuni secondi.
                  </small>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isExporting}>Annulla</button>
                  <button type="button" className="btn btn-primary" onClick={handleExport} disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Generazione...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-download me-2"></i>
                        Scarica Excel
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
