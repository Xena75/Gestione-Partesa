'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, Package, Truck, Calendar, AlertTriangle, CheckCircle, 
  FileText, Clock, Home, BarChart3, DollarSign, Upload, 
  Settings, Database, Shield, Bell, Search, Plus,
  TrendingUp, TrendingDown, Activity, Zap, RefreshCw, Tag, HelpCircle, Car, Eye, Construction,
  ChevronDown, ChevronUp, Building2
} from 'lucide-react';
import PodMancantiModal from '@/components/PodMancantiModal';
import TravelsNotInTabModal from '@/components/TravelsNotInTabModal';
import DocumentExpiryAlert from '@/components/DocumentExpiryAlert';

import { useAuth } from '@/contexts/AuthContext';

// Interfacce per i dati
interface Stat {
  title: string;
  value: number | string;
  trend: number;
  icon: string;
}

interface DashboardData {
  anagrafiche: Stat[];
  analytics: Stat[];
  fatturazione: Stat[];
  import: Stat[];
  veicoli: Stat[];
  sistema: Stat[];
  supporto: Stat[];
  viaggi: Stat[];
}

export default function ModernDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState(3);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Funzione per convertire date italiane (dd/mm/yyyy) in oggetti Date validi
  const parseItalianDate = (dateString: string): Date => {
    if (!dateString) return new Date();
    
    // Se la data è già in formato ISO (yyyy-mm-dd), usala direttamente
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateString);
    }
    
    // Se la data è in formato italiano (dd/mm/yyyy), convertila
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateString.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback: prova a parsare direttamente
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // Funzione per formattare una data in formato italiano
  const formatItalianDate = (dateString: string): string => {
    try {
      const date = parseItalianDate(dateString);
      return date.toLocaleDateString('it-IT');
    } catch (error) {
      console.error('Errore nella formattazione della data:', dateString, error);
      return 'Data non valida';
    }
  };

  // Funzione per ottenere il giorno della settimana in italiano
  const getItalianWeekday = (dateString: string): string => {
    try {
      const date = parseItalianDate(dateString);
      return date.toLocaleDateString('it-IT', { weekday: 'short' });
    } catch (error) {
      return '';
    }
  };
  
  // Stati toggle per ogni card
  const [toggleStates, setToggleStates] = useState({
    anagrafiche: false,
    analytics: false,
    fatturazione: false,
    import: false,
    veicoli: false,
    supporto: false,
    viaggi: false,
    sistema: false
  });

  // Stati toggle per le sezioni principali
  const [sectionToggleStates, setSectionToggleStates] = useState({
    avvisi: true,
    dashboard: true
  });

  // Funzione per toggle delle statistiche
  const toggleStats = (cardName: keyof typeof toggleStates) => {
    setToggleStates(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  // Funzione per toggle delle sezioni principali
  const toggleSection = (sectionName: keyof typeof sectionToggleStates) => {
    setSectionToggleStates(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Funzione per toggle globale di tutte le statistiche
  const toggleAllStats = () => {
    const allExpanded = Object.values(toggleStates).every(state => state);
    const newState = !allExpanded; // Se tutte espanse, collassa; altrimenti espandi
    
    setToggleStates({
      anagrafiche: newState,
      analytics: newState,
      fatturazione: newState,
      import: newState,
      veicoli: newState,
      supporto: newState,
      viaggi: newState,
      sistema: newState
    });
  };

  // Determina se tutte le card sono espanse
  const allExpanded = Object.values(toggleStates).every(state => state);
  
  // Stati per i modal
  const [isPodMancantiModalOpen, setIsPodMancantiModalOpen] = useState(false);
  const [isTravelsNotInTabModalOpen, setIsTravelsNotInTabModalOpen] = useState(false);

  // Stati per i loading dei pulsanti di sincronizzazione
  const [isSyncingTerzisti, setIsSyncingTerzisti] = useState(false);
  const [isSyncingDipendenti, setIsSyncingDipendenti] = useState(false);

  // Stato per le richieste ferie in attesa
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number>(0);
  const [isLoadingLeaveCount, setIsLoadingLeaveCount] = useState(true);

  // Stati per le manutenzioni
  const [expiredMaintenanceCount, setExpiredMaintenanceCount] = useState<number>(0);
  const [expiringMaintenanceCount, setExpiringMaintenanceCount] = useState<number>(0);
  const [isLoadingMaintenanceData, setIsLoadingMaintenanceData] = useState(true);
  const [maintenanceData, setMaintenanceData] = useState<any[]>([]);
  
  // Stati per i modal delle manutenzioni
  const [isExpiredMaintenanceModalOpen, setIsExpiredMaintenanceModalOpen] = useState(false);
  const [isExpiringMaintenanceModalOpen, setIsExpiringMaintenanceModalOpen] = useState(false);

  // Stati per il modal delle richieste ferie
  const [isLeaveRequestsModalOpen, setIsLeaveRequestsModalOpen] = useState(false);
  const [leaveRequestsData, setLeaveRequestsData] = useState<any[]>([]);
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(false);

  // Stati per le scadenze programmate
  const [criticalSchedulesCount, setCriticalSchedulesCount] = useState<number>(0);
  const [approachingSchedulesCount, setApproachingSchedulesCount] = useState<number>(0);
  const [isLoadingSchedulesData, setIsLoadingSchedulesData] = useState(true);
  const [schedulesData, setSchedulesData] = useState<any[]>([]);
  
  // Stati per i modal delle scadenze programmate
  const [isCriticalSchedulesModalOpen, setIsCriticalSchedulesModalOpen] = useState(false);
  const [isApproachingSchedulesModalOpen, setIsApproachingSchedulesModalOpen] = useState(false);

  // Aggiorna l'orologio ogni secondo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Carica i dati reali dal database e gestisce auto-refresh
  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchDashboardData = async () => {
      try {
        if (signal.aborted) return;
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/dashboard-stats', { signal });
        if (!response.ok) {
          throw new Error('Errore nel caricamento delle statistiche');
        }
        
        const data = await response.json();
        if (!signal.aborted) {
          setDashboardData(data);
        }
      } catch (err: any) {
        if (!signal.aborted && err.name !== 'AbortError') {
          console.error('Errore nel fetch dei dati dashboard:', err);
          setError('Errore nel caricamento dei dati. Riprova più tardi.');
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const fetchPendingLeaveRequests = async () => {
      try {
        if (signal.aborted) return;
        setIsLoadingLeaveCount(true);
        
        const response = await fetch('/api/employees/leave?status=pending', { signal });
        
        if (response.ok && !signal.aborted) {
          const data = await response.json();
          
          // L'API restituisce un array in data.data, non un count
          const pendingCount = data.data ? data.data.length : 0;
          
          setPendingLeaveCount(pendingCount);
        }
      } catch (err: any) {
        if (!signal.aborted && err.name !== 'AbortError') {
          console.error('Errore nel fetch delle richieste ferie:', err);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingLeaveCount(false);
        }
      }
    };

    const fetchMaintenanceData = async () => {
      try {
        if (signal.aborted) return;
        setIsLoadingMaintenanceData(true);
        
        const response = await fetch('/api/vehicles/maintenance-monitoring', { signal });
        
        if (response.ok && !signal.aborted) {
          const data = await response.json();
          
          // L'API restituisce direttamente { vehicles: [], stats: {} }
          if (data.vehicles && data.stats) {
            setMaintenanceData(data.vehicles);
            
            // Usa le statistiche dall'API
            setExpiredMaintenanceCount(data.stats.veicoli_scaduti || 0);
            setExpiringMaintenanceCount(data.stats.veicoli_in_scadenza || 0);
          }
        }
      } catch (err: any) {
        if (!signal.aborted && err.name !== 'AbortError') {
          console.error('Errore nel fetch dei dati manutenzione:', err);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingMaintenanceData(false);
        }
      }
    };

    const fetchSchedulesData = async () => {
      try {
        if (signal.aborted) return;
        setIsLoadingSchedulesData(true);
        
        const response = await fetch('/api/vehicles/schedules/expiring?days=30', { signal });
        
        if (response.ok && !signal.aborted) {
          const data = await response.json();
          
          if (data.success && data.schedules) {
            setSchedulesData(data.schedules);
            
            // Calcola i conteggi per scadenze critiche (≤7 giorni) e in avvicinamento (8-30 giorni)
            const critical = data.schedules.filter((schedule: any) => schedule.days_until_expiry <= 7).length;
            const approaching = data.schedules.filter((schedule: any) => schedule.days_until_expiry > 7 && schedule.days_until_expiry <= 30).length;
            
            setCriticalSchedulesCount(critical);
            setApproachingSchedulesCount(approaching);
          }
        }
      } catch (err: any) {
        if (!signal.aborted && err.name !== 'AbortError') {
          console.error('Errore nel fetch dei dati scadenze programmate:', err);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingSchedulesData(false);
        }
      }
    };

    const fetchAllData = async () => {
      await Promise.all([
        fetchDashboardData(),
        fetchPendingLeaveRequests(),
        fetchMaintenanceData(),
        fetchSchedulesData()
      ]);
    };

    // Caricamento iniziale
    fetchAllData();

    // Auto-refresh ogni 5 minuti
    const refreshTimer = setInterval(async () => {
      if (signal.aborted) return;

      try {
        await fetchAllData();
        console.log('Dashboard data refreshed');
      } catch (err: any) {
        if (!signal.aborted && err.name !== 'AbortError') {
          console.error('Errore nel refresh automatico:', err);
        }
      }
    }, 300000); // 5 minuti

    // Cleanup function per cancellare le richieste quando il componente viene smontato
    return () => {
      abortController.abort();
      clearInterval(refreshTimer);
    };
  }, []);

  // Funzione per sincronizzare i dati dei terzisti (copiata da pagina viaggi)
  const handleSyncTerzisti = async () => {
    if (!confirm('Questa operazione sincronizzerà i dati dei TERZISTI degli ultimi 5 giorni e richiederà pochi secondi. Continuare?')) {
      return;
    }
    
    setIsSyncingTerzisti(true);
    try {
      const response = await fetch('/api/viaggi/sync-tab-terzisti?days=5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('Errore sincronizzazione terzisti:', error);
      alert('❌ Errore durante la sincronizzazione dei terzisti');
    } finally {
      setIsSyncingTerzisti(false);
    }
  };

  // Funzione per sincronizzare i dati dei dipendenti (copiata da pagina viaggi)
  const handleSyncDipendenti = async () => {
    if (!confirm('Questa operazione sincronizzerà i dati degli ultimi 5 giorni e richiederà pochi secondi. Continuare?')) {
      return;
    }
    
    setIsSyncingDipendenti(true);
    try {
      const response = await fetch('/api/viaggi/sync-tab-viaggi?days=5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('Errore sincronizzazione dipendenti:', error);
      alert('❌ Errore durante la sincronizzazione dei dipendenti');
    } finally {
      setIsSyncingDipendenti(false);
    }
  };

  // Funzione per aprire il modal delle richieste ferie
  const handleOpenLeaveRequestsModal = async () => {
    setIsLeaveRequestsModalOpen(true);
    
    // Fetch dei dati delle richieste ferie
    try {
      setIsLoadingLeaveRequests(true);
      
      const response = await fetch('/api/employees/leave?status=pending');
      
      if (response.ok) {
        const data = await response.json();
        setLeaveRequestsData(data.data || []);
      } else {
        console.error('Errore nel caricamento delle richieste ferie:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Errore nel fetch dei dettagli richieste ferie:', err);
    } finally {
      setIsLoadingLeaveRequests(false);
    }
  };

  // Effetti parallax e animazioni
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setMousePosition({ x, y });
  };

  const AnimatedCounter = ({ value }: { value: number | string }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const [isAnimated, setIsAnimated] = useState(false);
    
    useEffect(() => {
      if (typeof value === 'number' && value > 0) {
        const duration = 1000;
        const steps = 60;
        const increment = value / steps;
        let current = 0;
        
        const timer = setInterval(() => {
          current += increment;
          if (current >= value) {
            setDisplayValue(value);
            setIsAnimated(true);
            clearInterval(timer);
          } else {
            setDisplayValue(Math.floor(current));
          }
        }, duration / steps);
        
        return () => clearInterval(timer);
      } else {
        setDisplayValue(typeof value === 'number' ? value : 0);
      }
    }, [value]);
    
    return (
      <span className={`stat-value ${isAnimated ? 'animate' : ''}`}>
        {typeof value === 'number' ? displayValue.toLocaleString('it-IT') : value}
      </span>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <h4 className="text-muted">Caricamento dati reali dal database...</h4>
            <p className="text-muted">Recupero statistiche aggiornate...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard-container">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <div className="text-center">
            <AlertTriangle className="text-danger mb-3" size={48} />
            <h4 className="text-danger">Errore nel caricamento</h4>
            <p className="text-muted">{error}</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Ricarica Pagina
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="dashboard-container">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <div className="text-center">
            <Database className="text-warning mb-3" size={48} />
            <h4 className="text-warning">Nessun dato disponibile</h4>
            <p className="text-muted">I dati del dashboard non sono disponibili al momento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .dashboard-card {
          transition: all 0.3s ease;
          border: none;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          overflow: hidden;
          min-height: 200px;
        }
        
        .dashboard-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .card-header-gradient {
          background: linear-gradient(135deg, var(--bs-primary), var(--bs-primary-dark));
          border: none;
          padding: 1.5rem;
        }
        
        .card-header-purple {
          background: linear-gradient(135deg, #6f42c1, #8e44ad);
        }
        
        .card-header-blue {
          background: linear-gradient(135deg, #0d6efd, #0056b3);
        }
        
        .card-header-green {
          background: linear-gradient(135deg, #198754, #146c43);
        }
        
        .card-header-cyan {
          background: linear-gradient(135deg, #0dcaf0, #0aa2c0);
        }
        
        .card-header-orange {
          background: linear-gradient(135deg, #fd7e14, #e55a00);
        }
        
        .card-header-red {
          background: linear-gradient(135deg, #dc3545, #b02a37);
        }
        
        .stat-row {
          transition: all 0.2s ease;
          border-radius: 8px;
          margin: 2px 0;
        }
        
        .stat-row:hover {
          background-color: rgba(0,0,0,0.02);
          transform: translateX(5px);
        }
        
        .trend-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
        }
        
        .btn-action {
          transition: all 0.2s ease;
          border-radius: 8px;
          font-weight: 500;
        }
        
        .btn-action:hover {
          transform: scale(1.05);
        }
        
        

        
        .search-box {
          border-radius: 25px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .search-box:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
        }
        
        .notification-badge {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .icon-spin {
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
           from { transform: rotate(0deg); }
           to { transform: rotate(360deg); }
         }
         
         .toggle-btn {
           background: none;
           border: none;
           color: white;
           cursor: pointer;
           padding: 0.25rem;
           border-radius: 4px;
           transition: all 0.2s ease;
         }
         
         .toggle-btn:hover {
           background-color: rgba(255, 255, 255, 0.1);
         }
         
         .stats-container {
           transition: all 0.4s ease;
           overflow: hidden;
         }
         
         .stats-collapsed {
           max-height: 0 !important;
           opacity: 0;
           margin: 0 !important;
           padding: 0 !important;
           border: none !important;
         }
         
         .stats-expanded {
           max-height: 500px;
           opacity: 1;
         }
         
         .card-body-collapsed {
           padding-bottom: 1rem !important;
         }
         
         .card-collapsed {
           height: 350px !important;
           transition: height 0.4s ease;
         }
         
         .dashboard-card {
           transition: height 0.4s ease;
         }
         
         /* Soft Elevation Styles */
         .dashboard-card-soft {
           border-radius: 12px !important;
           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
           border: 1px solid rgba(255, 255, 255, 0.1) !important;
           transition: all 0.2s ease-in-out !important;
           backdrop-filter: blur(10px);
         }
         
         .dashboard-card-soft:hover {
           transform: translateY(-2px) rotateX(2deg) rotateY(1deg) !important;
           box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12), 0 0 20px var(--glow-color, rgba(0, 123, 255, 0.3)) !important;
           border: 1px solid var(--glow-color, rgba(0, 123, 255, 0.5)) !important;
         }
         
         .card-header-soft {
           border-radius: 12px 12px 0 0 !important;
           background: linear-gradient(135deg, var(--header-color), var(--header-color-light)) !important;
           border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
         }
         
         .card-header-purple-soft {
           --header-color: #6f42c1;
           --header-color-light: #8a63d2;
           --glow-color: rgba(111, 66, 193, 0.4);
         }
         
         .card-header-blue-soft {
           --header-color: #0d6efd;
           --header-color-light: #3d8bfd;
           --glow-color: rgba(13, 110, 253, 0.4);
         }
         
         .card-header-green-soft {
           --header-color: #198754;
           --header-color-light: #20c997;
           --glow-color: rgba(25, 135, 84, 0.4);
         }
         
         .card-header-cyan-soft {
           --header-color: #0dcaf0;
           --header-color-light: #3dd5f3;
           --glow-color: rgba(13, 202, 240, 0.4);
         }
         
         .card-header-orange-soft {
           --header-color: #fd7e14;
           --header-color-light: #fd9843;
           --glow-color: rgba(253, 126, 20, 0.4);
         }
         
         .card-header-red-soft {
           --header-color: #dc3545;
           --header-color-light: #e15759;
           --glow-color: rgba(220, 53, 69, 0.4);
         }
         
         .card-body-soft {
           background: rgba(255, 255, 255, 0.95);
           backdrop-filter: blur(10px);
           position: relative;
           overflow: hidden;
         }
         
         /* Gradiente animato di sfondo */
         .card-body-soft::before {
           content: '';
           position: absolute;
           top: 0;
           left: -100%;
           width: 100%;
           height: 100%;
           background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
           animation: shimmer 3s infinite;
           z-index: 0;
         }
         
         @keyframes shimmer {
           0% { left: -100%; }
           100% { left: 100%; }
         }
         
         /* Effetto breathing per i badge */
         .trend-badge {
           animation: breathing 2s ease-in-out infinite;
         }
         
         @keyframes breathing {
           0%, 100% { transform: scale(1); opacity: 1; }
           50% { transform: scale(1.05); opacity: 0.9; }
         }
         
         /* Animazione contatori */
         .stat-value {
           transition: all 0.3s ease;
         }
         
         .stat-value.animate {
           animation: countUp 1s ease-out;
         }
         
         @keyframes countUp {
           0% { transform: scale(0.8); opacity: 0; }
           50% { transform: scale(1.1); }
           100% { transform: scale(1); opacity: 1; }
         }
         
         /* Effetto parallax per le icone */
         .icon-parallax {
           transition: transform 0.1s ease-out;
         }
         
         /* Particelle fluttuanti */
         .floating-particles {
           position: absolute;
           top: 0;
           left: 0;
           width: 100%;
           height: 100%;
           pointer-events: none;
           overflow: hidden;
         }
         
         .particle {
           position: absolute;
           width: 4px;
           height: 4px;
           background: var(--glow-color, rgba(0, 123, 255, 0.3));
           border-radius: 50%;
           animation: float 6s infinite ease-in-out;
         }
         
         .particle:nth-child(1) { top: 10%; left: 10%; animation-delay: 0s; }
         .particle:nth-child(2) { top: 20%; right: 10%; animation-delay: 1s; }
         .particle:nth-child(3) { bottom: 10%; left: 15%; animation-delay: 2s; }
         .particle:nth-child(4) { bottom: 20%; right: 15%; animation-delay: 3s; }
         
         @keyframes float {
           0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
           25% { transform: translateY(-10px) rotate(90deg); opacity: 0.6; }
           50% { transform: translateY(-5px) rotate(180deg); opacity: 0.8; }
           75% { transform: translateY(-15px) rotate(270deg); opacity: 0.6; }
         }
      `}</style>

      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content d-flex justify-content-between align-items-center">
            <div className="header-info">
              <h1 className="dashboard-title">Partesa Hub</h1>
              <p className="dashboard-subtitle">
                Benvenuto, <strong>{user?.username || 'Utente'}</strong>! 
                <span className="user-role">{user?.role || 'Utente'}</span>
              </p>
            </div>
            
            {/* Barra di Ricerca al Centro */}
            <div className="header-search w-50 mx-3">
              <div className="position-relative">
                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={20} />
                <input
                  type="text"
                  className="form-control search-box ps-5 py-2"
                  placeholder="Cerca funzionalità, reports, veicoli..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="header-right">
              <div className="header-badges-large" style={{justifyContent: 'flex-end'}}>
                <span className="header-badge-large datetime">
                  <Calendar size={18} />
                  <span style={{fontSize: '1.1rem', fontWeight: '600'}}>{currentTime.toLocaleDateString('it-IT')}</span>
                </span>
                <span className="header-badge-large datetime">
                  <Clock size={18} />
                  <span style={{fontSize: '1.1rem', fontWeight: '600'}}>{currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione Toggle Globale e Dashboard */}
        <div className="container-fluid mb-4">
          <div className="row">
            <div className="col-12 d-flex justify-content-between align-items-center">
              {/* Toggle Espandi/Comprimi */}
              <button 
                className="btn btn-outline-primary d-flex align-items-center px-4 py-2"
                onClick={toggleAllStats}
                title={allExpanded ? "Comprimi tutte le statistiche" : "Espandi tutte le statistiche"}
                style={{
                  borderRadius: '25px',
                  fontWeight: '500',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                {allExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                <span className="ms-2">
                  {allExpanded ? "Comprimi Statistiche" : "Espandi Statistiche"}
                </span>
              </button>


            </div>
          </div>
        </div>

        {/* Alert Scadenze Documenti */}
        <DocumentExpiryAlert className="mb-4" />

        {/* Sezione Avvisi e Notifiche */}
        {(pendingLeaveCount > 0 || expiredMaintenanceCount > 0 || expiringMaintenanceCount > 0 || criticalSchedulesCount > 0 || approachingSchedulesCount > 0) && (
          <div className="container-fluid mb-4">
            <div className="row">
              <div className="col-12">
                <h5 className="mb-3 d-flex align-items-center justify-content-between" style={{
                  color: '#495057',
                  fontWeight: '600',
                  fontSize: '1.1rem'
                }}>
                  <div className="d-flex align-items-center">
                    <Bell className="me-2" size={20} style={{ color: '#ff6b35' }} />
                    Avvisi e Notifiche
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                    onClick={() => toggleSection('avvisi')}
                    title={sectionToggleStates.avvisi ? "Nascondi sezione" : "Mostra sezione"}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#6c757d',
                      fontSize: '0.8rem'
                    }}
                  >
                    {sectionToggleStates.avvisi ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </h5>
                
                {sectionToggleStates.avvisi && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  paddingBottom: '10px',
                  maxWidth: '100%'
                }}>
                  {/* Card Richieste Ferie - Design Glassmorphism */}
                  {pendingLeaveCount > 0 && (
                  <div>
                      <div 
                        className="card"
                        style={{
                          background: 'rgba(255, 107, 53, 0.15)',
                          backdropFilter: 'blur(15px)',
                          WebkitBackdropFilter: 'blur(15px)',
                          border: '1px solid rgba(255, 107, 53, 0.3)',
                          borderRadius: '20px',
                          minHeight: '120px',
                          boxShadow: '0 8px 32px rgba(255, 107, 53, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onClick={handleOpenLeaveRequestsModal}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 16px 48px rgba(255, 107, 53, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                          e.currentTarget.style.backdropFilter = 'blur(20px)';
                          e.currentTarget.style.background = 'rgba(255, 107, 53, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 53, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.backdropFilter = 'blur(15px)';
                          e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                        }}
                      >
                        {/* Effetto di sfondo glassmorphism */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,107,53,0.1) 100%)',
                          borderRadius: '20px',
                          pointerEvents: 'none'
                        }}></div>
                        
                        {/* Riflesso glassmorphism */}
                        <div style={{
                          position: 'absolute',
                          top: '0',
                          left: '0',
                          width: '100%',
                          height: '50%',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                          borderRadius: '20px 20px 0 0',
                          pointerEvents: 'none'
                        }}></div>
                        
                        <div className="card-body p-4" style={{ position: 'relative', zIndex: 2 }}>
                          <div className="d-flex align-items-center justify-content-between h-100">
                            {/* Sezione sinistra con icona e testo */}
                            <div className="d-flex align-items-center flex-grow-1">
                              <div 
                                className="me-3"
                                style={{
                                  background: 'rgba(255, 107, 53, 0.2)',
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  border: '1px solid rgba(255, 107, 53, 0.3)',
                                  borderRadius: '16px',
                                  padding: '14px',
                                  boxShadow: '0 4px 16px rgba(255, 107, 53, 0.2)'
                                }}
                              >
                                <Calendar size={24} style={{ color: '#ff6b35' }} />
                              </div>
                              <div>
                                <h6 className="mb-1" style={{ 
                                  fontSize: '1rem', 
                                  fontWeight: '700',
                                  color: '#2d3748',
                                  textShadow: 'none'
                                }}>
                                  Richieste Ferie
                                </h6>
                                <p className="mb-0" style={{ 
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  color: '#4a5568'
                                }}>
                                  In attesa di approvazione
                                </p>
                              </div>
                            </div>
                            
                            {/* Conteggio prominente a destra */}
                            <div className="text-end">
                              <div 
                                style={{
                                  background: 'rgba(255, 255, 255, 0.9)',
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  color: '#ff6b35',
                                  border: '1px solid rgba(255, 107, 53, 0.2)',
                                  borderRadius: '18px',
                                  padding: '10px 18px',
                                  fontSize: '1.8rem',
                                  fontWeight: '900',
                                  lineHeight: '1',
                                  minWidth: '65px',
                                  textAlign: 'center',
                                  boxShadow: '0 6px 20px rgba(255, 107, 53, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                                }}
                              >
                                {isLoadingLeaveCount ? (
                                  <div 
                                    className="spinner-border" 
                                    role="status" 
                                    style={{ 
                                      width: '1.2rem', 
                                      height: '1.2rem',
                                      borderWidth: '2px',
                                      color: '#ff6b35'
                                    }}
                                  >
                                    <span className="visually-hidden">Caricamento...</span>
                                  </div>
                                ) : (
                                  pendingLeaveCount
                                )}
                              </div>
                              <div 
                                className="mt-2"
                                style={{
                                  background: 'rgba(255, 107, 53, 0.15)',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                  border: '1px solid rgba(255, 107, 53, 0.2)',
                                  borderRadius: '10px',
                                  padding: '4px 10px',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  color: '#ff6b35'
                                }}
                              >
                                Nuovo!
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                  </div>
                  )}

                  {/* Card Manutenzioni Scadute - Design Glassmorphism */}
                  {expiredMaintenanceCount > 0 && (
                  <div>
                    <div 
                      className="card"
                      style={{
                        background: 'rgba(220, 53, 69, 0.15)',
                        backdropFilter: 'blur(15px)',
                        WebkitBackdropFilter: 'blur(15px)',
                        border: '1px solid rgba(220, 53, 69, 0.3)',
                        borderRadius: '20px',
                        minHeight: '120px',
                        boxShadow: '0 8px 32px rgba(220, 53, 69, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => setIsExpiredMaintenanceModalOpen(true)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 16px 48px rgba(220, 53, 69, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.backdropFilter = 'blur(20px)';
                        e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(220, 53, 69, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.backdropFilter = 'blur(15px)';
                        e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)';
                      }}
                    >
                      {/* Effetto di sfondo glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(220,53,69,0.1) 100%)',
                        borderRadius: '20px',
                        pointerEvents: 'none'
                      }}></div>
                      
                      {/* Riflesso glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                        borderRadius: '20px 20px 0 0',
                        pointerEvents: 'none'
                      }}></div>
                      
                      <div className="card-body p-4" style={{ position: 'relative', zIndex: 2 }}>
                        <div className="d-flex align-items-center justify-content-between h-100">
                          {/* Sezione sinistra con icona e testo */}
                          <div className="d-flex align-items-center flex-grow-1">
                            <div 
                              className="me-3"
                              style={{
                                background: 'rgba(220, 53, 69, 0.2)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                border: '1px solid rgba(220, 53, 69, 0.3)',
                                borderRadius: '16px',
                                padding: '14px',
                                boxShadow: '0 4px 16px rgba(220, 53, 69, 0.2)'
                              }}
                            >
                              <Construction size={24} style={{ color: '#dc3545' }} />
                            </div>
                            <div>
                              <h6 className="mb-1" style={{ 
                                fontSize: '1rem', 
                                fontWeight: '700',
                                color: '#2d3748',
                                textShadow: 'none'
                              }}>
                                Manutenzioni Scadute
                              </h6>
                              <p className="mb-0" style={{ 
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                color: '#4a5568'
                              }}>
                                Richiedono attenzione immediata
                              </p>
                            </div>
                          </div>
                          
                          {/* Conteggio prominente a destra */}
                          <div className="text-end">
                            <div 
                              style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                color: '#dc3545',
                                border: '1px solid rgba(220, 53, 69, 0.2)',
                                borderRadius: '18px',
                                padding: '10px 18px',
                                fontSize: '1.8rem',
                                fontWeight: '900',
                                lineHeight: '1',
                                minWidth: '65px',
                                textAlign: 'center',
                                boxShadow: '0 6px 20px rgba(220, 53, 69, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                              }}
                            >
                              {isLoadingMaintenanceData ? (
                                <div 
                                  className="spinner-border" 
                                  role="status" 
                                  style={{ 
                                    width: '1.2rem', 
                                    height: '1.2rem',
                                    borderWidth: '2px',
                                    color: '#dc3545'
                                  }}
                                >
                                  <span className="visually-hidden">Caricamento...</span>
                                </div>
                              ) : (
                                expiredMaintenanceCount
                              )}
                            </div>
                            <div 
                              className="mt-2"
                              style={{
                                background: 'rgba(220, 53, 69, 0.15)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid rgba(220, 53, 69, 0.2)',
                                borderRadius: '10px',
                                padding: '4px 10px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: '#dc3545'
                              }}
                            >
                              Urgente!
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Card Manutenzioni in Scadenza - Design Glassmorphism */}
                  {expiringMaintenanceCount > 0 && (
                  <div>
                    <div 
                      className="card"
                      style={{
                        background: 'rgba(253, 126, 20, 0.15)',
                        backdropFilter: 'blur(15px)',
                        WebkitBackdropFilter: 'blur(15px)',
                        border: '1px solid rgba(253, 126, 20, 0.3)',
                        borderRadius: '20px',
                        minHeight: '120px',
                        boxShadow: '0 8px 32px rgba(253, 126, 20, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => setIsExpiringMaintenanceModalOpen(true)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 16px 48px rgba(253, 126, 20, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.backdropFilter = 'blur(20px)';
                        e.currentTarget.style.background = 'rgba(253, 126, 20, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(253, 126, 20, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.backdropFilter = 'blur(15px)';
                        e.currentTarget.style.background = 'rgba(253, 126, 20, 0.15)';
                      }}
                    >
                      {/* Effetto di sfondo glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(253,126,20,0.1) 100%)',
                        borderRadius: '20px',
                        pointerEvents: 'none'
                      }}></div>
                      
                      {/* Riflesso glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                        borderRadius: '20px 20px 0 0',
                        pointerEvents: 'none'
                      }}></div>
                      
                      <div className="card-body p-4" style={{ position: 'relative', zIndex: 2 }}>
                        <div className="d-flex align-items-center justify-content-between h-100">
                          {/* Sezione sinistra con icona e testo */}
                          <div className="d-flex align-items-center flex-grow-1">
                            <div 
                              className="me-3"
                              style={{
                                background: 'rgba(253, 126, 20, 0.2)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                border: '1px solid rgba(253, 126, 20, 0.3)',
                                borderRadius: '16px',
                                padding: '14px',
                                boxShadow: '0 4px 16px rgba(253, 126, 20, 0.2)'
                              }}
                            >
                              <Construction size={24} style={{ color: '#fd7e14' }} />
                            </div>
                            <div>
                              <h6 className="mb-1" style={{ 
                                fontSize: '1rem', 
                                fontWeight: '700',
                                color: '#2d3748',
                                textShadow: 'none'
                              }}>
                                Manutenzioni in Scadenza
                              </h6>
                              <p className="mb-0" style={{ 
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                color: '#4a5568'
                              }}>
                                Da programmare a breve
                              </p>
                            </div>
                          </div>
                          
                          {/* Conteggio prominente a destra */}
                          <div className="text-end">
                            <div 
                              style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                color: '#fd7e14',
                                border: '1px solid rgba(253, 126, 20, 0.2)',
                                borderRadius: '18px',
                                padding: '10px 18px',
                                fontSize: '1.8rem',
                                fontWeight: '900',
                                lineHeight: '1',
                                minWidth: '65px',
                                textAlign: 'center',
                                boxShadow: '0 6px 20px rgba(253, 126, 20, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                              }}
                            >
                              {isLoadingMaintenanceData ? (
                                <div 
                                  className="spinner-border" 
                                  role="status" 
                                  style={{ 
                                    width: '1.2rem', 
                                    height: '1.2rem',
                                    borderWidth: '2px',
                                    color: '#fd7e14'
                                  }}
                                >
                                  <span className="visually-hidden">Caricamento...</span>
                                </div>
                              ) : (
                                expiringMaintenanceCount
                              )}
                            </div>
                            <div 
                              className="mt-2"
                              style={{
                                background: 'rgba(253, 126, 20, 0.15)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid rgba(253, 126, 20, 0.2)',
                                borderRadius: '10px',
                                padding: '4px 10px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: '#fd7e14'
                              }}
                            >
                              Attenzione!
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Card Scadenze Critiche - Design Glassmorphism */}
                  {criticalSchedulesCount > 0 && (
                  <div>
                    <div 
                      className="card"
                      style={{
                        background: 'rgba(220, 53, 69, 0.15)',
                        backdropFilter: 'blur(15px)',
                        WebkitBackdropFilter: 'blur(15px)',
                        border: '1px solid rgba(220, 53, 69, 0.3)',
                        borderRadius: '20px',
                        minHeight: '120px',
                        boxShadow: '0 8px 32px rgba(220, 53, 69, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => setIsCriticalSchedulesModalOpen(true)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 16px 48px rgba(220, 53, 69, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.backdropFilter = 'blur(20px)';
                        e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(220, 53, 69, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.backdropFilter = 'blur(15px)';
                        e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)';
                      }}
                    >
                      {/* Effetto di sfondo glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(220,53,69,0.1) 100%)',
                        borderRadius: '20px',
                        pointerEvents: 'none'
                      }}></div>
                      
                      {/* Riflesso glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                        borderRadius: '20px 20px 0 0',
                        pointerEvents: 'none'
                      }}></div>
                      
                      <div 
                        className="card-body p-4"
                        style={{
                          position: 'relative',
                          zIndex: 2
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-between h-100">
                          {/* Sezione sinistra con icona e testo */}
                          <div className="d-flex align-items-center flex-grow-1">
                            <div 
                              className="me-3"
                              style={{
                                background: 'rgba(220, 53, 69, 0.3)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(220, 53, 69, 0.4)',
                                borderRadius: '16px',
                                padding: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 16px rgba(220, 53, 69, 0.2)'
                              }}
                            >
                              <AlertTriangle size={24} color="rgba(220, 53, 69, 0.9)" />
                            </div>
                            <div>
                              <h6 className="mb-1" style={{ 
                                fontSize: '1rem', 
                                fontWeight: '700',
                                color: 'rgba(220, 53, 69, 0.9)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}>
                                Scadenze Critiche
                              </h6>
                              <p className="mb-0" style={{ 
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                color: 'rgba(220, 53, 69, 0.7)'
                              }}>
                                Scadute o entro 7 giorni
                              </p>
                            </div>
                          </div>
                          
                          {/* Conteggio prominente a destra */}
                          <div className="text-end">
                            <div 
                              style={{
                                background: 'rgba(220, 53, 69, 0.2)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(220, 53, 69, 0.3)',
                                color: 'rgba(220, 53, 69, 0.9)',
                                borderRadius: '18px',
                                padding: '10px 18px',
                                fontSize: '1.8rem',
                                fontWeight: '900',
                                lineHeight: '1',
                                minWidth: '65px',
                                textAlign: 'center',
                                boxShadow: '0 4px 16px rgba(220, 53, 69, 0.2)'
                              }}
                            >
                              {isLoadingSchedulesData ? (
                                <div 
                                  className="spinner-border" 
                                  role="status" 
                                  style={{ 
                                    width: '1.2rem', 
                                    height: '1.2rem',
                                    borderWidth: '2px',
                                    color: 'rgba(220, 53, 69, 0.9)'
                                  }}
                                >
                                  <span className="visually-hidden">Caricamento...</span>
                                </div>
                              ) : (
                                criticalSchedulesCount
                              )}
                            </div>
                            <div 
                              className="mt-2"
                              style={{
                                background: 'rgba(220, 53, 69, 0.1)',
                                backdropFilter: 'blur(6px)',
                                border: '1px solid rgba(220, 53, 69, 0.2)',
                                borderRadius: '8px',
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: 'rgba(220, 53, 69, 0.8)'
                              }}
                            >
                              Urgente!
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Card Scadenze in Avvicinamento - Design Glassmorphism */}
                  {approachingSchedulesCount > 0 && (
                  <div>
                    <div 
                      className="card"
                      style={{
                        background: 'rgba(253, 126, 20, 0.15)',
                        backdropFilter: 'blur(15px)',
                        WebkitBackdropFilter: 'blur(15px)',
                        border: '1px solid rgba(253, 126, 20, 0.3)',
                        borderRadius: '20px',
                        minHeight: '120px',
                        boxShadow: '0 8px 32px rgba(253, 126, 20, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => setIsApproachingSchedulesModalOpen(true)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 16px 48px rgba(253, 126, 20, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.backdropFilter = 'blur(20px)';
                        e.currentTarget.style.background = 'rgba(253, 126, 20, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(253, 126, 20, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.backdropFilter = 'blur(15px)';
                        e.currentTarget.style.background = 'rgba(253, 126, 20, 0.15)';
                      }}
                    >
                      {/* Effetto di sfondo glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(253,126,20,0.1) 100%)',
                        borderRadius: '20px',
                        pointerEvents: 'none'
                      }}></div>
                      
                      {/* Riflesso glassmorphism */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                        borderRadius: '20px 20px 0 0',
                        pointerEvents: 'none'
                      }}></div>
                      
                      <div 
                        className="card-body p-4"
                        style={{
                          position: 'relative',
                          zIndex: 2
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-between h-100">
                          {/* Sezione sinistra con icona e testo */}
                          <div className="d-flex align-items-center flex-grow-1">
                            <div 
                              className="me-3"
                              style={{
                                background: 'rgba(253, 126, 20, 0.3)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(253, 126, 20, 0.4)',
                                borderRadius: '16px',
                                padding: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 16px rgba(253, 126, 20, 0.2)'
                              }}
                            >
                              <Clock size={24} color="rgba(253, 126, 20, 0.9)" />
                            </div>
                            <div>
                              <h6 className="mb-1" style={{ 
                                fontSize: '1rem', 
                                fontWeight: '700',
                                color: 'rgba(253, 126, 20, 0.9)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}>
                                Scadenze in Avvicinamento
                              </h6>
                              <p className="mb-0" style={{ 
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                color: 'rgba(253, 126, 20, 0.7)'
                              }}>
                                Da programmare entro 30 giorni
                              </p>
                            </div>
                          </div>
                          
                          {/* Conteggio prominente a destra */}
                          <div className="text-end">
                            <div 
                              style={{
                                background: 'rgba(253, 126, 20, 0.2)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(253, 126, 20, 0.3)',
                                color: 'rgba(253, 126, 20, 0.9)',
                                borderRadius: '18px',
                                padding: '10px 18px',
                                fontSize: '1.8rem',
                                fontWeight: '900',
                                lineHeight: '1',
                                minWidth: '65px',
                                textAlign: 'center',
                                boxShadow: '0 4px 16px rgba(253, 126, 20, 0.2)'
                              }}
                            >
                              {isLoadingSchedulesData ? (
                                <div 
                                  className="spinner-border" 
                                  role="status" 
                                  style={{ 
                                    width: '1.2rem', 
                                    height: '1.2rem',
                                    borderWidth: '2px',
                                    color: 'rgba(253, 126, 20, 0.9)'
                                  }}
                                >
                                  <span className="visually-hidden">Caricamento...</span>
                                </div>
                              ) : (
                                approachingSchedulesCount
                              )}
                            </div>
                            <div 
                              className="mt-2"
                              style={{
                                background: 'rgba(253, 126, 20, 0.1)',
                                backdropFilter: 'blur(6px)',
                                border: '1px solid rgba(253, 126, 20, 0.2)',
                                borderRadius: '8px',
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: 'rgba(253, 126, 20, 0.8)'
                              }}
                            >
                              Attenzione!
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cards Dashboard */}
        <div className="container-fluid mb-4">
          <div className="row">
            <div className="col-12">
              <h5 className="mb-3 d-flex align-items-center justify-content-between" style={{
                color: '#495057',
                fontWeight: '600',
                fontSize: '1.1rem'
              }}>
                <div className="d-flex align-items-center">
                  <BarChart3 className="me-2" size={20} style={{ color: '#0d6efd' }} />
                  Dashboard e Statistiche
                </div>
                <button
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                  onClick={() => toggleSection('dashboard')}
                  title={sectionToggleStates.dashboard ? "Nascondi sezione" : "Mostra sezione"}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#6c757d',
                    fontSize: '0.8rem'
                  }}
                >
                  {sectionToggleStates.dashboard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </h5>
            </div>
          </div>
        </div>

        {sectionToggleStates.dashboard && (
        <div className="row g-4">
          {/* Anagrafiche */}
          <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-purple-soft ${!toggleStates.anagrafiche ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-purple card-header-purple-soft card-header-soft text-white">
                 <div className="d-flex align-items-center justify-content-between w-100">
                   <div className="d-flex align-items-center flex-grow-1">
                     <Users 
                       className="me-3 icon-parallax" 
                       size={24}
                       style={{
                         transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                       }}
                     />
                     <div>
                       <h5 className="mb-0">🏢 Anagrafiche</h5>
                       <small className="opacity-75">Gestione clienti e fornitori</small>
                     </div>
                   </div>
                   <button 
                     className="toggle-btn ms-auto"
                     onClick={() => toggleStats('anagrafiche')}
                     title={toggleStates.anagrafiche ? "Nascondi statistiche" : "Mostra statistiche"}
                   >
                     {toggleStates.anagrafiche ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                   </button>
                 </div>
               </div>
              <div className={`card-body card-body-soft ${!toggleStates.anagrafiche ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-12">
                    <Link href="/gestione/dipendenti/dashboard" className="btn btn-outline-info btn-action btn-sm w-100">
                      <Activity size={16} className="me-1" />
                      Dashboard Personale
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/gestione/dipendenti" className="btn btn-outline-success btn-action btn-sm w-100">
                      <Users size={16} className="me-1" />
                      Personale
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/gestione/companies" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Building2 size={16} className="me-1" />
                      Società Trasporti
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/vehicles/suppliers" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Users size={16} className="me-1" />
                      Fornitori
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/vehicles/categories" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Tag size={16} className="me-1" />
                      Categorie
                    </Link>
                  </div>
                </div>
                {toggleStates.anagrafiche && <hr />}
                 <div className={`stats-container ${toggleStates.anagrafiche ? 'stats-expanded' : 'stats-collapsed'}`}>
                   {dashboardData?.anagrafiche?.map((stat, index) => (
                     <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                       <span className="text-muted">{stat.title}:</span>
                       <div className="d-flex align-items-center gap-2">
                         <strong className="h6 mb-0">
                           <AnimatedCounter value={stat.value} />
                         </strong>
                         <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                           {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                           {stat.trend > 0 ? '+' : ''}{stat.trend}
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-blue-soft ${!toggleStates.analytics ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-blue card-header-blue-soft card-header-soft text-white">
                 <div className="d-flex align-items-center justify-content-between w-100">
                   <div className="d-flex align-items-center flex-grow-1">
                     <BarChart3 
                       className="me-3 icon-parallax" 
                       size={24}
                       style={{
                         transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                       }}
                     />
                     <div>
                       <h5 className="mb-0">📊 Analytics</h5>
                       <small className="opacity-75">Reports e performance</small>
                     </div>
                   </div>
                   <button 
                     className="toggle-btn ms-auto"
                     onClick={() => toggleStats('analytics')}
                     title={toggleStates.analytics ? "Nascondi statistiche" : "Mostra statistiche"}
                   >
                     {toggleStates.analytics ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                   </button>
                 </div>
               </div>
              <div className={`card-body card-body-soft ${!toggleStates.analytics ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/delivery-analytics" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <BarChart3 size={16} className="me-1" />
                      Delivery
                    </Link>
                  </div>
                  <div className="col-6">
                    <button 
                      className="btn btn-outline-secondary btn-action btn-sm w-100 opacity-50" 
                      disabled 
                      title="Funzionalità in sviluppo"
                    >
                      <Construction size={16} className="me-1" />
                      Viaggi Analytics (WIP)
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      className="btn btn-outline-secondary btn-action btn-sm w-100 opacity-50" 
                      disabled 
                      title="Funzionalità in sviluppo"
                    >
                      <Construction size={16} className="me-1" />
                      Performance Analytics (WIP)
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      className="btn btn-outline-secondary btn-action btn-sm w-100 opacity-50" 
                      disabled 
                      title="Funzionalità in sviluppo"
                    >
                      <Construction size={16} className="me-1" />
                      Report Avanzati (WIP)
                    </button>
                  </div>
                </div>
                {toggleStates.analytics && <hr />}
                <div className={`stats-container ${toggleStates.analytics ? 'stats-expanded' : 'stats-collapsed'}`}>
                  {dashboardData?.analytics?.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                          {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                          {stat.trend > 0 ? '+' : ''}{stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fatturazione */}
            <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-green-soft ${!toggleStates.fatturazione ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-green card-header-green-soft card-header-soft text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <DollarSign 
                      className="me-3 icon-parallax" 
                      size={24}
                      style={{
                        transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                      }}
                    />
                    <div>
                      <h5 className="mb-0">💰 Fatturazione</h5>
                      <small className="opacity-75">Gestione economica</small>
                    </div>
                  </div>
                  <button 
                    className="toggle-btn ms-auto"
                    onClick={() => toggleStats('fatturazione')}
                    title={toggleStates.fatturazione ? "Nascondi statistiche" : "Mostra statistiche"}
                  >
                    {toggleStates.fatturazione ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
              <div className={`card-body card-body-soft ${!toggleStates.fatturazione ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/fatturazione-terzisti" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <DollarSign size={16} className="me-1" />
                      Fatturazione Terzisti
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/gestione" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Package size={16} className="me-1" />
                      Fatturazione Delivery
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/handling" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Package size={16} className="me-1" />
                      Fatturazione Handling
                    </Link>
                  </div>
                </div>
                {toggleStates.fatturazione && <hr />}
                <div className={`stats-container ${toggleStates.fatturazione ? 'stats-expanded' : 'stats-collapsed'}`}>
                  {dashboardData?.fatturazione?.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                          {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                          {stat.trend > 0 ? '+' : ''}{stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Import */}
          <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-cyan-soft ${!toggleStates.import ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-cyan card-header-cyan-soft card-header-soft text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Upload 
                      className="me-3 icon-parallax" 
                      size={24}
                      style={{
                        transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                      }}
                    />
                    <div>
                      <h5 className="mb-0">📤 Import</h5>
                      <small className="opacity-75">Caricamento dati</small>
                    </div>
                  </div>
                  <button 
                    className="toggle-btn ms-auto"
                    onClick={() => toggleStats('import')}
                    title={toggleStates.import ? "Nascondi statistiche" : "Mostra statistiche"}
                  >
                    {toggleStates.import ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
              <div className={`card-body card-body-soft ${!toggleStates.import ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/import_viaggi_PoD" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Upload size={16} className="me-1" />
                      Import Viaggi PoD
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/import-delivery" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Truck size={16} className="me-1" />
                      Import Delivery
                    </Link>
                  </div>

                </div>
                {toggleStates.import && <hr />}
                <div className={`stats-container ${toggleStates.import ? 'stats-expanded' : 'stats-collapsed'}`}>
                  {dashboardData?.import?.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                          {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                          {stat.trend > 0 ? '+' : ''}{stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Veicoli */}
            <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-orange-soft ${!toggleStates.veicoli ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-orange card-header-orange-soft card-header-soft text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Truck 
                      className="me-3 icon-parallax" 
                      size={24}
                      style={{
                        transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                      }}
                    />
                    <div>
                      <h5 className="mb-0">🚗 Veicoli</h5>
                      <small className="opacity-75">Fleet management</small>
                    </div>
                  </div>
                  <button 
                    className="toggle-btn ms-auto"
                    onClick={() => toggleStats('veicoli')}
                    title={toggleStates.veicoli ? "Nascondi statistiche" : "Mostra statistiche"}
                  >
                    {toggleStates.veicoli ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
              <div className={`card-body card-body-soft ${!toggleStates.veicoli ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-12">
                    <Link href="/vehicles" className="btn btn-primary btn-action btn-sm w-100">
                      <Car size={18} className="me-1" />
                      Dashboard Veicoli
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/vehicles/list" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Car size={16} className="me-1" />
                      Lista Veicoli
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/vehicles/documents" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <FileText size={16} className="me-1" />
                      Documenti Veicoli
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/vehicles/schedules" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Calendar size={16} className="me-1" />
                      Gestione Scadenze
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/vehicles/schedules/calendar" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Calendar size={16} className="me-1" />
                      Calendario Veicoli
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/vehicles/quotes" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <DollarSign size={16} className="me-1" />
                      Preventivi Manutenzione
                    </Link>
                  </div>
                </div>
                {toggleStates.veicoli && <hr />}
                <div className={`stats-container ${toggleStates.veicoli ? 'stats-expanded' : 'stats-collapsed'}`}>
                  {dashboardData?.veicoli?.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                          {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                          {stat.trend > 0 ? '+' : ''}{stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Supporto */}
          <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-purple-soft ${!toggleStates.supporto ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-purple card-header-purple-soft card-header-soft text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <HelpCircle 
                      className="me-3 icon-parallax" 
                      size={24}
                      style={{
                        transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                      }}
                    />
                    <div>
                      <h5 className="mb-0">📚 Supporto</h5>
                      <small className="opacity-75">Guide e documentazione</small>
                    </div>
                  </div>
                  <button 
                    className="toggle-btn ms-auto"
                    onClick={() => toggleStats('supporto')}
                    title={toggleStates.supporto ? "Nascondi statistiche" : "Mostra statistiche"}
                  >
                    {toggleStates.supporto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
              <div className={`card-body card-body-soft ${!toggleStates.supporto ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/funzionalita" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <HelpCircle size={16} className="me-1" />
                      Funzionalità
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/documents/prd" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <FileText size={16} className="me-1" />
                      Guide PRD
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/documents/architettura" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Settings size={16} className="me-1" />
                      Architettura Tecnica
                    </Link>
                  </div>
                </div>
                {toggleStates.supporto && <hr />}
                <div className={`stats-container ${toggleStates.supporto ? 'stats-expanded' : 'stats-collapsed'}`}>
                  {dashboardData?.supporto?.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                          {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                          {stat.trend > 0 ? '+' : ''}{stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Viaggi */}
            <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-blue-soft ${!toggleStates.viaggi ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-blue card-header-blue-soft card-header-soft text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Truck 
                      className="me-3 icon-parallax" 
                      size={24}
                      style={{
                        transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                      }}
                    />
                    <div>
                      <h5 className="mb-0">🚛 Viaggi</h5>
                      <small className="opacity-75">Gestione e monitoraggio viaggi</small>
                    </div>
                  </div>
                  <button 
                    className="toggle-btn ms-auto"
                    onClick={() => toggleStats('viaggi')}
                    title={toggleStates.viaggi ? "Nascondi statistiche" : "Mostra statistiche"}
                  >
                    {toggleStates.viaggi ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
              <div className={`card-body card-body-soft ${!toggleStates.viaggi ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/viaggi" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Truck size={16} className="me-1" />
                      Gestione Viaggi
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/monitoraggio" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <BarChart3 size={16} className="me-1" />
                      Monitoraggio
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/viaggi-pod" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Package size={16} className="me-1" />
                      Viaggi POD
                    </Link>
                  </div>
                  <div className="col-6">
                    <button 
                      onClick={handleSyncTerzisti}
                      disabled={isSyncingTerzisti}
                      className="btn btn-outline-warning btn-action btn-sm w-100" 
                      style={{ borderColor: '#ffc107', color: 'black', backgroundColor: '#ffc107', WebkitTextFillColor: 'black' }}
                    >
                      <RefreshCw size={16} className={`me-1 ${isSyncingTerzisti ? 'spin' : ''}`} />
                      {isSyncingTerzisti ? 'Sincronizzando...' : '🚛 Sincronizza Terzista'}
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      onClick={handleSyncDipendenti}
                      disabled={isSyncingDipendenti}
                      className="btn btn-primary btn-action btn-sm w-100"
                    >
                      <RefreshCw size={16} className={`me-1 ${isSyncingDipendenti ? 'spin' : ''}`} />
                      {isSyncingDipendenti ? 'Sincronizzando...' : '🔄 Sincronizza Dipendente'}
                    </button>
                  </div>
                </div>
                {toggleStates.viaggi && <hr />}
                <div className={`stats-container ${toggleStates.viaggi ? 'stats-expanded' : 'stats-collapsed'}`}>
                  {dashboardData?.viaggi?.map((stat, index) => {
                    // Rendi cliccabili 'Monitoraggi Pending' e 'Viaggi Pod Pending'
                    const isClickable = stat.title === 'Monitoraggi Pending' || stat.title === 'Viaggi Pod Pending';
                    
                    return (
                      <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                        <span className="text-muted">{stat.title}:</span>
                        <div className="d-flex align-items-center gap-2">
                          <strong 
                            className={`h6 mb-0 ${isClickable ? 'clickable-stat' : ''}`}
                            onClick={isClickable ? () => {
                              if (stat.title === 'Monitoraggi Pending') {
                                setIsTravelsNotInTabModalOpen(true);
                              } else if (stat.title === 'Viaggi Pod Pending') {
                                setIsPodMancantiModalOpen(true);
                              }
                            } : undefined}
                            style={{ cursor: isClickable ? 'pointer' : 'default' }}
                          >
                            <AnimatedCounter value={stat.value} />
                            {isClickable && (
                              <Eye size={14} className="ms-1" style={{ verticalAlign: 'middle' }} />
                            )}
                          </strong>
                          <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                            {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                            {stat.trend > 0 ? '+' : ''}{stat.trend}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sistema */}
            <div className="col-lg-3 col-md-6">
            <div 
              className={`card dashboard-card dashboard-card-soft card-header-red-soft ${!toggleStates.sistema ? 'card-collapsed' : ''}`}
              onMouseMove={handleMouseMove}
            >
              <div className="floating-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
              <div className="card-header card-header-red card-header-red-soft card-header-soft text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Settings 
                      className="me-3 icon-parallax" 
                      size={24}
                      style={{
                        transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`
                      }}
                    />
                    <div>
                      <h5 className="mb-0">⚙️ Sistema</h5>
                      <small className="opacity-75">Amministrazione</small>
                    </div>
                  </div>
                  <button 
                    className="toggle-btn ms-auto"
                    onClick={() => toggleStats('sistema')}
                    title={toggleStates.sistema ? "Nascondi statistiche" : "Mostra statistiche"}
                  >
                    {toggleStates.sistema ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
              <div className={`card-body card-body-soft ${!toggleStates.sistema ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/sistema/configurazioni" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Settings size={16} className="me-1" />
                      Configurazioni
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/sistema/logs" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <FileText size={16} className="me-1" />
                      Log Sistema
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/sistema" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Users size={16} className="me-1" />
                      Gestione Utenti
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/backup-dashboard" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Shield size={16} className="me-1" />
                      Backup Dashboard
                    </Link>
                  </div>
                </div>
                {toggleStates.sistema && <hr />}
                <div className={`stats-container ${toggleStates.sistema ? 'stats-expanded' : 'stats-collapsed'}`}>
                  {dashboardData?.sistema?.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend > 0 ? 'bg-success' : stat.trend < 0 ? 'bg-danger' : 'bg-secondary'} text-white`}>
                          {stat.trend > 0 ? <TrendingUp size={12} /> : stat.trend < 0 ? <TrendingDown size={12} /> : <Activity size={12} />}
                          {stat.trend > 0 ? '+' : ''}{stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}



        {/* Footer */}
        <div className="text-center mt-5 pt-4 border-top">
          <p className="text-muted mb-0">
            <CheckCircle size={16} className="me-2 text-success" />
            Sistema operativo - Ultimo aggiornamento: {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Modal per i viaggi POD mancanti */}
      <PodMancantiModal 
        isOpen={isPodMancantiModalOpen}
        onClose={() => setIsPodMancantiModalOpen(false)}
      />

      {/* Modal per i viaggi non sincronizzati */}
      <TravelsNotInTabModal 
        isOpen={isTravelsNotInTabModalOpen}
        onClose={() => setIsTravelsNotInTabModalOpen(false)}
      />

      {/* Modal per le richieste ferie */}
      {isLeaveRequestsModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setIsLeaveRequestsModalOpen(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)', color: 'white' }}>
                <h5 className="modal-title d-flex align-items-center">
                  <Calendar className="me-2" size={24} />
                  Richieste Ferie in Attesa ({pendingLeaveCount})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsLeaveRequestsModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                {isLoadingLeaveRequests ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-warning" role="status">
                      <span className="visually-hidden">Caricamento...</span>
                    </div>
                    <p className="mt-2 text-muted">Caricamento richieste ferie...</p>
                  </div>
                ) : leaveRequestsData.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead style={{ backgroundColor: '#fff3cd' }}>
                        <tr>
                          <th scope="col">
                            <Users size={16} className="me-1" />
                            Dipendente
                          </th>
                          <th scope="col">
                            <Calendar size={16} className="me-1" />
                            Periodo
                          </th>
                          <th scope="col">
                            <Clock size={16} className="me-1" />
                            Giorni
                          </th>
                          <th scope="col">
                            <FileText size={16} className="me-1" />
                            Richiesta
                          </th>
                          <th scope="col">
                            <AlertTriangle size={16} className="me-1" />
                            Stato
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequestsData.map((request, index) => (
                          <tr key={index}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div 
                                  className="rounded-circle me-2 d-flex align-items-center justify-content-center"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#ff6b35',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {request.nome?.charAt(0)}{request.cognome?.charAt(0)}
                                </div>
                                <div>
                                  <div className="fw-bold">{request.nome} {request.cognome}</div>
                                  <small className="text-muted">{request.employee_id}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div className="fw-bold">
                                  {formatItalianDate(request.start_date)} - {formatItalianDate(request.end_date)}
                                </div>
                                <small className="text-muted">
                                  Dal {getItalianWeekday(request.start_date)} al {getItalianWeekday(request.end_date)}
                                </small>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-warning text-dark">
                                {request.days_requested} giorni
                              </span>
                            </td>
                            <td>
                              <div>
                                <small className="text-muted">
                                  Richiesta il {formatItalianDate(request.created_at)}
                                </small>
                                {request.reason && (
                                  <div className="mt-1">
                                    <small className="text-muted fst-italic">"{request.reason}"</small>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-warning">
                                {request.status === 'pending' ? 'In attesa' : request.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar size={48} className="text-muted mb-3" />
                    <h6 className="text-muted">Nessuna richiesta ferie in attesa</h6>
                    <p className="text-muted mb-0">Tutte le richieste sono state elaborate.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsLeaveRequestsModalOpen(false)}>
                  Chiudi
                </button>
                <Link href="/gestione/employees/ferie?status=pending" className="btn btn-primary" style={{ backgroundColor: '#ff6b35', borderColor: '#ff6b35' }}>
                  <Users size={16} className="me-1" />
                  Vai alla Gestione Ferie
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal per le manutenzioni scadute */}
      {isExpiredMaintenanceModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setIsExpiredMaintenanceModalOpen(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title d-flex align-items-center">
                  <Construction className="me-2" size={24} />
                  Manutenzioni Scadute ({expiredMaintenanceCount})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsExpiredMaintenanceModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                {maintenanceData.filter(vehicle => vehicle.stato_tagliando === 'Scaduto').length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-danger">
                        <tr>
                          <th>Targa</th>
                          <th>Marca/Modello</th>
                          <th>Km Percorsi</th>
                          <th>Giorni dall'ultimo tagliando</th>
                          <th>Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenanceData.filter(vehicle => vehicle.stato_tagliando === 'Scaduto').map((vehicle, index) => (
                          <tr key={index}>
                            <td><strong>{vehicle.targa}</strong></td>
                            <td>{vehicle.marca} {vehicle.modello}</td>
                            <td>{vehicle.km_percorsi?.toLocaleString() || 'N/A'} km</td>
                            <td>
                              <span className="badge bg-danger">
                                {vehicle.giorni_ultimo_tagliando || 'N/A'} giorni
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-danger">
                                {vehicle.stato_tagliando}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Construction size={48} className="text-muted mb-3" />
                    <p className="text-muted">Nessuna manutenzione scaduta trovata.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <Link href="/vehicles/maintenance-monitoring?stato=Scaduto" className="btn btn-danger">
                  <Construction className="me-2" size={16} />
                  Vai al Monitoraggio Manutenzioni
                </Link>
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpiredMaintenanceModalOpen(false)}>
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal per le manutenzioni in scadenza */}
      {isExpiringMaintenanceModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setIsExpiringMaintenanceModalOpen(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title d-flex align-items-center">
                  <Construction className="me-2" size={24} />
                  Manutenzioni in Scadenza ({expiringMaintenanceCount})
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsExpiringMaintenanceModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                {maintenanceData.filter(vehicle => vehicle.stato_tagliando === 'In Scadenza').length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-warning">
                        <tr>
                          <th>Targa</th>
                          <th>Marca/Modello</th>
                          <th>Km Percorsi</th>
                          <th>Giorni dall'ultimo tagliando</th>
                          <th>Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenanceData.filter(vehicle => vehicle.stato_tagliando === 'In Scadenza').map((vehicle, index) => (
                          <tr key={index}>
                            <td><strong>{vehicle.targa}</strong></td>
                            <td>{vehicle.marca} {vehicle.modello}</td>
                            <td>{vehicle.km_percorsi?.toLocaleString() || 'N/A'} km</td>
                            <td>
                              <span className="badge bg-warning text-dark">
                                {vehicle.giorni_ultimo_tagliando || 'N/A'} giorni
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-warning text-dark">
                                {vehicle.stato_tagliando}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Construction size={48} className="text-muted mb-3" />
                    <p className="text-muted">Nessuna manutenzione in scadenza trovata.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <Link href="/vehicles/maintenance-monitoring?stato=In+Scadenza" className="btn btn-warning">
                  <Construction className="me-2" size={16} />
                  Vai al Monitoraggio Manutenzioni
                </Link>
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpiringMaintenanceModalOpen(false)}>
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal per le scadenze critiche */}
      {isCriticalSchedulesModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setIsCriticalSchedulesModalOpen(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title d-flex align-items-center">
                  <Calendar className="me-2" size={24} />
                  Scadenze Critiche ({criticalSchedulesCount})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsCriticalSchedulesModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                {schedulesData.filter(schedule => schedule.days_until_expiry <= 7).length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-danger">
                        <tr>
                          <th>Targa</th>
                          <th>Tipo Scadenza</th>
                          <th>Data Scadenza</th>
                          <th>Giorni Rimanenti</th>
                          <th>Priorità</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedulesData.filter(schedule => schedule.days_until_expiry <= 7).map((schedule, index) => (
                          <tr key={index}>
                            <td><strong>{schedule.vehicle_plate}</strong></td>
                            <td>{schedule.schedule_type}</td>
                            <td>{new Date(schedule.scheduled_date).toLocaleDateString('it-IT')}</td>
                            <td>
                              <span className={`badge ${schedule.days_until_expiry < 0 ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                {schedule.days_until_expiry < 0 ? 
                                  `Scaduto da ${Math.abs(schedule.days_until_expiry)} giorni` : 
                                  `${schedule.days_until_expiry} giorni`
                                }
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                schedule.priority === 'Alta' ? 'bg-danger' : 
                                schedule.priority === 'Media' ? 'bg-warning text-dark' : 'bg-success'
                              }`}>
                                {schedule.priority || 'Media'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar size={48} className="text-muted mb-3" />
                    <p className="text-muted">Nessuna scadenza critica trovata.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <Link href="/vehicles/schedules?status=overdue" className="btn btn-danger">
                  <Calendar className="me-2" size={16} />
                  Vai alle Scadenze Programmate
                </Link>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCriticalSchedulesModalOpen(false)}>
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal per le scadenze in avvicinamento */}
      {isApproachingSchedulesModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setIsApproachingSchedulesModalOpen(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title d-flex align-items-center">
                  <Calendar className="me-2" size={24} />
                  Scadenze in Avvicinamento ({approachingSchedulesCount})
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsApproachingSchedulesModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                {schedulesData.filter(schedule => schedule.days_until_expiry > 7 && schedule.days_until_expiry <= 30).length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-warning">
                        <tr>
                          <th>Targa</th>
                          <th>Tipo Scadenza</th>
                          <th>Data Scadenza</th>
                          <th>Giorni Rimanenti</th>
                          <th>Priorità</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedulesData.filter(schedule => schedule.days_until_expiry > 7 && schedule.days_until_expiry <= 30).map((schedule, index) => (
                          <tr key={index}>
                            <td><strong>{schedule.vehicle_plate}</strong></td>
                            <td>{schedule.schedule_type}</td>
                            <td>{new Date(schedule.scheduled_date).toLocaleDateString('it-IT')}</td>
                            <td>
                              <span className="badge bg-warning text-dark">
                                {schedule.days_until_expiry} giorni
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                schedule.priority === 'Alta' ? 'bg-danger' : 
                                schedule.priority === 'Media' ? 'bg-warning text-dark' : 'bg-success'
                              }`}>
                                {schedule.priority || 'Media'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar size={48} className="text-muted mb-3" />
                    <p className="text-muted">Nessuna scadenza in avvicinamento trovata.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <Link href="/vehicles/schedules?status=pending" className="btn btn-warning">
                  <Calendar className="me-2" size={16} />
                  Vai alle Scadenze Programmate
                </Link>
                <button type="button" className="btn btn-secondary" onClick={() => setIsApproachingSchedulesModalOpen(false)}>
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}