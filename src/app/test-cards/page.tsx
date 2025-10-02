'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Users, Package, Truck, Calendar, AlertTriangle, CheckCircle, 
  FileText, Clock, Home, BarChart3, DollarSign, Upload, 
  Settings, Database, Shield, Bell, Search, Plus,
  TrendingUp, TrendingDown, Activity, Zap, RefreshCw, Tag, HelpCircle, Car, Eye, Construction,
  ChevronDown, ChevronUp
} from 'lucide-react';
import PodMancantiModal from '@/components/PodMancantiModal';
import TravelsNotInTabModal from '@/components/TravelsNotInTabModal';
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState(3);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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

  // Funzione per toggle delle statistiche
  const toggleStats = (cardName: keyof typeof toggleStates) => {
    setToggleStates(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
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

  // Aggiorna l'orologio ogni secondo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Carica i dati reali dal database
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/dashboard-stats');
        if (!response.ok) {
          throw new Error('Errore nel caricamento delle statistiche');
        }
        
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error('Errore nel fetch dei dati dashboard:', err);
        setError('Errore nel caricamento dei dati. Riprova più tardi.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Auto-refresh ogni 5 minuti
  useEffect(() => {
    const refreshTimer = setInterval(async () => {
      try {
        const response = await fetch('/api/dashboard-stats');
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
          console.log('Dashboard data refreshed');
        }
      } catch (err) {
        console.error('Errore nel refresh automatico:', err);
      }
    }, 300000); // 5 minuti

    return () => clearInterval(refreshTimer);
  }, []);



  const AnimatedCounter = ({ value }: { value: number | string }) => {
    return <span>{value}</span>;
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
        
        .floating-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0d6efd, #0056b3);
          border: none;
          box-shadow: 0 4px 15px rgba(13, 110, 253, 0.3);
          z-index: 1000;
          transition: all 0.3s ease;
        }
        
        .floating-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(13, 110, 253, 0.4);
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

        {/* Sezione Toggle Globale */}
        <div className="container-fluid mb-4">
          <div className="row">
            <div className="col-12 d-flex justify-content-center">
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
                  {allExpanded ? "Comprimi Tutto" : "Espandi Tutto"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Cards Dashboard */}
        <div className="row g-4">
          {/* Anagrafiche */}
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.anagrafiche ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-purple text-white">
                 <div className="d-flex align-items-center justify-content-between w-100">
                   <div className="d-flex align-items-center flex-grow-1">
                     <Users className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.anagrafiche ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
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
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.analytics ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-blue text-white">
                 <div className="d-flex align-items-center justify-content-between w-100">
                   <div className="d-flex align-items-center flex-grow-1">
                     <BarChart3 className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.analytics ? 'card-body-collapsed' : ''}`}>
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
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.fatturazione ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-green text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <DollarSign className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.fatturazione ? 'card-body-collapsed' : ''}`}>
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
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.import ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-cyan text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Upload className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.import ? 'card-body-collapsed' : ''}`}>
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
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.veicoli ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-orange text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Truck className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.veicoli ? 'card-body-collapsed' : ''}`}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/vehicles/list" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Car size={16} className="me-1" />
                      Lista Veicoli
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
                  <div className="col-6">
                    <Link href="/vehicles/quotes" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <DollarSign size={16} className="me-1" />
                      Preventivi Manutenzione
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/vehicles" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Car size={16} className="me-1" />
                      Dashboard Veicoli
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
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.supporto ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-purple text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <HelpCircle className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.supporto ? 'card-body-collapsed' : ''}`}>
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
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.viaggi ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-blue text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Truck className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.viaggi ? 'card-body-collapsed' : ''}`}>
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
          <div className="col-lg-4 col-md-6">
            <div className={`card dashboard-card ${!toggleStates.sistema ? 'card-collapsed' : ''}`}>
              <div className="card-header card-header-red text-white">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <Settings className="me-3" size={24} />
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
              <div className={`card-body ${!toggleStates.sistema ? 'card-body-collapsed' : ''}`}>
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

        {/* Quick Actions Floating Button */}
        <button className="floating-btn text-white" title="Quick Actions">
          <Plus size={24} />
        </button>

        {/* Footer */}
        <div className="text-center mt-5 pt-4 border-top">
          <div className="row align-items-center">
            <div className="col-md-6 text-md-start">
              <p className="text-muted mb-0">
                <CheckCircle size={16} className="me-2 text-success" />
                Sistema operativo - Ultimo aggiornamento: {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <Link href="/" className="btn btn-outline-primary me-2">
                <Home size={16} className="me-1" />
                Home Originale
              </Link>
              <Link href="/dashboard" className="btn btn-primary">
                <BarChart3 size={16} className="me-1" />
                Dashboard Classica
              </Link>
            </div>
          </div>
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
    </>
  );
}