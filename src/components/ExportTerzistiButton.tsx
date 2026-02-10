'use client';

import { useState } from 'react';
import { TerzistiFilters } from '@/lib/data-terzisti';

interface ExportTerzistiButtonProps {
  filters: TerzistiFilters;
  disabled?: boolean;
}

export default function ExportTerzistiButton({ filters, disabled = false }: ExportTerzistiButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeStats: true,
    includeVettoreAnalysis: true
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/terzisti/export', {
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

      // Crea blob dal response
      const blob = await response.blob();
      
      // Crea URL temporaneo per download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Estrae filename dall'header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `Fatturazione_Terzisti_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Chiudi modal
      setShowModal(false);
      
    } catch (error) {
      console.error('Errore export:', error);
      alert('Errore durante l\'export del file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const getActiveFiltersText = () => {
    const activeFilters = [];
    
    if (filters.divisione) activeFilters.push(`Divisione: ${filters.divisione}`);
    if (filters.vettore) activeFilters.push(`Vettore: ${filters.vettore}`);
    if (filters.azienda) activeFilters.push(`Azienda: ${filters.azienda}`);
    if (filters.anno) activeFilters.push(`Anno: ${filters.anno}`);
    if (filters.mese) {
      const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
      const monthName = monthNames[parseInt(filters.mese) - 1] || filters.mese;
      activeFilters.push(`Mese: ${monthName}`);
    }
    if (filters.trimestre) activeFilters.push(`Trimestre: Q${filters.trimestre}`);
    if (filters.settimana) activeFilters.push(`Settimana: ${filters.settimana}`);
    if (filters.dataDa) activeFilters.push(`Data Da: ${filters.dataDa}`);
    if (filters.dataA) activeFilters.push(`Data A: ${filters.dataA}`);
    if (filters.viaggio) activeFilters.push(`Viaggio: ${filters.viaggio}`);
    if (filters.cliente) activeFilters.push(`Cliente: ${filters.cliente}`);
    if (filters.ordine) activeFilters.push(`Ordine: ${filters.ordine}`);
    if (filters.consegna) activeFilters.push(`Consegna: ${filters.consegna}`);
    if (filters.articolo) activeFilters.push(`Articolo: ${filters.articolo}`);
    
    return activeFilters.length > 0 ? activeFilters.join(', ') : 'Nessun filtro attivo';
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-success"
        onClick={() => setShowModal(true)}
        disabled={disabled || isExporting}
      >
        {isExporting ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Export in corso...
          </>
        ) : (
          <>
            📊 Export Excel
          </>
        )}
      </button>

      {/* Modal Export */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📊 Export Dati Terzisti</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  disabled={isExporting}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6>Filtri Attivi:</h6>
                  <div className="alert alert-info">
                    <small>{getActiveFiltersText()}</small>
                  </div>
                </div>

                <div className="mb-3">
                  <h6>Opzioni Export:</h6>
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
                </div>

                <div className="mb-3">
                  <h6>Contenuto File Excel:</h6>
                  <ul className="list-unstyled">
                    <li>📋 <strong>Dati Filtati</strong> - Tabella completa con tutti i dettagli delle consegne (30 campi)</li>
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
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={isExporting}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Generazione...
                    </>
                  ) : (
                    <>
                      📥 Scarica Excel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
