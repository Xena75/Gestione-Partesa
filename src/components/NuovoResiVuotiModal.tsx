'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, Plus, Trash2, X } from 'lucide-react';
import { convertItalianToISO } from '@/lib/date-utils';

interface BollaData {
  Deposito: string;
  Riferimento: string;
  Data_rif_ddt: string; // ISO format
  Data_rif_ddt_display: string; // gg/mm/aaaa format
  ddt: string;
  Cod_Cliente: string;
  VETTORE: string;
  Data_Ritiro: string; // ISO format
  Data_Ritiro_display: string; // gg/mm/aaaa format
}

interface ProdottoRiga {
  id: string; // ID temporaneo per React key
  Cod_Prod: string;
  Colli: string;
  descr_articolo?: string;
  classe_prod?: string;
  ID_TARIFFA?: string;
  Tariffa?: number;
  Totale_compenso?: number;
  prodottoTrovato?: boolean; // Flag per tracciare se il prodotto è stato trovato
}

interface ClienteLookup {
  ragione_sociale?: string;
  div?: string;
  classe_tariffa?: string;
}

interface NuovoResiVuotiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NuovoResiVuotiModal({ isOpen, onClose, onSuccess }: NuovoResiVuotiModalProps) {
  const [bollaData, setBollaData] = useState<BollaData>({
    Deposito: '',
    Riferimento: '',
    Data_rif_ddt: '',
    Data_rif_ddt_display: '',
    ddt: '',
    Cod_Cliente: '',
    VETTORE: '',
    Data_Ritiro: '',
    Data_Ritiro_display: ''
  });

  const [righeProdotto, setRigheProdotto] = useState<ProdottoRiga[]>([]);
  const [clienteLookup, setClienteLookup] = useState<ClienteLookup>({});
  const [depositiOptions, setDepositiOptions] = useState<string[]>([]);
  const [vettoriOptions, setVettoriOptions] = useState<string[]>([]);
  const [showNewDepositoInput, setShowNewDepositoInput] = useState(false);
  const [newDepositoName, setNewDepositoName] = useState('');
  const [showNewVettoreInput, setShowNewVettoreInput] = useState(false);
  const [newVettoreName, setNewVettoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lookupInProgressRef = useRef<Set<string>>(new Set());
  const lookupRequestIdRef = useRef<Map<string, number>>(new Map()); // Traccia l'ID della richiesta per ogni riga

  // Reset form quando il modal viene chiuso
  useEffect(() => {
    if (!isOpen) {
      setBollaData({
        Deposito: '',
        Riferimento: '',
        Data_rif_ddt: '',
        Data_rif_ddt_display: '',
        ddt: '',
        Cod_Cliente: '',
        VETTORE: '',
        Data_Ritiro: '',
        Data_Ritiro_display: ''
      });
      setRigheProdotto([]);
      setClienteLookup({});
      setError('');
      setSuccess('');
      setShowNewDepositoInput(false);
      setNewDepositoName('');
      setShowNewVettoreInput(false);
      setNewVettoreName('');
      
      // Pulisci timeout e ref di lookup
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
        lookupTimeoutRef.current = null;
      }
      lookupInProgressRef.current.clear();
      lookupRequestIdRef.current.clear();
    }
  }, [isOpen]);

  // Carica opzioni dropdown
  useEffect(() => {
    if (!isOpen) return;
    
    const loadOptions = async () => {
      try {
        const response = await fetch('/api/resi-vuoti/filter-options', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setDepositiOptions(data.data.depositi || []);
            setVettoriOptions(data.data.vettori || []);
          }
        }
      } catch (err) {
        console.error('Errore nel caricare le opzioni:', err);
      }
    };
    loadOptions();
  }, [isOpen]);

  // Auto-format date input (gg/mm/aaaa)
  const formatDateInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const handleDateChange = (field: 'Data_rif_ddt' | 'Data_Ritiro', value: string) => {
    const displayValue = formatDateInput(value);
    const isoValue = displayValue.length === 10 ? convertItalianToISO(displayValue) : '';
    
    setBollaData(prev => ({
      ...prev,
      [field]: isoValue || '',
      [`${field}_display`]: displayValue
    }));
  };

  const handleBollaInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'Data_rif_ddt_display') {
      handleDateChange('Data_rif_ddt', value);
    } else if (name === 'Data_Ritiro_display') {
      handleDateChange('Data_Ritiro', value);
    } else if (name === 'Cod_Cliente') {
      // Rimuovi spazi dal codice cliente
      setBollaData(prev => ({ ...prev, [name]: value.trim() }));
    } else {
      setBollaData(prev => ({ ...prev, [name]: value }));
    }
    
    setError('');
  };

  // Lookup cliente quando cambia Cod_Cliente
  useEffect(() => {
    if (!isOpen) return;
    
    // Cancella timeout precedente
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    const codClienteTrimmed = bollaData.Cod_Cliente?.trim() || '';
    if (!codClienteTrimmed || codClienteTrimmed.length < 3) {
      setClienteLookup({});
      return;
    }

    lookupTimeoutRef.current = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const response = await fetch(`/api/resi-vuoti/lookup?type=cliente&code=${encodeURIComponent(codClienteTrimmed)}`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.data) {
          setClienteLookup({
            ragione_sociale: data.data.ragione_sociale,
            div: data.data.div,
            classe_tariffa: data.data.classe_tariffa
          });
        } else {
          setClienteLookup({});
        }
      } catch (err) {
        console.error('Errore lookup cliente:', err);
        setClienteLookup({});
      } finally {
        setLookupLoading(false);
      }
    }, 300);

    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
    };
  }, [bollaData.Cod_Cliente, isOpen]);

  // Aggiungi nuovo deposito
  const handleAddNewDeposito = () => {
    const depositoName = newDepositoName.trim();
    if (!depositoName) {
      setError('Inserisci il nome del deposito');
      return;
    }

    if (depositiOptions.includes(depositoName)) {
      setError('Questo deposito esiste già');
      return;
    }

    setDepositiOptions(prev => [...prev, depositoName].sort());
    setBollaData(prev => ({ ...prev, Deposito: depositoName }));
    setShowNewDepositoInput(false);
    setNewDepositoName('');
    setError('');
  };

  const handleAddNewVettore = () => {
    const vettoreName = newVettoreName.trim();
    if (!vettoreName) {
      setError('Inserisci il nome del vettore');
      return;
    }

    if (vettoriOptions.includes(vettoreName)) {
      setError('Questo vettore esiste già');
      return;
    }

    setVettoriOptions(prev => [...prev, vettoreName].sort());
    setBollaData(prev => ({ ...prev, VETTORE: vettoreName }));
    setShowNewVettoreInput(false);
    setNewVettoreName('');
    setError('');
  };

  // Aggiungi nuova riga prodotto
  const handleAddRigaProdotto = () => {
    const newRiga: ProdottoRiga = {
      id: Date.now().toString(),
      Cod_Prod: '',
      Colli: '',
      prodottoTrovato: undefined
    };
    setRigheProdotto(prev => [...prev, newRiga]);
  };

  // Rimuovi riga prodotto
  const handleRemoveRigaProdotto = (id: string) => {
    setRigheProdotto(prev => prev.filter(r => r.id !== id));
  };

  // Ricalcola totale compenso quando cambiano Colli
  const ricalcolaTotaleCompenso = useCallback((rigaId: string) => {
    setRigheProdotto(prev => {
      const riga = prev.find(r => r.id === rigaId);
      if (!riga || riga.Tariffa === undefined || riga.Tariffa === null) return prev;

      const colli = parseFloat(riga.Colli) || 0;
      const totaleCompenso = colli > 0 && !isNaN(riga.Tariffa) 
        ? colli * riga.Tariffa 
        : undefined;

      return prev.map(r => 
        r.id === rigaId ? { ...r, Totale_compenso: totaleCompenso } : r
      );
    });
  }, []);

  // Calcola tariffa per una riga
  const ricalcolaTariffa = useCallback(async (rigaId: string) => {
    setRigheProdotto(prev => {
      const riga = prev.find(r => r.id === rigaId);
      if (!riga || !clienteLookup.div || !clienteLookup.classe_tariffa || !riga.classe_prod) {
        return prev.map(r => 
          r.id === rigaId ? { ...r, ID_TARIFFA: undefined, Tariffa: undefined, Totale_compenso: undefined } : r
        );
      }

      const idTariffa = `${clienteLookup.div}-${clienteLookup.classe_tariffa}-${riga.classe_prod}`;
      
      // Recupera Tariffa in modo asincrono
      fetch(`/api/resi-vuoti/lookup-tariffa?idTariffa=${encodeURIComponent(idTariffa)}`, {
        credentials: 'include'
      })
        .then(response => response.json())
        .then(tariffaData => {
          const tariffa = tariffaData.success && tariffaData.data.Tariffa 
            ? parseFloat(tariffaData.data.Tariffa) 
            : undefined;

          // Usa lo stato corrente per ottenere i Colli aggiornati
          setRigheProdotto(current => {
            const currentRiga = current.find(r => r.id === rigaId);
            if (!currentRiga) return current;
            
            const colli = parseFloat(currentRiga.Colli) || 0;
            // Calcola totale compenso solo se tariffa e colli sono validi
            let totaleCompenso: number | undefined = undefined;
            if (tariffa !== undefined && !isNaN(tariffa) && colli > 0) {
              totaleCompenso = colli * tariffa;
              // Verifica che il risultato sia un numero valido
              if (isNaN(totaleCompenso)) {
                totaleCompenso = undefined;
              }
            }

            return current.map(r => {
              if (r.id === rigaId) {
                return {
                  ...r,
                  ID_TARIFFA: idTariffa,
                  Tariffa: tariffa,
                  Totale_compenso: totaleCompenso
                };
              }
              return r;
            });
          });
        })
        .catch(err => {
          console.error('Errore calcolo tariffa:', err);
        });

      // Aggiorna immediatamente con ID_TARIFFA
      return prev.map(r => {
        if (r.id === rigaId) {
          return { ...r, ID_TARIFFA: idTariffa };
        }
        return r;
      });
    });
  }, [clienteLookup.div, clienteLookup.classe_tariffa]);

  // Lookup prodotto
  const lookupProdotto = useCallback(async (rigaId: string, codProd: string, requestId: number) => {
    const codProdClean = codProd.trim().toUpperCase();
    
    console.log(`[Modal Lookup] Richiesta lookup per riga ${rigaId}, codice: "${codProd}" (pulito: "${codProdClean}"), requestId: ${requestId}`);
    
    if (!codProdClean || codProdClean.length < 2) {
      setRigheProdotto(prev => prev.map(r => 
        r.id === rigaId ? { ...r, descr_articolo: undefined, classe_prod: undefined, prodottoTrovato: false } : r
      ));
      return;
    }

    // Evita chiamate duplicate per lo stesso prodotto
    const lookupKey = `${rigaId}-${codProdClean}`;
    if (lookupInProgressRef.current.has(lookupKey)) {
      console.log(`[Modal Lookup] Lookup già in corso per ${lookupKey}, skip`);
      return;
    }

    lookupInProgressRef.current.add(lookupKey);

    try {
      const response = await fetch(`/api/resi-vuoti/lookup?type=prodotto&code=${encodeURIComponent(codProdClean)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log(`[Modal Lookup] Risposta API per "${codProdClean}" (requestId: ${requestId}):`, {
        success: data.success,
        cod_articolo: data.data?.cod_articolo,
        descr_articolo: data.data?.descr_articolo?.substring(0, 50),
        classe_prod: data.data?.classe_prod
      });
      
      // Verifica che questa risposta sia ancora valida (il codice nella riga non è cambiato)
      setRigheProdotto(prev => {
        const riga = prev.find(r => r.id === rigaId);
        if (!riga) return prev;
        
        const currentCodProd = riga.Cod_Prod.trim().toUpperCase();
        const currentRequestId = lookupRequestIdRef.current.get(rigaId) || 0;
        
        // Se il codice è cambiato o c'è una richiesta più recente, ignora questa risposta
        if (currentCodProd !== codProdClean || currentRequestId > requestId) {
          console.log(`[Modal Lookup] Risposta obsoleta ignorata: codice attuale="${currentCodProd}", risposta="${codProdClean}", requestId attuale=${currentRequestId}, risposta=${requestId}`);
          return prev;
        }
        
        if (data.success && data.data) {
          // Prodotto trovato se abbiamo almeno classe_prod (necessario per calcolare tariffa)
          const prodottoTrovato = !!data.data.classe_prod;
          // Pulisci la descrizione da spazi e mostra sempre se presente
          const descrArticolo = data.data.descr_articolo ? data.data.descr_articolo.trim() : '';
          
          console.log(`[Modal Lookup] Aggiornamento stato riga ${rigaId} (requestId: ${requestId}):`, {
            descrArticolo: descrArticolo.substring(0, 50),
            classe_prod: data.data.classe_prod,
            prodottoTrovato
          });
          
          return prev.map(r => {
            if (r.id === rigaId) {
              const updated = {
                ...r,
                descr_articolo: descrArticolo,
                classe_prod: data.data.classe_prod,
                prodottoTrovato: prodottoTrovato
              };
              
              // Calcola tariffa se prodotto trovato
              if (prodottoTrovato) {
                setTimeout(() => ricalcolaTariffa(rigaId), 0);
              }
              
              return updated;
            }
            return r;
          });
        } else {
          console.log(`[Modal Lookup] Prodotto non trovato per "${codProdClean}" (requestId: ${requestId})`);
          return prev.map(r => 
            r.id === rigaId ? { ...r, descr_articolo: undefined, classe_prod: undefined, prodottoTrovato: false } : r
          );
        }
      });
    } catch (err) {
      console.error('[Modal Lookup] Errore lookup prodotto:', err);
      setRigheProdotto(prev => prev.map(r => 
        r.id === rigaId ? { ...r, prodottoTrovato: false } : r
      ));
    } finally {
      lookupInProgressRef.current.delete(lookupKey);
    }
  }, [ricalcolaTariffa]);

  // Aggiorna riga prodotto
  const handleRigaProdottoChange = useCallback((id: string, field: 'Cod_Prod' | 'Colli', value: string) => {
    setRigheProdotto(prev => {
      const updated = prev.map(riga => {
        if (riga.id === id) {
          const updatedRiga = { ...riga, [field]: value };
          
          // Se cambia Cod_Prod, resetta i campi calcolati
          if (field === 'Cod_Prod') {
            updatedRiga.descr_articolo = undefined;
            updatedRiga.classe_prod = undefined;
            updatedRiga.ID_TARIFFA = undefined;
            updatedRiga.Tariffa = undefined;
            updatedRiga.Totale_compenso = undefined;
            updatedRiga.prodottoTrovato = undefined;
            
            // Incrementa requestId per questa riga per invalidare richieste precedenti
            const currentRequestId = lookupRequestIdRef.current.get(id) || 0;
            lookupRequestIdRef.current.set(id, currentRequestId + 1);
          }
          
          return updatedRiga;
        }
        return riga;
      });
      
      // Se cambia Cod_Prod, fai lookup con debounce per evitare troppe chiamate
      if (field === 'Cod_Prod') {
        // Cancella timeout precedente se esiste
        if (lookupTimeoutRef.current) {
          clearTimeout(lookupTimeoutRef.current);
        }
        
        // Debounce: aspetta 500ms dopo l'ultimo carattere digitato
        lookupTimeoutRef.current = setTimeout(() => {
          const riga = updated.find(r => r.id === id);
          if (riga) {
            const requestId = lookupRequestIdRef.current.get(id) || 0;
            lookupProdotto(id, riga.Cod_Prod, requestId);
          }
        }, 500);
      }
      
      // Se cambia Colli, ricalcola Totale_compenso immediatamente
      if (field === 'Colli') {
        requestAnimationFrame(() => {
          ricalcolaTotaleCompenso(id);
        });
      }
      
      return updated;
    });
  }, [lookupProdotto, ricalcolaTotaleCompenso]);

  // Ricalcola tutte le tariffe quando cambiano i dati cliente
  useEffect(() => {
    if (!isOpen) return;
    
    if (clienteLookup.div && clienteLookup.classe_tariffa) {
      righeProdotto.forEach(riga => {
        if (riga.Cod_Prod && riga.classe_prod) {
          ricalcolaTariffa(riga.id);
        }
      });
    }
  }, [clienteLookup.div, clienteLookup.classe_tariffa, righeProdotto.length, isOpen, ricalcolaTariffa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validazione dati bolla
    if (!bollaData.Deposito) {
      setError('Deposito è obbligatorio');
      setLoading(false);
      return;
    }
    if (!bollaData.Cod_Cliente) {
      setError('Codice Cliente è obbligatorio');
      setLoading(false);
      return;
    }
    if (!bollaData.Data_rif_ddt) {
      setError('Data riferimento DDT è obbligatoria');
      setLoading(false);
      return;
    }
    if (righeProdotto.length === 0) {
      setError('Aggiungi almeno una riga prodotto');
      setLoading(false);
      return;
    }

    // Validazione righe prodotto
    for (const riga of righeProdotto) {
      if (!riga.Cod_Prod) {
        setError('Tutte le righe prodotto devono avere un Codice Prodotto');
        setLoading(false);
        return;
      }
      if (!riga.Colli || parseFloat(riga.Colli) <= 0) {
        setError('Tutte le righe prodotto devono avere Colli maggiore di 0');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/resi-vuoti/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          bolla: {
            Deposito: bollaData.Deposito,
            Riferimento: bollaData.Riferimento || null,
            Data_rif_ddt: bollaData.Data_rif_ddt,
            ddt: bollaData.ddt || null,
            Cod_Cliente: bollaData.Cod_Cliente,
            VETTORE: bollaData.VETTORE || null,
            Data_Ritiro: bollaData.Data_Ritiro || null
          },
          righe: righeProdotto.map(riga => ({
            Cod_Prod: riga.Cod_Prod ? riga.Cod_Prod.trim().toUpperCase() : '', // Sempre pulito: maiuscolo e senza spazi
            Colli: parseInt(riga.Colli)
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il salvataggio');
      }

      setSuccess(`${data.inserted || righeProdotto.length} record inseriti con successo!`);
      
      // Reset form dopo 2 secondi e chiudi modal
      setTimeout(() => {
        setBollaData({
          Deposito: '',
          Riferimento: '',
          Data_rif_ddt: '',
          Data_rif_ddt_display: '',
          ddt: '',
          Cod_Cliente: '',
          VETTORE: '',
          Data_Ritiro: '',
          Data_Ritiro_display: ''
        });
        setRigheProdotto([]);
        setClienteLookup({});
        setSuccess('');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">Nuovo Resi e Vuoti Non Fatturati</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <AlertCircle className="me-2" size={20} />
                <div>{error}</div>
              </div>
            )}

            {success && (
              <div className="alert alert-success d-flex align-items-center" role="alert">
                <CheckCircle className="me-2" size={20} />
                <div>{success}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} id="nuovo-resi-vuoti-form">
              {/* Sezione Dati Bolla */}
              <div className="card mb-3">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">Dati Bolla</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="Deposito" className="form-label">
                        Deposito <span className="text-danger">*</span>
                      </label>
                      <div className="d-flex gap-2 align-items-start">
                        <div className="flex-grow-1">
                          <select
                            className="form-select"
                            id="Deposito"
                            name="Deposito"
                            value={bollaData.Deposito}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setShowNewDepositoInput(true);
                                setBollaData(prev => ({ ...prev, Deposito: '' }));
                              } else {
                                handleBollaInputChange(e);
                              }
                            }}
                            required
                            disabled={showNewDepositoInput}
                          >
                            <option value="">-- Seleziona deposito --</option>
                            {depositiOptions.map((deposito) => (
                              <option key={deposito} value={deposito}>
                                {deposito}
                              </option>
                            ))}
                            <option value="__NEW__">+ Aggiungi nuovo deposito</option>
                          </select>
                        </div>
                        {!showNewDepositoInput && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setShowNewDepositoInput(true);
                              setBollaData(prev => ({ ...prev, Deposito: '' }));
                            }}
                            title="Aggiungi nuovo deposito"
                            style={{ flexShrink: 0 }}
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>
                      {showNewDepositoInput && (
                        <div className="mt-2 d-flex gap-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Nome nuovo deposito"
                            value={newDepositoName}
                            onChange={(e) => setNewDepositoName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewDeposito();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowNewDepositoInput(false);
                                setNewDepositoName('');
                              }
                            }}
                            maxLength={100}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleAddNewDeposito}
                          >
                            Aggiungi
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setShowNewDepositoInput(false);
                              setNewDepositoName('');
                            }}
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="Riferimento" className="form-label">Riferimento</label>
                      <input
                        type="text"
                        className="form-control"
                        id="Riferimento"
                        name="Riferimento"
                        value={bollaData.Riferimento}
                        onChange={handleBollaInputChange}
                        maxLength={50}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="Data_rif_ddt_display" className="form-label">
                        Data rif/ddt <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="Data_rif_ddt_display"
                        name="Data_rif_ddt_display"
                        value={bollaData.Data_rif_ddt_display}
                        onChange={handleBollaInputChange}
                        placeholder="gg/mm/aaaa"
                        maxLength={10}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="ddt" className="form-label">DDT</label>
                      <input
                        type="text"
                        className="form-control"
                        id="ddt"
                        name="ddt"
                        value={bollaData.ddt}
                        onChange={handleBollaInputChange}
                        maxLength={4}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="Cod_Cliente" className="form-label">
                        Codice Cliente <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="Cod_Cliente"
                        name="Cod_Cliente"
                        value={bollaData.Cod_Cliente}
                        onChange={handleBollaInputChange}
                        maxLength={10}
                        required
                      />
                      {lookupLoading && <small className="text-muted">Caricamento...</small>}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Ragione Sociale</label>
                      <input
                        type="text"
                        className={`form-control ${clienteLookup.ragione_sociale ? 'border-success' : ''}`}
                        value={clienteLookup.ragione_sociale || ''}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f8f9fa', fontWeight: clienteLookup.ragione_sociale ? 'bold' : 'normal' }}
                      />
                      {!clienteLookup.ragione_sociale && bollaData.Cod_Cliente.length >= 3 && (
                        <small className="text-danger">Cliente non trovato - verifica il codice</small>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="VETTORE" className="form-label">Vettore</label>
                      <div className="d-flex gap-2 align-items-start">
                        <div className="flex-grow-1">
                          <select
                            className="form-select"
                            id="VETTORE"
                            name="VETTORE"
                            value={bollaData.VETTORE}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setShowNewVettoreInput(true);
                                setBollaData(prev => ({ ...prev, VETTORE: '' }));
                              } else {
                                handleBollaInputChange(e);
                              }
                            }}
                            disabled={showNewVettoreInput}
                          >
                            <option value="">-- Seleziona vettore --</option>
                            {vettoriOptions.map((vettore) => (
                              <option key={vettore} value={vettore}>
                                {vettore}
                              </option>
                            ))}
                            <option value="__NEW__">+ Aggiungi nuovo vettore</option>
                          </select>
                        </div>
                        {!showNewVettoreInput && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setShowNewVettoreInput(true);
                              setBollaData(prev => ({ ...prev, VETTORE: '' }));
                            }}
                            title="Aggiungi nuovo vettore"
                            style={{ flexShrink: 0 }}
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>
                      {showNewVettoreInput && (
                        <div className="mt-2 d-flex gap-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Nome nuovo vettore"
                            value={newVettoreName}
                            onChange={(e) => setNewVettoreName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewVettore();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowNewVettoreInput(false);
                                setNewVettoreName('');
                              }
                            }}
                            maxLength={100}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleAddNewVettore}
                          >
                            Aggiungi
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setShowNewVettoreInput(false);
                              setNewVettoreName('');
                            }}
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="Data_Ritiro_display" className="form-label">Data Ritiro</label>
                      <input
                        type="text"
                        className="form-control"
                        id="Data_Ritiro_display"
                        name="Data_Ritiro_display"
                        value={bollaData.Data_Ritiro_display}
                        onChange={handleBollaInputChange}
                        placeholder="gg/mm/aaaa"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sezione Righe Prodotto */}
              <div className="card">
                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Righe Prodotto</h5>
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={handleAddRigaProdotto}
                  >
                    <Plus className="me-1" size={16} />
                    Aggiungi Riga
                  </button>
                </div>
                <div className="card-body">
                  {righeProdotto.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <p>Nessuna riga prodotto aggiunta.</p>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleAddRigaProdotto}
                      >
                        <Plus className="me-2" size={16} />
                        Aggiungi Prima Riga
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table table-bordered table-sm">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th style={{ width: '5%' }}>#</th>
                            <th style={{ width: '20%' }}>Cod. Prod. <span className="text-danger">*</span></th>
                            <th style={{ width: '30%' }}>Descrizione Articolo</th>
                            <th style={{ width: '10%' }}>Colli <span className="text-danger">*</span></th>
                            <th style={{ width: '15%' }}>ID Tariffa</th>
                            <th style={{ width: '10%' }}>Tariffa</th>
                            <th style={{ width: '10%' }}>Totale Compenso</th>
                            <th style={{ width: '5%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {righeProdotto.map((riga, index) => (
                            <tr key={riga.id}>
                              <td className="text-center">{index + 1}</td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={riga.Cod_Prod}
                                  onChange={(e) => handleRigaProdottoChange(riga.id, 'Cod_Prod', e.target.value)}
                                  placeholder="Es: VCL-CAS"
                                  maxLength={10}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className={`form-control form-control-sm ${riga.prodottoTrovato ? 'border-success' : ''}`}
                                  value={riga.descr_articolo || ''}
                                  readOnly
                                  disabled
                                  placeholder={riga.prodottoTrovato && !riga.descr_articolo ? 'Descrizione non disponibile' : ''}
                                  style={{ backgroundColor: '#f8f9fa', fontWeight: riga.prodottoTrovato ? 'bold' : 'normal' }}
                                />
                                {riga.prodottoTrovato === false && riga.Cod_Prod.length >= 2 && (
                                  <small className="text-danger">Prodotto non trovato - verifica il codice</small>
                                )}
                                {riga.prodottoTrovato === true && !riga.descr_articolo && (
                                  <small className="text-muted">Descrizione non disponibile nel database</small>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={riga.Colli}
                                  onChange={(e) => handleRigaProdottoChange(riga.id, 'Colli', e.target.value)}
                                  min="1"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={riga.ID_TARIFFA || ''}
                                  readOnly
                                  disabled
                                  style={{ backgroundColor: '#f8f9fa' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={riga.Tariffa !== undefined ? riga.Tariffa.toFixed(2) + ' €' : ''}
                                  readOnly
                                  disabled
                                  style={{ backgroundColor: '#f8f9fa' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={riga.Totale_compenso !== undefined ? riga.Totale_compenso.toFixed(2) + ' €' : ''}
                                  readOnly
                                  disabled
                                  style={{ backgroundColor: '#f8f9fa' }}
                                />
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveRigaProdotto(riga.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Annulla
            </button>
            <button 
              type="submit" 
              form="nuovo-resi-vuoti-form"
              className="btn btn-primary" 
              disabled={loading || righeProdotto.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="me-2" size={16} />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="me-2" size={16} />
                  Salva {righeProdotto.length > 0 && `(${righeProdotto.length} righe)`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

