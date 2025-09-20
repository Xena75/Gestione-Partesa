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
    searchParams.forEach((value, key) => {
      filters[key] = value;
    });
    return filters;
  });

  const [showTable, setShowTable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizza i filtri con l'URL
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'Tutti' && value !== 'Tutte') {
        params.set(key, value as string);
      }
    });
    
    const newUrl = params.toString() ? `?${params.toString()}` : '/handling';
    router.replace(newUrl, { scroll: false });
  }, [activeFilters, router]);

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
        
        if (!response.ok) {
          throw new Error('Errore durante l\'import');
        }
        
        alert('Import completato con successo');
        window.location.reload();
      } catch (error) {
        console.error('Errore import:', error);
        alert('Errore durante l\'import dei dati');
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
                className="btn btn-outline-primary"
                onClick={handleImport}
                disabled={true}
              >
                <i className="bi bi-upload me-2"></i>
                Importa Excel
              </button>
            </div>
          </div>

          {/* Statistiche */}
          <HandlingStats filters={activeFilters} />

          {/* Filtri */}
          <HandlingFilters 
            onFiltersChange={handleFiltersChange}
            initialFilters={activeFilters}
          />

          {/* Toggle Vista */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Vista Dati</h6>
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

          {/* Tabella */}
          {showTable && (
            <HandlingTable filters={activeFilters} />
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