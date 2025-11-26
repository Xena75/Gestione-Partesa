'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface QuoteItem {
  code?: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total_price: number;
  vat_rate: number | string; // Può essere un numero o "Esclusa art. 15"
  category?: string;
  part_category?: string; // categoria del pezzo (es: Filtri, Freni, ecc.)
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
  const [interventionDateDisplay, setInterventionDateDisplay] = useState('');
  
  // Stati per select luoghi
  const [locations, setLocations] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showNewLocationInput, setShowNewLocationInput] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationDescription, setNewLocationDescription] = useState('');
  
  // Stati per categorie pezzi
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState<{ [key: number]: boolean }>({});
  const [newCategoryName, setNewCategoryName] = useState<{ [key: number]: string }>({});
  const [showNewCategoryInputPart, setShowNewCategoryInputPart] = useState<{ [key: number]: boolean }>({});
  const [newCategoryNamePart, setNewCategoryNamePart] = useState<{ [key: number]: string }>({});
  
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

  // Funzione helper per ottenere il valore numerico dell'IVA (o 0 se "Esclusa art. 15")
  const getVatRateValue = (vatRate: number | string): number => {
    if (vatRate === 'Esclusa art. 15' || vatRate === -1) {
      return 0;
    }
    return typeof vatRate === 'number' ? vatRate : parseFloat(String(vatRate)) || 0;
  };

  // Funzione helper per ottenere il display dell'IVA
  const getVatRateDisplay = (vatRate: number | string): string => {
    if (vatRate === 'Esclusa art. 15' || vatRate === -1) {
      return 'Esclusa art. 15';
    }
    return String(vatRate);
  };
  
  // Stati per il display dei prezzi unitari (permettono digitazione libera)
  const [unitPriceDisplays, setUnitPriceDisplays] = useState<{ [key: number]: string }>({});

  // Totali calcolati
  const [taxRate, setTaxRate] = useState(22);
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Stati per autocompletamento pezzi - APPROCCIO SEMPLIFICATO
  const [partsSuggestions, setPartsSuggestions] = useState<Array<{
    id: number;
    codice?: string;
    descrizione: string;
    categoria?: string;
    tipo: string;
    um: string;
  }>>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null); // Indice della riga con ricerca attiva
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<{ value: string; index: number } | null>(null); // Traccia ultima ricerca
  const [showNewPartInput, setShowNewPartInput] = useState<{ [key: number]: boolean }>({});
  const [newPartData, setNewPartData] = useState<{ [key: number]: { codice?: string; categoria?: string; tipo: string; um: string } }>({});

  const textClass = theme === 'dark' ? 'text-white' : 'text-dark';
  const bgClass = theme === 'dark' ? 'bg-dark' : 'bg-white';
  const modalBg = theme === 'dark' ? '#1a1d20' : '#ffffff';

  // Carica righe esistenti quando il modal viene aperto
  useEffect(() => {
    if (show && quoteId) {
      loadExistingData();
      loadLocations();
      loadCategories();
    } else if (show && !quoteId) {
      // Se il modal è aperto ma non c'è quoteId (nuovo preventivo), carica comunque categorie e luoghi
      loadLocations();
      loadCategories();
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
      setPartsSuggestions([]);
      setActiveSearchIndex(null);
      setShowNewPartInput({});
      setNewPartData({});
      setUnitPriceDisplays({});
      setShowNewCategoryInput({});
      setNewCategoryName({});
      setShowNewCategoryInputPart({});
      setNewCategoryNamePart({});
    }
    
    // Cleanup timeout quando il componente viene smontato
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
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

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/parts-catalog?categories_only=true');
      const data = await response.json();
      if (data.success && data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Errore nel caricamento delle categorie:', err);
      setCategories([]);
    }
  };

  // Aggiungi nuova categoria
  const handleAddNewCategory = (itemIndex: number) => {
    const categoryName = newCategoryName[itemIndex]?.trim();
    if (!categoryName) {
      setError('Inserisci il nome della categoria');
      return;
    }

    // Verifica se la categoria esiste già
    if (categories.includes(categoryName)) {
      setError('Questa categoria esiste già');
      return;
    }

    // Aggiungi la categoria alla lista locale
    setCategories([...categories, categoryName].sort());
    
    // Imposta la categoria nella riga corrente
    updateItem(itemIndex, 'part_category', categoryName);
    
    // Reset form
    setShowNewCategoryInput(prev => ({ ...prev, [itemIndex]: false }));
    setNewCategoryName(prev => ({ ...prev, [itemIndex]: '' }));
    setError(null);
  };

  // Aggiungi nuova categoria nel form nuovo pezzo
  const handleAddNewCategoryPart = (itemIndex: number) => {
    const categoryName = newCategoryNamePart[itemIndex]?.trim();
    if (!categoryName) {
      setError('Inserisci il nome della categoria');
      return;
    }

    // Verifica se la categoria esiste già
    if (categories.includes(categoryName)) {
      setError('Questa categoria esiste già');
      return;
    }

    // Aggiungi la categoria alla lista locale
    setCategories([...categories, categoryName].sort());
    
    // Imposta la categoria nel form nuovo pezzo
    setNewPartData(prev => ({
      ...prev,
      [itemIndex]: { ...prev[itemIndex], categoria: categoryName }
    }));
    
    // Reset form
    setShowNewCategoryInputPart(prev => ({ ...prev, [itemIndex]: false }));
    setNewCategoryNamePart(prev => ({ ...prev, [itemIndex]: '' }));
    setError(null);
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
          // Converti per la visualizzazione
          try {
            const date = new Date(data.quote.intervention_date);
            if (!isNaN(date.getTime())) {
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              setInterventionDateDisplay(`${day}/${month}/${year}`);
            }
          } catch {}
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
            vat_rate: item.vat_rate === -1 || item.vat_rate === 'Esclusa art. 15' ? 'Esclusa art. 15' : (Number(item.vat_rate) || 22),
            category: item.item_category || 'ricambio',
            part_category: item.part_category || undefined
          }));
          setItems(loadedItems);
          
          // Inizializza i display dei prezzi unitari
          const displays: { [key: number]: string } = {};
          loadedItems.forEach((item: QuoteItem, idx: number) => {
            if (item.unit_price > 0) {
              displays[idx] = item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
          });
          setUnitPriceDisplays(displays);
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
    let totalTax = 0;
    
    items.forEach(item => {
      // Calcola totale riga: (prezzo_unitario * quantità) * (1 - sconto%)
      const lineTotal = (item.unit_price * item.quantity) * (1 - (item.discount_percent / 100));
      subtotal += lineTotal;
      
      // Calcola IVA per questa riga (se non è "Esclusa art. 15")
      const itemVatRate = getVatRateValue(item.vat_rate);
      if (itemVatRate > 0) {
        totalTax += lineTotal * (itemVatRate / 100);
      }
    });

    setTaxableAmount(subtotal);
    setTaxAmount(totalTax);
    
    // Totale finale
    setTotalAmount(subtotal + totalTax);
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
    const newIndex = items.length;
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
    // Inizializza display vuoto per la nuova riga
    setUnitPriceDisplays(prev => ({ ...prev, [newIndex]: '' }));
    // Reset stati categoria per la nuova riga
    setShowNewCategoryInput(prev => ({ ...prev, [newIndex]: false }));
    setNewCategoryName(prev => ({ ...prev, [newIndex]: '' }));
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      // Rimuovi anche il display del prezzo unitario e riorganizza gli indici
      setUnitPriceDisplays(prev => {
        const newDisplays: { [key: number]: string } = {};
        Object.keys(prev).forEach(key => {
          const oldIdx = parseInt(key);
          if (oldIdx < index) {
            newDisplays[oldIdx] = prev[oldIdx];
          } else if (oldIdx > index) {
            newDisplays[oldIdx - 1] = prev[oldIdx];
          }
        });
        return newDisplays;
      });
    }
  };

  // Cerca pezzi nell'anagrafica per autocompletamento
  const searchParts = useCallback(async (query: string, itemIndex: number) => {
    if (!query || query.trim().length < 2) {
      setPartsSuggestions([]);
      setActiveSearchIndex(null);
      return;
    }

    try {
      const response = await fetch(`/api/parts-catalog?q=${encodeURIComponent(query.trim())}&limit=10`);
      const data = await response.json();
      
      // Mostra sempre il dropdown se c'è una query (anche senza risultati)
      setActiveSearchIndex(itemIndex);
      
      if (data.success && data.data && data.data.length > 0) {
        setPartsSuggestions(data.data);
      } else {
        // Nessun risultato trovato, ma mostra comunque il dropdown per permettere l'aggiunta
        setPartsSuggestions([]);
      }
    } catch (err) {
      console.error('Errore ricerca pezzi:', err);
      // In caso di errore, mostra comunque il dropdown per permettere l'aggiunta manuale
      setPartsSuggestions([]);
      setActiveSearchIndex(itemIndex);
    }
  }, []);

  // Seleziona un pezzo dall'autocompletamento e precompila i campi
  const selectPart = (part: { codice?: string; descrizione: string; categoria?: string; tipo: string; um: string }, itemIndex: number) => {
    const newItems = [...items];
    const item = newItems[itemIndex];
    
    // Mappa tipo DB -> category form
    const tipoMap: { [key: string]: string } = {
      'Ricambio': 'ricambio',
      'Servizio': 'servizio',
      'Manodopera': 'manodopera'
    };
    
    newItems[itemIndex] = {
      ...item,
      description: part.descrizione,
      code: part.codice || undefined,
      category: tipoMap[part.tipo] || 'ricambio',
      part_category: part.categoria || undefined,
      unit: part.um || 'NR'
    };
    
    setItems(newItems);
    setPartsSuggestions([]);
    setActiveSearchIndex(null);
  };

  // Aggiungi nuovo pezzo all'anagrafica
  const handleAddNewPart = async (itemIndex: number) => {
    const item = items[itemIndex];
    const newPart = newPartData[itemIndex];
    
    if (!item.description.trim()) {
      setError('Inserisci una descrizione per il nuovo pezzo');
      return;
    }

    try {
      const response = await fetch('/api/parts-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codice: newPart?.codice || null,
          descrizione: item.description.trim(),
          categoria: newPart?.categoria || null,
          tipo: newPart?.tipo || 'Ricambio',
          um: newPart?.um || 'NR'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Precompila i campi con il nuovo pezzo
        selectPart({
          codice: data.data.codice,
          descrizione: data.data.descrizione,
          categoria: data.data.categoria,
          tipo: data.data.tipo,
          um: data.data.um
        }, itemIndex);
        
        setShowNewPartInput(prev => ({ ...prev, [itemIndex]: false }));
        setNewPartData(prev => ({ ...prev, [itemIndex]: { tipo: 'Ricambio', um: 'NR' } }));
      } else {
        setError(data.error || 'Errore nell\'aggiunta del nuovo pezzo');
      }
    } catch (err: any) {
      setError('Errore nell\'aggiunta del nuovo pezzo');
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
    
    // Se cambia la descrizione, salva per ricerca debounced
    if (field === 'description') {
      // Nascondi suggerimenti se la descrizione è vuota
      if (!value || value.trim().length < 2) {
        if (activeSearchIndex === index) {
          setPartsSuggestions([]);
          setActiveSearchIndex(null);
        }
        lastSearchRef.current = null;
        // Cancella timeout se esiste
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
      } else {
        // Salva l'ultima ricerca
        lastSearchRef.current = { value: value.trim(), index };
        
        // Cancella timeout precedente
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        
        // Cerca dopo 300ms
        searchTimeoutRef.current = setTimeout(() => {
          if (lastSearchRef.current) {
            searchParts(lastSearchRef.current.value, lastSearchRef.current.index);
          }
          searchTimeoutRef.current = null;
        }, 300);
      }
    }
  };

  // Nascondi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeSearchIndex !== null && !target.closest('.autocomplete-dropdown') && !target.closest('input[placeholder*="Descrizione"]')) {
        setActiveSearchIndex(null);
      }
    };

    if (activeSearchIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeSearchIndex]);

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

      // Prepara gli items per il salvataggio, convertendo "Esclusa art. 15" in -1
      const itemsToSave = items.map(item => ({
        ...item,
        vat_rate: item.vat_rate === 'Esclusa art. 15' ? -1 : (typeof item.vat_rate === 'number' ? item.vat_rate : parseFloat(String(item.vat_rate)) || 22)
      }));

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
          items: itemsToSave
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
      <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: '95%', width: '95%', maxHeight: '95vh', height: '95vh' }}>
        <div className={`modal-content ${bgClass}`} style={{ overflow: 'visible', height: '100%', display: 'flex', flexDirection: 'column' }}>
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

          <div className="modal-body" style={{ overflow: 'auto', flex: '1', overflowY: 'auto', overflowX: 'hidden' }}>
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
                          value={interventionDateDisplay}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Rimuovi tutto tranne i numeri
                            const numbersOnly = value.replace(/\D/g, '');
                            
                            // Limita a 8 numeri (gg + mm + aaaa)
                            const limitedNumbers = numbersOnly.substring(0, 8);
                            
                            // Formatta automaticamente con le barre
                            let formatted = '';
                            if (limitedNumbers.length > 0) {
                              formatted = limitedNumbers.substring(0, 2);
                              if (limitedNumbers.length > 2) {
                                formatted += '/' + limitedNumbers.substring(2, 4);
                              }
                              if (limitedNumbers.length > 4) {
                                formatted += '/' + limitedNumbers.substring(4, 8);
                              }
                            }
                            
                            setInterventionDateDisplay(formatted);
                            
                            // Se il formato è completo gg/mm/aaaa, converti e salva in ISO
                            if (limitedNumbers.length === 8) {
                              const day = limitedNumbers.substring(0, 2);
                              const month = limitedNumbers.substring(2, 4);
                              const year = limitedNumbers.substring(4, 8);
                              const dayNum = parseInt(day);
                              const monthNum = parseInt(month);
                              const yearNum = parseInt(year);
                              
                              // Validazione base
                              if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
                                const date = new Date(yearNum, monthNum - 1, dayNum);
                                if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
                                  setInterventionDate(date.toISOString().split('T')[0]);
                                }
                              }
                            } else if (limitedNumbers.length === 0) {
                              setInterventionDate('');
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            // Se il formato non è completo, lascia il display come è per permettere all'utente di completarla
                            if (value && value.length < 10) {
                              // Se è vuoto, mantieni vuoto
                              if (value === '') {
                                setInterventionDateDisplay('');
                                setInterventionDate('');
                              }
                              // Altrimenti mantieni quello che c'è scritto
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
                <div className="d-flex justify-content-between align-items-center mb-2 sticky-top" style={{ backgroundColor: modalBg, zIndex: 10, padding: '10px 0', marginTop: '-10px', marginBottom: '10px' }}>
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
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table table-sm table-hover" style={{ width: '100%', tableLayout: 'auto' }}>
                    <thead className="sticky-top" style={{ backgroundColor: modalBg, zIndex: 5 }}>
                      <tr>
                        <th className={textClass} style={{ width: '40px' }}>#</th>
                        <th className={textClass} style={{ width: '10%' }}>Codice</th>
                        <th className={textClass} style={{ width: '25%', minWidth: '250px' }}>Descrizione *</th>
                        <th className={textClass} style={{ width: '10%', minWidth: '130px' }}>Tipo</th>
                        <th className={textClass} style={{ width: '12%' }}>Categoria</th>
                        <th className={textClass} style={{ width: '6%' }}>Qtà</th>
                        <th className={textClass} style={{ width: '6%' }}>UM</th>
                        <th className={textClass} style={{ width: '8%' }}>€/u</th>
                        <th className={textClass} style={{ width: '6%' }}>Sc%</th>
                        <th className={textClass} style={{ width: '9%' }}>Totale</th>
                        <th className={textClass} style={{ width: '6%' }}>IVA%</th>
                        <th className={textClass} style={{ width: '50px' }}></th>
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
                              style={{ width: '100%' }}
                              placeholder="Opzionale"
                            />
                          </td>
                          <td style={{ position: 'relative', overflow: 'visible' }}>
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              style={{ width: '100%' }}
                              placeholder="Descrizione prodotto/servizio *"
                              required
                            />
                            {/* Dropdown suggerimenti - POSIZIONAMENTO FIXED PER EVITARE CLIPPING */}
                            {activeSearchIndex === index && item.description.trim().length >= 2 && (
                              <div 
                                className="autocomplete-dropdown"
                                style={{
                                  position: 'fixed',
                                  zIndex: 10000,
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                  backgroundColor: theme === 'dark' ? '#2d3238' : '#fff',
                                  border: `1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'}`,
                                  borderRadius: '4px',
                                  marginTop: '2px',
                                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                  minWidth: '300px',
                                  width: '300px'
                                }}
                              >
                                {partsSuggestions.length > 0 ? (
                                  partsSuggestions.map((part) => (
                                    <div
                                      key={part.id}
                                      className={`${textClass}`}
                                      style={{ 
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        borderBottom: `1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'}`
                                      }}
                                      onClick={() => {
                                        selectPart(part, index);
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#495057' : '#f8f9fa';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      <div>
                                        <strong>{part.descrizione}</strong>
                                        {part.codice && <small className="text-muted ms-2">({part.codice})</small>}
                                      </div>
                                      <small className="text-muted">
                                        {part.categoria && `${part.categoria} • `}
                                        {part.tipo} • UM: {part.um}
                                      </small>
                                    </div>
                                  ))
                                ) : (
                                  <div 
                                    className={`${textClass}`}
                                    style={{ 
                                      padding: '8px 12px',
                                      fontStyle: 'italic',
                                      color: theme === 'dark' ? '#adb5bd' : '#6c757d',
                                      borderBottom: `1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'}`
                                    }}
                                  >
                                    Nessun risultato trovato
                                  </div>
                                )}
                                <div 
                                  className={`${textClass}`}
                                  style={{ 
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderTop: `1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'}`,
                                    color: theme === 'dark' ? '#4dabf7' : '#0d6efd'
                                  }}
                                  onClick={() => {
                                    setShowNewPartInput(prev => ({ ...prev, [index]: true }));
                                    setActiveSearchIndex(null);
                                    setNewPartData(prev => ({
                                      ...prev,
                                      [index]: {
                                        tipo: 'Ricambio',
                                        um: 'NR'
                                      }
                                    }));
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#495057' : '#f8f9fa';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <i className="fas fa-plus me-1"></i>
                                  Aggiungi "{item.description}" all'anagrafica
                                </div>
                              </div>
                            )}
                            {/* Form per nuovo pezzo */}
                            {showNewPartInput[index] && (
                              <div 
                                className="p-2 border rounded mt-2"
                                style={{ 
                                  backgroundColor: theme === 'dark' ? '#1e2124' : '#f8f9fa',
                                  borderColor: theme === 'dark' ? '#495057' : '#dee2e6'
                                }}
                              >
                                <small className={`d-block mb-2 ${textClass}`}>
                                  <strong>Aggiungi nuovo pezzo all'anagrafica</strong>
                                </small>
                                <div className="row g-2 mb-2">
                                  <div className="col-6">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Codice (opzionale)"
                                      value={newPartData[index]?.codice || ''}
                                      onChange={(e) => setNewPartData(prev => ({
                                        ...prev,
                                        [index]: { ...prev[index], codice: e.target.value }
                                      }))}
                                    />
                                  </div>
                                  <div className="col-6">
                                    {showNewCategoryInputPart[index] ? (
                                      <div className="d-flex gap-1 align-items-center">
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          placeholder="Nome categoria"
                                          value={newCategoryNamePart[index] || ''}
                                          onChange={(e) => setNewCategoryNamePart(prev => ({ ...prev, [index]: e.target.value }))}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleAddNewCategoryPart(index);
                                            }
                                          }}
                                          style={{ width: '100%' }}
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-success"
                                          onClick={() => handleAddNewCategoryPart(index)}
                                          title="Aggiungi categoria"
                                        >
                                          <i className="fas fa-check"></i>
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-secondary"
                                          onClick={() => {
                                            setShowNewCategoryInputPart(prev => ({ ...prev, [index]: false }));
                                            setNewCategoryNamePart(prev => ({ ...prev, [index]: '' }));
                                          }}
                                          title="Annulla"
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </div>
                                    ) : (
                                      <select
                                        className="form-select form-select-sm"
                                        value={newPartData[index]?.categoria || ''}
                                        onChange={(e) => {
                                          if (e.target.value === '__add_new__') {
                                            setShowNewCategoryInputPart(prev => ({ ...prev, [index]: true }));
                                          } else {
                                            setNewPartData(prev => ({
                                              ...prev,
                                              [index]: { ...prev[index], categoria: e.target.value }
                                            }));
                                          }
                                        }}
                                      >
                                        <option value="">-- Seleziona categoria --</option>
                                        {categories.map((cat) => (
                                          <option key={cat} value={cat}>
                                            {cat}
                                          </option>
                                        ))}
                                        <option value="__add_new__" className="text-primary fw-bold">
                                          + Aggiungi nuova categoria
                                        </option>
                                      </select>
                                    )}
                                  </div>
                                </div>
                                <div className="row g-2 mb-2">
                                  <div className="col-6">
                                    <select
                                      className="form-select form-select-sm"
                                      value={newPartData[index]?.tipo || 'Ricambio'}
                                      onChange={(e) => setNewPartData(prev => ({
                                        ...prev,
                                        [index]: { ...prev[index], tipo: e.target.value }
                                      }))}
                                    >
                                      <option value="Ricambio">Ricambio</option>
                                      <option value="Servizio">Servizio</option>
                                      <option value="Manodopera">Manodopera</option>
                                    </select>
                                  </div>
                                  <div className="col-6">
                                    <select
                                      className="form-select form-select-sm"
                                      value={newPartData[index]?.um || 'NR'}
                                      onChange={(e) => setNewPartData(prev => ({
                                        ...prev,
                                        [index]: { ...prev[index], um: e.target.value }
                                      }))}
                                    >
                                      <option value="NR">NR</option>
                                      <option value="PZ">PZ</option>
                                      <option value="CF">CF</option>
                                      <option value="HH">HH</option>
                                      <option value="KG">KG</option>
                                      <option value="LT">LT</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="d-flex gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleAddNewPart(index)}
                                  >
                                    <i className="fas fa-check me-1"></i>
                                    Aggiungi
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => {
                                      setShowNewPartInput(prev => ({ ...prev, [index]: false }));
                                      setNewPartData(prev => ({ ...prev, [index]: { tipo: 'Ricambio', um: 'NR' } }));
                                    }}
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.category || 'ricambio'}
                              onChange={(e) => updateItem(index, 'category', e.target.value)}
                              style={{ width: '100%' }}
                            >
                              <option value="ricambio">Ricambio</option>
                              <option value="manodopera">Manodopera</option>
                              <option value="servizio">Servizio</option>
                            </select>
                          </td>
                          <td>
                            {showNewCategoryInput[index] ? (
                              <div className="d-flex gap-1 align-items-center">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Nome categoria"
                                  value={newCategoryName[index] || ''}
                                  onChange={(e) => setNewCategoryName(prev => ({ ...prev, [index]: e.target.value }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddNewCategory(index);
                                    }
                                  }}
                                  style={{ width: '100%' }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleAddNewCategory(index)}
                                  title="Aggiungi categoria"
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    setShowNewCategoryInput(prev => ({ ...prev, [index]: false }));
                                    setNewCategoryName(prev => ({ ...prev, [index]: '' }));
                                  }}
                                  title="Annulla"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ) : (
                              <select
                                className="form-select form-select-sm"
                                value={item.part_category || ''}
                                onChange={(e) => {
                                  if (e.target.value === '__add_new__') {
                                    setShowNewCategoryInput(prev => ({ ...prev, [index]: true }));
                                  } else {
                                    updateItem(index, 'part_category', e.target.value);
                                  }
                                }}
                                style={{ width: '100%' }}
                              >
                                <option value="">-- Seleziona categoria --</option>
                                {categories.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                                <option value="__add_new__" className="text-primary fw-bold">
                                  + Aggiungi nuova categoria
                                </option>
                              </select>
                            )}
                          </td>
                          <td>
                            <input 
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%' }}
                              min="0"
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              style={{ width: '100%' }}
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
                              value={unitPriceDisplays[index] !== undefined ? unitPriceDisplays[index] : (item.unit_price > 0 ? item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permetti digitazione libera (solo numeri, virgola e punto)
                                const cleanedValue = value.replace(/[^\d,.]/g, '');
                                setUnitPriceDisplays(prev => ({ ...prev, [index]: cleanedValue }));
                                
                                // Aggiorna anche il valore numerico per i calcoli
                                const normalizedValue = cleanedValue.replace(',', '.');
                                const numValue = parseFloat(normalizedValue) || 0;
                                updateItem(index, 'unit_price', numValue);
                              }}
                              onBlur={(e) => {
                                // Formatta il valore quando perde il focus
                                const value = e.target.value;
                                const normalizedValue = value.replace(/\s/g, '').replace(',', '.');
                                const numValue = parseFloat(normalizedValue) || 0;
                                updateItem(index, 'unit_price', numValue);
                                
                                // Formatta per la visualizzazione
                                if (numValue > 0) {
                                  setUnitPriceDisplays(prev => ({ ...prev, [index]: numValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
                                } else {
                                  setUnitPriceDisplays(prev => ({ ...prev, [index]: '' }));
                                }
                              }}
                              style={{ width: '100%' }}
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
                              style={{ width: '100%' }}
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
                              style={{ width: '100%', backgroundColor: theme === 'dark' ? '#2d3238' : '#f8f9fa' }}
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.vat_rate === 'Esclusa art. 15' || item.vat_rate === -1 ? 'Esclusa art. 15' : String(item.vat_rate)}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === 'Esclusa art. 15') {
                                  updateItem(index, 'vat_rate', 'Esclusa art. 15');
                                } else {
                                  updateItem(index, 'vat_rate', parseFloat(value) || 22);
                                }
                              }}
                              style={{ width: '100%' }}
                            >
                              <option value="0">0%</option>
                              <option value="4">4%</option>
                              <option value="10">10%</option>
                              <option value="22">22%</option>
                              <option value="Esclusa art. 15">Esclusa art. 15</option>
                            </select>
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
                {/* Pulsante aggiungi riga anche in fondo alla tabella per facilità d'uso */}
                <div className="d-flex justify-content-center mt-3">
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={addItem}
                    title="Aggiungi riga"
                  >
                    <i className="fas fa-plus me-1"></i>
                    Aggiungi Riga ({items.length + 1})
                  </button>
                </div>
              </div>
            </div>
              </>
            )}

          </div>

          <div className={`px-3 py-2 ${textClass}`} style={{ borderTop: `1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'}` }}>
            <small>
              <i className="fas fa-info-circle me-1"></i>
              I totali vengono calcolati automaticamente. Il totale riga = (Prezzo × Quantità) × (1 - Sconto%)
            </small>
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

