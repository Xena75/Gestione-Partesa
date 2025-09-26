// src/app/vehicles/schedules/calendar/page.tsx
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/it';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Link from 'next/link';

// Configura moment in italiano
moment.locale('it');
const localizer = momentLocalizer(moment);

interface VehicleSchedule {
  id: number;
  vehicle_id: string;
  schedule_type: string;
  description: string;
  data_scadenza: string;
  booking_date?: string;
  status: string;
  priority: string;
  cost_estimate?: number;
  notes?: string;
  targa?: string;
  marca?: string;
  modello?: string;
  vehicle?: {
    targa: string;
    marca: string;
    modello: string;
  };
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: VehicleSchedule;
}

function VehicleSchedulesCalendarContent() {
  const [schedules, setSchedules] = useState<VehicleSchedule[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

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
      convertToCalendarEvents(data.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const convertToCalendarEvents = (schedules: VehicleSchedule[]) => {
    const calendarEvents: CalendarEvent[] = schedules.map(schedule => {
      const dueDate = new Date(schedule.data_scadenza);
      const now = new Date();
      const isOverdue = dueDate < now;
      
      // Se l'evento è scaduto ma ha una data di prenotazione, usa quella
      let displayDate = dueDate;
      let titleSuffix = '';
      
      if (isOverdue && schedule.booking_date) {
        displayDate = new Date(schedule.booking_date);
        titleSuffix = ' (Prenotato)';
      }
      
      return {
        id: schedule.id,
        title: `${schedule.vehicle?.targa || 'N/A'} - ${schedule.schedule_type}${titleSuffix}`,
        start: displayDate,
        end: displayDate,
        resource: {
          ...schedule,
          vehicle: {
            targa: schedule.targa,
            marca: schedule.marca,
            modello: schedule.modello
          }
        }
      };
    });
    setEvents(calendarEvents);
  };

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
  }, []);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    // Naviga alla pagina di creazione nuova scadenza con data preselezionata
    const dateParam = start.toISOString().split('T')[0];
    window.location.href = `/vehicles/schedules/new?date=${dateParam}`;
  }, []);

  const eventStyleGetter = (event: CalendarEvent) => {
    const schedule = event.resource;
    const now = new Date();
    const dueDate = new Date(schedule.data_scadenza);
    const isOverdue = dueDate < now;
    const isBooked = isOverdue && schedule.booking_date;
    
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';
    
    if (schedule.status === 'completed') {
      backgroundColor = '#28a745';
      borderColor = '#28a745';
    } else if (schedule.status === 'cancelled') {
      backgroundColor = '#6c757d';
      borderColor = '#6c757d';
    } else if (isBooked) {
      // Eventi scaduti ma prenotati - colore viola
      backgroundColor = '#6f42c1';
      borderColor = '#6f42c1';
    } else if (dueDate < now) {
      backgroundColor = '#dc3545';
      borderColor = '#dc3545';
    } else if (dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      backgroundColor = '#ffc107';
      borderColor = '#ffc107';
    } else if (schedule.priority === 'high') {
      backgroundColor = '#fd7e14';
      borderColor = '#fd7e14';
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }
    };
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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
      high: 'bg-danger',
      medium: 'bg-warning text-dark',
      low: 'bg-info'
    };
    return priorityClasses[priority as keyof typeof priorityClasses] || 'bg-secondary';
  };

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
            <h1 className="h3 mb-0">📅 Calendario Scadenze Veicoli</h1>
            <div className="btn-group">
              <Link href="/vehicles/schedules" className="btn btn-outline-primary">
                <i className="fas fa-list me-1"></i>
                Vista Lista
              </Link>
              <Link href="/vehicles/schedules/new" className="btn btn-success">
                <i className="fas fa-plus me-1"></i>
                Nuova Scadenza
              </Link>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Legenda */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title">Legenda Colori</h6>
              <div className="row">
                <div className="col-md-2">
                  <span className="badge bg-danger me-2">■</span>
                  <small>Scadute</small>
                </div>
                <div className="col-md-2">
                  <span className="badge me-2" style={{backgroundColor: '#6f42c1'}}>■</span>
                  <small>Prenotate</small>
                </div>
                <div className="col-md-2">
                  <span className="badge bg-warning me-2">■</span>
                  <small>In scadenza (7 giorni)</small>
                </div>
                <div className="col-md-2">
                  <span className="badge bg-success me-2">■</span>
                  <small>Completate</small>
                </div>
                <div className="col-md-2">
                  <span className="badge bg-secondary me-2">■</span>
                  <small>Annullate</small>
                </div>
                <div className="col-md-2">
                  <span className="badge" style={{backgroundColor: '#fd7e14', color: 'white'}} className="me-2">■</span>
                  <small>Priorità alta</small>
                </div>
              </div>
            </div>
          </div>

          {/* Calendario */}
          <div className="card">
            <div className="card-body" style={{ height: '600px' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                eventPropGetter={eventStyleGetter}
                messages={{
                  next: 'Successivo',
                  previous: 'Precedente',
                  today: 'Oggi',
                  month: 'Mese',
                  week: 'Settimana',
                  day: 'Giorno',
                  agenda: 'Agenda',
                  date: 'Data',
                  time: 'Ora',
                  event: 'Evento',
                  noEventsInRange: 'Nessun evento in questo periodo',
                  showMore: (total) => `+ Altri ${total}`
                }}
                formats={{
                  monthHeaderFormat: 'MMMM YYYY',
                  dayHeaderFormat: 'dddd DD/MM',
                  dayRangeHeaderFormat: ({ start, end }) => 
                    `${moment(start).format('DD/MM')} - ${moment(end).format('DD/MM/YYYY')}`,
                  agendaDateFormat: 'DD/MM/YYYY',
                  agendaTimeFormat: 'HH:mm',
                  agendaTimeRangeFormat: ({ start, end }) => 
                    `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dettagli Evento */}
      {showModal && selectedEvent && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  🚗 Dettagli Scadenza - {selectedEvent.resource.vehicle?.targa}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Informazioni Veicolo</h6>
                    <p><strong>Targa:</strong> {selectedEvent.resource.vehicle?.targa}</p>
                    <p><strong>Marca:</strong> {selectedEvent.resource.vehicle?.marca}</p>
                    <p><strong>Modello:</strong> {selectedEvent.resource.vehicle?.modello}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Dettagli Scadenza</h6>
                    <p><strong>Tipo:</strong> {selectedEvent.resource.schedule_type}</p>
                    <p><strong>Descrizione:</strong> {selectedEvent.resource.description}</p>
                    <p><strong>Data Scadenza:</strong> {moment(selectedEvent.resource.data_scadenza).format('DD/MM/YYYY')}</p>
                    {selectedEvent.resource.booking_date && (
                      <p><strong>Data Prenotazione:</strong> {moment(selectedEvent.resource.booking_date).format('DD/MM/YYYY')}</p>
                    )}
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <p>
                      <strong>Stato:</strong> 
                      <span className={`badge ${getStatusBadge(selectedEvent.resource.status)} ms-2`}>
                        {selectedEvent.resource.status}
                      </span>
                    </p>
                    <p>
                      <strong>Priorità:</strong> 
                      <span className={`badge ${getPriorityBadge(selectedEvent.resource.priority)} ms-2`}>
                        {selectedEvent.resource.priority}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Costo Stimato:</strong> {formatCurrency(selectedEvent.resource.cost_estimate)}</p>
                  </div>
                </div>
                {selectedEvent.resource.notes && (
                  <div className="mt-3">
                    <h6>Note</h6>
                    <p className="text-muted">{selectedEvent.resource.notes}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Chiudi
                </button>
                <Link 
                  href={`/vehicles/schedules/${selectedEvent.resource.id}`}
                  className="btn btn-primary"
                >
                  Visualizza Dettagli
                </Link>
                <Link 
                  href={`/vehicles/schedules/${selectedEvent.resource.id}/edit`}
                  className="btn btn-warning"
                >
                  Modifica
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VehicleSchedulesCalendarPage() {
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
      <VehicleSchedulesCalendarContent />
    </Suspense>
  );
}