'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HandlingStats from '@/components/HandlingStats';
import HandlingFilters from '@/components/HandlingFilters';
import HandlingTable from '@/components/HandlingTable';
import ExportHandlingButton from '@/components/ExportHandlingButton';

function HandlingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Stato per i filtri attivi, sincronizzato con i parametri URL
  const [activeFilters, setActiveFilters] = useState(() => {
    const filters: any = {};
    searchParams?.forEach((value, key) => {
      filters[key] = value;
    });
    return filters;
  });

  const [showTable, setShowTable] = useState(true);
  const [viewType, setViewType] = useState<'grouped' | 'detailed'>('detailed');
  const [isLoading, setIsLoading] = useState(false);

  // Inizializza viewType dal parametro URL
  useEffect(() => {
    const urlViewType = searchParams?.get('viewType') as 'grouped' | 'detailed' | null;
    if (urlViewType) {
      setViewType(urlViewType);
    }
  }, [searchParams]);

  // Sincronizza i filtri e viewType con l'URL
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'Tutti' && value !== 'Tutte') {
        params.set(key, value as string);
      }
    });
    
    // Aggiungi il parametro viewType all'URL
    params.set('viewType', viewType);
    
    const newUrl = params.toString() ? `?${params.toString()}` : '/handling';
    router.replace(newUrl, { scroll: false });
  }, [activeFilters, viewType, router]);

  const handleFiltersChange = (newFilters: any) => {
    setActiveFilters(newFilters);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/handling/import', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || result.details || 'Errore durante l\'import');
        }
        
        // Mostra messaggio dettagliato
        let message = `✅ Import completato con successo!\n\n`;
        message += `Righe importate: ${result.importedRows || 0}\n`;
        message += `Totale righe: ${result.totalRows || 0}\n`;
        if (result.errorCount > 0) {
          message += `Errori: ${result.errorCount}\n`;
          if (result.errors && result.errors.length > 0) {
            message += `\nPrimi errori:\n${result.errors.slice(0, 5).join('\n')}`;
          }
        }
        
        alert(message);
        window.location.reload();
      } catch (error) {
        console.error('Errore import:', error);
        const errorMessage = error instanceof Error ? error.message : 'Errore durante l\'import dei dati';
        alert(`❌ Errore durante l'import:\n${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">Gestione Handling</h1>
            <div className="d-flex gap-2">
              <ExportHandlingButton filters={activeFilters} disabled={isLoading} />
              <button
                className="btn btn-success"
                onClick={handleImport}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Importazione...
                  </>
                ) : (
                  <>
                    <i className="bi bi-upload me-2"></i>
                    Importa Excel
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Statistiche */}
          <HandlingStats filters={activeFilters} viewType={viewType} />

          {/* Filtri */}
          <HandlingFilters 
            onFiltersChange={handleFiltersChange}
            initialFilters={activeFilters}
            viewType={viewType}
          />

          {/* Toggle Vista */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Vista Dati</h6>
                <div className="d-flex align-items-center gap-3">
                  <div className="btn-group" role="group" aria-label="Tipo di vista">
                    <button
                      type="button"
                      className={`btn ${viewType === 'grouped' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => {
                        setViewType('grouped');
                        // Aggiorna l'URL con il nuovo tipo di vista
                        const params = new URLSearchParams(searchParams?.toString());
                        params.set('viewType', 'grouped');
                        router.push(`?${params.toString()}`, { scroll: false });
                      }}
                    >
                      Vista Raggruppata
                    </button>
                    <button
                      type="button"
                      className={`btn ${viewType === 'detailed' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => {
                        setViewType('detailed');
                        // Aggiorna l'URL con il nuovo tipo di vista
                        const params = new URLSearchParams(searchParams?.toString());
                        params.set('viewType', 'detailed');
                        router.push(`?${params.toString()}`, { scroll: false });
                      }}
                    >
                      Vista Dettagliata
                    </button>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showTableSwitch"
                      checked={showTable}
                      onChange={(e) => setShowTable(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="showTableSwitch">
                      {showTable ? 'Nascondi Tabella' : 'Mostra Tabella'}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabella */}
          {showTable && (
            <HandlingTable filters={activeFilters} viewType={viewType} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function HandlingPage() {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center p-4"><div className="spinner-border" role="status"></div></div>}>
      <HandlingContent />
    </Suspense>
  );
}