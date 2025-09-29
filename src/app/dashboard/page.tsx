'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Users, Truck, Package, DollarSign, Settings, FileText, 
  BarChart3, Calendar, Shield, Plus, Upload, Code, Clock, HelpCircle, Eye, ChevronRight, TrendingUp, Car, Tag 
} from 'lucide-react';
import PendingViaggiModal from '@/components/PendingViaggiModal';
import PodMancantiModal from '@/components/PodMancantiModal';
import TravelsNotInTabModal from '@/components/TravelsNotInTabModal';
import DocumentExpiryAlert from '@/components/DocumentExpiryAlert';


// Interfaccia per le statistiche
interface DashboardStats {
  viaggi: {
    active: number;
    completed: number;
    pending: number;
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  anagrafiche: {
    clients: number;
    suppliers: number;
    users: number;
  };
  fatturazione: {
    monthly: string;
    pending: string;
    completed: number;
  };
  import: {
    files: number;
    pending: number;
    errors: number;
  };
  sistema: {
    configs: number;
    logs: string;
    users: number;
  };
  veicoli: {
    total: number;
    activeSchedules: number;
    overdueSchedules: number;
    openQuotes: number;
  };
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isPodMancantiModalOpen, setIsPodMancantiModalOpen] = useState(false);
  const [isTravelsNotInTabModalOpen, setIsTravelsNotInTabModalOpen] = useState(false);



  // Aggiorna data e ora ogni secondo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Carica le statistiche dal database
  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento delle statistiche');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Errore nel caricamento statistiche:', error);
      setStatsError('Errore nel caricamento delle statistiche');
      // Valori di fallback
      setStats({
        viaggi: { active: 0, completed: 0, pending: 0, total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
        anagrafiche: { clients: 0, suppliers: 0, users: 0 },
        fatturazione: { monthly: '€0k', pending: '€0', completed: 0 },
        import: { files: 0, pending: 0, errors: 0 },
        sistema: { configs: 0, logs: '0', users: 0 },
        veicoli: { total: 0, activeSchedules: 0, overdueSchedules: 0, openQuotes: 0 }
      });
    } finally {
      setStatsLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Caricamento...</span>
        </div>
      </div>
    );
  }

// Componente per il caricamento
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
  </div>
);

// Skeleton per le statistiche
const StatsSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
    <div className="h-6 bg-gray-300 rounded w-1/2"></div>
  </div>
);

const SectionSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="flex items-center mb-4">
      <div className="w-8 h-8 bg-gray-300 rounded mr-3"></div>
      <div className="h-6 bg-gray-300 rounded w-1/3"></div>
    </div>
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="text-center">
          <StatsSkeleton />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 bg-gray-300 rounded"></div>
      ))}
    </div>
  </div>
);
  if (!isAuthenticated) {
    return (
      <div className="dashboard-container">
        <div className="auth-warning">
          <Shield size={48} />
          <h3>Accesso non autorizzato</h3>
          <p>Effettua il login per continuare.</p>
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: 'anagrafiche',
      title: 'Anagrafiche',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      pages: [
        { name: 'Clienti', href: '/clienti', icon: Users },
        { name: 'Fornitori', href: '/vehicles/suppliers', icon: Users },
        { name: 'Categorie', href: '/vehicles/categories', icon: Tag },
        { name: 'Utenti Sistema', href: '/utenti', icon: Shield }
      ],
      stats: { 
        clients: stats?.anagrafiche.clients || 0, 
        suppliers: stats?.anagrafiche.suppliers || 0, 
        users: stats?.anagrafiche.users || 0 
      }
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: BarChart3,
      color: 'from-indigo-500 to-purple-500',
      pages: [
        { name: 'Delivery Analytics', href: '/delivery-analytics', icon: BarChart3 },
        { name: 'Viaggi Analytics', href: '/viaggi-analytics', icon: TrendingUp },
        { name: 'Performance Analytics', href: '/performance-analytics', icon: BarChart3 },
        { name: 'Report Avanzati', href: '/report-avanzati', icon: FileText }
      ],
      stats: { 
        'Delivery Reports': 1, 
        'Viaggi Reports': 1, 
        'Performance Reports': 1 
      }
    },
    {
      id: 'fatturazione',
      title: 'Fatturazione',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      pages: [
        { name: 'Fatturazione Terzisti', href: '/fatturazione-terzisti', icon: DollarSign },
        { name: 'Fatturazione Delivery', href: '/gestione', icon: Package },
        { name: 'Fatturazione Handling', href: '/handling', icon: Package }
      ],
      stats: { 
        monthly: stats?.fatturazione.monthly || '€0k', 
        pending: stats?.fatturazione.pending || '€0', 
        completed: stats?.fatturazione.completed || 0 
      }
    },
    {
      id: 'import',
      title: 'Import',
      icon: Upload,
      color: 'from-green-500 to-emerald-500',
      pages: [
        { name: 'Import Viaggi PoD', href: '/import_viaggi_PoD', icon: Upload },
        { name: 'Import Delivery', href: '/import-delivery', icon: Truck }
      ],
      stats: { 
        files: stats?.import.files || 0, 
        pending: stats?.import.pending || 0, 
        errors: stats?.import.errors || 0 
      }
    },
    {
      id: 'sistema',
      title: 'Sistema',
      icon: Settings,
      color: 'from-blue-500 to-indigo-500',
      pages: [
        { name: 'Configurazioni', href: '/sistema/configurazioni', icon: Settings },
        { name: 'Log Sistema', href: '/sistema/logs', icon: FileText },
        { name: 'Gestione Utenti', href: '/sistema', icon: Users },
        { name: 'Backup Dashboard', href: '/backup-dashboard', icon: Shield }
      ],
      stats: { 
        configs: stats?.sistema.configs || 0, 
        logs: stats?.sistema.logs || '0', 
        users: stats?.sistema.users || 0 
      }
    },
    {
      id: 'supporto',
      title: 'Supporto',
      icon: HelpCircle,
      color: 'from-purple-500 to-pink-500',
      pages: [
        { name: 'Funzionalità', href: '/funzionalita', icon: HelpCircle },
        { name: 'Guide PRD', href: '/documents/prd', icon: FileText },
        { name: 'Architettura Tecnica', href: '/documents/architettura', icon: Settings }
      ],
      stats: { 
        tickets: 0, 
        guide: 12, 
        docs: 2 
      }
    },
    {
      id: 'veicoli',
      title: 'Veicoli',
      icon: Car,
      color: 'from-orange-500 to-red-500',
      pages: [
        { name: 'Lista Veicoli', href: '/vehicles/list', icon: Car },
        { name: 'Gestione Scadenze', href: '/vehicles/schedules', icon: Calendar },
        { name: 'Calendario Veicoli', href: '/vehicles/schedules/calendar', icon: Calendar },
        { name: 'Preventivi Manutenzione', href: '/vehicles/quotes', icon: DollarSign },
        { name: 'Dashboard Veicoli', href: '/vehicles', icon: Car }
      ],
      stats: { 
        'Scadute': stats?.veicoli?.overdueSchedules || 0,
        'Scadenze attive': stats?.veicoli?.activeSchedules || 0, 
        'Preventivi aperti': stats?.veicoli?.openQuotes || 0, 
        'Veicoli totali': stats?.veicoli?.total || 0 
      }
    },
    {
      id: 'viaggi',
      title: 'Viaggi',
      icon: Truck,
      color: 'from-blue-500 to-cyan-500',
      pages: [
        { name: 'Gestione Viaggi', href: '/viaggi', icon: Truck },
        { name: 'Monitoraggio', href: '/monitoraggio', icon: BarChart3 },
        { name: 'Viaggi POD', href: '/viaggi-pod', icon: Package }
      ],
      stats: { 
        'Monitoraggi pending': stats?.viaggi.active || 0, 
        completed: stats?.viaggi.completed || 0, 
        'Viaggi PoD mancanti': stats?.viaggi.pending || 0 
      }
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="dashboard-title">Partesa Hub</h1>
            <p className="dashboard-subtitle">
              Benvenuto, <strong>{user?.username}</strong>! 
              <span className="user-role">{user?.role}</span>
            </p>
          </div>
          <div className="header-right">
            <div className="header-badges-large" style={{justifyContent: 'flex-end', marginLeft: 'auto'}}>
              <span className="header-badge-large datetime">
                <Calendar size={18} />
                <span style={{fontSize: '1.1rem', fontWeight: '600'}}>{currentDateTime.toLocaleDateString('it-IT')}</span>
              </span>
              <span className="header-badge-large datetime">
                <Clock size={18} />
                <span style={{fontSize: '1.1rem', fontWeight: '600'}}>{currentDateTime.toLocaleTimeString('it-IT', { hour12: false })}</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Messaggio di errore */}
      {statsError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Errore nel caricamento delle statistiche
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{statsError}</p>
                <button 
                  onClick={loadStats}
                  className="mt-2 text-red-800 underline hover:text-red-900"
                >
                  Riprova
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert documenti in scadenza */}
      <DocumentExpiryAlert className="mb-6" />

      {/* Sezioni Principali */}
      <div className="section-grid">
        {statsLoading ? (
          // Mostra skeleton loading
          Array.from({ length: 5 }).map((_, index) => (
            <SectionSkeleton key={index} />
          ))
        ) : (
          sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className={`dashboard-card ${activeSection === section.id ? 'active' : ''}`}
                onMouseEnter={() => setActiveSection(section.id)}
                onMouseLeave={() => setActiveSection(null)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="parallax-bg"></div>
                
                <div className="card-header">
                  <div className={`card-icon ${section.color}`}>
                    <Icon size={48} />
                  </div>
                  <h3 className="card-title">{section.title}</h3>
                </div>

                <div className="card-content">
                  <div className="page-links">
                    {section.pages.map((page, idx) => {
                      const PageIcon = page.icon;
                      
                      // Lista dei link da disabilitare
                      const disabledLinks = ['/clienti', '/fornitori', '/utenti', '/viaggi-analytics', '/performance-analytics', '/report-avanzati'];
                      const isDisabled = disabledLinks.includes(page.href) || (page.name === 'FAQ');
                      
                      if (isDisabled) {
                        return (
                          <span
                            key={page.name}
                            className="page-link disabled-link"
                            style={{ 
                              transitionDelay: `${idx * 0.05}s`,
                              color: '#ef4444',
                              cursor: 'not-allowed',
                              opacity: 0.7
                            }}
                          >
                            <PageIcon size={16} />
                            <span>{page.name}</span>
                          </span>
                        );
                      }
                      
                      return (
                        <Link
                          key={page.name}
                          href={page.href}
                          className="page-link"
                          style={{ transitionDelay: `${idx * 0.05}s` }}
                        >
                          <PageIcon size={16} />
                          <span>{page.name}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="card-stats">
                    {Object.entries(section.stats).map(([key, value]) => {
                      // Colora in rosso le statistiche 'tickets' e 'faq' nella sezione supporto
                      const isRedStat = section.id === 'supporto' && (key === 'tickets' || key === 'faq');
                      
                      // Mappa le chiavi alle label italiane
                      const getStatLabel = (key: string) => {
                        if (key === 'completed') return 'Viaggi completati';
                        if (key === 'suppliers') return 'Fornitori';
                        return key;
                      };
                      
                      // Rendi cliccabili 'Monitoraggi pending' e 'Viaggi PoD mancanti' nella sezione viaggi
                      const isClickable = section.id === 'viaggi' && (key === 'Monitoraggi pending' || key === 'Viaggi PoD mancanti');
                      
                      return (
                        <div key={key} className="stat-item">
                          <span className="stat-label">{getStatLabel(key)}</span>
                          <span 
                            className={`stat-value ${isClickable ? 'clickable-stat' : ''}`}
                            style={{
                              ...(isRedStat ? { color: '#ef4444' } : {})
                            }}
                            onClick={isClickable ? () => {
                              if (key === 'Monitoraggi pending') {
                                setIsTravelsNotInTabModalOpen(true);
                              } else if (key === 'Viaggi PoD mancanti') {
                                setIsPodMancantiModalOpen(true);
                              }
                            } : undefined}
                          >
                            <span className="stat-number">{value}</span>
                            {isClickable && (
                              <Eye size={14} className="stat-icon" />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button className="quick-action">
                  <Plus size={20} />
                </button>
              </div>
            );
          })
        )}


      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-badges">
            <span className="footer-badge version">
              <Code size={14} />
              <span>Versione 2.17.0</span>
            </span>
            <span className="footer-badge status">
              <Shield size={14} />
              <span>Stato: Autenticato</span>
            </span>
          </div>
        </div>
      </div>

      {/* Modal per i viaggi pending */}
      <PendingViaggiModal 
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
      />

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

    </div>
  );
}