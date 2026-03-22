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
  const [showImportModal, setShowImportModal] = useState(false);
  const [folderPath, setFolderPath] = useState<string>('');
  const [availableFiles, setAvailableFiles] = useState<Array<{name: string}>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProduction, setIsProduction] = useState(false);
  useEffect(() => {
    setIsProduction(!window.location.hostname.includes('localhost'));
  }, []);

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

  const handleImportFromFolder = () => {
    // Mostra il modal per selezionare la cartella
    const savedPath = localStorage.getItem('handling_import_folder_path');
    setFolderPath(savedPath || '');
    setAvailableFiles([]);
    setShowImportModal(true);
  };

  const loadFilesForFolder = async (path: string) => {
    if (!path || path.trim() === '') {
      setAvailableFiles([]);
      return;
    }

    setLoadingFiles(true);
    try {
      const url = `/api/handling/import-from-folder?customPath=${encodeURIComponent(path.trim())}`;
      const listResponse = await fetch(url, {
        credentials: 'include'
      });
      const listData = await listResponse.json();
      
      if (!listResponse.ok) {
        throw new Error(listData.error || 'Errore durante il caricamento dei file');
      }
      
      setAvailableFiles(listData.files || []);
    } catch (error) {
      console.error('Errore caricamento file:', error);
      setAvailableFiles([]);
      alert(error instanceof Error ? error.message : 'Errore durante il caricamento dei file');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFolderPathChange = (path: string) => {
    setFolderPath(path);
    if (path.trim() !== '') {
      localStorage.setItem('handling_import_folder_path', path);
    }
  };

  const handleFileImport = async (fileName: string) => {
    if (!confirm(`Vuoi importare il file "${fileName}"?\n\nQuesta operazione potrebbe richiedere alcuni minuti.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setShowImportModal(false);
      
      const importResponse = await fetch('/api/handling/import-from-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          fileName: fileName, 
          customPath: folderPath.trim() 
        }),
      });
      
      const result = await importResponse.json();
      
      if (!importResponse.ok) {
        throw new Error(result.error || result.details || 'Errore durante l\'import');
      }
      
      // Mostra messaggio dettagliato
      let message = `✅ Import completato con successo!\n\n`;
      message += `File: ${fileName}\n`;
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
      console.error('Errore import da cartella:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore durante l\'import dei dati';
      alert(`❌ Errore durante l'import:\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFromUpload = async () => {
    if (!selectedFile) return;
    if (!confirm(`Vuoi importare il file "${selectedFile.name}"?\n\nQuesta operazione potrebbe richiedere alcuni minuti.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setShowImportModal(false);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const importResponse = await fetch('/api/handling/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const result = await importResponse.json();
      
      if (!importResponse.ok) {
        throw new Error(result.error || result.details || 'Errore durante l\'import');
      }
      
      let message = `✅ Import completato con successo!\n\n`;
      message += `File: ${selectedFile.name}\n`;
      message += `Righe importate: ${result.importedRows || 0}\n`;
      message += `Totale righe: ${result.totalRows || 0}\n`;
      if (result.errorCount > 0) {
        message += `Errori: ${result.errorCount}\n`;
        if (result.errors && result.errors.length > 0) {
          message += `\nPrimi errori:\n${result.errors.slice(0, 5).join('\n')}`;
        }
      }
      
      alert(message);
      setSelectedFile(null);
      window.location.reload();
    } catch (error) {
      console.error('Errore import da upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore durante l\'import dei dati';
      alert(`❌ Errore durante l'import:\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
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
                onClick={handleImportFromFolder}
                disabled={isLoading}
                title="Seleziona e importa un file Excel"
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-excel me-2"></i>
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

          {/* Modal Import Excel */}
          {showImportModal && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
              <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="bi bi-file-earmark-excel me-2"></i>
                      Importa Excel
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => { setShowImportModal(false); setSelectedFile(null); }}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="modal-body">
                    {/* Sezione Upload - funziona in produzione (Vercel) */}
                    <div className="mb-4">
                      <label className="form-label">
                        <strong>Carica file dal computer</strong>
                        {isProduction && (
                          <span className="badge bg-primary ms-2">Consigliato in produzione</span>
                        )}
                      </label>
                      <div className="input-group">
                        <input
                          type="file"
                          className="form-control"
                          accept=".xlsx,.xls"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          disabled={isLoading}
                        />
                        <button
                          className="btn btn-success"
                          type="button"
                          onClick={handleImportFromUpload}
                          disabled={isLoading || !selectedFile}
                        >
                          <i className="bi bi-upload me-2"></i>
                          Importa file selezionato
                        </button>
                      </div>
                      {selectedFile && (
                        <small className="text-muted d-block mt-1">
                          File selezionato: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </small>
                      )}
                    </div>

                    {/* Sezione Cartella - solo in locale */}
                    {!isProduction && (
                      <>
                        <hr />
                        <div className="mb-3">
                          <label className="form-label">
                            <strong>Oppure da cartella di rete</strong>
                          </label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Es: \\\\Server\\Cartella\\Handling oppure C:\\Cartella\\Handling"
                              value={folderPath}
                              onChange={(e) => handleFolderPathChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && folderPath.trim() !== '') {
                                  loadFilesForFolder(folderPath);
                                }
                              }}
                              disabled={loadingFiles || isLoading}
                            />
                            <button
                              className="btn btn-outline-primary"
                              type="button"
                              onClick={() => {
                                if (folderPath.trim() !== '') {
                                  loadFilesForFolder(folderPath);
                                }
                              }}
                              disabled={loadingFiles || isLoading || !folderPath.trim()}
                            >
                              <i className="bi bi-search me-2"></i>
                              Carica File
                            </button>
                          </div>
                          <small className="text-muted">
                            Inserisci il percorso completo della cartella condivisa. Funziona solo in sviluppo locale.
                          </small>
                        </div>

                        <div className="mb-3">
                          <label className="form-label">
                            <strong>File Disponibili:</strong>
                            {availableFiles.length > 0 && (
                              <span className="badge bg-success ms-2">{availableFiles.length} file</span>
                            )}
                          </label>
                          {loadingFiles ? (
                            <div className="text-center py-3">
                              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                              Caricamento file dalla cartella...
                            </div>
                          ) : availableFiles.length === 0 ? (
                            <div className="alert alert-info">
                              <i className="bi bi-info-circle me-2"></i>
                              Inserisci il percorso della cartella e clicca su &quot;Carica File&quot; per vedere i file Excel disponibili.
                            </div>
                          ) : (
                            <div className="list-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                              {availableFiles.map((file, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                  onClick={() => handleFileImport(file.name)}
                                  disabled={isLoading}
                                >
                                  <div>
                                    <i className="bi bi-file-earmark-excel me-2 text-success"></i>
                                    <strong>{file.name}</strong>
                                  </div>
                                  <i className="bi bi-arrow-right"></i>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {isProduction && (
                      <div className="alert alert-info mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        In produzione usa &quot;Carica file dal computer&quot; per selezionare e importare il file Excel. L&apos;import da cartella è disponibile solo in sviluppo locale.
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setShowImportModal(false); setSelectedFile(null); }}
                      disabled={isLoading}
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              </div>
            </div>
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