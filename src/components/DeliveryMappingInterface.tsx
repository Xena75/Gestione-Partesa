'use client';

import { useState, useEffect } from 'react';

interface DeliveryMappingInterfaceProps {
  headers: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
}

// Campi del database fatt_delivery
const DELIVERY_DATABASE_FIELDS = [
  { key: 'source_name', label: 'Nome File', required: false, type: 'string', auto: true },
  { key: 'appalto', label: 'Appalto', required: false, type: 'string' },
  { key: 'ordine', label: 'Ordine', required: false, type: 'string' },
  { key: 'cod_vettore', label: 'Codice Vettore', required: false, type: 'double' },
  { key: 'descr_vettore', label: 'Descrizione Vettore', required: false, type: 'string' },
  { key: 'viaggio', label: 'Viaggio', required: false, type: 'string' },
  { key: 'consegna_num', label: 'Numero Consegna', required: false, type: 'string' },
  { key: 'cod_cliente', label: 'Codice Cliente', required: false, type: 'string' },
  { key: 'ragione_sociale', label: 'Ragione Sociale', required: false, type: 'string' },
  { key: 'cod_articolo', label: 'Codice Articolo', required: false, type: 'string' },
  { key: 'descr_articolo', label: 'Descrizione Articolo', required: false, type: 'string' },
  { key: 'gr_stat', label: 'Gruppo Statistico', required: false, type: 'string' },
  { key: 'descr_gruppo_st', label: 'Descrizione Gruppo Statistico', required: false, type: 'string' },
  { key: 'classe_prod', label: 'Classe Prodotto', required: false, type: 'string' },
  { key: 'descr_classe_prod', label: 'Descrizione Classe Prodotto', required: false, type: 'string' },
  { key: 'classe_tariffa', label: 'Classe Tariffa', required: false, type: 'string' },
  { key: 'anomalia', label: 'Anomalia', required: false, type: 'text' },
  { key: 'data_mov_merce', label: 'Data Movimento Merce', required: false, type: 'datetime' },
  { key: 'colli', label: 'Colli', required: false, type: 'int' },
  { key: 'tariffa', label: 'Tariffa', required: false, type: 'decimal' },
  { key: 'tariffa_vuoti', label: 'Tariffa Vuoti', required: false, type: 'decimal' },
  { key: 'compenso', label: 'Compenso', required: false, type: 'decimal' },
  { key: 'tr_cons', label: '€uro Consegna', required: false, type: 'int' },
  { key: 'tot_compenso', label: 'Totale Compenso', required: false, type: 'decimal' },
  { key: 'bu', label: 'BU', required: false, type: 'string' },
  { key: 'div', label: 'Divisione', required: false, type: 'string' },
  { key: 'dep', label: 'Deposito', required: false, type: 'string' },
  { key: 'tipologia', label: 'Tipologia', required: false, type: 'string' },
  { key: 'cod_em_fat', label: 'Codice Emittente Fattura', required: false, type: 'string' },
  { key: 'emittente_fattura', label: 'Emittente Fattura', required: false, type: 'string' },
  { key: 'oda', label: 'ODA', required: false, type: 'string' },
  { key: 'mese', label: 'Mese', required: false, type: 'int', auto: true },
  { key: 'settimana', label: 'Settimana', required: false, type: 'int', auto: true },
  { key: 'ID_fatt', label: 'ID Fattura', required: false, type: 'string' }
];

// Valori speciali per campi automatici
const SPECIAL_VALUES = [
  { key: 'auto_filename', label: 'Nome File', description: 'Usa il nome del file caricato' },
  { key: 'auto_calculated', label: 'Calcolato Automaticamente', description: 'Calcolato dal sistema' },
  { key: 'auto_current_date', label: 'Data Corrente', description: 'Data e ora attuali' },
  { key: 'skip', label: 'Ignora Colonna', description: 'Non importare questa colonna' }
];

// Campi che possono essere calcolati automaticamente
const CALCULATED_FIELDS = [
  { key: 'source_name', label: 'Nome File', description: 'Estratto dal nome del file caricato' },
  { key: 'mese', label: 'Mese', description: 'Estratto da data_mov_merce' },
  { key: 'settimana', label: 'Settimana', description: 'Calcolato da data_mov_merce' }
];

export default function DeliveryMappingInterface({ headers, onMappingComplete }: DeliveryMappingInterfaceProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [savedMappings, setSavedMappings] = useState<{ id: number; name: string; description: string; mapping_data: string; created_at: Date; updated_at: Date }[]>([]);

  // Genera suggerimenti automatici per il mapping
  useEffect(() => {
    const newSuggestions: Record<string, string[]> = {};
    
    headers.forEach(header => {
      const headerLower = header.toLowerCase();
      const matches: string[] = [];
      
      DELIVERY_DATABASE_FIELDS.forEach(field => {
        const fieldKeyLower = field.key.toLowerCase();
        
        // Priorità assoluta: corrispondenza esatta tra header e key del campo
        if (headerLower === fieldKeyLower) {
          matches.unshift(field.key); // Priorità massima
        }
        // Controlla corrispondenze parziali con il key del campo
        else if (headerLower.includes(fieldKeyLower) || fieldKeyLower.includes(headerLower)) {
          // Esclusioni specifiche per evitare conflitti
          if (headerLower === 'tariffa' && field.key === 'tariffa_vuoti') {
            // Non suggerire tariffa_vuoti per header "tariffa"
          } else if (headerLower === 'tariffa_vuoti' && field.key === 'tariffa') {
            // Non suggerire tariffa per header "tariffa_vuoti"
          } else if (headerLower === 'compenso' && field.key === 'tot_compenso') {
            // Non suggerire tot_compenso per header "compenso"
          } else if (headerLower === 'tot_compenso' && field.key === 'compenso') {
            // Non suggerire compenso per header "tot_compenso"
          } else {
            matches.push(field.key);
          }
        }
        // Controlla corrispondenze con il label del campo
        else {
          const fieldLabelLower = field.label.toLowerCase();
          if (headerLower.includes(fieldLabelLower) || fieldLabelLower.includes(headerLower)) {
            // Stesse esclusioni per i label
            if (headerLower === 'tariffa' && field.key === 'tariffa_vuoti') {
              // Non suggerire tariffa_vuoti per header "tariffa"
            } else if (headerLower === 'tariffa_vuoti' && field.key === 'tariffa') {
              // Non suggerire tariffa per header "tariffa_vuoti"
            } else if (headerLower === 'compenso' && field.key === 'tot_compenso') {
              // Non suggerire tot_compenso per header "compenso"
            } else if (headerLower === 'tot_compenso' && field.key === 'compenso') {
              // Non suggerire compenso per header "tot_compenso"
            } else {
              matches.push(field.key);
            }
          }
        }
      });
      
      newSuggestions[header] = matches.slice(0, 3); // Massimo 3 suggerimenti
    });
    
    setSuggestions(newSuggestions);
  }, [headers]);

  // Carica mapping salvati
  useEffect(() => {
    const loadSavedMappings = async () => {
      try {
        const response = await fetch('/api/import-delivery/delivery-mappings');
        if (response.ok) {
          const data = await response.json();
          setSavedMappings(data.mappings || []);
        }
      } catch (error) {
        console.error('Errore nel caricamento mapping salvati:', error);
      }
    };

    loadSavedMappings();
  }, []);

  const handleMappingChange = (header: string, value: string) => {
    setMapping(prev => ({
      ...prev,
      [header]: value
    }));
  };

  const applyAutoMapping = () => {
    const autoMapping: Record<string, string> = {};
    
    headers.forEach(header => {
      const headerSuggestions = suggestions[header];
      if (headerSuggestions && headerSuggestions.length > 0) {
        autoMapping[header] = headerSuggestions[0];
      }
    });
    
    setMapping(autoMapping);
  };

  const clearMapping = () => {
    setMapping({});
  };

  const saveMapping = async () => {
    const mappingName = prompt('Inserisci un nome per salvare questo mapping:');
    if (!mappingName) return;

    try {
      const response = await fetch('/api/import-delivery/delivery-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mappingName,
          description: `Mapping per ${headers.length} colonne`,
          mapping_data: mapping
        })
      });

      if (response.ok) {
        alert('Mapping salvato con successo!');
        // Ricarica i mapping salvati
        const data = await response.json();
        setSavedMappings(prev => [...prev, data.mapping]);
      } else {
        alert('Errore nel salvataggio del mapping');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nel salvataggio del mapping');
    }
  };

  const loadMapping = (savedMapping: { id: number; name: string; description: string; mapping_data: string; created_at: Date; updated_at: Date }) => {
    if (confirm(`Caricare il mapping "${savedMapping.name}"?`)) {
      try {
        const parsedMapping = JSON.parse(savedMapping.mapping_data);
        setMapping(parsedMapping);
      } catch (error) {
        console.error('Errore nel parsing del mapping:', error);
        alert('Errore nel caricamento del mapping');
      }
    }
  };

  const handleSubmit = () => {
    // Verifica che i campi obbligatori siano mappati
    const requiredFields = DELIVERY_DATABASE_FIELDS.filter(field => field.required);
    const missingFields = requiredFields.filter(field => 
      !Object.values(mapping).includes(field.key)
    );

    if (missingFields.length > 0) {
      alert(`Campi obbligatori mancanti: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    console.log('📋 Mapping finale:', mapping);
    console.log('ℹ️ I campi calcolati (source_name, mese, settimana) verranno calcolati automaticamente dal sistema');
    
    onMappingComplete(mapping);
  };

  return (
    <div className="mapping-interface">
      {/* Controlli */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">⚙️ Controlli Mapping</h5>
        </div>
        <div className="card-body">
          <div className="d-flex gap-2 flex-wrap">
            <button onClick={applyAutoMapping} className="btn btn-outline-primary">
              🔄 Auto-Mapping
            </button>
            <button onClick={clearMapping} className="btn btn-outline-secondary">
              🗑️ Pulisci
            </button>
            <button onClick={saveMapping} className="btn btn-outline-success">
              💾 Salva Mapping
            </button>
            <button onClick={handleSubmit} className="btn btn-primary">
              ▶️ Procedi con Importazione
            </button>
          </div>
        </div>
      </div>

      {/* Mapping Salvati */}
      {savedMappings.length > 0 && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">💾 Mapping Salvati</h5>
          </div>
          <div className="card-body">
            <div className="row">
              {savedMappings.map((savedMapping, index) => (
                <div key={index} className="col-md-6 col-lg-4 mb-2">
                  <div className="card border">
                    <div className="card-body p-3">
                      <h6 className="card-title mb-1">{savedMapping.name}</h6>
                      <p className="card-text small text-muted mb-2">
                        {savedMapping.description}
                      </p>
                      <button 
                        onClick={() => loadMapping(savedMapping)}
                        className="btn btn-sm btn-outline-primary"
                      >
                        Carica
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interfaccia Mapping */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-light">
          <h5 className="mb-0">🔗 Mappatura Colonne</h5>
        </div>
        <div className="card-body">
          <div className="row">
            {/* Colonne Excel */}
            <div className="col-md-6">
              <h6 className="text-primary mb-3">📊 Colonne Excel</h6>
              <div className="excel-columns">
                {headers.map((header, index) => (
                  <div key={index} className="excel-column mb-2">
                    <div className="d-flex align-items-center p-2 border rounded bg-light" style={{ height: '38px' }}>
                      <span className="badge bg-secondary me-2">{String.fromCharCode(65 + index)}</span>
                      <span className="flex-grow-1">{header}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campi Database */}
            <div className="col-md-6">
              <h6 className="text-success mb-3">🗄️ Campi Database</h6>
              <div className="database-fields">
                {headers.map((header, index) => (
                  <div key={index} className="database-field mb-2">
                    <select
                      className="form-select"
                      style={{ height: '38px' }}
                      value={mapping[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                    >
                      <option value="">-- Seleziona campo --</option>
                      
                      {/* Campi database */}
                      <optgroup label="Campi Database">
                        {DELIVERY_DATABASE_FIELDS.map(field => (
                          <option key={field.key} value={field.key}>
                            {field.label} {field.required ? '(Obbligatorio)' : ''} {field.auto ? '(Auto)' : ''}
                          </option>
                        ))}
                      </optgroup>
                      
                      {/* Valori speciali */}
                      <optgroup label="Valori Speciali">
                        {SPECIAL_VALUES.map(special => (
                          <option key={special.key} value={special.key}>
                            {special.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    
                    {/* Suggerimenti */}
                    {suggestions[header] && suggestions[header].length > 0 && !mapping[header] && (
                      <div className="mt-1">
                        <small className="text-muted">Suggerimenti: </small>
                        {suggestions[header].map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="btn btn-sm btn-outline-info me-1"
                            onClick={() => handleMappingChange(header, suggestion)}
                          >
                            {DELIVERY_DATABASE_FIELDS.find(f => f.key === suggestion)?.label || suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informazioni Campi Calcolati */}
      <div className="card shadow-sm border-0 mt-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">ℹ️ Campi Calcolati Automaticamente</h5>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3">
            I seguenti campi verranno calcolati automaticamente dal sistema durante l&apos;importazione:
          </p>
          <div className="row">
            {CALCULATED_FIELDS.map(field => (
              <div key={field.key} className="col-md-6 col-lg-4 mb-3">
                <div className="d-flex align-items-start">
                  <span className="badge bg-info me-2 mt-1">🔄</span>
                  <div>
                    <strong>{field.label}</strong>
                    <br />
                    <small className="text-muted">{field.description}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistiche Mapping */}
      <div className="card shadow-sm border-0 mt-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">📈 Statistiche Mapping</h5>
        </div>
        <div className="card-body">
          <div className="row text-center">
            <div className="col-md-3">
              <h4 className="text-primary">{headers.length}</h4>
              <p className="text-muted mb-0">Colonne Totali</p>
            </div>
            <div className="col-md-3">
              <h4 className="text-success">{Object.keys(mapping).length}</h4>
              <p className="text-muted mb-0">Colonne Mappate</p>
            </div>
            <div className="col-md-3">
              <h4 className="text-warning">{headers.length - Object.keys(mapping).length}</h4>
              <p className="text-muted mb-0">Colonne Non Mappate</p>
            </div>
            <div className="col-md-3">
              <h4 className="text-info">{Object.values(mapping).filter(v => v.startsWith('auto_')).length}</h4>
              <p className="text-muted mb-0">Campi Automatici</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
