'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type FilterOptions = {
  viaggi: string[];
  magazzini: string[];
  trasportatori: string[];
  mesi: number[];
  trimestri: number[];
};

type Filters = {
  viaggio: string;
  magazzino: string;
  trasportatore: string;
  dataInizio: string;
  dataFine: string;
  mese: string;
  trimestre: string;
};

// Funzione helper per convertire le date dal formato YYYY-MM-DD al formato gg/mm/aaaa per la visualizzazione
const convertDateForDisplay = (dateString: string): string => {
  if (!dateString || dateString.length !== 10) return '';
  
  // Se è già nel formato gg/mm/aaaa, restituisci così com'è
  if (dateString.includes('/')) return dateString;
  
  // Se è nel formato YYYY-MM-DD, convertilo
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  
  // Formato italiano: gg/mm/aaaa
  return `${day}/${month}/${year}`;
};

export default function FiltriViaggiPod() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ viaggi: [], magazzini: [], trasportatori: [], mesi: [], trimestri: [] });
  const [filters, setFilters] = useState<Filters>({
    viaggio: searchParams?.get('viaggio') || '',
    magazzino: searchParams?.get('magazzino') || '',
    trasportatore: searchParams?.get('trasportatore') || '',
    dataInizio: convertDateForDisplay(searchParams?.get('dataInizio') || ''),
    dataFine: convertDateForDisplay(searchParams?.get('dataFine') || ''),
    mese: searchParams?.get('mese') || '',
    trimestre: searchParams?.get('trimestre') || ''
  });

  // Carica le opzioni dei filtri
  useEffect(() => {
    fetch('/api/viaggi-pod?filterOptions=true')
      .then(res => res.json())
      .then(data => setFilterOptions(data))
      .catch(error => console.error('Errore nel caricamento delle opzioni filtro:', error));
  }, []);

  // Funzione per formattare automaticamente l'input delle date
  const formatDateInput = (value: string) => {
    // Rimuove tutti i caratteri non numerici
    const numbersOnly = value.replace(/\D/g, '');
    
    // Limita a massimo 8 cifre
    const limitedNumbers = numbersOnly.slice(0, 8);
    
    // Aggiunge le barre nelle posizioni corrette
    let formatted = limitedNumbers;
    if (limitedNumbers.length >= 3) {
      formatted = limitedNumbers.slice(0, 2) + '/' + limitedNumbers.slice(2);
    }
    if (limitedNumbers.length >= 5) {
      formatted = limitedNumbers.slice(0, 2) + '/' + limitedNumbers.slice(2, 4) + '/' + limitedNumbers.slice(4);
    }
    
    return formatted;
  };

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (field: 'dataInizio' | 'dataFine', value: string) => {
    const formattedValue = formatDateInput(value);
    setFilters(prev => ({ ...prev, [field]: formattedValue }));
  };

  // Funzione per convertire le date dal formato gg/mm/aaaa al formato YYYY-MM-DD per il backend
  const convertDateForBackend = (dateString: string): string | null => {
    if (!dateString || dateString.length !== 10) return null;
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Validazione base
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 1 || month > 12) return null;
    if (year < 1900 || year > 2100) return null;
    
    // Crea la data per validazione completa
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    
    // Formato per MySQL: YYYY-MM-DD
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const applyFilters = () => {
    console.log('=== DEBUG APPLY FILTERS ===');
    console.log('Filtri attuali:', filters);
    
    const params = new URLSearchParams();
    
    // Aggiungi solo i filtri non vuoti
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        // Converti le date dal formato gg/mm/aaaa al formato YYYY-MM-DD per il backend
        if (key === 'dataInizio' || key === 'dataFine') {
          const convertedDate = convertDateForBackend(value);
          if (convertedDate) {
            params.set(key, convertedDate);
          }
        } else {
          params.set(key, value);
        }
      }
    });
    
    // Mantieni la pagina corrente o vai alla prima
    const currentPage = searchParams?.get('page');
    if (currentPage && currentPage !== '1') {
      params.set('page', '1');
    }
    
    const finalUrl = `/viaggi-pod?${params.toString()}`;
    console.log('URL finale costruito:', finalUrl);
    console.log('Parametri URL:', params.toString());
    
    router.push(finalUrl);
  };

  const resetFilters = () => {
    setFilters({
      viaggio: '',
      magazzino: '',
      trasportatore: '',
      dataInizio: '',
      dataFine: '',
      mese: '',
      trimestre: ''
    });
    
    // Rimuovi tutti i parametri dei filtri dall'URL
    const params = new URLSearchParams();
    const currentPage = searchParams?.get('page');
    if (currentPage) {
      params.set('page', currentPage);
    }
    
    router.push(`/viaggi-pod?${params.toString()}`);
  };

  return (
    <div className="mb-4">
      {/* Sezione Filtri */}
      <div className="card bg-light">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Filtri</h5>
          <div className="d-flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline-primary btn-sm"
            >
              🔍 {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'} {showFilters ? '▲' : '▼'}
            </button>
            {showFilters && (
              <>
                <button
                  onClick={resetFilters}
                  className="btn btn-outline-secondary btn-sm"
                >
                  ✕ Reset
                </button>
                <button
                  onClick={applyFilters}
                  className="btn btn-primary btn-sm"
                >
                  🔍 Filtra
                </button>
              </>
            )}
          </div>
        </div>
        {showFilters && (
          <div className="card-body">
            <div className="row g-3">
              {/* Prima riga */}
              <div className="col-md-4">
                <label className="form-label">Nome Trasportatore</label>
                <select
                  className="form-select"
                  value={filters.trasportatore}
                  onChange={(e) => handleFilterChange('trasportatore', e.target.value)}
                >
                  <option value="">Tutti</option>
                  {filterOptions.trasportatori.map(trasportatore => (
                    <option key={trasportatore} value={trasportatore}>{trasportatore}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-4">
                <label className="form-label">Viaggio</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Inserisci numero viaggio"
                  value={filters.viaggio}
                  onChange={(e) => handleFilterChange('viaggio', e.target.value)}
                />
              </div>
              
              <div className="col-md-4">
                <label className="form-label">Magazzino</label>
                <select
                  className="form-select"
                  value={filters.magazzino}
                  onChange={(e) => handleFilterChange('magazzino', e.target.value)}
                >
                  <option value="">Tutti</option>
                  {filterOptions.magazzini.map(magazzino => (
                    <option key={magazzino} value={magazzino}>{magazzino}</option>
                  ))}
                </select>
              </div>
              
              {/* Seconda riga */}
              <div className="col-md-3">
                <label className="form-label">Data Inizio Da</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="gg/mm/aaaa"
                  maxLength={10}
                  value={filters.dataInizio}
                  onChange={(e) => handleDateChange('dataInizio', e.target.value)}
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Data Fine A</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="gg/mm/aaaa"
                  maxLength={10}
                  value={filters.dataFine}
                  onChange={(e) => handleDateChange('dataFine', e.target.value)}
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Mese</label>
                <select
                  className="form-select"
                  value={filters.mese}
                  onChange={(e) => handleFilterChange('mese', e.target.value)}
                >
                  <option value="">Tutti</option>
                  <option value="1">Gennaio</option>
                  <option value="2">Febbraio</option>
                  <option value="3">Marzo</option>
                  <option value="4">Aprile</option>
                  <option value="5">Maggio</option>
                  <option value="6">Giugno</option>
                  <option value="7">Luglio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Settembre</option>
                  <option value="10">Ottobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Dicembre</option>
                </select>
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Trimestre</label>
                <select
                  className="form-select"
                  value={filters.trimestre}
                  onChange={(e) => handleFilterChange('trimestre', e.target.value)}
                >
                  <option value="">Tutti</option>
                  <option value="1">Q1 (Gen-Mar)</option>
                  <option value="2">Q2 (Apr-Giu)</option>
                  <option value="3">Q3 (Lug-Set)</option>
                  <option value="4">Q4 (Ott-Dic)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}