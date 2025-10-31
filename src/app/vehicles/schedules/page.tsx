// src/app/vehicles/schedules/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatDateItalian } from '@/lib/date-utils';
import { useTheme } from '@/contexts/ThemeContext';

interface VehicleSchedule {
  id: number;
  vehicle_id: string;
  schedule_type: string;
  description: string;
  data_scadenza: string;
  completed_date?: string;
  booking_date?: string;
  provider?: string;
  status: string;
  priority: string;
  cost_estimate?: number;
  notes?: string;
  quote_number?: string;
  quote_date?: string;
  vehicle?: {
    targa: string;
    marca: string;
    modello: string;
  };
}

interface AlertStats {
  overdue: number;
  dueSoon: number;
  upcoming: number;
  total: number;
}

interface RevisionStats {
  totalVehicles: number;
  vehiclesWithRevisions: number;
  vehiclesWithoutRevisions: number;
  nextRevisionsDue: number;
  // Campi tachigrafo
  totalTachographVehicles: number;
  vehiclesWithTachographRevisions: number;
  vehiclesWithoutTachographRevisions: number;
  nextTachographRevisionsDue: number;
}

interface RevisionCheckResult {
  success: boolean;
  message: string;
  stats?: RevisionStats;
  processed?: number;
  errors?: string[];
}

function VehicleSchedulesContent() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  
  // Classi dinamiche basate sul tema
  const textClass = theme === 'dark' ? 'text-light' : 'text-dark';
  const bgClass = theme === 'dark' ? 'bg-dark' : 'bg-light';
  const cardClass = theme === 'dark' ? 'bg-dark text-light' : 'bg-white text-dark';
  const borderClass = theme === 'dark' ? 'border-secondary' : 'border-light';
  const formClass = theme === 'dark' ? 'bg-dark text-light border-secondary' : 'bg-white text-dark border-light';
  const modalClass = theme === 'dark' ? 'bg-dark text-light' : 'bg-white text-dark';
  const tableClass = theme === 'dark' ? 'table-dark' : 'table-light';
  const badgeClass = theme === 'dark' ? 'bg-info text-dark' : 'bg-primary text-white';

  const [schedules, setSchedules] = useState<VehicleSchedule[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    overdue: 0,
    dueSoon: 0,
    upcoming: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterPlate, setFilterPlate] = useState<string>('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionStats, setRevisionStats] = useState<RevisionStats | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Effetto per leggere il parametro vehicle dall'URL
  useEffect(() => {
    const vehicleParam = searchParams?.get('vehicle');
    if (vehicleParam) {
      setFilterPlate(vehicleParam);
    }
  }, [searchParams]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles/schedules');
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle scadenze');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
      calculateAlertStats(data.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const calculateAlertStats = (schedules: VehicleSchedule[]) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const stats = schedules
      .filter(schedule => schedule.status === 'pending')
      .reduce((acc, schedule) => {
        // Usa booking_date se disponibile, altrimenti data_scadenza
        const relevantDate = schedule.booking_date 
          ? new Date(schedule.booking_date) 
          : new Date(schedule.data_scadenza);
        
        relevantDate.setHours(0, 0, 0, 0);

        if (relevantDate < now) {
          acc.overdue++;
        } else if (relevantDate <= sevenDaysFromNow) {
          acc.dueSoon++;
        } else if (relevantDate <= thirtyDaysFromNow) {
          acc.upcoming++;
        }
        
        acc.total++;
        return acc;
      }, { overdue: 0, dueSoon: 0, upcoming: 0, total: 0 });

    setAlertStats(stats);
  };

  const handleRevisionCheck = async () => {
    try {
      setRevisionLoading(true);
      setRevisionError(null);
      
      const response = await fetch('/api/vehicles/revisions/automation?action=vehicles-status');
      if (!response.ok) {
        throw new Error('Errore nel controllo delle revisioni');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Errore nel controllo delle revisioni');
      }
      
      // Calcola le statistiche dai dati ricevuti per le revisioni normali
      const vehicles = result.data.vehicles || [];
      const totalVehicles = vehicles.length;
      const vehiclesWithRevisions = vehicles.filter((v: any) => v.future_revisions_count > 0).length;
      const vehiclesWithoutRevisions = totalVehicles - vehiclesWithRevisions;
      
      // Conta le revisioni in scadenza nei prossimi 30 giorni
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const nextRevisionsDue = vehicles.filter((v: any) => {
        if (!v.next_revision_date) return false;
        const revisionDate = new Date(v.next_revision_date);
        return revisionDate <= thirtyDaysFromNow;
      }).length;
      
      // Calcola le statistiche per i tachigrafi
      const tachographVehicles = result.data.tachograph_vehicles || [];
      const totalTachographVehicles = tachographVehicles.length;
      const vehiclesWithTachographRevisions = tachographVehicles.filter((v: any) => v.future_tachograph_revisions_count > 0).length;
      const vehiclesWithoutTachographRevisions = totalTachographVehicles - vehiclesWithTachographRevisions;
      
      const nextTachographRevisionsDue = tachographVehicles.filter((v: any) => {
        if (!v.next_tachograph_revision_date) return false;
        const revisionDate = new Date(v.next_tachograph_revision_date);
        return revisionDate <= thirtyDaysFromNow;
      }).length;
      
      const stats: RevisionStats = {
        totalVehicles,
        vehiclesWithRevisions,
        vehiclesWithoutRevisions,
        nextRevisionsDue,
        totalTachographVehicles,
        vehiclesWithTachographRevisions,
        vehiclesWithoutTachographRevisions,
        nextTachographRevisionsDue
      };
      
      setRevisionStats(stats);
      setShowRevisionModal(true);
    } catch (err) {
      setRevisionError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setShowRevisionModal(true); // Mostra il modal anche in caso di errore
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleFullRevisionCheck = async () => {
    try {
      setRevisionLoading(true);
      setRevisionError(null);
      
      const response = await fetch('/api/vehicles/revisions/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run-check' })
      });
      
      if (!response.ok) {
        throw new Error('Errore nel controllo completo delle revisioni');
      }
      
      const result: RevisionCheckResult = await response.json();
      
      if (result.success) {
        setLastCheckResult(`Controllo completato con successo. ${result.processed || 0} veicoli processati.`);
        // Aggiorna le statistiche
        if (result.stats) {
          setRevisionStats(result.stats);
        }
        // Ricarica la pagina dopo un breve delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setRevisionError(result.message || 'Errore durante il controllo');
      }
    } catch (err) {
      setRevisionError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setRevisionLoading(false);
    }
  };

  const closeRevisionModal = () => {
    setShowRevisionModal(false);
    setRevisionError(null);
    setLastCheckResult(null);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-warning text-dark',
      completed: 'bg-success',
      overdue: 'bg-danger',
      cancelled: 'bg-secondary'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-secondary';
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      low: 'bg-primary text-white',
      medium: 'bg-warning text-dark',
      high: 'bg-danger text-white'
    };
    return priorityClasses[priority as keyof typeof priorityClasses] || 'bg-secondary text-white';
  };

  const formatDate = (dateString: string) => {
    return formatDateItalian(dateString);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const filteredSchedules = schedules.filter(schedule => {
    // Gestione speciale per il filtro "overdue"
    if (filterStatus === 'overdue') {
      // Include scadenze con status "overdue" O scadenze "pending" con data passata
      if (schedule.status === 'overdue') {
        // Scadenze già marcate come scadute
      } else if (schedule.status === 'pending') {
        // Controlla se la scadenza pending è effettivamente scaduta
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const relevantDate = schedule.booking_date 
          ? new Date(schedule.booking_date) 
          : new Date(schedule.data_scadenza);
        relevantDate.setHours(0, 0, 0, 0);
        
        if (relevantDate >= now) {
          return false; // Non è scaduta
        }
      } else {
        return false; // Non è né overdue né pending scaduta
      }
    } else if (filterStatus !== 'all' && schedule.status !== filterStatus) {
      return false;
    }
    
    if (filterPriority !== 'all' && schedule.priority !== filterPriority) return false;
    if (filterPlate && !schedule.vehicle?.targa.toLowerCase().includes(filterPlate.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">🚗 Dashboard Scadenze Veicoli</h1>
            <div className="d-flex gap-2">
              <Link href="/vehicles/schedules/calendar" className="btn btn-primary">
                <i className="fas fa-calendar me-1"></i>
                Calendario
              </Link>
              <Link href="/vehicles/quotes" className="btn btn-danger">
                <i className="fas fa-file-invoice me-1"></i>
                Preventivi
              </Link>
              <Link href="/vehicles" className="btn btn-outline-primary">
                <i className="fas fa-arrow-left me-2"></i>
                Torna ai Veicoli
              </Link>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Alert Overview */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className={`card ${cardClass} border-danger`}>
                <div className="card-body text-center">
                  <h5 className="card-title text-danger">⚠️ Scadute</h5>
                  <h2 className="text-danger">{alertStats.overdue}</h2>
                  <small className={theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}>Richiedono attenzione immediata</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className={`card ${cardClass} border-warning`}>
                <div className="card-body text-center">
                  <h5 className="card-title text-warning">⏰ In Scadenza</h5>
                  <h2 className="text-warning">{alertStats.dueSoon}</h2>
                  <small className={theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}>Prossimi 7 giorni</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className={`card ${cardClass} border-info`}>
                <div className="card-body text-center">
                  <h5 className="card-title text-info">📅 Prossime</h5>
                  <h2 className="text-info">{alertStats.upcoming}</h2>
                  <small className={theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}>Prossimi 30 giorni</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className={`card ${cardClass} border-primary`}>
                <div className="card-body text-center">
                  <h5 className="card-title text-primary">📊 Totali</h5>
                  <h2 className="text-primary">{alertStats.total}</h2>
                  <small className={theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}>Tutte le scadenze</small>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`card ${cardClass} ${borderClass} mb-4`}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-light">🛠️ Azioni Rapide</h5>
                <div className="btn-group">
                  <Link href="/vehicles/schedules/new" className="btn btn-success">
                    <i className="fas fa-plus me-1"></i>
                    Nuova Scadenza
                  </Link>
                  <button 
                    onClick={handleRevisionCheck}
                    className="btn btn-warning"
                    disabled={revisionLoading}
                  >
                    <i className="fas fa-cogs me-1"></i>
                    {revisionLoading ? 'Controllo...' : 'Controllo Revisioni'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`card ${cardClass} ${borderClass} mb-4`}>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <label className={`form-label ${textClass}`}>Stato</label>
                  <select 
                    className={`form-select ${formClass}`}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tutti gli stati</option>
                    <option value="pending">In attesa</option>
                    <option value="completed">Completate</option>
                    <option value="overdue">Scadute</option>
                    <option value="cancelled">Annullate</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className={`form-label ${textClass}`}>Priorità</label>
                  <select 
                    className={`form-select ${formClass}`}
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                  >
                    <option value="all">Tutte le priorità</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Bassa</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className={`form-label ${textClass}`}>Cerca per Targa</label>
                  <input 
                    type="text"
                    className={`form-control ${formClass}`}
                    placeholder="Cerca per targa..."
                    value={filterPlate}
                    onChange={(e) => setFilterPlate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Schedules Table */}
          <div className={`card ${cardClass} ${borderClass}`}>
            <div className={`card-header ${cardClass} ${borderClass}`}>
              <h5 className={`mb-0 ${textClass}`}>📋 Elenco Scadenze ({filteredSchedules.length})</h5>
            </div>
            <div className="card-body">
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-4">
                  <p className={theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}>Nessuna scadenza trovata con i filtri selezionati.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className={`table ${tableClass} table-hover`}>
                    <thead>
                      <tr>
                        <th>Veicolo</th>
                        <th>Tipo</th>
                        <th>Descrizione</th>
                        <th>Scadenza</th>
                        <th>Data Completamento</th>
                        <th>Stato</th>
                        <th>Priorità</th>
                        <th>Costo Stimato</th>
                        <th>Fornitore</th>
                        <th>Data Prenotazione</th>
                        <th>N. Preventivo</th>
                        <th>Data Preventivo</th>
                        <th>Note</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td>
                            <strong className={textClass}>{schedule.vehicle?.targa}</strong><br />
                            <small className={theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}>
                              {schedule.vehicle?.marca} {schedule.vehicle?.modello}
                            </small>
                          </td>
                          <td>
                            <span className={`badge ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-light text-dark'}`}>
                              {schedule.schedule_type}
                            </span>
                          </td>
                          <td className={textClass}>{schedule.description}</td>
                          <td>
                            <span className={
                              schedule.status === 'completed'
                                ? textClass
                                : schedule.status === 'pending' && new Date(schedule.data_scadenza) < new Date()
                                ? 'text-danger'
                                : schedule.status === 'pending' && new Date(schedule.data_scadenza) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-warning'
                                : schedule.status === 'pending' && new Date(schedule.data_scadenza) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-info'
                                : textClass
                            }>
                              {formatDate(schedule.data_scadenza)}
                            </span>
                          </td>
                          <td className={textClass}>
                            {schedule.completed_date ? formatDate(schedule.completed_date) : '-'}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(schedule.status)}`}>
                              {schedule.status}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getPriorityBadge(schedule.priority)}`}>
                              {schedule.priority}
                            </span>
                          </td>
                          <td className={textClass}>{formatCurrency(schedule.cost_estimate)}</td>
                          <td className={textClass}>
                            {schedule.provider || '-'}
                          </td>
                          <td className={textClass}>
                            {schedule.booking_date ? formatDate(schedule.booking_date) : '-'}
                          </td>
                          <td>
                            {schedule.quote_number ? (
                              <span className={`badge ${badgeClass}`}>
                                {schedule.quote_number}
                              </span>
                            ) : <span className={textClass}>-</span>}
                          </td>
                          <td>
                            {schedule.quote_date ? formatDate(schedule.quote_date) : '-'}
                          </td>
                          <td className={textClass}>
                            {schedule.notes ? 
                              (schedule.notes.length > 50 ? 
                                schedule.notes.substring(0, 50) + '...' : 
                                schedule.notes
                              ) : '-'
                            }
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link 
                                href={`/vehicles/schedules/${schedule.id}`}
                                className="btn btn-outline-primary"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Link 
                                href={`/vehicles/schedules/${schedule.id}/edit`}
                                className="btn btn-outline-secondary"
                              >
                                <i className="fas fa-edit"></i>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Modal Controllo Revisioni */}
          {showRevisionModal && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className={`modal-content ${modalClass}`}>
                  <div className={`modal-header ${borderClass}`}>
                    <h5 className={`modal-title ${textClass}`}>
                      <i className="fas fa-cogs me-2"></i>
                      Controllo Revisioni Automatiche
                    </h5>
                    <button 
                      type="button" 
                      className={theme === 'dark' ? 'btn-close btn-close-white' : 'btn-close'} 
                      onClick={closeRevisionModal}
                    ></button>
                  </div>
                  <div className="modal-body">
                    {revisionError && (
                      <div className="alert alert-danger">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        {revisionError}
                      </div>
                    )}
                    
                    {lastCheckResult && (
                      <div className="alert alert-success">
                        <i className="fas fa-check-circle me-2"></i>
                        {lastCheckResult}
                      </div>
                    )}
                    
                    {revisionStats && (
                      <div>
                        {/* Sezione Revisioni Normali */}
                        <h6 className={`${textClass} mb-3`}>
                          <i className="fas fa-tools me-2"></i>
                          Revisioni Normali
                        </h6>
                        <div className="row mb-4">
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-primary">
                                  <i className="fas fa-car me-2"></i>
                                  Veicoli Totali
                                </h5>
                                <h2 className="text-primary">{revisionStats.totalVehicles}</h2>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-success">
                                  <i className="fas fa-check-circle me-2"></i>
                                  Con Revisioni
                                </h5>
                                <h2 className="text-success">{revisionStats.vehiclesWithRevisions}</h2>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-danger">
                                  <i className="fas fa-exclamation-triangle me-2"></i>
                                  Senza Revisioni
                                </h5>
                                <h2 className="text-danger">{revisionStats.vehiclesWithoutRevisions}</h2>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-warning">
                                  <i className="fas fa-clock me-2"></i>
                                  Prossime Scadenze
                                </h5>
                                <h2 className="text-warning">{revisionStats.nextRevisionsDue}</h2>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sezione Revisioni Tachigrafo */}
                        <hr className={`${borderClass} my-4`} />
                        <h6 className={`${textClass} mb-3`}>
                          <i className="fas fa-tachometer-alt me-2"></i>
                          Revisioni Tachigrafo
                        </h6>
                        <div className="row">
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-info">
                                  <i className="fas fa-truck me-2"></i>
                                  Veicoli con Tachigrafo
                                </h5>
                                <h2 className="text-info">{revisionStats.totalTachographVehicles}</h2>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-success">
                                  <i className="fas fa-check-circle me-2"></i>
                                  Con Revisioni Tachigrafo
                                </h5>
                                <h2 className="text-success">{revisionStats.vehiclesWithTachographRevisions}</h2>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-danger">
                                  <i className="fas fa-exclamation-triangle me-2"></i>
                                  Senza Revisioni Tachigrafo
                                </h5>
                                <h2 className="text-danger">{revisionStats.vehiclesWithoutTachographRevisions}</h2>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className={`card ${cardClass} mb-3`}>
                              <div className="card-body text-center">
                                <h5 className="card-title text-warning">
                                  <i className="fas fa-clock me-2"></i>
                                  Prossime Scadenze Tachigrafo
                                </h5>
                                <h2 className="text-warning">{revisionStats.nextTachographRevisionsDue}</h2>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {revisionLoading && (
                      <div className="text-center py-3">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Caricamento...</span>
                        </div>
                        <p className={`mt-2 ${theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}`}>Controllo in corso...</p>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer border-secondary">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={closeRevisionModal}
                    >
                      Chiudi
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={handleFullRevisionCheck}
                      disabled={revisionLoading}
                    >
                      <i className="fas fa-sync-alt me-1"></i>
                      {revisionLoading ? 'Controllo...' : 'Controllo Completo'}
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

export default function VehicleSchedulesPage() {
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
      <VehicleSchedulesContent />
    </Suspense>
  );
}