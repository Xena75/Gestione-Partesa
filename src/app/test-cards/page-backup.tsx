'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Users, Package, Truck, Calendar, AlertTriangle, CheckCircle, FileText, Clock, Home } from 'lucide-react';

export default function TestCardsPage() {
  // Dati di esempio per le statistiche
  const vehicleStats = [
    { icon: Truck, label: 'Veicoli Attivi', value: '24', color: 'primary' },
    { icon: AlertTriangle, label: 'Manutenzioni', value: '3', color: 'warning' },
    { icon: CheckCircle, label: 'Revisioni OK', value: '21', color: 'success' },
    { icon: Calendar, label: 'Scadenze', value: '7', color: 'info' }
  ];

  const quoteStats = [
    { icon: FileText, label: 'Preventivi Attivi', value: '12', color: 'primary' },
    { icon: Clock, label: 'In Attesa', value: '8', color: 'warning' },
    { icon: CheckCircle, label: 'Approvati', value: '4', color: 'success' }
  ];

  const scheduleStats = [
    { icon: AlertTriangle, label: 'Scadute', value: '3', color: 'danger' },
    { icon: Clock, label: 'Prossime (7gg)', value: '7', color: 'warning' },
    { icon: Calendar, label: 'Prossime (30gg)', value: '15', color: 'info' },
    { icon: CheckCircle, label: 'Completate', value: '28', color: 'success' }
  ];

  const supplierStats = [
    { icon: Users, label: 'Fornitori Attivi', value: '18', color: 'primary' },
    { icon: TrendingUp, label: 'Nuovi (Mese)', value: '3', color: 'success' },
    { icon: Package, label: 'Servizi', value: '45', color: 'info' }
  ];

  // Componente per le card riutilizzabili
  const StatsCard = ({ title, stats, navigationLinks, className = '', style = {}, showNavigation = true }) => (
    <div className={`card h-100 ${className}`} style={style}>
      <div className="card-header bg-light">
        <h6 className="card-title mb-0">{title}</h6>
      </div>
      <div className="card-body d-flex flex-column">
        <div className="flex-grow-1">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="d-flex align-items-center justify-content-between mb-2">
                <div className="d-flex align-items-center">
                  <IconComponent size={16} className={`text-${stat.color} me-2`} />
                  <span className="small">{stat.label}</span>
                </div>
                <span className={`badge bg-${stat.color}`}>{stat.value}</span>
              </div>
            );
          })}
        </div>
        
        {showNavigation && (
          <div className="mt-3 pt-3 border-top">
            <h6 className="small text-muted mb-2">Collegamenti Rapidi</h6>
            <div className="d-flex flex-wrap gap-1">
              {navigationLinks.slice(0, 3).map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <button key={index} className={`btn btn-sm ${link.variant}`} style={{ fontSize: '0.75rem' }}>
                    <IconComponent size={12} className="me-1" />
                    {link.label}
                  </button>
                );
              })}
            </div>
            <div className="d-flex flex-wrap gap-1 mt-1">
              {navigationLinks.slice(3).map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <button key={index + 3} className={`btn btn-sm ${link.variant}`} style={{ fontSize: '0.75rem' }}>
                    <IconComponent size={12} className="me-1" />
                    {link.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="text-center mb-5">🧪 Test Soluzioni Allineamento Card</h1>

          {/* PROBLEMA ORIGINALE */}
          <section className="mb-5">
            <h2 className="mb-4">❌ PROBLEMA: Card Disallineate</h2>
            <p className="text-muted mb-4">
              Ecco come appaiono le card quando hanno contenuti di altezze diverse - nota il disallineamento:
            </p>
            <div className="row">
              <div className="col-md-4 mb-4">
                <div className="card h-auto">
                  <div className="card-body">
                    <h5 className="card-title">
                      <Truck className="me-2" size={20} />
                      Gestione Veicoli
                    </h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Veicoli Attivi:</span>
                        <strong>24</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Manutenzioni:</span>
                        <strong className="text-warning">3</strong>
                      </div>
                    </div>
                    <hr />
                    <div className="d-flex flex-wrap gap-2">
                      <a href="/vehicles" className="btn btn-outline-secondary btn-sm">
                        <Truck size={16} className="me-1" />
                        Dashboard Veicoli
                      </a>
                      <a href="/vehicles/calendar" className="btn btn-outline-secondary btn-sm">
                        <Calendar size={16} className="me-1" />
                        Calendario
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-auto">
                  <div className="card-body">
                    <h5 className="card-title">
                      <FileText className="me-2" size={20} />
                      Sistema Preventivi
                    </h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Preventivi Attivi:</span>
                        <strong>12</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>In Attesa:</span>
                        <strong>8</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Approvati:</span>
                        <strong>4</strong>
                      </div>
                    </div>
                    <hr />
                    <div className="d-flex flex-wrap gap-2">
                      <a href="/vehicles/quotes" className="btn btn-primary btn-sm">
                        <FileText size={16} className="me-1" />
                        Nuovo Preventivo
                      </a>
                      <a href="/vehicles/schedules" className="btn btn-outline-secondary btn-sm">
                        <Clock size={16} className="me-1" />
                        Scadenze
                      </a>
                      <a href="/vehicles/suppliers" className="btn btn-outline-secondary btn-sm">
                        <Users size={16} className="me-1" />
                        Fornitori
                      </a>
                      <a href="/vehicles" className="btn btn-outline-secondary btn-sm">
                        <Truck size={16} className="me-1" />
                        Dashboard Veicoli
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-auto">
                  <div className="card-body">
                    <h5 className="card-title">
                      <Clock className="me-2" size={20} />
                      Monitoraggio Scadenze
                    </h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Scadute:</span>
                        <strong className="text-danger">3</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Prossime (7gg):</span>
                        <strong className="text-warning">7</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Prossime (30gg):</span>
                        <strong className="text-info">15</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Completate:</span>
                        <strong className="text-success">28</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Totale:</span>
                        <strong>53</strong>
                      </div>
                    </div>
                    <hr />
                    <div className="d-flex flex-wrap gap-2">
                      <a href="/vehicles/schedules" className="btn btn-outline-secondary btn-sm">
                        <Clock size={16} className="me-1" />
                        Scadenze
                      </a>
                      <a href="/vehicles/calendar" className="btn btn-outline-secondary btn-sm">
                        <Calendar size={16} className="me-1" />
                        Calendario
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SOLUZIONE 1: ALTEZZA FISSA */}
          <section className="mb-5">
            <h2 className="mb-4">✅ SOLUZIONE 1: Altezza Fissa (min-height)</h2>
            <p className="text-muted mb-4">
              Tutte le card hanno la stessa altezza minima (300px). Le card più piccole avranno spazio vuoto in basso.
            </p>
            <div className="row">
              <div className="col-md-4 mb-4">
                <div className="card" style={{ minHeight: '300px' }}>
                  <div className="card-body">
                    <h5 className="card-title">
                      <Truck className="me-2" size={20} />
                      Gestione Veicoli
                    </h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Veicoli Attivi:</span>
                        <strong>24</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Manutenzioni:</span>
                        <strong className="text-warning">3</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card" style={{ minHeight: '300px' }}>
                  <div className="card-body">
                    <h5 className="card-title">
                      <FileText className="me-2" size={20} />
                      Sistema Preventivi
                    </h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Preventivi Attivi:</span>
                        <strong>12</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>In Attesa:</span>
                        <strong>8</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Approvati:</span>
                        <strong>4</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card" style={{ minHeight: '300px' }}>
                  <div className="card-body">
                    <h5 className="card-title">
                      <Clock className="me-2" size={20} />
                      Monitoraggio Scadenze
                    </h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Scadute:</span>
                        <strong className="text-danger">3</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Prossime (7gg):</span>
                        <strong className="text-warning">7</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Prossime (30gg):</span>
                        <strong className="text-info">15</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Completate:</span>
                        <strong className="text-success">28</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Totale:</span>
                        <strong>53</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}