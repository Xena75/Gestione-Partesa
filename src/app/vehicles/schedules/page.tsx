// src/app/vehicles/schedules/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDateItalian } from '@/lib/date-utils';

interface VehicleSchedule {
  id: number;
  vehicle_id: string;
  schedule_type: string;
  description: string;
  data_scadenza: string;
  completed_date?: string;
  booking_date?: string;
  status: string;
  priority: string;
  cost_estimate?: number;
  notes?: string;
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

function VehicleSchedulesContent() {
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

  useEffect(() => {
    fetchSchedules();
  }, []);

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
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stats = schedules.reduce(
      (acc, schedule) => {
        const dueDate = new Date(schedule.data_scadenza);
        if (dueDate < now && schedule.status === 'pending') {
          acc.overdue++;
        } else if (dueDate <= sevenDaysFromNow && schedule.status === 'pending') {
          acc.dueSoon++;
        } else if (dueDate <= thirtyDaysFromNow && schedule.status === 'pending') {
          acc.upcoming++;
        }
        acc.total++;
        return acc;
      },
      { overdue: 0, dueSoon: 0, upcoming: 0, total: 0 }
    );

    setAlertStats(stats);
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
    if (filterStatus !== 'all' && schedule.status !== filterStatus) return false;
    if (filterPriority !== 'all' && schedule.priority !== filterPriority) return false;
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
            <Link href="/vehicles" className="btn btn-outline-primary">
              <i className="fas fa-arrow-left me-2"></i>
              Torna ai Veicoli
            </Link>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Alert Overview */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card bg-dark text-light border-danger">
                <div className="card-body text-center">
                  <h5 className="card-title text-danger">⚠️ Scadute</h5>
                  <h2 className="text-danger">{alertStats.overdue}</h2>
                  <small className="text-light-emphasis">Richiedono attenzione immediata</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-dark text-light border-warning">
                <div className="card-body text-center">
                  <h5 className="card-title text-warning">⏰ In Scadenza</h5>
                  <h2 className="text-warning">{alertStats.dueSoon}</h2>
                  <small className="text-light-emphasis">Prossimi 7 giorni</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-dark text-light border-info">
                <div className="card-body text-center">
                  <h5 className="card-title text-info">📅 Prossime</h5>
                  <h2 className="text-info">{alertStats.upcoming}</h2>
                  <small className="text-light-emphasis">Prossimi 30 giorni</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-dark text-light border-primary">
                <div className="card-body text-center">
                  <h5 className="card-title text-primary">📊 Totali</h5>
                  <h2 className="text-primary">{alertStats.total}</h2>
                  <small className="text-light-emphasis">Tutte le scadenze</small>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card bg-dark text-light border-secondary mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-light">🛠️ Azioni Rapide</h5>
                <div className="btn-group">
                  <Link href="/vehicles/schedules/calendar" className="btn btn-primary">
                    <i className="fas fa-calendar me-1"></i>
                    Calendario
                  </Link>
                  <Link href="/vehicles/schedules/new" className="btn btn-success">
                    <i className="fas fa-plus me-1"></i>
                    Nuova Scadenza
                  </Link>
                  <Link href="/vehicles/quotes" className="btn btn-info">
                    <i className="fas fa-file-invoice me-1"></i>
                    Preventivi
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card bg-dark text-light border-secondary mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label text-light">Stato</label>
                  <select 
                    className="form-select bg-dark text-light border-secondary"
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
                <div className="col-md-6">
                  <label className="form-label text-light">Priorità</label>
                  <select 
                    className="form-select bg-dark text-light border-secondary"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                  >
                    <option value="all">Tutte le priorità</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Bassa</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Schedules Table */}
          <div className="card bg-dark text-light border-secondary">
            <div className="card-header bg-dark border-secondary">
              <h5 className="mb-0 text-light">📋 Elenco Scadenze ({filteredSchedules.length})</h5>
            </div>
            <div className="card-body">
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-light-emphasis">Nessuna scadenza trovata con i filtri selezionati.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-hover">
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
                        <th>Note</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td>
                            <strong>{schedule.vehicle?.targa}</strong><br />
                            <small className="text-light-emphasis">
                              {schedule.vehicle?.marca} {schedule.vehicle?.modello}
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-secondary text-light">
                              {schedule.schedule_type}
                            </span>
                          </td>
                          <td>{schedule.description}</td>
                          <td>
                            <span className={`fw-bold ${
                              new Date(schedule.data_scadenza) < new Date() && schedule.status === 'pending'
                                ? 'text-danger'
                                : new Date(schedule.data_scadenza) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-warning'
                                : new Date(schedule.data_scadenza) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-info'
                                : 'text-white'
                            }`}
                            style={!(new Date(schedule.data_scadenza) < new Date() && schedule.status === 'pending') && 
                                   !(new Date(schedule.data_scadenza) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) && 
                                   !(new Date(schedule.data_scadenza) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) ? 
                                   {color: '#ffffff'} : {}}>
                              {formatDate(schedule.data_scadenza)}
                            </span>
                          </td>
                          <td>
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
                          <td>{formatCurrency(schedule.cost_estimate)}</td>
                          <td>
                            {schedule.provider || '-'}
                          </td>
                          <td>
                            {schedule.booking_date ? formatDate(schedule.booking_date) : '-'}
                          </td>
                          <td>
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