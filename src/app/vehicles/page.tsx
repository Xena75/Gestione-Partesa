'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Car, Calendar, DollarSign, AlertTriangle, CheckCircle, 
  Clock, TrendingUp, Users, Settings, Plus, Eye, List, FileText 
} from 'lucide-react';

interface VehicleStats {
  total_vehicles: number;
  active_schedules: number;
  overdue_schedules: number;
  open_quotes: number;
  monthly_maintenance_cost: number;
  upcoming_deadlines: number;
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  date: string;
  status: string;
}

export default function VehiclesDashboard() {
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carica statistiche
      const statsResponse = await fetch('/api/vehicles/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
      
      // Carica attività recenti
      const activityResponse = await fetch('/api/vehicles/recent-activity', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati dashboard:', error);
      // Dati di fallback
      setStats({
        total_vehicles: 0,
        active_schedules: 0,
        overdue_schedules: 0,
        open_quotes: 0,
        monthly_maintenance_cost: 0,
        upcoming_deadlines: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'overdue': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-1">
                <Car className="me-2" size={32} />
                Dashboard Veicoli
              </h1>
              <p className="text-muted mb-0">
                Gestione completa del parco veicoli e manutenzioni
              </p>
            </div>
            <div className="d-flex gap-2">
              <Link href="/vehicles/schedules" className="btn btn-primary">
                <Plus size={16} className="me-1" />
                Nuova Scadenza
              </Link>
              <Link href="/dashboard" className="btn btn-outline-secondary">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>



      {/* Statistiche Principali */}
      <div className="row mb-4">
        <div className="col-md-6 col-lg-3 mb-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center">
              <div className="p-3 bg-primary bg-opacity-10 rounded me-3">
                <Car size={24} className="text-primary" />
              </div>
              <div>
                <p className="card-text text-muted small mb-1">Veicoli Totali</p>
                <h4 className="card-title mb-0">{stats?.total_vehicles || 0}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3 mb-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center">
              <div className="p-3 bg-warning bg-opacity-10 rounded me-3">
                <Calendar size={24} className="text-warning" />
              </div>
              <div>
                <p className="card-text text-muted small mb-1">Scadenze Attive</p>
                <h4 className="card-title mb-0">{stats?.active_schedules || 0}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3 mb-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center">
              <div className="p-3 bg-danger bg-opacity-10 rounded me-3">
                <AlertTriangle size={24} className="text-danger" />
              </div>
              <div>
                <p className="card-text text-muted small mb-1">Scadenze Scadute</p>
                <h4 className="card-title mb-0">{stats?.overdue_schedules || 0}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3 mb-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center">
              <div className="p-3 bg-success bg-opacity-10 rounded me-3">
                <DollarSign size={24} className="text-success" />
              </div>
              <div>
                <p className="card-text text-muted small mb-1">Preventivi Aperti</p>
                <h4 className="card-title mb-0">{stats?.open_quotes || 0}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni Rapide */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">
                <Settings className="me-2" size={20} />
                Azioni Rapide
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 col-lg-3 mb-3">
                  <Link href="/vehicles/list" className="btn btn-outline-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                    <List size={32} className="mb-2" />
                    <span>Lista Veicoli</span>
                  </Link>
                </div>
                <div className="col-md-6 col-lg-3 mb-3">
                  <Link href="/vehicles/schedules" className="btn btn-outline-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                    <Calendar size={32} className="mb-2" />
                    <span>Gestione Scadenze</span>
                  </Link>
                </div>
                <div className="col-md-6 col-lg-3 mb-3">
                  <Link href="/vehicles/schedules/calendar" className="btn btn-outline-info w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                    <Calendar size={32} className="mb-2" />
                    <span>Calendario</span>
                  </Link>
                </div>
                <div className="col-md-6 col-lg-3 mb-3">
                  <Link href="/vehicles/quotes" className="btn btn-outline-success w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                    <DollarSign size={32} className="mb-2" />
                    <span>Preventivi</span>
                  </Link>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 col-lg-3 mb-3">
                  <Link href="/vehicles/documents" className="btn btn-outline-info w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                    <FileText size={32} className="mb-2" />
                    <span>Gestione Documenti</span>
                  </Link>
                </div>
                <div className="col-md-6 col-lg-3 mb-3">
                  <Link href="/vehicles/maintenance-monitoring" className="btn btn-outline-warning w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                    <AlertTriangle size={32} className="mb-2" />
                    <span>Monitoraggio Tagliandi</span>
                  </Link>
                </div>
                <div className="col-md-6 col-lg-3 mb-3">
                  <Link href="/vehicles/maintenance-settings" className="btn btn-outline-secondary w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                    <Settings size={32} className="mb-2" />
                    <span>Configurazione Soglie</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attività Recenti */}
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <Clock className="me-2" size={20} />
                Attività Recenti
              </h5>
              <Link href="/vehicles/schedules" className="btn btn-sm btn-outline-primary">
                <Eye size={16} className="me-1" />
                Vedi Tutte
              </Link>
            </div>
            <div className="card-body">
              {recentActivity.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="list-group-item border-0 px-0">
                      <div className="d-flex align-items-center">
                        <div className={`me-3 ${getStatusColor(activity.status)}`}>
                          {getStatusIcon(activity.status)}
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-1">{activity.description}</p>
                          <small className="text-muted">
                            {new Date(activity.date).toLocaleDateString('it-IT')}
                          </small>
                        </div>
                        <span className={`badge ${activity.status === 'completed' ? 'bg-success' : activity.status === 'overdue' ? 'bg-danger' : 'bg-warning'}`}>
                          {activity.status === 'completed' ? 'Completato' : 
                           activity.status === 'overdue' ? 'Scaduto' : 'In Attesa'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock size={48} className="text-muted mb-3" />
                  <p className="text-muted">Nessuna attività recente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">
                <TrendingUp className="me-2" size={20} />
                Riepilogo Mensile
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Costo Manutenzioni</span>
                  <strong>{formatCurrency(stats?.monthly_maintenance_cost || 0)}</strong>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div className="progress-bar bg-primary" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Scadenze Prossime</span>
                  <strong>{stats?.upcoming_deadlines || 0}</strong>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div className="progress-bar bg-warning" style={{ width: '40%' }}></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Efficienza Flotta</span>
                  <strong>85%</strong>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div className="progress-bar bg-success" style={{ width: '85%' }}></div>
                </div>
              </div>

              <hr />
              
              <div className="text-center">
                <button className="btn btn-outline-primary btn-sm" disabled>
                  <TrendingUp size={16} className="me-1" />
                  Report Dettagliato
                  <br />
                  <small className="text-muted">(Prossimamente)</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}