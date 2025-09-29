// src/app/vehicles/schedules/calendar/page.tsx
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import moment from 'moment';
import 'moment/locale/it';
import Link from 'next/link';

// Import dinamico per prevenire errori di inizializzazione
const Calendar = dynamic(
  () => import('react-big-calendar').then((mod) => mod.Calendar),
  { ssr: false }
);
const momentLocalizer = dynamic(
  () => import('react-big-calendar').then((mod) => mod.momentLocalizer),
  { ssr: false }
);
const Views = dynamic(
  () => import('react-big-calendar').then((mod) => mod.Views),
  { ssr: false }
);

// Import CSS in modo sicuro
if (typeof window !== 'undefined') {
  import('react-big-calendar/lib/css/react-big-calendar.css');
  import('react-big-calendar/lib/addons/dragAndDrop/styles.css');
}

// CSS globale per forzare tutti i colori degli eventi in modalità dark
const forceEventColorsCSS = `
  /* 🔴 ROSSO: Eventi scaduti */
  .rbc-event.force-red-event,
  .rbc-event.force-red-event .rbc-event-content,
  .rbc-event.force-red-event:hover,
  .rbc-event.force-red-event:focus {
    background-color: #ff0000 !important;
    border-color: #ff0000 !important;
    color: white !important;
    border: 2px solid #ff0000 !important;
    outline: 2px solid #ff0000 !important;
  }
  
  /* 🟢 VERDE: Eventi completati */
  .rbc-event.force-green-event,
  .rbc-event.force-green-event .rbc-event-content,
  .rbc-event.force-green-event:hover,
  .rbc-event.force-green-event:focus {
    background-color: #28a745 !important;
    border-color: #28a745 !important;
    color: white !important;
    border: 2px solid #28a745 !important;
  }
  
  /* ⚫ GRIGIO: Eventi cancellati */
  .rbc-event.force-grey-event,
  .rbc-event.force-grey-event .rbc-event-content,
  .rbc-event.force-grey-event:hover,
  .rbc-event.force-grey-event:focus {
    background-color: #6c757d !important;
    border-color: #6c757d !important;
    color: white !important;
    border: 2px solid #6c757d !important;
  }
  
  /* 🟠 ARANCIONE: Eventi priorità alta */
  .rbc-event.force-orange-event,
  .rbc-event.force-orange-event .rbc-event-content,
  .rbc-event.force-orange-event:hover,
  .rbc-event.force-orange-event:focus {
    background-color: #fd7e14 !important;
    border-color: #fd7e14 !important;
    color: white !important;
    border: 2px solid #fd7e14 !important;
  }
  
  /* 🟡 GIALLO: Eventi entro 7 giorni */
  .rbc-event.force-yellow-event,
  .rbc-event.force-yellow-event .rbc-event-content,
  .rbc-event.force-yellow-event:hover,
  .rbc-event.force-yellow-event:focus {
    background-color: #ffc107 !important;
    border-color: #ffc107 !important;
    color: black !important;
    border: 2px solid #ffc107 !important;
  }
  
  /* 🟣 VIOLA: Eventi entro 30 giorni */
  .rbc-event.force-purple-event,
  .rbc-event.force-purple-event .rbc-event-content,
  .rbc-event.force-purple-event:hover,
  .rbc-event.force-purple-event:focus {
    background-color: #6f42c1 !important;
    border-color: #6f42c1 !important;
    color: white !important;
    border: 2px solid #6f42c1 !important;
  }
  
  /* 🔵 BLU: Eventi standard */
  .rbc-event.force-blue-event,
  .rbc-event.force-blue-event .rbc-event-content,
  .rbc-event.force-blue-event:hover,
  .rbc-event.force-blue-event:focus {
    background-color: #3174ad !important;
    border-color: #3174ad !important;
    color: white !important;
    border: 2px solid #3174ad !important;
  }
  
  /* Forza i colori anche in modalità scura */
  .dark .rbc-event.force-red-event,
  .dark .rbc-event.force-red-event .rbc-event-content {
    background-color: #ff0000 !important;
    border-color: #ff0000 !important;
    color: white !important;
  }
  
  .dark .rbc-event.force-green-event,
  .dark .rbc-event.force-green-event .rbc-event-content {
    background-color: #28a745 !important;
    border-color: #28a745 !important;
    color: white !important;
  }
  
  .dark .rbc-event.force-grey-event,
  .dark .rbc-event.force-grey-event .rbc-event-content {
    background-color: #6c757d !important;
    border-color: #6c757d !important;
    color: white !important;
  }
  
  .dark .rbc-event.force-orange-event,
  .dark .rbc-event.force-orange-event .rbc-event-content {
    background-color: #fd7e14 !important;
    border-color: #fd7e14 !important;
    color: white !important;
  }
  
  .dark .rbc-event.force-yellow-event,
  .dark .rbc-event.force-yellow-event .rbc-event-content {
    background-color: #ffc107 !important;
    border-color: #ffc107 !important;
    color: black !important;
  }
  
  .dark .rbc-event.force-purple-event,
  .dark .rbc-event.force-purple-event .rbc-event-content {
    background-color: #6f42c1 !important;
    border-color: #6f42c1 !important;
    color: white !important;
  }
  
  .dark .rbc-event.force-blue-event,
  .dark .rbc-event.force-blue-event .rbc-event-content {
    background-color: #3174ad !important;
    border-color: #3174ad !important;
    color: white !important;
  }
  
  /* Override generale per tutti gli eventi */
  .rbc-event {
    border-radius: 4px !important;
    font-weight: 500 !important;
  }
`;

// Inietta il CSS nella pagina
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = forceEventColorsCSS;
  document.head.appendChild(style);
}

// Configura moment per la localizzazione italiana
moment.locale('it');

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
  const [view, setView] = useState<any>('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [currentLocalizer, setCurrentLocalizer] = useState<any>(null);
  const [DragAndDropCalendar, setDragAndDropCalendar] = useState<any>(null);
  const [dragFeedback, setDragFeedback] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);

  // Inizializzazione del calendario
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-big-calendar'),
        import('react-big-calendar/lib/addons/dragAndDrop')
      ]).then(([calendarMod, dragAndDropMod]) => {
        const localizer = calendarMod.momentLocalizer(moment);
        const withDragAndDrop = dragAndDropMod.default;
        const DragAndDropCalendarComponent = withDragAndDrop(calendarMod.Calendar);
        setCurrentLocalizer(localizer);
        setDragAndDropCalendar(() => DragAndDropCalendarComponent);
        setCalendarReady(true);
      });
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Reset isDragging quando il componente viene smontato
  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
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
    console.log('Tutti i veicoli nel calendario:', schedules.map(s => ({ targa: s.vehicle?.targa, id: s.id, data_scadenza: s.data_scadenza, booking_date: s.booking_date })));
    const calendarEvents: CalendarEvent[] = schedules.map(schedule => {
      // Usa booking_date se presente e non vuota, altrimenti data_scadenza
      const eventDate = schedule.booking_date && schedule.booking_date.trim() !== '' 
        ? new Date(schedule.booking_date) 
        : new Date(schedule.data_scadenza);
      
      let titleSuffix = '';
      
      if (schedule.booking_date && schedule.booking_date.trim() !== '') {
        titleSuffix = ' (Prenotato)';
      }
      
      return {
        id: schedule.id,
        title: `${schedule.vehicle?.targa || 'N/A'} - ${schedule.schedule_type}${titleSuffix}`,
        start: eventDate,
        end: eventDate,
        resource: {
          ...schedule,
          // Mantieni la struttura originale del veicolo dall'API
          vehicle: schedule.vehicle
        }
      };
    });
    setEvents(calendarEvents);
  };

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    // Apri sempre il modal al click, il drag è gestito separatamente
    setSelectedEvent(event);
    setShowModal(true);
  }, []);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    // Naviga alla pagina di creazione nuova scadenza con data preselezionata
    const dateParam = start.toISOString().split('T')[0];
    window.location.href = `/vehicles/schedules/new?date=${dateParam}`;
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setDragStartTime(Date.now());
    setShowModal(false); // Chiudi il modal se aperto
  }, []);

  // Aggiungi un handler per quando il drag finisce senza drop
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setTimeout(() => {
      setDragStartTime(null);
    }, 300);
  }, []);

  const handleEventDrop = useCallback(async ({ event, start, end }: { event: CalendarEvent, start: Date, end: Date }) => {

    
    try {
      setDragFeedback('Aggiornamento in corso...');
      
      const scheduleId = event.resource.id;
      const newDate = start.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      // Determina quale campo aggiornare basandosi sulla logica esistente
      const updateData: any = {};
      
      // Se l'evento ha booking_date, aggiorna quello, altrimenti data_scadenza
      if (event.resource.booking_date && event.resource.booking_date.trim() !== '') {
        updateData.booking_date = newDate;
      } else {
        updateData.data_scadenza = newDate;
      }
      
      // Chiamata API per aggiornare la scadenza (usando PATCH per aggiornamento parziale)
      const response = await fetch(`/api/vehicles/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento della data');
      }
      
      // Aggiorna lo stato locale degli eventi
      const updatedSchedules = schedules.map(schedule => {
        if (schedule.id === scheduleId) {
          return {
            ...schedule,
            ...updateData
          };
        }
        return schedule;
      });
      
      setSchedules(updatedSchedules);
      convertToCalendarEvents(updatedSchedules);
      
      setDragFeedback('✅ Data aggiornata con successo!');
      setTimeout(() => setDragFeedback(null), 3000);
      
      // Reset dello stato di drag immediatamente dopo il successo
      setIsDragging(false);
      setTimeout(() => {
        setDragStartTime(null);
      }, 300);
      
    } catch (error) {
      console.error('Errore durante l\'aggiornamento:', error);
      setDragFeedback('❌ Errore nell\'aggiornamento della data');
      setTimeout(() => setDragFeedback(null), 5000);
      
      // Reset dello stato di drag
      setIsDragging(false);
      setTimeout(() => {
        setDragStartTime(null);
      }, 300);
      
      // Ricarica i dati in caso di errore
      fetchSchedules();
    }
  }, [schedules]);

  const eventStyleGetter = (event: any) => {
    const schedule = event.resource;
    const today = new Date();
    const eventDate = new Date(schedule.data_scadenza);
    const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 🟢 VERDE: Eventi completati (priorità massima)
    if (schedule.status === 'completed') {
      return {
        style: {
          backgroundColor: '#28a745 !important',
          borderColor: '#28a745 !important',
          color: 'white !important',
          border: '2px solid #28a745 !important'
        },
        className: 'force-green-event'
      };
    }

    // 🔴 ROSSO: Eventi scaduti
    if (daysDiff < 0) {
      return {
        style: {
          backgroundColor: '#ff0000 !important',
          borderColor: '#ff0000 !important',
          color: 'white !important',
          border: '2px solid #ff0000 !important',
          outline: '2px solid #ff0000 !important'
        },
        className: 'force-red-event'
      };
    }

    // ⚫ GRIGIO: Eventi cancellati
    if (schedule.status === 'cancelled') {
      return {
        style: {
          backgroundColor: '#6c757d !important',
          borderColor: '#6c757d !important',
          color: 'white !important',
          border: '2px solid #6c757d !important'
        },
        className: 'force-grey-event'
      };
    }

    // 🟠 ARANCIONE: Eventi con priorità alta
    if (schedule.priority === 'high') {
      return {
        style: {
          backgroundColor: '#fd7e14 !important',
          borderColor: '#fd7e14 !important',
          color: 'white !important',
          border: '2px solid #fd7e14 !important'
        },
        className: 'force-orange-event'
      };
    }

    // 🟡 GIALLO: Eventi in scadenza entro 7 giorni
    if (daysDiff <= 7 && daysDiff >= 0) {
      return {
        style: {
          backgroundColor: '#ffc107 !important',
          borderColor: '#ffc107 !important',
          color: 'black !important',
          border: '2px solid #ffc107 !important'
        },
        className: 'force-yellow-event'
      };
    }

    // 🟣 VIOLA: Eventi prossimi entro 30 giorni
    if (daysDiff <= 30 && daysDiff >= 0) {
      return {
        style: {
          backgroundColor: '#6f42c1 !important',
          borderColor: '#6f42c1 !important',
          color: 'white !important',
          border: '2px solid #6f42c1 !important'
        },
        className: 'force-purple-event'
      };
    }

    // 🔵 BLU: Tutti gli altri eventi (default)
    return {
      style: {
        backgroundColor: '#3174ad !important',
        borderColor: '#3174ad !important',
        color: 'white !important',
        border: '2px solid #3174ad !important'
      },
      className: 'force-blue-event'
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

  if (loading || !calendarReady || !currentLocalizer) {
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
              <Link href="/vehicles/schedules/new" className="btn btn-success">
                <i className="fas fa-plus me-1"></i>
                Nuova Scadenza
              </Link>
              <Link href="/vehicles/schedules" className="btn btn-outline-primary">
                <i className="fas fa-list me-1"></i>
                Vista Lista
              </Link>
              <Link href="/vehicles" className="btn btn-outline-primary">
                <i className="fas fa-arrow-left me-1"></i>
                Torna ai Veicoli
              </Link>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Feedback per drag and drop */}
          {dragFeedback && (
            <div className={`alert ${dragFeedback.includes('✅') ? 'alert-success' : dragFeedback.includes('❌') ? 'alert-danger' : 'alert-info'} alert-dismissible`} role="alert">
              {dragFeedback}
            </div>
          )}

          {/* Legenda */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title mb-3">Legenda Colori</h6>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2" style={{minHeight: '60px'}}>
                <div className="d-flex align-items-center flex-grow-1 justify-content-center px-2 py-1">
                  <span className="badge bg-danger me-2 fs-6" style={{fontSize: '1.1rem !important'}}>🔴</span>
                  <span className="fw-medium">Scadute</span>
                </div>
                <div className="d-flex align-items-center flex-grow-1 justify-content-center px-2 py-1">
                  <span className="badge me-2 fs-6" style={{backgroundColor: '#fd7e14', color: 'white', fontSize: '1.1rem !important'}}>🟠</span>
                  <span className="fw-medium">Priorità alta</span>
                </div>
                <div className="d-flex align-items-center flex-grow-1 justify-content-center px-2 py-1">
                  <span className="badge bg-warning me-2 fs-6" style={{fontSize: '1.1rem !important'}}>🟡</span>
                  <span className="fw-medium">In scadenza (7 giorni)</span>
                </div>
                <div className="d-flex align-items-center flex-grow-1 justify-content-center px-2 py-1">
                  <span className="badge me-2 fs-6" style={{backgroundColor: '#6f42c1', color: 'white', fontSize: '1.1rem !important'}}>🟣</span>
                  <span className="fw-medium">Prossime (30 giorni)</span>
                </div>
                <div className="d-flex align-items-center flex-grow-1 justify-content-center px-2 py-1">
                  <span className="badge bg-success me-2 fs-6" style={{fontSize: '1.1rem !important'}}>🟢</span>
                  <span className="fw-medium">Completate</span>
                </div>
                <div className="d-flex align-items-center flex-grow-1 justify-content-center px-2 py-1">
                  <span className="badge bg-secondary me-2 fs-6" style={{fontSize: '1.1rem !important'}}>⚫</span>
                  <span className="fw-medium">Annullate</span>
                </div>
                <div className="d-flex align-items-center flex-grow-1 justify-content-center px-2 py-1">
                  <span className="badge me-2 fs-6" style={{backgroundColor: '#3174ad', color: 'white', fontSize: '1.1rem !important'}}>🔵</span>
                  <span className="fw-medium">Eventi standard</span>
                </div>
              </div>
              
              {/* Layout responsivo per dispositivi mobili */}
              <style jsx>{`
                @media (max-width: 768px) {
                  .d-flex.flex-wrap {
                    flex-direction: column;
                    gap: 0.5rem;
                  }
                  .d-flex.align-items-center.flex-grow-1 {
                    justify-content: flex-start !important;
                    min-height: 40px;
                  }
                }
                @media (max-width: 576px) {
                  .d-flex.flex-wrap {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                  }
                }
              `}</style>
            </div>
          </div>

          {/* Calendario */}
          <div className="card" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
            <div className="card-body" style={{ height: '100%', padding: '1rem' }}>
              {calendarReady && currentLocalizer && DragAndDropCalendar ? (
                  <DragAndDropCalendar
                  localizer={currentLocalizer}
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
                  draggableAccessor={() => true}
                  resizable={false}
                  onEventDrop={handleEventDrop}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
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
              ) : (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Caricamento calendario...</span>
                    </div>
                    <p className="mt-3 text-muted">Inizializzazione calendario...</p>
                  </div>
                </div>
              )}
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
                      className="btn btn-danger"
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