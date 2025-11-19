// src/app/vehicles/schedules/calendar/page.tsx
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import moment from 'moment';
import 'moment/locale/it';
import Link from 'next/link';

// Import diretto per funzioni e oggetti (non componenti)
import { momentLocalizer as createMomentLocalizer, Views } from 'react-big-calendar';

// Import CSS prima del dynamic import per evitare problemi di preload
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// Import dinamico per prevenire errori di inizializzazione
const Calendar = dynamic(
  () => import('react-big-calendar').then((mod) => mod.Calendar),
  { ssr: false }
);

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
  
  /* 🏖️ AZZURRO: Eventi ferie */
  .rbc-event.force-cyan-event,
  .rbc-event.force-cyan-event .rbc-event-content,
  .rbc-event.force-cyan-event:hover,
  .rbc-event.force-cyan-event:focus {
    background-color: #17a2b8 !important;
    border-color: #17a2b8 !important;
    color: white !important;
    border: 2px solid #17a2b8 !important;
  }
  
  /* 🤒 ROSA: Eventi malattia */
  .rbc-event.force-pink-event,
  .rbc-event.force-pink-event .rbc-event-content,
  .rbc-event.force-pink-event:hover,
  .rbc-event.force-pink-event:focus {
    background-color: #e83e8c !important;
    border-color: #e83e8c !important;
    color: white !important;
    border: 2px solid #e83e8c !important;
  }
  
  /* 📝 MARRONE: Eventi permesso */
  .rbc-event.force-brown-event,
  .rbc-event.force-brown-event .rbc-event-content,
  .rbc-event.force-brown-event:hover,
  .rbc-event.force-brown-event:focus {
    background-color: #795548 !important;
    border-color: #795548 !important;
    color: white !important;
    border: 2px solid #795548 !important;
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
  
  .dark .rbc-event.force-cyan-event,
  .dark .rbc-event.force-cyan-event .rbc-event-content {
    background-color: #17a2b8 !important;
    border-color: #17a2b8 !important;
    color: white !important;
  }
  
  .dark .rbc-event.force-pink-event,
  .dark .rbc-event.force-pink-event .rbc-event-content {
    background-color: #e83e8c !important;
    border-color: #e83e8c !important;
    color: white !important;
  }
  
  .dark .rbc-event.force-brown-event,
  .dark .rbc-event.force-brown-event .rbc-event-content {
    background-color: #795548 !important;
    border-color: #795548 !important;
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
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  resource: VehicleSchedule | LeaveEvent;
}

interface LeaveEvent {
  type: 'leave';
  leave_id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  days_requested: number;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

function VehicleSchedulesCalendarContent() {
  const [schedules, setSchedules] = useState<VehicleSchedule[]>([]);
  const [leaveEvents, setLeaveEvents] = useState<CalendarEvent[]>([]);
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
  
  // Nuovi stati per i filtri
  const [showVehicleEvents, setShowVehicleEvents] = useState(true);
  const [showLeaveEvents, setShowLeaveEvents] = useState(true);

  // Inizializzazione del calendario
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localizer = createMomentLocalizer(moment);
      setCurrentLocalizer(localizer);
      
      // Carica dinamicamente il componente DragAndDropCalendar
      import('react-big-calendar/lib/addons/dragAndDrop').then((mod) => {
        const DragAndDropCalendarComponent = mod.default(Calendar);
        setDragAndDropCalendar(() => DragAndDropCalendarComponent);
        setCalendarReady(true);
      }).catch((error) => {
        console.error('Errore nel caricamento del DragAndDropCalendar:', error);
        // Fallback al calendario normale se il drag and drop non si carica
        setDragAndDropCalendar(() => Calendar);
        setCalendarReady(true);
      });
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchLeaveEvents();
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
      updateCombinedEvents(data.schedules || [], leaveEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveEvents = async () => {
    try {
      const response = await fetch('/api/employees/leave/calendar');
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle ferie');
      }
      const data = await response.json();
      const leaveCalendarEvents = data.data.map((event: any) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        resource: event.resource
      }));
      setLeaveEvents(leaveCalendarEvents);
      updateCombinedEvents(schedules, leaveCalendarEvents);
    } catch (err) {
      console.error('Errore nel caricamento delle ferie:', err);
      // Non bloccare l'app se le ferie non si caricano
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
    return calendarEvents;
  };

  const updateCombinedEvents = (vehicleSchedules: VehicleSchedule[], leaveEvents: CalendarEvent[]) => {
    const vehicleEvents = convertToCalendarEvents(vehicleSchedules);
    
    let combinedEvents: CalendarEvent[] = [];
    
    if (showVehicleEvents) {
      combinedEvents = [...combinedEvents, ...vehicleEvents];
    }
    
    if (showLeaveEvents) {
      combinedEvents = [...combinedEvents, ...leaveEvents];
    }
    
    setEvents(combinedEvents);
  };

  // Aggiorna gli eventi quando cambiano i filtri
  useEffect(() => {
    updateCombinedEvents(schedules, leaveEvents);
  }, [showVehicleEvents, showLeaveEvents, schedules, leaveEvents]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    // Apri sempre il modal al click, il drag è gestito separatamente
    setSelectedEvent(event);
    setShowModal(true);
  }, []);

  // Funzione per generare tooltip informativi
  const getEventTooltip = (event: CalendarEvent) => {
    if ('type' in event.resource && event.resource.type === 'leave') {
      const leaveEvent = event.resource as LeaveEvent;
      const startDate = moment(event.start).format('DD/MM/YYYY');
      const endDate = moment(event.end).format('DD/MM/YYYY');
      return `${leaveEvent.employee_name} - ${leaveEvent.leave_type}\nDal ${startDate} al ${endDate}\nGiorni: ${leaveEvent.days_requested}`;
    } else {
      const vehicleEvent = event.resource as VehicleSchedule;
      const dueDate = moment(vehicleEvent.data_scadenza).format('DD/MM/YYYY');
      return `${vehicleEvent.vehicle?.targa} - ${vehicleEvent.schedule_type}\nScadenza: ${dueDate}\nStato: ${vehicleEvent.status}`;
    }
  };

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

    // Se è un evento leave, non permettere il drag
    if ('type' in event.resource && event.resource.type === 'leave') {
      setDragFeedback('Gli eventi di assenza non possono essere spostati dal calendario');
      setTimeout(() => setDragFeedback(''), 3000);
      return;
    }
    
    try {
      setDragFeedback('Aggiornamento in corso...');
      
      const vehicleSchedule = event.resource as VehicleSchedule;
      const scheduleId = vehicleSchedule.id;
      const newDate = start.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      // Determina quale campo aggiornare basandosi sulla logica esistente
      const updateData: any = {};
      
      // Se l'evento ha booking_date, aggiorna quello, altrimenti data_scadenza
      if (vehicleSchedule.booking_date && vehicleSchedule.booking_date.trim() !== '') {
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

  const eventStyleGetter = (event: CalendarEvent) => {
    const resource = event.resource;
    
    // Gestisci eventi ferie
    if ('type' in resource && resource.type === 'leave') {
      const leaveResource = resource as LeaveEvent;
      
      switch (leaveResource.leave_type) {
        case 'ferie':
          return {
            style: {
              backgroundColor: '#17a2b8 !important',
              borderColor: '#17a2b8 !important',
              color: 'white !important',
              border: '2px solid #17a2b8 !important'
            },
            className: 'force-cyan-event'
          };
        case 'malattia':
          return {
            style: {
              backgroundColor: '#e83e8c !important',
              borderColor: '#e83e8c !important',
              color: 'white !important',
              border: '2px solid #e83e8c !important'
            },
            className: 'force-pink-event'
          };
        case 'permesso':
          return {
            style: {
              backgroundColor: '#795548 !important',
              borderColor: '#795548 !important',
              color: 'white !important',
              border: '2px solid #795548 !important'
            },
            className: 'force-brown-event'
          };
        default:
          return {
            style: {
              backgroundColor: '#17a2b8 !important',
              borderColor: '#17a2b8 !important',
              color: 'white !important',
              border: '2px solid #17a2b8 !important'
            },
            className: 'force-cyan-event'
          };
      }
    }
    
    // Gestisci eventi veicoli (logica esistente)
    const schedule = resource as VehicleSchedule;
    
    // Calcola i giorni di differenza dalla data di scadenza
    const eventDate = schedule.booking_date && schedule.booking_date.trim() !== '' 
      ? new Date(schedule.booking_date) 
      : new Date(schedule.data_scadenza);
    const today = new Date();
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
            <h1 className="h3 mb-0">📅 Calendario Integrato</h1>
            <div className="btn-group">
              <Link href="/vehicles/schedules/new" className="btn btn-outline-primary">
                <i className="fas fa-plus me-1"></i>
                Nuova Scadenza
              </Link>
              <Link href="/vehicles/schedules" className="btn btn-outline-primary">
                <i className="fas fa-list me-1"></i>
                Vista Lista
              </Link>
              <Link href="/vehicles" className="btn btn-outline-primary">
                <i className="fas fa-arrow-left me-2"></i>
                  Dashboard Veicoli
              </Link>
            </div>
          </div>

          {/* Filtri e Legenda Unificati */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title mb-3">🎛️ Filtri e Legenda</h6>
              
              {/* Prima riga: Filtri a sinistra, Legenda Eventi Veicoli a destra */}
              <div className="row mb-3">
                {/* Colonna Filtri */}
                <div className="col-lg-3 col-md-4 mb-3 mb-lg-0">
                  <h6 className="text-muted mb-2">Filtri Visualizzazione</h6>
                  <div className="d-flex flex-column gap-2">
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="showVehicleEvents"
                        checked={showVehicleEvents}
                        onChange={(e) => setShowVehicleEvents(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="showVehicleEvents">
                        🚗 Eventi Veicoli
                      </label>
                    </div>
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="showLeaveEvents"
                        checked={showLeaveEvents}
                        onChange={(e) => setShowLeaveEvents(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="showLeaveEvents">
                        🏖️ Eventi Ferie Dipendenti
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Colonna Legenda Eventi Veicoli */}
                <div className="col-lg-9 col-md-8">
                  <h6 className="text-muted mb-2">🚗 Legenda Eventi Veicoli</h6>
                  <div className="row g-2">
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="d-flex align-items-center justify-content-center p-2 border rounded">
                        <span className="badge bg-danger me-2">🔴</span>
                        <small className="fw-medium">Scadute</small>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="d-flex align-items-center justify-content-center p-2 border rounded">
                        <span className="badge me-2" style={{backgroundColor: '#fd7e14', color: 'white'}}>🟠</span>
                        <small className="fw-medium">Priorità alta</small>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="d-flex align-items-center justify-content-center p-2 border rounded">
                        <span className="badge bg-warning me-2">🟡</span>
                        <small className="fw-medium">7 giorni</small>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="d-flex align-items-center justify-content-center p-2 border rounded">
                        <span className="badge me-2" style={{backgroundColor: '#6f42c1', color: 'white'}}>🟣</span>
                        <small className="fw-medium">30 giorni</small>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="d-flex align-items-center justify-content-center p-2 border rounded">
                        <span className="badge bg-success me-2">🟢</span>
                        <small className="fw-medium">Completate</small>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="d-flex align-items-center justify-content-center p-2 border rounded">
                        <span className="badge bg-secondary me-2">⚫</span>
                        <small className="fw-medium">Annullate</small>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="d-flex align-items-center justify-content-center p-2 border rounded">
                        <span className="badge me-2" style={{backgroundColor: '#3174ad', color: 'white'}}>🔵</span>
                        <small className="fw-medium">Standard</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Seconda riga: Legenda Eventi Ferie */}
              <div className="row">
                <div className="col-12">
                  <h6 className="text-muted mb-2">🏖️ Legenda Eventi Ferie Dipendenti</h6>
                  <div className="d-flex flex-wrap justify-content-center gap-3">
                    <div className="d-flex align-items-center p-2 border rounded">
                      <span className="badge me-2" style={{backgroundColor: '#17a2b8', color: 'white'}}>🏖️</span>
                      <span className="fw-medium">Ferie</span>
                    </div>
                    <div className="d-flex align-items-center p-2 border rounded">
                      <span className="badge me-2" style={{backgroundColor: '#e83e8c', color: 'white'}}>🤒</span>
                      <span className="fw-medium">Malattia</span>
                    </div>
                    <div className="d-flex align-items-center p-2 border rounded">
                      <span className="badge me-2" style={{backgroundColor: '#795548', color: 'white'}}>📝</span>
                      <span className="fw-medium">Permesso</span>
                    </div>
                  </div>
                </div>
              </div>
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
                  titleAccessor={(event: CalendarEvent) => getEventTooltip(event)}
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
                    showMore: (total: number) => `+ Altri ${total}`
                  }}
                  formats={{
                    monthHeaderFormat: 'MMMM YYYY',
                    dayHeaderFormat: 'dddd DD/MM',
                    dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => 
                      `${moment(start).format('DD/MM')} - ${moment(end).format('DD/MM/YYYY')}`,
                    agendaDateFormat: 'DD/MM/YYYY',
                    agendaTimeFormat: 'HH:mm',
                    agendaTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) => 
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
                  {('type' in selectedEvent.resource && selectedEvent.resource.type === 'leave') ? (
                    <>🏖️ Dettagli Ferie - {(selectedEvent.resource as LeaveEvent).employee_name}</>
                  ) : (
                    <>🚗 Dettagli Scadenza - {(selectedEvent.resource as VehicleSchedule).vehicle?.targa}</>
                  )}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {('type' in selectedEvent.resource && selectedEvent.resource.type === 'leave') ? (
                  // Modal per eventi ferie
                  <>
                    <div className="row">
                      <div className="col-md-6">
                        <h6>Informazioni Dipendente</h6>
                        <p><strong>Nome:</strong> {(selectedEvent.resource as LeaveEvent).employee_name}</p>
                        <p><strong>ID Dipendente:</strong> {(selectedEvent.resource as LeaveEvent).employee_id}</p>
                      </div>
                      <div className="col-md-6">
                        <h6>Dettagli Ferie</h6>
                        <p><strong>Tipo:</strong> {(selectedEvent.resource as LeaveEvent).leave_type}</p>
                        <p><strong>Giorni Richiesti:</strong> {(selectedEvent.resource as LeaveEvent).days_requested}</p>
                        <p><strong>Data Inizio:</strong> {moment(selectedEvent.start).format('DD/MM/YYYY')}</p>
                        <p><strong>Data Fine:</strong> {moment(selectedEvent.end).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>
                    {(selectedEvent.resource as LeaveEvent).reason && (
                      <div className="mt-3">
                        <h6>Motivo</h6>
                        <p className="text-muted">{(selectedEvent.resource as LeaveEvent).reason}</p>
                      </div>
                    )}
                    {(selectedEvent.resource as LeaveEvent).approved_by && (
                      <div className="mt-3">
                        <h6>Approvazione</h6>
                        <p><strong>Approvato da:</strong> {(selectedEvent.resource as LeaveEvent).approved_by}</p>
                        {(selectedEvent.resource as LeaveEvent).approved_at && (
                          <p><strong>Data Approvazione:</strong> {moment((selectedEvent.resource as LeaveEvent).approved_at).format('DD/MM/YYYY HH:mm')}</p>
                        )}
                      </div>
                    )}
                    {(selectedEvent.resource as LeaveEvent).notes && (
                      <div className="mt-3">
                        <h6>Note</h6>
                        <p className="text-muted">{(selectedEvent.resource as LeaveEvent).notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  // Modal per eventi veicoli (esistente)
                  <>
                    <div className="row">
                      <div className="col-md-6">
                        <h6>Informazioni Veicolo</h6>
                        <p><strong>Targa:</strong> {(selectedEvent.resource as VehicleSchedule).vehicle?.targa}</p>
                        <p><strong>Marca:</strong> {(selectedEvent.resource as VehicleSchedule).vehicle?.marca}</p>
                        <p><strong>Modello:</strong> {(selectedEvent.resource as VehicleSchedule).vehicle?.modello}</p>
                      </div>
                      <div className="col-md-6">
                        <h6>Dettagli Scadenza</h6>
                        <p><strong>Tipo:</strong> {(selectedEvent.resource as VehicleSchedule).schedule_type}</p>
                        <p><strong>Descrizione:</strong> {(selectedEvent.resource as VehicleSchedule).description}</p>
                        <p><strong>Data Scadenza:</strong> {moment((selectedEvent.resource as VehicleSchedule).data_scadenza).format('DD/MM/YYYY')}</p>
                        {(selectedEvent.resource as VehicleSchedule).booking_date && (
                          <p><strong>Data Prenotazione:</strong> {moment((selectedEvent.resource as VehicleSchedule).booking_date).format('DD/MM/YYYY')}</p>
                        )}
                      </div>
                    </div>
                    <div className="row mt-3">
                      <div className="col-md-6">
                        <p>
                          <strong>Stato:</strong> 
                          <span className={`badge ${getStatusBadge((selectedEvent.resource as VehicleSchedule).status)} ms-2`}>
                            {(selectedEvent.resource as VehicleSchedule).status}
                          </span>
                        </p>
                        <p>
                          <strong>Priorità:</strong> 
                          <span className={`badge ${getPriorityBadge((selectedEvent.resource as VehicleSchedule).priority)} ms-2`}>
                            {(selectedEvent.resource as VehicleSchedule).priority}
                          </span>
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Costo Stimato:</strong> {formatCurrency((selectedEvent.resource as VehicleSchedule).cost_estimate)}</p>
                      </div>
                    </div>
                    {(selectedEvent.resource as VehicleSchedule).notes && (
                      <div className="mt-3">
                        <h6>Note</h6>
                        <p className="text-muted">{(selectedEvent.resource as VehicleSchedule).notes}</p>
                      </div>
                    )}
                  </>
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
                {!('type' in selectedEvent.resource && selectedEvent.resource.type === 'leave') && (
                  <>
                    <Link 
                      href={`/vehicles/schedules/${(selectedEvent.resource as VehicleSchedule).id}`}
                      className="btn btn-primary"
                    >
                      Visualizza Dettagli
                    </Link>
                    <Link 
                      href={`/vehicles/schedules/${(selectedEvent.resource as VehicleSchedule).id}/edit`}
                      className="btn btn-danger"
                    >
                      Modifica
                    </Link>
                  </>
                )}
                {('type' in selectedEvent.resource && selectedEvent.resource.type === 'leave') && (
                  <Link 
                    href="/gestione/employees/ferie"
                    className="btn btn-primary"
                  >
                    Gestione Ferie
                  </Link>
                )}
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