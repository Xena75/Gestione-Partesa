'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Funzioni di utilità per la conversione delle date
const formatDateToItalian = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const formatDateToISO = (italianDate: string): string => {
  if (!italianDate) return '';
  
  // Rimuovi spazi e verifica il formato
  const cleanDate = italianDate.trim();
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = cleanDate.match(dateRegex);
  
  if (!match) return '';
  
  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Validazione base
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return '';
  }
  
  // Crea la data e verifica che sia valida
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
    return '';
  }
  
  return `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
};

const isValidItalianDate = (dateString: string): boolean => {
  if (!dateString) return true; // Campo vuoto è valido
  return formatDateToISO(dateString) !== '';
};

interface FilterOptions {
  aziendeVettore: string[];
  trasportatori: string[];
  targhe: string[];
  magazzini: string[];
  mesi: number[];
  trimestri: number[];
}

interface FiltriViaggiProps {
  onFiltersApplied?: () => void;
}

export interface FiltriViaggiRef {
  applyFilters: () => void;
  clearFilters: () => void;
}

const FiltriViaggi = forwardRef<FiltriViaggiRef, FiltriViaggiProps>(({ onFiltersApplied }, ref) => {
  console.log('🚀 COMPONENTE FiltriViaggi MONTATO!');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Stati per i valori dei filtri
  const [aziendaVettore, setAziendaVettore] = useState(searchParams?.get('aziendaVettore') || '');
  const [nominativo, setNominativo] = useState(searchParams?.get('nominativo') || '');
  const [trasportatore, setTrasportatore] = useState(searchParams?.get('trasportatore') || '');
  const [numeroViaggio, setNumeroViaggio] = useState(searchParams?.get('numeroViaggio') || '');
  const [targa, setTarga] = useState(searchParams?.get('targa') || '');
  const [magazzino, setMagazzino] = useState(searchParams?.get('magazzino') || '');
  const [haiEffettuatoRitiri, setHaiEffettuatoRitiri] = useState(searchParams?.get('haiEffettuatoRitiri') || '');
  const [mese, setMese] = useState(searchParams?.get('mese') || '');
  const [trimestre, setTrimestre] = useState(searchParams?.get('trimestre') || '');
  const [dataDa, setDataDa] = useState(searchParams?.get('dataDa') ? formatDateToItalian(searchParams.get('dataDa')!) : '');
  const [dataA, setDataA] = useState(searchParams?.get('dataA') ? formatDateToItalian(searchParams.get('dataA')!) : '');
  
  // Stati per le opzioni dei filtri
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    aziendeVettore: [],
    trasportatori: [],
    targhe: [],
    magazzini: [],
    mesi: [],
    trimestri: []
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Carica le opzioni per i filtri
  useEffect(() => {
    fetch('/api/viaggi/filters')
      .then(res => res.json())
      .then(data => {
        setFilterOptions(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Errore nel caricamento delle opzioni filtri:', error);
        setIsLoading(false);
      });
  }, []);

  // Applica i filtri
  const applyFilters = () => {
    console.log('🔍 FILTRI - Applicazione filtri:', {
      haiEffettuatoRitiri,
      aziendaVettore,
      nominativo,
      trasportatore,
      numeroViaggio,
      targa,
      magazzino,
      mese,
      trimestre,
      dataDa,
      dataA
    });
    console.log('🔍 FILTRI - Valore haiEffettuatoRitiri prima della condizione:', haiEffettuatoRitiri, 'tipo:', typeof haiEffettuatoRitiri);
    
    const params = new URLSearchParams();
    
    // Mantieni la pagina corrente o vai alla prima
    const currentPage = searchParams?.get('page');
    if (currentPage && currentPage !== '1') {
      params.set('page', '1');
    }
    
    // Preserva l'ordinamento attuale
    const currentSortBy = searchParams?.get('sortBy');
    const currentSortOrder = searchParams?.get('sortOrder');
    if (currentSortBy) params.set('sortBy', currentSortBy);
    if (currentSortOrder) params.set('sortOrder', currentSortOrder);
    
    // Aggiungi i filtri attivi
    if (aziendaVettore) params.set('aziendaVettore', aziendaVettore);
    if (nominativo) params.set('nominativo', nominativo);
    if (trasportatore) params.set('trasportatore', trasportatore);
    if (numeroViaggio) params.set('numeroViaggio', numeroViaggio);
    if (targa) params.set('targa', targa);
    if (magazzino) params.set('magazzino', magazzino);
    if (haiEffettuatoRitiri !== '') {
      console.log('🔍 FILTRI - Aggiungendo haiEffettuatoRitiri:', haiEffettuatoRitiri);
      params.set('haiEffettuatoRitiri', haiEffettuatoRitiri);
    }
    if (mese) params.set('mese', mese);
    if (trimestre) params.set('trimestre', trimestre);
    if (dataDa) {
      const isoDateDa = formatDateToISO(dataDa);
      if (isoDateDa) params.set('dataDa', isoDateDa);
    }
    if (dataA) {
      const isoDateA = formatDateToISO(dataA);
      if (isoDateA) params.set('dataA', isoDateA);
    }
    
    console.log('🔍 FILTRI - URL finale:', `/viaggi?${params.toString()}`);
    console.log('🔍 FILTRI - Parametri URL completi:', params.toString());
    
    router.push(`/viaggi?${params.toString()}`);
    
    // Chiudi i filtri dopo averli applicati
    if (onFiltersApplied) {
      onFiltersApplied();
    }
  };

  // Pulisci tutti i filtri
  const clearFilters = () => {
    setAziendaVettore('');
    setNominativo('');
    setTrasportatore('');
    setNumeroViaggio('');
    setTarga('');
    setMagazzino('');
    setHaiEffettuatoRitiri('');
    setMese('');
    setTrimestre('');
    setDataDa('');
    setDataA('');
    
    // Rimuovi tutti i parametri dei filtri dall'URL ma preserva ordinamento e pagina
    const params = new URLSearchParams();
    const currentPage = searchParams?.get('page');
    const currentSortBy = searchParams?.get('sortBy');
    const currentSortOrder = searchParams?.get('sortOrder');
    
    if (currentPage) {
      params.set('page', currentPage);
    }
    if (currentSortBy) {
      params.set('sortBy', currentSortBy);
    }
    if (currentSortOrder) {
      params.set('sortOrder', currentSortOrder);
    }
    
    router.push(`/viaggi?${params.toString()}`);
    
    // Chiudi i filtri dopo averli puliti
    if (onFiltersApplied) {
      onFiltersApplied();
    }
  };

  // Espone le funzioni al componente padre tramite ref
  useImperativeHandle(ref, () => ({
    applyFilters,
    clearFilters
  }));

  // Gestisce il tasto Enter per applicare i filtri
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  if (isLoading) {
    return <div className="text-center">Caricamento opzioni filtri...</div>;
  }

  return (
    <div className="row g-3">
      {/* Prima riga - 5 campi */}
      <div className="col-md-2">
        <label className="form-label fw-bold">Azienda Vettore</label>
        <select 
          className="form-select"
          value={aziendaVettore}
          onChange={(e) => setAziendaVettore(e.target.value)}
        >
          <option value="">Tutte le aziende</option>
          {filterOptions.aziendeVettore.map((azienda, index) => (
            <option key={index} value={azienda}>{azienda}</option>
          ))}
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Nominativo</label>
        <input
          type="text"
          className="form-control"
          placeholder="Cerca nominativo..."
          value={nominativo}
          onChange={(e) => setNominativo(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Trasportatore</label>
        <select 
          className="form-select"
          value={trasportatore}
          onChange={(e) => setTrasportatore(e.target.value)}
        >
          <option value="">Tutti i trasportatori</option>
          {filterOptions.trasportatori.map((trasport, index) => (
            <option key={index} value={trasport}>{trasport}</option>
          ))}
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Numero Viaggio</label>
        <input
          type="text"
          className="form-control"
          placeholder="Cerca viaggio..."
          value={numeroViaggio}
          onChange={(e) => setNumeroViaggio(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Targa</label>
        <select 
          className="form-select"
          value={targa}
          onChange={(e) => setTarga(e.target.value)}
        >
          <option value="">Tutte le targhe</option>
          {filterOptions.targhe.map((targaOpt, index) => (
            <option key={index} value={targaOpt}>{targaOpt}</option>
          ))}
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Magazzino</label>
        <select 
          className="form-select"
          value={magazzino}
          onChange={(e) => setMagazzino(e.target.value)}
        >
          <option value="">Tutti i magazzini</option>
          {filterOptions.magazzini.map((mag, index) => (
            <option key={index} value={mag}>{mag}</option>
          ))}
        </select>
      </div>

      {/* Seconda riga - 5 campi */}
      <div className="col-md-2">
        <label className="form-label fw-bold">Hai Effettuato Ritiri</label>
        <select 
          className="form-select"
          value={haiEffettuatoRitiri}
          onChange={(e) => setHaiEffettuatoRitiri(e.target.value)}
        >
          <option value="">Tutti</option>
          <option value="true">Sì</option>
          <option value="false">No</option>
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Mese</label>
        <select 
          className="form-select"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
        >
          <option value="">Tutti i mesi</option>
          {filterOptions.mesi.map((m, index) => (
            <option key={index} value={m}>
              {new Date(2025, m - 1).toLocaleDateString('it-IT', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Trimestre</label>
        <select 
          className="form-select"
          value={trimestre}
          onChange={(e) => setTrimestre(e.target.value)}
        >
          <option value="">Tutti i trimestri</option>
          {filterOptions.trimestri.map((t, index) => (
            <option key={index} value={t}>{t}° Trimestre</option>
          ))}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label fw-bold">Data Da</label>
        <input
          type="text"
          className={`form-control ${dataDa && !isValidItalianDate(dataDa) ? 'is-invalid' : ''}`}
          placeholder="gg/mm/aaaa"
          pattern="\d{1,2}/\d{1,2}/\d{4}"
          value={dataDa}
          onChange={(e) => setDataDa(e.target.value)}
          onKeyPress={handleKeyPress}
          title="Inserisci la data nel formato gg/mm/aaaa"
        />
        {dataDa && !isValidItalianDate(dataDa) && (
          <div className="invalid-feedback">
            Formato data non valido. Usa gg/mm/aaaa
          </div>
        )}
      </div>

      <div className="col-md-3">
        <label className="form-label fw-bold">Data A</label>
        <input
          type="text"
          className={`form-control ${dataA && !isValidItalianDate(dataA) ? 'is-invalid' : ''}`}
          placeholder="gg/mm/aaaa"
          pattern="\d{1,2}/\d{1,2}/\d{4}"
          value={dataA}
          onChange={(e) => setDataA(e.target.value)}
          onKeyPress={handleKeyPress}
          title="Inserisci la data nel formato gg/mm/aaaa"
        />
        {dataA && !isValidItalianDate(dataA) && (
          <div className="invalid-feedback">
            Formato data non valido. Usa gg/mm/aaaa
          </div>
        )}
      </div>

    </div>
  );
});

FiltriViaggi.displayName = 'FiltriViaggi';

export default FiltriViaggi;
