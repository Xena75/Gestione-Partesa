'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Viaggio } from "@/lib/data-viaggi";
import DeleteButton from "@/components/DeleteButton";
import FiltriViaggi from "@/components/FiltriViaggi";
import SortableHeader from "@/components/SortableHeader";
import Link from 'next/link';

function ViaggiPageContent() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page');
  const currentPage = Number(page) || 1;
  const sortBy = searchParams.get('sortBy') || 'dataOraInizioViaggio';
  const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
  
  // Parametri dei filtri
  const dataDa = searchParams.get('dataDa');
  const dataA = searchParams.get('dataA');
  const deposito = searchParams.get('deposito');
  const nominativoId = searchParams.get('nominativoId');
  const numeroViaggio = searchParams.get('numeroViaggio');
  const targaMezzoId = searchParams.get('targaMezzoId');
  
  const [data, setData] = useState<{ viaggi: Viaggio[], totalPages: number, totalRecords: number } | null>(null);
  const [stats, setStats] = useState<{ totalRecords: number, totalPages: number, recordsPerPage: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Costruisci l'URL con i parametri dei filtri e ordinamento
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    if (dataDa) params.set('dataDa', dataDa);
    if (dataA) params.set('dataA', dataA);
    if (deposito) params.set('deposito', deposito);
    if (nominativoId) params.set('nominativoId', nominativoId);
    if (numeroViaggio) params.set('numeroViaggio', numeroViaggio);
    if (targaMezzoId) params.set('targaMezzoId', targaMezzoId);
    
    // Carica i dati della pagina corrente
    fetch(`/api/viaggi?${params.toString()}`)
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      });
    
    // Carica le statistiche
    fetch(`/api/viaggi/stats?page=${currentPage}`)
      .then(res => res.json())
      .then(fetchedStats => {
        setStats(fetchedStats);
      });
  }, [currentPage, sortBy, sortOrder, dataDa, dataA, deposito, nominativoId, numeroViaggio, targaMezzoId]);

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  if (!data || !stats) {
    return <div>Errore nel caricamento dei dati.</div>;
  }

  const { viaggi, totalPages } = data;

  return (
    <div className="vh-100 d-flex flex-column p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>🚚 Gestione Viaggi - Monitoraggio</h1>
        <Link href="/" className="btn btn-outline-secondary">
          ← Torna alla Dashboard
        </Link>
      </div>
      
      {/* Card Statistiche */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-primary mb-0">{stats.totalRecords.toLocaleString()}</h2>
              <p className="text-muted mb-0">Record Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-info mb-0">{stats.totalPages}</h2>
              <p className="text-muted mb-0">Pagine Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-success mb-0">{stats.recordsPerPage}</h2>
              <p className="text-muted mb-0">Record in questa Pagina</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Filtri */}
      <FiltriViaggi />

      {/* Tabella */}
      <div className="flex-grow-1 table-responsive h-100">
        <table className="table table-striped table-sm table-hover mb-0">
          <thead>
            <tr>
              <th>Deposito</th>
              <SortableHeader 
                field="numeroViaggio" 
                label="Viaggio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder} 
              />
              <th>Nominativo</th>
              <th>Affiancato Da</th>
              <th>Totale Colli</th>
              <SortableHeader 
                field="dataOraInizioViaggio" 
                label="Data Inizio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder} 
              />
              <SortableHeader 
                field="dataOraFineViaggio" 
                label="Data Fine" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder} 
              />
              <th>Ore Effettive</th>
              <SortableHeader 
                field="targaMezzoId" 
                label="Targa Mezzo" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder} 
              />
              <th>KM Iniziali</th>
              <th>KM Finali</th>
              <th>KM Effettivi</th>
              <th>KM al Rifornimento</th>
              <th>Litri Riforniti</th>
              <th>€/Litro</th>
              <th>Ritiri Effettuati</th>
              <th>Aggiornato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {viaggi.map((viaggio) => (
              <tr key={viaggio.id}>
                <td>{viaggio.deposito || '-'}</td>
                <td>{viaggio.numeroViaggio || '-'}</td>
                <td>{viaggio.nominativoId || '-'}</td>
                <td>{viaggio.affiancatoDaId || '-'}</td>
                <td>{viaggio.totaleColli || '-'}</td>
                <td>{viaggio.dataOraInizioViaggio ? new Date(viaggio.dataOraInizioViaggio).toLocaleString('it-IT') : '-'}</td>
                <td>{viaggio.dataOraFineViaggio ? new Date(viaggio.dataOraFineViaggio).toLocaleString('it-IT') : '-'}</td>
                <td>{viaggio.oreEffettive || '-'}</td>
                <td>{viaggio.targaMezzoId || '-'}</td>
                <td>{viaggio.kmIniziali || '-'}</td>
                <td>{viaggio.kmFinali || '-'}</td>
                <td>{viaggio.kmEffettivi || '-'}</td>
                <td>{viaggio.kmAlRifornimento || '-'}</td>
                <td>{viaggio.litriRiforniti || '-'}</td>
                <td>{viaggio.euroLitro || '-'}</td>
                <td>{viaggio.haiEffettuatoRitiri ? 'Sì' : 'No'}</td>
                <td>{viaggio.updatedAt ? new Date(viaggio.updatedAt).toLocaleString('it-IT') : '-'}</td>
                <td className="d-flex gap-2">
                  <Link href={`/viaggi/${viaggio.id}/modifica`} className="btn btn-secondary btn-sm">
                    Modifica
                  </Link>
                  <DeleteButton id={viaggio.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controlli di Paginazione */}
      <div className="d-flex justify-content-center gap-2 mt-3">
        <Link 
          href={`/viaggi?page=${currentPage - 1}${searchParams.toString() ? `&${searchParams.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage <= 1 ? 'disabled' : ''}`}
        >
          Indietro
        </Link>
        <span className="d-flex align-items-center">Pagina {currentPage} di {totalPages}</span>
        <Link 
          href={`/viaggi?page=${currentPage + 1}${searchParams.toString() ? `&${searchParams.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage >= totalPages ? 'disabled' : ''}`}
        >
          Avanti
        </Link>
      </div>
    </div>
  );
}

export default function ViaggiPage() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <ViaggiPageContent />
    </Suspense>
  );
}
