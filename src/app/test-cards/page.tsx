'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Users, Package, Truck, Calendar, AlertTriangle, CheckCircle, 
  FileText, Clock, Home, BarChart3, DollarSign, Upload, 
  Settings, Database, Shield, Bell, Search, Plus,
  TrendingUp, TrendingDown, Activity, Zap, RefreshCw
} from 'lucide-react';

// Interfacce per i dati
interface Stat {
  label: string;
  value: number | string;
  trend: string;
  color: string;
}

interface SectionStats {
  stats: Stat[];
}

interface DashboardData {
  anagrafiche: SectionStats;
  analytics: SectionStats;
  fatturazione: SectionStats;
  import: SectionStats;
  veicoli: SectionStats;
  sistema: SectionStats;
}

export default function ModernDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState(3);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const AnimatedCounter = ({ value }: { value: number | string }) => {
    return <span>{value}</span>;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container-fluid py-4">
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
      <div className="container-fluid py-4">
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
      <div className="container-fluid py-4">
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
          height: 100%;
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
        
        .header-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 15px;
          color: white;
          margin-bottom: 2rem;
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
      `}</style>

      <div className="container-fluid py-4">
        {/* Header Dinamico */}
        <div className="header-card p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="mb-2">
                <Activity className="me-3" size={32} />
                Dashboard Gestione Partesa
              </h1>
              <p className="mb-0 opacity-75">
                Benvenuto! Oggi è {formatDate(currentTime)}
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <div className="d-flex align-items-center justify-content-md-end gap-3">
                <div className="text-center">
                  <Clock size={24} className="mb-1" />
                  <div className="h4 mb-0 font-monospace">{formatTime(currentTime)}</div>
                </div>
                <div className="position-relative">
                  <Bell size={24} />
                  {notifications > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger notification-badge">
                      {notifications}
                    </span>
                  )}
                </div>
                <RefreshCw size={20} className="icon-spin opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Barra di Ricerca */}
        <div className="row mb-4">
          <div className="col-md-8 mx-auto">
            <div className="position-relative">
              <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={20} />
              <input
                type="text"
                className="form-control search-box ps-5 py-3"
                placeholder="Cerca funzionalità, reports, veicoli..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Cards Dashboard */}
        <div className="row g-4">
          {/* Anagrafiche */}
          <div className="col-lg-4 col-md-6">
            <div className="card dashboard-card h-100">
              <div className="card-header card-header-purple text-white">
                <div className="d-flex align-items-center">
                  <Users className="me-3" size={24} />
                  <div>
                    <h5 className="mb-0">🏢 Anagrafiche</h5>
                    <small className="opacity-75">Gestione clienti e fornitori</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/clienti" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Users size={16} className="me-1" />
                      Clienti
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/fornitori" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Truck size={16} className="me-1" />
                      Fornitori
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/categorie" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Package size={16} className="me-1" />
                      Categorie
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/utenti" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Shield size={16} className="me-1" />
                      Utenti
                    </Link>
                  </div>
                </div>
                <hr />
                <div className="stats-container">
                  {dashboardData.anagrafiche.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                          {stat.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stat.trend >= 0 ? '+' : ''}{stat.trend}%
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
            <div className="card dashboard-card h-100">
              <div className="card-header card-header-blue text-white">
                <div className="d-flex align-items-center">
                  <BarChart3 className="me-3" size={24} />
                  <div>
                    <h5 className="mb-0">📊 Analytics</h5>
                    <small className="opacity-75">Reports e performance</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/delivery-analytics" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <BarChart3 size={16} className="me-1" />
                      Delivery
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/viaggi-analytics" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Truck size={16} className="me-1" />
                      Viaggi
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/performance" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Zap size={16} className="me-1" />
                      Performance
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/reports" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <FileText size={16} className="me-1" />
                      Reports
                    </Link>
                  </div>
                </div>
                <hr />
                <div className="stats-container">
                  {dashboardData.analytics.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                          {stat.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stat.trend >= 0 ? '+' : ''}{stat.trend}%
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
            <div className="card dashboard-card h-100">
              <div className="card-header card-header-green text-white">
                <div className="d-flex align-items-center">
                  <DollarSign className="me-3" size={24} />
                  <div>
                    <h5 className="mb-0">💰 Fatturazione</h5>
                    <small className="opacity-75">Gestione economica</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/fatturazione-terzisti" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <DollarSign size={16} className="me-1" />
                      Terzisti
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/fatturazione-delivery" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Package size={16} className="me-1" />
                      Delivery
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/handling" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Truck size={16} className="me-1" />
                      Handling Operations
                    </Link>
                  </div>
                </div>
                <hr />
                <div className="stats-container">
                  {dashboardData.fatturazione.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                          {stat.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stat.trend >= 0 ? '+' : ''}{stat.trend}%
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
            <div className="card dashboard-card h-100">
              <div className="card-header card-header-cyan text-white">
                <div className="d-flex align-items-center">
                  <Upload className="me-3" size={24} />
                  <div>
                    <h5 className="mb-0">📤 Import</h5>
                    <small className="opacity-75">Caricamento dati</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/import_viaggi_PoD" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Upload size={16} className="me-1" />
                      Viaggi POD
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/import-delivery" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Package size={16} className="me-1" />
                      Delivery
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/import-history" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <FileText size={16} className="me-1" />
                      Storico Import
                    </Link>
                  </div>
                </div>
                <hr />
                <div className="stats-container">
                  {dashboardData.import.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                          {stat.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stat.trend >= 0 ? '+' : ''}{stat.trend}%
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
            <div className="card dashboard-card h-100">
              <div className="card-header card-header-orange text-white">
                <div className="d-flex align-items-center">
                  <Truck className="me-3" size={24} />
                  <div>
                    <h5 className="mb-0">🚗 Veicoli</h5>
                    <small className="opacity-75">Fleet management</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/vehicles" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Truck size={16} className="me-1" />
                      Gestione
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/vehicles/scadenze" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Calendar size={16} className="me-1" />
                      Scadenze
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/vehicles/preventivi" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <FileText size={16} className="me-1" />
                      Preventivi
                    </Link>
                  </div>
                </div>
                <hr />
                <div className="stats-container">
                  {dashboardData.veicoli.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                          {stat.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stat.trend >= 0 ? '+' : ''}{stat.trend}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sistema */}
          <div className="col-lg-4 col-md-6">
            <div className="card dashboard-card h-100">
              <div className="card-header card-header-red text-white">
                <div className="d-flex align-items-center">
                  <Settings className="me-3" size={24} />
                  <div>
                    <h5 className="mb-0">⚙️ Sistema</h5>
                    <small className="opacity-75">Amministrazione</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Link href="/backup-dashboard" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Database size={16} className="me-1" />
                      Backup
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href="/sistema/logs" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <FileText size={16} className="me-1" />
                      Logs
                    </Link>
                  </div>
                  <div className="col-12">
                    <Link href="/sistema/configurazioni" className="btn btn-outline-primary btn-action btn-sm w-100">
                      <Settings size={16} className="me-1" />
                      Configurazioni
                    </Link>
                  </div>
                </div>
                <hr />
                <div className="stats-container">
                  {dashboardData.sistema.map((stat, index) => (
                    <div key={index} className="stat-row d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted">{stat.title}:</span>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="h6 mb-0">
                          <AnimatedCounter value={stat.value} />
                        </strong>
                        <span className={`trend-badge ${stat.trend >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                          {stat.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stat.trend >= 0 ? '+' : ''}{stat.trend}%
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
                Sistema operativo - Ultimo aggiornamento: {formatTime(currentTime)}
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
    </>
  );
}