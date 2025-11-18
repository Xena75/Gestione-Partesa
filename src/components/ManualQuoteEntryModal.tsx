'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface QuoteItem {
  code?: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total_price: number;
  vat_rate: number;
  category?: string;
}

interface ManualQuoteEntryModalProps {
  show: boolean;
  quoteId: number;
  quoteData?: {
    quote_number?: string;
    quote_date?: string;
    vehicle_plate?: string;
    vehicle_km?: number;
    intervention_location?: string;
    intervention_date?: string;
    supplier_name?: string;
  };
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function ManualQuoteEntryModal({ 
  show, 
  quoteId, 
  quoteData,
  onClose, 
  onSaveSuccess 
}: ManualQuoteEntryModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dati del preventivo
  const [quoteDate, setQuoteDate] = useState<string>('');
  const [vehicleKm, setVehicleKm] = useState<number | ''>(quoteData?.vehicle_km || '');
  const [interventionLocation, setInterventionLocation] = useState(quoteData?.intervention_location || '');
  const [interventionDate, setInterventionDate] = useState(quoteData?.intervention_date || '');
  
  // Stati per select luoghi
  const [locations, setLocations] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showNewLocationInput, setShowNewLocationInput] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationDescription, setNewLocationDescription] = useState('');
  
  // Righe del preventivo
  const [items, setItems] = useState<QuoteItem[]>([
    {
      description: '',
      unit: 'NR',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      total_price: 0,
      vat_rate: 22,
      category: 'ricambio'
    }
  ]);

  // Totali calcolati
  const [taxRate, setTaxRate] = useState(22);
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const textClass = theme === 'dark' ? 'text-white' : 'text-dark';
  const bgClass = theme === 'dark' ? 'bg-dark' : 'bg-white';
  const modalBg = theme === 'dark' ? '#1a1d20' : '#ffffff';

  // Carica righe esistenti quando il modal viene aperto
  useEffect(() => {
    if (show && quoteId) {
      loadExistingData();
      loadLocations();
    } else {
      // Reset quando il modal viene chiuso
      setItems([{
        description: '',
        unit: 'NR',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        total_price: 0,
        vat_rate: 22,
        category: 'ricambio'
      }]);
      setQuoteDate(quoteData?.quote_date || '');
      setVehicleKm(quoteData?.vehicle_km || '');
      setInterventionLocation(quoteData?.intervention_location || '');
      setInterventionDate(quoteData?.intervention_date || '');
      setTaxRate(22);
      setShowNewLocationInput(false);
      setNewLocationName('');
      setNewLocationDescription('');
    }
  }, [show, quoteId]);

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch('/api/intervention-locations');
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Errore nel caricamento dei luoghi:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleAddNewLocation = async () => {
    if (!newLocationName.trim()) {
      setError('Il nome del luogo è obbligatorio');
      return;
    }

    try {
      const response = await fetch('/api/intervention-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocationName.trim(),
          description: newLocationDescription.trim() || null
        })
      });

      const data = await response.json();

      if (data.success && data.location) {
        // Aggiungi il nuovo luogo alla lista
        setLocations([...locations, data.location]);
        // Seleziona il nuovo luogo
        setInterventionLocation(data.location.name);
        // Reset form
        setShowNewLocationInput(false);
        setNewLocationName('');
        setNewLocationDescription('');
        setError(null);
      } else {
        setError(data.error || 'Errore nell\'aggiunta del luogo');
      }
    } catch (err: any) {
      setError('Errore nell\'aggiunta del luogo');
      console.error('Errore:', err);
    }
  };

  const loadExistingData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/vehicles/quotes/${quoteId}`);
      const data = await response.json();

      if (data.success && data.quote) {
        // Carica dati preventivo
        if (data.quote.quote_date) setQuoteDate(data.quote.quote_date);
        if (data.quote.vehicle_km) setVehicleKm(data.quote.vehicle_km);
        if (data.quote.intervention_location) setInterventionLocation(data.quote.intervention_location);
        if (data.quote.intervention_date) {
          // La data dal DB è in formato ISO (YYYY-MM-DD), la manteniamo così per il salvataggio
          setInterventionDate(data.quote.intervention_date);
        }
        if (data.quote.tax_rate) setTaxRate(data.quote.tax_rate);

        // Carica righe esistenti
        if (data.items && data.items.length > 0) {
          const loadedItems = data.items.map((item: any) => ({
            code: item.part_code || undefined,
            description: item.part_name || '',
            unit: item.unit || 'NR',
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            discount_percent: Number(item.discount_percent) || 0,
            total_price: Number(item.total_price) || 0,
            vat_rate: Number(item.vat_rate) || 22,
            category: item.item_category || 'ricambio'
          }));
          setItems(loadedItems);
        } else {
          // Nessuna riga esistente, mantieni riga vuota
          setItems([{
            description: '',
            unit: 'NR',
            quantity: 1,
            unit_price: 0,
            discount_percent: 0,
            total_price: 0,
            vat_rate: 22,
            category: 'ricambio'
          }]);
        }
      }
    } catch (err: any) {
      console.error('Errore nel caricamento dati:', err);
      setError('Errore nel caricamento dei dati esistenti');
    } finally {
      setLoading(false);
    }
  };

  // Calcola totali quando cambiano le righe
  useEffect(() => {
    let subtotal = 0;
    
    items.forEach(item => {
      // Calcola totale riga: (prezzo_unitario * quantità) * (1 - sconto%)
      const lineTotal = (item.unit_price * item.quantity) * (1 - (item.discount_percent / 100));
      subtotal += lineTotal;
    });

    setTaxableAmount(subtotal);
    
    // Calcola IVA
    const tax = subtotal * (taxRate / 100);
    setTaxAmount(tax);
    
    // Totale finale
    setTotalAmount(subtotal + tax);
  }, [items, taxRate]);

  // Aggiorna total_price quando cambiano quantità, prezzo o sconto
  useEffect(() => {
    setItems(prevItems => 
      prevItems.map(item => {
        const lineTotal = (item.unit_price * item.quantity) * (1 - (item.discount_percent / 100));
        return { ...item, total_price: Math.round(lineTotal * 100) / 100 };
      })
    );
  }, []); // Solo al mount, poi gestito manualmente

  const addItem = () => {
    setItems([...items, {
      description: '',
      unit: 'NR',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      total_price: 0,
      vat_rate: 22,
      category: 'ricambio'
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Ricalcola total_price se cambiano quantità, prezzo o sconto
    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent') {
      const item = newItems[index];
      const lineTotal = (item.unit_price * item.quantity) * (1 - (item.discount_percent / 100));
      newItems[index].total_price = Math.round(lineTotal * 100) / 100;
    }
    
    setItems(newItems);
  };

  const handleSave = async () => {
    // Validazione
    const hasEmptyDescriptions = items.some(item => !item.description.trim());
    if (hasEmptyDescriptions) {
      setError('Tutte le righe devono avere una descrizione');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Converti la data nel formato YYYY-MM-DD per MySQL
      let formattedDate = null;
      if (interventionDate) {
        try {
          // Se è già in formato YYYY-MM-DD, usalo direttamente
          if (/^\d{4}-\d{2}-\d{2}$/.test(interventionDate)) {
            formattedDate = interventionDate;
          } else {
            // Altrimenti prova a convertire da formato ISO o altro
            const date = new Date(interventionDate);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              formattedDate = `${year}-${month}-${day}`;
            }
          }
        } catch (e) {
          console.error('Errore conversione data:', e);
        }
      }

      const response = await fetch(`/api/vehicles/quotes/${quoteId}/save-parsed-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_km: vehicleKm || null,
          intervention_location: interventionLocation || null,
          intervention_date: formattedDate,
          taxable_amount: taxableAmount,
          tax_amount: taxAmount,
          tax_rate: taxRate,
          items: items
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className={`modal-content ${bgClass}`}>
          <div className="modal-header">
            <h5 className={`modal-title ${textClass}`}>
              <i className="fas fa-edit me-2"></i>
              Inserimento Manuale Righe Preventivo
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            {loading && (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
                <p className={`mt-2 ${textClass}`}>Caricamento dati...</p>
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setError(null)}
                ></button>
              </div>
            )}

            {!loading && (
              <>
                {/* Dati Preventivo e Veicolo */}
                <div className="row mb-4">
              <div className="col-md-6">
                <h6 className={textClass}>📋 Dati Preventivo</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td className={textClass}><strong>N. Preventivo:</strong></td>
                      <td className={textClass}>{quoteData?.quote_number || '-'}</td>
                    </tr>
                    <tr>
                      <td className={textClass}><strong>Data Preventivo:</strong></td>
                      <td className={textClass}>
                        {quoteDate ? (() => {
                          try {
                            const date = new Date(quoteDate);
                            if (isNaN(date.getTime())) return quoteDate;
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            return `${day}/${month}/${year}`;
                          } catch {
                            return quoteDate;
                          }
                        })() : (quoteData?.quote_date ? (() => {
                          try {
                            const date = new Date(quoteData.quote_date);
                            if (isNaN(date.getTime())) return quoteData.quote_date;
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            return `${day}/${month}/${year}`;
                          } catch {
                            return quoteData.quote_date;
                          }
                        })() : '-')}
                      </td>
                    </tr>
                    <tr>
                      <td className={textClass}><strong>Fornitore:</strong></td>
                      <td className={textClass}>{quoteData?.supplier_name || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="col-md-6">
                <h6 className={textClass}>🚗 Dati Veicolo</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td className={textClass}><strong>Targa:</strong></td>
                      <td className={textClass}>{quoteData?.vehicle_plate || '-'}</td>
                    </tr>
                    <tr>
                      <td className={textClass}><strong>KM:</strong></td>
                      <td>
                        <input 
                          type="number"
                          className="form-control form-control-sm"
                          value={vehicleKm}
                          onChange={(e) => setVehicleKm(e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="Es: 150000"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className={textClass}><strong>Luogo Intervento:</strong></td>
                      <td>
                        <div className="d-flex gap-2 align-items-start">
                          <select
                            className="form-select form-select-sm"
                            value={interventionLocation}
                            onChange={(e) => {
                              if (e.target.value === '__new__') {
                                setShowNewLocationInput(true);
                                setInterventionLocation('');
                              } else {
                                setInterventionLocation(e.target.value);
                                setShowNewLocationInput(false);
                              }
                            }}
                            style={{ flex: 1 }}
                            disabled={showNewLocationInput}
                          >
                            <option value="">-- Seleziona luogo --</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.name}>
                                {loc.name}
                              </option>
                            ))}
                            <option value="__new__">+ Aggiungi nuovo luogo</option>
                          </select>
                          {showNewLocationInput && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                setShowNewLocationInput(false);
                                setNewLocationName('');
                                setNewLocationDescription('');
                              }}
                              title="Annulla"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                        {showNewLocationInput && (
                          <div className="mt-2 p-2 border rounded" style={{ backgroundColor: theme === 'dark' ? '#2d3238' : '#f8f9fa' }}>
                            <div className="mb-2">
                              <label className={`form-label small ${textClass}`}>Nome Luogo *</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={newLocationName}
                                onChange={(e) => setNewLocationName(e.target.value)}
                                placeholder="Es: Milano, Officina Giuliani"
                                autoFocus
                              />
                            </div>
                            <div className="mb-2">
                              <label className={`form-label small ${textClass}`}>Descrizione (opzionale)</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={newLocationDescription}
                                onChange={(e) => setNewLocationDescription(e.target.value)}
                                placeholder="Indirizzo o note aggiuntive"
                              />
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={handleAddNewLocation}
                              disabled={!newLocationName.trim()}
                            >
                              <i className="fas fa-plus me-1"></i>
                              Aggiungi
                            </button>
                          </div>
                        )}
                        {!showNewLocationInput && interventionLocation && !locations.some(loc => loc.name === interventionLocation) && (
                          <small className={`text-muted d-block mt-1 ${textClass}`}>
                            <i className="fas fa-info-circle me-1"></i>
                            Luogo personalizzato: {interventionLocation}
                          </small>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className={textClass}><strong>Data Intervento:</strong></td>
                      <td>
                        <input 
                          type="text"
                          className="form-control form-control-sm"
                          value={interventionDate ? (() => {
                            try {
                              const date = new Date(interventionDate);
                              if (isNaN(date.getTime())) return interventionDate;
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const year = date.getFullYear();
                              return `${day}/${month}/${year}`;
                            } catch {
                              return interventionDate;
                            }
                          })() : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Accetta formato gg/mm/aaaa
                            const dateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                            if (dateMatch) {
                              const [, day, month, year] = dateMatch;
                              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              if (!isNaN(date.getTime())) {
                                setInterventionDate(date.toISOString().split('T')[0]);
                              } else {
                                setInterventionDate(value);
                              }
                            } else if (value === '') {
                              setInterventionDate('');
                            } else {
                              setInterventionDate(value);
                            }
                          }}
                          placeholder="gg/mm/aaaa"
                          maxLength={10}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totali */}
            <div className="row mb-4">
              <div className="col-12">
                <h6 className={textClass}>💰 Totali</h6>
                <div className="row">
                  <div className="col-md-3">
                    <label className={`form-label small ${textClass}`}>Imponibile</label>
                    <div className={`input-group input-group-sm`}>
                      <span className="input-group-text">€</span>
                      <input 
                        type="text"
                        className="form-control"
                        value={taxableAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        readOnly
                        style={{ backgroundColor: theme === 'dark' ? '#2d3238' : '#f8f9fa' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className={`form-label small ${textClass}`}>IVA %</label>
                    <input 
                      type="number"
                      className="form-control form-control-sm"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 22)}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-md-3">
                    <label className={`form-label small ${textClass}`}>IVA</label>
                    <div className={`input-group input-group-sm`}>
                      <span className="input-group-text">€</span>
                      <input 
                        type="text"
                        className="form-control"
                        value={taxAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        readOnly
                        style={{ backgroundColor: theme === 'dark' ? '#2d3238' : '#f8f9fa' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className={`form-label small ${textClass}`}>Totale</label>
                    <div className={`input-group input-group-sm`}>
                      <span className="input-group-text">€</span>
                      <input 
                        type="text"
                        className={`form-control fw-bold ${textClass}`}
                        value={totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        readOnly
                        style={{ backgroundColor: theme === 'dark' ? '#2d3238' : '#f8f9fa' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Righe */}
            <div className="row">
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className={`mb-0 ${textClass}`}>📦 Righe Preventivo ({items.length})</h6>
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={addItem}
                    title="Aggiungi riga"
                  >
                    <i className="fas fa-plus me-1"></i>
                    Aggiungi Riga
                  </button>
                </div>
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-sm table-hover">
                    <thead className="sticky-top" style={{ backgroundColor: modalBg }}>
                      <tr>
                        <th className={textClass}>#</th>
                        <th className={textClass}>Codice</th>
                        <th className={textClass}>Descrizione *</th>
                        <th className={textClass}>Cat</th>
                        <th className={textClass}>Qtà</th>
                        <th className={textClass}>UM</th>
                        <th className={textClass}>€/u</th>
                        <th className={textClass}>Sc%</th>
                        <th className={textClass}>Totale</th>
                        <th className={textClass}>IVA%</th>
                        <th className={textClass}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className={textClass}>{index + 1}</td>
                          <td>
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              value={item.code || ''}
                              onChange={(e) => updateItem(index, 'code', e.target.value)}
                              style={{ width: '120px' }}
                              placeholder="Opzionale"
                            />
                          </td>
                          <td>
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              style={{ minWidth: '300px' }}
                              placeholder="Descrizione prodotto/servizio *"
                              required
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.category || 'ricambio'}
                              onChange={(e) => updateItem(index, 'category', e.target.value)}
                              style={{ width: '100px' }}
                            >
                              <option value="ricambio">Ricambio</option>
                              <option value="manodopera">Manodopera</option>
                              <option value="servizio">Servizio</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              style={{ width: '90px' }}
                              min="0"
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              style={{ width: '70px' }}
                            >
                              <option value="NR">NR</option>
                              <option value="HH">HH</option>
                              <option value="KG">KG</option>
                              <option value="LT">LT</option>
                              <option value="PZ">PZ</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              value={item.unit_price > 0 ? item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Rimuovi spazi e sostituisci virgola con punto per il parsing
                                const normalizedValue = value.replace(/\s/g, '').replace(',', '.');
                                const numValue = parseFloat(normalizedValue) || 0;
                                updateItem(index, 'unit_price', numValue);
                              }}
                              onBlur={(e) => {
                                // Formatta il valore quando perde il focus
                                const value = e.target.value;
                                const normalizedValue = value.replace(/\s/g, '').replace(',', '.');
                                const numValue = parseFloat(normalizedValue) || 0;
                                updateItem(index, 'unit_price', numValue);
                              }}
                              style={{ width: '100px' }}
                              placeholder="0,00"
                            />
                          </td>
                          <td>
                            <input 
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={item.discount_percent}
                              onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                              style={{ width: '70px' }}
                              min="0"
                              max="100"
                            />
                          </td>
                          <td>
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              value={item.total_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              readOnly
                              style={{ width: '110px', backgroundColor: theme === 'dark' ? '#2d3238' : '#f8f9fa' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number"
                              className="form-control form-control-sm"
                              value={item.vat_rate}
                              onChange={(e) => updateItem(index, 'vat_rate', parseFloat(e.target.value) || 22)}
                              style={{ width: '60px' }}
                              min="0"
                              max="100"
                            />
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem(index)}
                              title="Elimina riga"
                              disabled={items.length === 1}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={`mt-2 ${textClass}`}>
                  <small>
                    <i className="fas fa-info-circle me-1"></i>
                    I totali vengono calcolati automaticamente. Il totale riga = (Prezzo × Quantità) × (1 - Sconto%)
                  </small>
                </div>
              </div>
            </div>
              </>
            )}

          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={saving}
            >
              Annulla
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || loading || items.some(item => !item.description.trim())}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Salvataggio...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Salva Righe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

