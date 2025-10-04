'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MaintenanceThreshold {
  id: number;
  threshold_type: string;
  km_value: number;
  description: string;
  updated_at: string;
}

export default function MaintenanceSettingsPage() {
  const router = useRouter();
  const [thresholds, setThresholds] = useState<MaintenanceThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [warningKm, setWarningKm] = useState<number>(12000);
  const [criticalKm, setCriticalKm] = useState<number>(15000);
  const [warningDesc, setWarningDesc] = useState<string>('');
  const [criticalDesc, setCriticalDesc] = useState<string>('');

  // Carica le soglie attuali
  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles/maintenance-thresholds');
      const result = await response.json();

      if (result.success) {
        setThresholds(result.data);
        
        // Popola il form con i valori attuali
        const warning = result.data.find((t: MaintenanceThreshold) => t.threshold_type === 'warning');
        const critical = result.data.find((t: MaintenanceThreshold) => t.threshold_type === 'critical');
        
        if (warning) {
          setWarningKm(warning.km_value);
          setWarningDesc(warning.description);
        }
        if (critical) {
          setCriticalKm(critical.km_value);
          setCriticalDesc(critical.description);
        }
      } else {
        setError('Errore nel caricamento delle soglie');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validazione
    if (warningKm >= criticalKm) {
      setError('La soglia di avviso deve essere inferiore alla soglia critica');
      return;
    }

    if (warningKm <= 0 || criticalKm <= 0) {
      setError('I valori delle soglie devono essere positivi');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updatedThresholds = [
        {
          threshold_type: 'warning',
          km_value: warningKm,
          description: warningDesc
        },
        {
          threshold_type: 'critical',
          km_value: criticalKm,
          description: criticalDesc
        }
      ];

      const response = await fetch('/api/vehicles/maintenance-thresholds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thresholds: updatedThresholds }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Soglie aggiornate con successo!');
        setThresholds(result.data);
        
        // Ricarica la pagina dopo 2 secondi per mostrare i nuovi valori
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(result.error || 'Errore nell\'aggiornamento delle soglie');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (kmPercorsi: number) => {
    if (kmPercorsi < warningKm) return 'success';
    if (kmPercorsi < criticalKm) return 'warning';
    return 'danger';
  };

  const getStatusText = (kmPercorsi: number) => {
    if (kmPercorsi < warningKm) return 'OK';
    if (kmPercorsi < criticalKm) return 'In Scadenza';
    return 'Scaduto';
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
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
              <h1 className="h3 mb-0">Configurazione Soglie Manutenzione</h1>
              <p className="text-muted mb-0">
                Gestisci le soglie chilometriche per il monitoraggio della manutenzione veicoli
              </p>
            </div>
            <button
              className="btn btn-outline-secondary"
              onClick={() => router.back()}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Indietro
            </button>
          </div>
        </div>
      </div>

      {/* Alert messaggi */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess(null)}
          ></button>
        </div>
      )}

      <div className="row">
        {/* Form Configurazione */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-gear-fill me-2"></i>
                Configurazione Soglie
              </h5>
            </div>
            <div className="card-body">
              {/* Soglia Warning */}
              <div className="mb-4">
                <label className="form-label fw-bold">
                  <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                  Soglia di Avviso (Giallo)
                </label>
                <div className="input-group mb-2">
                  <input
                    type="number"
                    className="form-control"
                    value={warningKm}
                    onChange={(e) => setWarningKm(parseInt(e.target.value) || 0)}
                    min="1"
                    max="50000"
                  />
                  <span className="input-group-text">km</span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Descrizione soglia di avviso"
                  value={warningDesc}
                  onChange={(e) => setWarningDesc(e.target.value)}
                />
                <div className="form-text">
                  Veicoli con chilometraggio superiore a questo valore saranno contrassegnati come "In Scadenza"
                </div>
              </div>

              {/* Soglia Critical */}
              <div className="mb-4">
                <label className="form-label fw-bold">
                  <i className="bi bi-exclamation-octagon text-danger me-2"></i>
                  Soglia Critica (Rosso)
                </label>
                <div className="input-group mb-2">
                  <input
                    type="number"
                    className="form-control"
                    value={criticalKm}
                    onChange={(e) => setCriticalKm(parseInt(e.target.value) || 0)}
                    min="1"
                    max="50000"
                  />
                  <span className="input-group-text">km</span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Descrizione soglia critica"
                  value={criticalDesc}
                  onChange={(e) => setCriticalDesc(e.target.value)}
                />
                <div className="form-text">
                  Veicoli con chilometraggio superiore a questo valore saranno contrassegnati come "Scaduto"
                </div>
              </div>

              {/* Pulsante Salva */}
              <div className="d-grid">
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-2"></i>
                      Salva Configurazione
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Anteprima */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-eye-fill me-2"></i>
                Anteprima Stati
              </h5>
            </div>
            <div className="card-body">
              <p className="text-muted mb-3">
                Anteprima di come verranno visualizzati i diversi stati di manutenzione:
              </p>

              {/* Esempi di stato */}
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <span className={`badge bg-${getStatusColor(8000)} me-3`}>
                    {getStatusText(8000)}
                  </span>
                  <span>8.000 km - Manutenzione OK</span>
                </div>
                <div className="progress mb-3" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-success"
                    style={{ width: `${Math.min((8000 / criticalKm) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <span className={`badge bg-${getStatusColor(warningKm + 1000)} me-3`}>
                    {getStatusText(warningKm + 1000)}
                  </span>
                  <span>{(warningKm + 1000).toLocaleString('it-IT')} km - In Scadenza</span>
                </div>
                <div className="progress mb-3" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-warning"
                    style={{ width: `${Math.min(((warningKm + 1000) / criticalKm) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <span className={`badge bg-${getStatusColor(criticalKm + 2000)} me-3`}>
                    {getStatusText(criticalKm + 2000)}
                  </span>
                  <span>{(criticalKm + 2000).toLocaleString('it-IT')} km - Scaduto</span>
                </div>
                <div className="progress mb-3" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-danger"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>

              {/* Informazioni soglie attuali */}
              <div className="mt-4 p-3 bg-light rounded">
                <h6 className="fw-bold mb-2">Soglie Attuali:</h6>
                <div className="row">
                  <div className="col-6">
                    <small className="text-muted">Avviso:</small>
                    <div className="fw-bold text-warning">{warningKm.toLocaleString('it-IT')} km</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Critica:</small>
                    <div className="fw-bold text-danger">{criticalKm.toLocaleString('it-IT')} km</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Link al monitoraggio */}
          <div className="card mt-3">
            <div className="card-body text-center">
              <h6 className="card-title">
                <i className="bi bi-speedometer2 me-2"></i>
                Monitoraggio Tagliandi
              </h6>
              <p className="card-text text-muted">
                Visualizza il dashboard di monitoraggio con le nuove soglie
              </p>
              <a
                href="/vehicles/maintenance-monitoring"
                className="btn btn-outline-primary"
              >
                <i className="bi bi-arrow-right me-2"></i>
                Vai al Monitoraggio
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}