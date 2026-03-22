// src/app/gestione/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DeliveryStats from '@/components/DeliveryStats';
import ViewToggle from '@/components/ViewToggle';
import DeliveryFilters from '@/components/DeliveryFilters';
import DeliveryTable from '@/components/DeliveryTable';
import ExportDeliveryButton from '@/components/ExportDeliveryButton';
import ImportProgress from '@/components/ImportProgress';

function GestioneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewType, setViewType] = useState<'grouped' | 'detailed'>('grouped');
  const [isLoading, setIsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [folderPath, setFolderPath] = useState<string>('');
  const [availableFiles, setAvailableFiles] = useState<Array<{name: string}>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProduction, setIsProduction] = useState(false);
  useEffect(() => {
    setIsProduction(typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));
  }, []);
  const [activeFilters, setActiveFilters] = useState({
    viaggio: searchParams?.get('viaggio') || undefined,
    ordine: searchParams?.get('ordine') || undefined,
    bu: searchParams?.get('bu') || undefined,
    divisione: searchParams?.get('divisione') || undefined,
    deposito: searchParams?.get('deposito') || undefined,
    vettore: searchParams?.get('vettore') || undefined,
    tipologia: searchParams?.get('tipologia') || undefined,
    codCliente: searchParams?.get('codCliente') || undefined,
    cliente: searchParams?.get('cliente') || undefined,
    dataDa: searchParams?.get('dataDa') || undefined,
    dataA: searchParams?.get('dataA') || undefined,
    mese: searchParams?.get('mese') || undefined,
    anno: searchParams?.get('anno') || undefined
  });

  // Aggiorna i filtri attivi quando cambiano i parametri URL
  useEffect(() => {
    setActiveFilters({
      viaggio: searchParams?.get('viaggio') || undefined,
      ordine: searchParams?.get('ordine') || undefined,
      bu: searchParams?.get('bu') || undefined,
      divisione: searchParams?.get('divisione') || undefined,
      deposito: searchParams?.get('deposito') || undefined,
      vettore: searchParams?.get('vettore') || undefined,
      tipologia: searchParams?.get('tipologia') || undefined,
      codCliente: searchParams?.get('codCliente') || undefined,
      cliente: searchParams?.get('cliente') || undefined,
      dataDa: searchParams?.get('dataDa') || undefined,
      dataA: searchParams?.get('dataA') || undefined,
      mese: searchParams?.get('mese') || undefined,
      anno: searchParams?.get('anno') || undefined
    });
  }, [searchParams]);

  const handleImportFromFolder = () => {
    const savedPath = localStorage.getItem('delivery_import_folder_path');
    setFolderPath(savedPath || '');
    setAvailableFiles([]);
    setSelectedFile(null);
    setShowImportModal(true);
    
    // Carica dalla cartella predefinita solo in locale (non su Vercel)
    if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
      if (!savedPath || savedPath.trim() === '') {
        loadFilesForFolder('');
      }
    }
  };

  const loadFilesForFolder = async (path: string) => {
    setLoadingFiles(true);
    try {
      let url: string;
      
      if (path && path.trim() !== '') {
        // Percorso personalizzato
        url = `/api/delivery/import-from-folder?customPath=${encodeURIComponent(path.trim())}`;
      } else {
        // Cartella predefinita (mensili)
        url = `/api/delivery/import-from-folder?folder=mensili`;
      }
      
      const listResponse = await fetch(url, {
        credentials: 'include'
      });
      const listData = await listResponse.json();
      
      if (!listResponse.ok) {
        throw new Error(listData.error || 'Errore durante il caricamento dei file');
      }
      
      setAvailableFiles(listData.files || []);
      
      // Se è una cartella predefinita, mostra il percorso nel campo
      if (!path && listData.folderPath) {
        setFolderPath(listData.folderPath);
      }
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
      localStorage.setItem('delivery_import_folder_path', path);
    }
  };

  const handleFileImport = async (fileName: string) => {
    if (!confirm(`Vuoi importare il file "${fileName}"?\n\nQuesta operazione potrebbe richiedere alcuni minuti.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setShowImportModal(false);
      
      const requestBody: any = { 
        fileName: fileName
      };
      
      // Se c'è un percorso personalizzato, usalo, altrimenti usa la cartella predefinita
      if (folderPath && folderPath.trim() !== '') {
        requestBody.customPath = folderPath.trim();
      } else {
        requestBody.folder = 'mensili'; // Cartella predefinita
      }
      
      const importResponse = await fetch('/api/delivery/import-from-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      
      const result = await importResponse.json();
      
      if (!importResponse.ok) {
        throw new Error(result.error || result.details || 'Errore durante l\'import');
      }
      
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
      const importResponse = await fetch('/api/delivery/import', {
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
        if (result.errors?.length > 0) {
          message += `\nPrimi errori:\n${result.errors.slice(0, 5).join('\n')}`;
        }
      }
      alert(message);
      setSelectedFile(null);
      window.location.reload();
    } catch (error) {
      console.error('Errore import da upload:', error);
      alert(`❌ Errore durante l'import:\n${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">Gestione Fatturazione Delivery</h1>

          {/* Pulsanti Export e Import */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">📊 Gestione Dati</h5>
                <div className="btn-group">
                  <ExportDeliveryButton filters={activeFilters} />
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
                        Import Excel
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiche Dashboard */}
          <DeliveryStats />

          {/* Filtri Avanzati */}
          <DeliveryFilters />

          {/* Toggle Vista */}
          <ViewToggle viewType={viewType} setViewType={setViewType} />

          {/* Tabella Dati */}
          <DeliveryTable viewType={viewType} />

          {/* Modal Import Excel */}
          {showImportModal && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
              <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="bi bi-file-earmark-excel me-2"></i>
                      Importa Excel Delivery
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
                              placeholder="Es: \\\\Server\\Cartella\\Delivery oppure C:\\Cartella\\Delivery"
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

export default function GestionePage() {
  return (
    <Suspense fallback={
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    }>
      <GestioneContent />
    </Suspense>
  );
}
