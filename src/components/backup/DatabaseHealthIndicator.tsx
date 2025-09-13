'use client';

import React from 'react';
import { 
  Activity, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Wifi, 
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface DatabaseMetrics {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  connectionCount: number;
  maxConnections: number;
  queryResponseTime: number; // milliseconds
  transactionsPerSecond: number;
  errorRate: number; // percentage
  uptime: number; // seconds
  lastBackupAge: number; // hours
}

interface DatabaseHealth {
  name: string;
  isOnline: boolean;
  overallHealth: number; // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical' | 'offline';
  metrics: DatabaseMetrics;
  alerts: string[];
  lastChecked: string;
  trend: 'up' | 'down' | 'stable';
}

interface DatabaseHealthIndicatorProps {
  database: DatabaseHealth;
  showDetails?: boolean;
  className?: string;
}

export default function DatabaseHealthIndicator({ 
  database, 
  showDetails = false, 
  className = '' 
}: DatabaseHealthIndicatorProps) {
  // Ottieni colore salute
  const getHealthColor = (health: number): string => {
    if (health >= 90) return 'text-success';
    if (health >= 75) return 'text-primary';
    if (health >= 60) return 'text-warning';
    if (health >= 40) return 'text-warning';
    return 'text-danger';
  };

  // Ottieni colore background salute
  const getHealthBgColor = (health: number): string => {
    if (health >= 90) return 'bg-success-subtle';
    if (health >= 75) return 'bg-primary-subtle';
    if (health >= 60) return 'bg-warning-subtle';
    if (health >= 40) return 'bg-warning-subtle';
    return 'bg-danger-subtle';
  };

  // Ottieni colore barra salute
  const getHealthBarColor = (health: number): string => {
    if (health >= 90) return 'bg-success';
    if (health >= 75) return 'bg-primary';
    if (health >= 60) return 'bg-warning';
    if (health >= 40) return 'bg-warning';
    return 'bg-danger';
  };

  // Ottieni icona stato
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle size={20} className="text-success" />;
      case 'good': return <CheckCircle size={20} className="text-primary" />;
      case 'warning': return <AlertTriangle size={20} className="text-warning" />;
      case 'critical': return <XCircle size={20} className="text-danger" />;
      case 'offline': return <WifiOff size={20} className="text-secondary" />;
      default: return <Clock size={20} className="text-secondary" />;
    }
  };

  // Ottieni icona trend
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} className="text-success" />;
      case 'down': return <TrendingDown size={16} className="text-danger" />;
      case 'stable': return <Minus size={16} className="text-secondary" />;
      default: return <Minus size={16} className="text-secondary" />;
    }
  };

  // Formatta uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Ottieni colore metrica
  const getMetricColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-success';
    if (value <= thresholds.warning) return 'text-warning';
    return 'text-danger';
  };

  // Ottieni stato connessione
  const getConnectionStatus = (): { color: string; text: string } => {
    const usage = (database.metrics.connectionCount / database.metrics.maxConnections) * 100;
    if (usage < 70) return { color: 'text-success', text: 'Normale' };
    if (usage < 85) return { color: 'text-warning', text: 'Elevato' };
    return { color: 'text-danger', text: 'Critico' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center">
            <Database size={24} className="text-primary me-3" />
            <div>
              <h3 className="h5 mb-1">{database.name}</h3>
              <div className="d-flex align-items-center">
                {database.isOnline ? (
                  <>
                    <Wifi size={16} className="text-success me-2" />
                    <span className="small text-success fw-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} className="text-danger me-2" />
                    <span className="small text-danger fw-medium">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="d-flex align-items-center">
            <div className="me-2">{getTrendIcon(database.trend)}</div>
            {getStatusIcon(database.status)}
          </div>
        </div>

        {/* Salute generale */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center">
              <Activity size={16} className="text-muted me-2" />
              <span className="small fw-medium">Salute Generale</span>
            </div>
            <div className="d-flex align-items-center">
              <span className={`h5 fw-bold me-2 ${getHealthColor(database.overallHealth)}`}>
                {database.overallHealth}%
              </span>
              <span className={`badge rounded-pill ${getHealthColor(database.overallHealth)} ${getHealthBgColor(database.overallHealth)}`}>
                {database.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="progress" style={{ height: '12px' }}>
            <div 
              className={`progress-bar ${getHealthBarColor(database.overallHealth)}`}
              style={{ width: `${database.overallHealth}%` }}
            ></div>
          </div>
        </div>

        {/* Metriche principali */}
        <div className="row g-3 mb-4">
          {/* CPU */}
          <div className="col-6 col-md-3">
            <div className="text-center">
              <Cpu size={20} className="text-muted d-block mx-auto mb-1" />
              <p className="small text-muted mb-1">CPU</p>
              <p className={`small fw-semibold ${getMetricColor(database.metrics.cpuUsage, { good: 70, warning: 85 })}`}>
                {database.metrics.cpuUsage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Memoria */}
          <div className="col-6 col-md-3">
            <div className="text-center">
              <MemoryStick size={20} className="text-muted d-block mx-auto mb-1" />
              <p className="small text-muted mb-1">Memoria</p>
              <p className={`small fw-semibold ${getMetricColor(database.metrics.memoryUsage, { good: 75, warning: 90 })}`}>
                {database.metrics.memoryUsage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Disco */}
          <div className="col-6 col-md-3">
            <div className="text-center">
              <HardDrive size={20} className="text-muted d-block mx-auto mb-1" />
              <p className="small text-muted mb-1">Disco</p>
              <p className={`small fw-semibold ${getMetricColor(database.metrics.diskUsage, { good: 80, warning: 90 })}`}>
                {database.metrics.diskUsage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Connessioni */}
          <div className="col-6 col-md-3">
            <div className="text-center">
              <Wifi size={20} className="text-muted d-block mx-auto mb-1" />
              <p className="small text-muted mb-1">Connessioni</p>
              <p className={`small fw-semibold ${connectionStatus.color}`}>
                {database.metrics.connectionCount}/{database.metrics.maxConnections}
              </p>
            </div>
          </div>
        </div>

        {/* Dettagli aggiuntivi */}
        {showDetails && (
          <div className="pt-3 border-top">
            {/* Performance */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-4">
                <p className="small text-muted mb-1">Tempo Risposta Query</p>
                <p className={`small fw-medium ${getMetricColor(database.metrics.queryResponseTime, { good: 100, warning: 500 })}`}>
                  {database.metrics.queryResponseTime}ms
                </p>
              </div>
              <div className="col-12 col-md-4">
                <p className="small text-muted mb-1">Transazioni/sec</p>
                <p className="small fw-medium">
                  {database.metrics.transactionsPerSecond.toFixed(1)}
                </p>
              </div>
              <div className="col-12 col-md-4">
                <p className="small text-muted mb-1">Tasso Errori</p>
                <p className={`small fw-medium ${getMetricColor(database.metrics.errorRate, { good: 1, warning: 5 })}`}>
                  {database.metrics.errorRate.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Uptime e ultimo backup */}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <p className="small text-muted mb-1">Uptime</p>
                <p className="small fw-medium">
                  {formatUptime(database.metrics.uptime)}
                </p>
              </div>
              <div className="col-12 col-md-6">
                <p className="small text-muted mb-1">Ultimo Backup</p>
                <p className={`small fw-medium ${
                  database.metrics.lastBackupAge < 24 ? 'text-success' :
                  database.metrics.lastBackupAge < 48 ? 'text-warning' :
                  'text-danger'
                }`}>
                  {database.metrics.lastBackupAge < 1 ? 
                    'Meno di 1h fa' : 
                    `${Math.floor(database.metrics.lastBackupAge)}h fa`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alert attivi */}
        {database.alerts.length > 0 && (
          <div className="mt-4 pt-3 border-top">
            <p className="small text-muted mb-2">Alert Attivi:</p>
            <div className="d-flex flex-column gap-1">
              {database.alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="d-flex align-items-center">
                  <AlertTriangle size={12} className="text-warning me-2 flex-shrink-0" />
                  <span className="small">{alert}</span>
                </div>
              ))}
              {database.alerts.length > 3 && (
                <p className="small text-muted fst-italic">
                  +{database.alerts.length - 3} altri alert...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="d-flex align-items-center justify-content-between small text-muted mt-4 pt-2 border-top">
          <span>Ultimo controllo: {new Date(database.lastChecked).toLocaleTimeString('it-IT')}</span>
          <span className={connectionStatus.color}>{connectionStatus.text}</span>
        </div>
      </div>
    </div>
  );
}