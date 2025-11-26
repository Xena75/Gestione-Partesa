'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, Plus, X } from 'lucide-react';
import { convertItalianToISO, convertISOToItalian, formatDateInput } from '@/lib/date-utils';

interface ResiVuotiRecord {
  id: number;
  Riferimento: string | null;
  Data_rif_ddt: string;
  ddt: string | null;
  Cod_Cliente: string;
  ragione_sociale: string | null;
  VETTORE: string | null;
  Cod_Prod: string;
  descr_articolo: string | null;
  Deposito: string | null;
  Colli: number;
  Data_Ritiro: string | null;
  ID_TARIFFA: string | null;
  Tariffa: number | null;
  Totale_compenso: number | null;
}

interface FormData {
  Deposito: string;
  Riferimento: string;
  Data_rif_ddt: string; // ISO format
  Data_rif_ddt_display: string; // gg/mm/aaaa format
  ddt: string;
  Cod_Cliente: string;
  VETTORE: string;
  Cod_Prod: string;
  Colli: string;
  Data_Ritiro: string; // ISO format
  Data_Ritiro_display: string; // gg/mm/aaaa format
}

interface ClienteLookup {
  ragione_sociale?: string;
  div?: string;
  classe_tariffa?: string;
}

interface ModificaResiVuotiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: ResiVuotiRecord | null;
}

export default function ModificaResiVuotiModal({ isOpen, onClose, onSuccess, record }: ModificaResiVuotiModalProps) {
  const [formData, setFormData] = useState<FormData>({
    Deposito: '',
    Riferimento: '',
    Data_rif_ddt: '',
    Data_rif_ddt_display: '',
    ddt: '',
    Cod_Cliente: '',
    VETTORE: '',
    Cod_Prod: '',
    Colli: '',
    Data_Ritiro: '',
    Data_Ritiro_display: ''
  });

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
  const [prodottoInfo, setProdottoInfo] = useState<{
    descr_articolo?: string;
    classe_prod?: string;
    ID_TARIFFA?: string;
    Tariffa?: number;
    Totale_compenso?: number;
  }>({});
  
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Funzione helper per convertire data da qualsiasi formato a ISO
  const normalizeDateToISO = (dateString: string | null | undefined): string => {
    if (!dateString || dateString.trim() === '') return '';
    
    // Se è già in formato ISO yyyy-mm-dd, restituiscilo
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
      return dateString.trim();
    }
    
    // Se contiene T (timestamp ISO), estrai solo la parte data
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // Prova a parsare come Date e convertire in ISO
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error('Errore conversione data:', e);
    }
    
    return '';
  };

  // Funzione helper per convertire data da qualsiasi formato a italiano
  const normalizeDateToItalian = (dateString: string | null | undefined): string => {
    const isoDate = normalizeDateToISO(dateString);
    if (!isoDate) return '';
    return convertISOToItalian(isoDate);
  };

  // Carica i dati del record quando il modal si apre
  useEffect(() => {
    if (isOpen && record) {
      const dataRifDdtISO = normalizeDateToISO(record.Data_rif_ddt);
      const dataRitiroISO = normalizeDateToISO(record.Data_Ritiro);
      const dataRifDdtDisplay = normalizeDateToItalian(record.Data_rif_ddt);
      const dataRitiroDisplay = dataRitiroISO ? normalizeDateToItalian(record.Data_Ritiro) : '';
      
      // Assicurati che Data_rif_ddt sia sempre presente e valida
      let finalDataRifDdtISO = dataRifDdtISO;
      if (!finalDataRifDdtISO && record.Data_rif_ddt) {
        // Se la normalizzazione fallisce, prova a parsare direttamente
        try {
          const date = new Date(record.Data_rif_ddt);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            finalDataRifDdtISO = `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.error('Errore parsing data Data_rif_ddt:', e);
        }
      }
      
      // Assicurati che Data_rif_ddt_display sia sempre presente
      let finalDataRifDdtDisplay = dataRifDdtDisplay;
      if (!finalDataRifDdtDisplay && finalDataRifDdtISO) {
        // Se la conversione italiana fallisce ma abbiamo ISO, converti manualmente
        finalDataRifDdtDisplay = convertISOToItalian(finalDataRifDdtISO);
      }
      
      console.log('[ModificaModal] Caricamento dati record:', {
        recordDataRifDdt: record.Data_rif_ddt,
        finalDataRifDdtISO,
        finalDataRifDdtDisplay
      });
      
      setFormData({
        Deposito: record.Deposito || '',
        Riferimento: record.Riferimento || '',
        Data_rif_ddt: finalDataRifDdtISO || '', // Deve essere sempre presente
        Data_rif_ddt_display: finalDataRifDdtDisplay || '', // Deve essere sempre presente se Data_rif_ddt è presente
        ddt: record.ddt || '',
        Cod_Cliente: record.Cod_Cliente,
        VETTORE: record.VETTORE || '',
        Cod_Prod: record.Cod_Prod,
        Colli: record.Colli.toString(),
        Data_Ritiro: dataRitiroISO || '',
        Data_Ritiro_display: dataRitiroDisplay
      });

      setProdottoInfo({
        descr_articolo: record.descr_articolo || undefined,
        classe_prod: undefined, // Verrà recuperato dal lookup
        ID_TARIFFA: record.ID_TARIFFA || undefined,
        Tariffa: record.Tariffa || undefined,
        Totale_compenso: record.Totale_compenso || undefined
      });

      // Carica lookup cliente iniziale
      if (record.Cod_Cliente) {
        lookupCliente(record.Cod_Cliente);
      }

      // Carica lookup prodotto iniziale
      if (record.Cod_Prod) {
        lookupProdotto(record.Cod_Prod);
      }
    }
  }, [isOpen, record]);

  // Reset form quando il modal viene chiuso
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        Deposito: '',
        Riferimento: '',
        Data_rif_ddt: '',
        Data_rif_ddt_display: '',
        ddt: '',
        Cod_Cliente: '',
        VETTORE: '',
        Cod_Prod: '',
        Colli: '',
        Data_Ritiro: '',
        Data_Ritiro_display: ''
      });
      setClienteLookup({});
      setProdottoInfo({});
      setError('');
      setSuccess('');
      setShowNewDepositoInput(false);
      setNewDepositoName('');
      setShowNewVettoreInput(false);
      setNewVettoreName('');
      
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
        lookupTimeoutRef.current = null;
      }
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

  // Lookup cliente
  const lookupCliente = async (codCliente: string) => {
    const codClienteTrimmed = codCliente.trim();
    if (!codClienteTrimmed || codClienteTrimmed.length < 3) {
      setClienteLookup({});
      return;
    }

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
        // Ricalcola tariffa se abbiamo tutti i dati
        if (data.data.div && data.data.classe_tariffa && prodottoInfo.classe_prod) {
          ricalcolaTariffa();
        }
      } else {
        setClienteLookup({});
      }
    } catch (err) {
      console.error('Errore lookup cliente:', err);
      setClienteLookup({});
    } finally {
      setLookupLoading(false);
    }
  };

  // Lookup prodotto
  const lookupProdotto = async (codProd: string) => {
    const codProdClean = codProd.trim().toUpperCase();
    if (!codProdClean) {
      setProdottoInfo({});
      return;
    }

    try {
      const response = await fetch(`/api/resi-vuoti/lookup?type=prodotto&code=${encodeURIComponent(codProdClean)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const classeProd = data.data.classe_prod;
        const descrArticolo = data.data.descr_articolo ? data.data.descr_articolo.trim() : '';
        
        setProdottoInfo(prev => ({
          ...prev,
          descr_articolo: descrArticolo,
          classe_prod: classeProd
        }));

        // Ricalcola tariffa se abbiamo tutti i dati
        if (clienteLookup.div && clienteLookup.classe_tariffa && classeProd) {
          ricalcolaTariffa();
        }
      } else {
        setProdottoInfo(prev => ({
          ...prev,
          descr_articolo: undefined,
          classe_prod: undefined
        }));
      }
    } catch (err) {
      console.error('Errore lookup prodotto:', err);
      setProdottoInfo(prev => ({
        ...prev,
        descr_articolo: undefined,
        classe_prod: undefined
      }));
    }
  };

  // Ricalcola tariffa e totale compenso
  const ricalcolaTariffa = useCallback(async () => {
    if (!clienteLookup.div || !clienteLookup.classe_tariffa || !prodottoInfo.classe_prod) {
      setProdottoInfo(prev => ({
        ...prev,
        ID_TARIFFA: undefined,
        Tariffa: undefined,
        Totale_compenso: undefined
      }));
      return;
    }

    const idTariffa = `${clienteLookup.div}-${clienteLookup.classe_tariffa}-${prodottoInfo.classe_prod}`;
    
    try {
      const response = await fetch(`/api/resi-vuoti/lookup-tariffa?idTariffa=${encodeURIComponent(idTariffa)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.tariffa !== undefined && data.tariffa !== null) {
        const tariffa = parseFloat(data.tariffa);
        const colli = parseFloat(formData.Colli) || 0;
        const totaleCompenso = colli > 0 && !isNaN(tariffa) ? colli * tariffa : undefined;
        
        setProdottoInfo(prev => ({
          ...prev,
          ID_TARIFFA: idTariffa,
          Tariffa: tariffa,
          Totale_compenso: totaleCompenso
        }));
      } else {
        setProdottoInfo(prev => ({
          ...prev,
          ID_TARIFFA: idTariffa,
          Tariffa: undefined,
          Totale_compenso: undefined
        }));
      }
    } catch (err) {
      console.error('Errore recupero tariffa:', err);
      setProdottoInfo(prev => ({
        ...prev,
        ID_TARIFFA: idTariffa,
        Tariffa: undefined,
        Totale_compenso: undefined
      }));
    }
  }, [clienteLookup, prodottoInfo.classe_prod, formData.Colli]);

  // Ricalcola totale compenso quando cambiano i colli
  useEffect(() => {
    if (prodottoInfo.Tariffa !== undefined && prodottoInfo.Tariffa !== null) {
      const colli = parseFloat(formData.Colli) || 0;
      const totaleCompenso = colli > 0 && !isNaN(prodottoInfo.Tariffa) 
        ? colli * prodottoInfo.Tariffa 
        : undefined;
      
      setProdottoInfo(prev => ({
        ...prev,
        Totale_compenso: totaleCompenso
      }));
    }
  }, [formData.Colli, prodottoInfo.Tariffa]);

  // Ricalcola tariffa quando cambiano i dati cliente o prodotto
  useEffect(() => {
    if (clienteLookup.div && clienteLookup.classe_tariffa && prodottoInfo.classe_prod) {
      ricalcolaTariffa();
    }
  }, [clienteLookup.div, clienteLookup.classe_tariffa, prodottoInfo.classe_prod, ricalcolaTariffa]);

  const handleDateChange = (field: 'Data_rif_ddt' | 'Data_Ritiro', value: string) => {
    const displayValue = formatDateInput(value);
    let isoValue = '';
    
    // Se il formato è completo (gg/mm/aaaa), converti in ISO
    if (displayValue.length === 10) {
      isoValue = convertItalianToISO(displayValue);
    }
    // Se il formato non è completo ma c'è già un valore ISO nel campo, mantienilo
    // Questo evita di perdere il valore quando l'utente sta ancora digitando
    else if (displayValue.length < 10) {
      // Non sovrascrivere il valore ISO esistente durante la digitazione
      setFormData(prev => ({
        ...prev,
        [`${field}_display`]: displayValue
        // Non modificare [field] se la conversione non è completa
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: isoValue || prev[field] || '', // Mantieni il valore precedente se la conversione fallisce
      [`${field}_display`]: displayValue
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'Data_rif_ddt_display') {
      handleDateChange('Data_rif_ddt', value);
    } else if (name === 'Data_Ritiro_display') {
      handleDateChange('Data_Ritiro', value);
    } else if (name === 'Cod_Cliente') {
      setFormData(prev => ({ ...prev, [name]: value.trim() }));
      // Lookup cliente con debounce
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
      lookupTimeoutRef.current = setTimeout(() => {
        lookupCliente(value.trim());
      }, 300);
    } else if (name === 'Cod_Prod') {
      setFormData(prev => ({ ...prev, [name]: value.trim().toUpperCase() }));
      // Lookup prodotto con debounce
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
      lookupTimeoutRef.current = setTimeout(() => {
        lookupProdotto(value.trim().toUpperCase());
      }, 500);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError('');
  };

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
    setFormData(prev => ({ ...prev, Deposito: depositoName }));
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
    setFormData(prev => ({ ...prev, VETTORE: vettoreName }));
    setShowNewVettoreInput(false);
    setNewVettoreName('');
    setError('');
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validazione
    if (!formData.Deposito) {
      setError('Deposito è obbligatorio');
      setLoading(false);
      return;
    }
    if (!formData.Cod_Cliente) {
      setError('Codice Cliente è obbligatorio');
      setLoading(false);
      return;
    }
    // Se Data_rif_ddt è vuoto ma Data_rif_ddt_display è presente e completo, convertilo
    let finalDataRifDdt = formData.Data_rif_ddt;
    if (!finalDataRifDdt && formData.Data_rif_ddt_display && formData.Data_rif_ddt_display.length === 10) {
      finalDataRifDdt = convertItalianToISO(formData.Data_rif_ddt_display);
    }
    
    if (!finalDataRifDdt) {
      setError('Data riferimento DDT è obbligatoria');
      setLoading(false);
      return;
    }
    if (!formData.Cod_Prod) {
      setError('Codice Prodotto è obbligatorio');
      setLoading(false);
      return;
    }
    if (!formData.Colli || parseFloat(formData.Colli) <= 0) {
      setError('Colli deve essere maggiore di 0');
      setLoading(false);
      return;
    }

    if (!record) {
      setError('Record non trovato');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/resi-vuoti/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          Deposito: formData.Deposito,
          Riferimento: formData.Riferimento || null,
          Data_rif_ddt: finalDataRifDdt,
          ddt: formData.ddt || null,
          Cod_Cliente: formData.Cod_Cliente,
          VETTORE: formData.VETTORE || null,
          Cod_Prod: formData.Cod_Prod.trim().toUpperCase(),
          Colli: parseFloat(formData.Colli),
          Data_Ritiro: formData.Data_Ritiro || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'aggiornamento');
      }

      setSuccess('Record aggiornato con successo');
      
      // Aggiorna i dati calcolati dal server
      if (data.data) {
        setProdottoInfo(prev => ({
          ...prev,
          ID_TARIFFA: data.data.ID_TARIFFA,
          Tariffa: data.data.Tariffa,
          Totale_compenso: data.data.Totale_compenso
        }));
      }

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Errore aggiornamento:', err);
      setError(err.message || 'Errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Modifica Record</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
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

              <div className="row">
                {/* Deposito */}
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
                        value={formData.Deposito}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setShowNewDepositoInput(true);
                            setFormData(prev => ({ ...prev, Deposito: '' }));
                          } else {
                            handleInputChange(e);
                          }
                        }}
                        disabled={showNewDepositoInput}
                        required
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
                          setFormData(prev => ({ ...prev, Deposito: '' }));
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
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleAddNewDeposito}>
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

                {/* Riferimento */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="Riferimento" className="form-label">Riferimento</label>
                  <input
                    type="text"
                    className="form-control"
                    id="Riferimento"
                    name="Riferimento"
                    value={formData.Riferimento}
                    onChange={handleInputChange}
                    maxLength={50}
                  />
                </div>

                {/* Data rif/ddt */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="Data_rif_ddt_display" className="form-label">
                    Data rif/ddt <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="Data_rif_ddt_display"
                    name="Data_rif_ddt_display"
                    value={formData.Data_rif_ddt_display}
                    onChange={handleInputChange}
                    placeholder="gg/mm/aaaa"
                    maxLength={10}
                    required
                  />
                </div>

                {/* DDT */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="ddt" className="form-label">DDT</label>
                  <input
                    type="text"
                    className="form-control"
                    id="ddt"
                    name="ddt"
                    value={formData.ddt}
                    onChange={handleInputChange}
                    maxLength={4}
                  />
                </div>

                {/* Codice Cliente */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="Cod_Cliente" className="form-label">
                    Codice Cliente <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="Cod_Cliente"
                    name="Cod_Cliente"
                    value={formData.Cod_Cliente}
                    onChange={handleInputChange}
                    maxLength={10}
                    required
                  />
                  {lookupLoading && <small className="text-muted">Caricamento...</small>}
                  {clienteLookup.ragione_sociale && (
                    <small className="text-success d-block mt-1">
                      ✓ {clienteLookup.ragione_sociale}
                    </small>
                  )}
                </div>

                {/* Vettore */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="VETTORE" className="form-label">Vettore</label>
                  <div className="d-flex gap-2 align-items-start">
                    <div className="flex-grow-1">
                      <select
                        className="form-select"
                        id="VETTORE"
                        name="VETTORE"
                        value={formData.VETTORE}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setShowNewVettoreInput(true);
                            setFormData(prev => ({ ...prev, VETTORE: '' }));
                          } else {
                            handleInputChange(e);
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
                          setFormData(prev => ({ ...prev, VETTORE: '' }));
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
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleAddNewVettore}>
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

                {/* Data Ritiro */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="Data_Ritiro_display" className="form-label">Data Ritiro</label>
                  <input
                    type="text"
                    className="form-control"
                    id="Data_Ritiro_display"
                    name="Data_Ritiro_display"
                    value={formData.Data_Ritiro_display}
                    onChange={handleInputChange}
                    placeholder="gg/mm/aaaa"
                    maxLength={10}
                  />
                </div>

                {/* Codice Prodotto */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="Cod_Prod" className="form-label">
                    Codice Prodotto <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="Cod_Prod"
                    name="Cod_Prod"
                    value={formData.Cod_Prod}
                    onChange={handleInputChange}
                    maxLength={10}
                    required
                  />
                  {prodottoInfo.descr_articolo ? (
                    <small className="text-success d-block mt-1">
                      ✓ {prodottoInfo.descr_articolo}
                    </small>
                  ) : formData.Cod_Prod && !prodottoInfo.classe_prod ? (
                    <small className="text-danger d-block mt-1">
                      ⚠ Prodotto non trovato
                    </small>
                  ) : null}
                </div>

                {/* Colli */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="Colli" className="form-label">
                    Colli <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="Colli"
                    name="Colli"
                    value={formData.Colli}
                    onChange={handleInputChange}
                    min="1"
                    step="1"
                    required
                  />
                </div>

                {/* Campi calcolati (sola lettura) */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">ID Tariffa</label>
                  <input
                    type="text"
                    className="form-control"
                    value={prodottoInfo.ID_TARIFFA || '-'}
                    readOnly
                    disabled
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Tariffa</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formatCurrency(prodottoInfo.Tariffa)}
                    readOnly
                    disabled
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Totale Compenso</label>
                  <input
                    type="text"
                    className="form-control fw-bold"
                    value={formatCurrency(prodottoInfo.Totale_compenso)}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Annulla
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="me-2 animate-spin" size={16} />
                    Aggiornamento...
                  </>
                ) : (
                  <>
                    <Save className="me-2" size={16} />
                    Salva Modifiche
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

