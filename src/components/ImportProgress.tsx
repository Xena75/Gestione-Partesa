'use client';

interface ImportProgressProps {
  progress: number;
  currentStep: string;
  isImporting: boolean;
}

export default function ImportProgress({ progress, currentStep, isImporting }: ImportProgressProps) {
  const getProgressColor = () => {
    if (progress < 30) return 'danger';
    if (progress < 70) return 'warning';
    return 'success';
  };

  const getStepIcon = (step: string) => {
    if (step.includes('Inizializzazione')) return '🚀';
    if (step.includes('Validazione')) return '✅';
    if (step.includes('Lettura')) return '📖';
    if (step.includes('Elaborazione')) return '⚙️';
    if (step.includes('Importazione')) return '💾';
    if (step.includes('Completamento')) return '🎉';
    return '🔄';
  };

  return (
    <div className="import-progress">
      {/* Progress Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
              <span className="fs-1">📊</span>
            </div>
            <h4 className="mb-2">Importazione in Corso</h4>
            <p className="text-muted mb-0">
              Elaborazione dati Excel nel database
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold">{currentStep}</span>
              <span className="text-muted">{progress}%</span>
            </div>
            <div className="progress" style={{ height: '20px' }}>
              <div 
                className={`progress-bar bg-${getProgressColor()} progress-bar-striped progress-bar-animated`}
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {progress}%
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="row text-center">
              <div className="col-md-3">
                <div className={`step ${progress >= 10 ? 'completed' : 'pending'}`}>
                  <div className="step-icon">
                    {progress >= 10 ? '✅' : '⏳'}
                  </div>
                  <div className="step-label">Inizializzazione</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`step ${progress >= 30 ? 'completed' : progress >= 10 ? 'current' : 'pending'}`}>
                  <div className="step-icon">
                    {progress >= 30 ? '✅' : progress >= 10 ? '🔄' : '⏳'}
                  </div>
                  <div className="step-label">Validazione</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`step ${progress >= 70 ? 'completed' : progress >= 30 ? 'current' : 'pending'}`}>
                  <div className="step-icon">
                    {progress >= 70 ? '✅' : progress >= 30 ? '🔄' : '⏳'}
                  </div>
                  <div className="step-label">Elaborazione</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`step ${progress >= 100 ? 'completed' : progress >= 70 ? 'current' : 'pending'}`}>
                  <div className="step-icon">
                    {progress >= 100 ? '✅' : progress >= 70 ? '🔄' : '⏳'}
                  </div>
                  <div className="step-label">Completamento</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Activity */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-light">
          <h5 className="mb-0">🔄 Attività Corrente</h5>
        </div>
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <span className="fs-4">{getStepIcon(currentStep)}</span>
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-1">{currentStep}</h6>
              <p className="text-muted mb-0">
                {isImporting ? 'Elaborazione in corso...' : 'In attesa...'}
              </p>
            </div>
            {isImporting && (
              <div className="ms-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informazioni */}
      <div className="card shadow-sm border-0 mt-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">ℹ️ Informazioni</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <strong>Stato:</strong> 
                  <span className={`ms-2 badge bg-${getProgressColor()}`}>
                    {isImporting ? 'In Elaborazione' : 'In Attesa'}
                  </span>
                </li>
                <li className="mb-2">
                  <strong>Progresso:</strong> {progress}%
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <strong>Tempo Stimato:</strong> 
                  {progress > 0 ? `${Math.round((100 - progress) / 10)}s rimanenti` : 'Calcolo...'}
                </li>
                <li className="mb-2">
                  <strong>Fase:</strong> {Math.ceil(progress / 25)} di 4
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Stili CSS */}
      <style jsx>{`
        .import-progress {
          width: 100%;
        }
        
        .step-indicator {
          margin-top: 2rem;
        }
        
        .step {
          text-align: center;
          padding: 1rem 0.5rem;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .step.completed {
          background-color: #d4edda;
          color: #155724;
        }
        
        .step.current {
          background-color: #fff3cd;
          color: #856404;
          animation: pulse 2s infinite;
        }
        
        .step.pending {
          background-color: #f8f9fa;
          color: #6c757d;
        }
        
        .step-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .step-label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .progress-bar {
          transition: width 0.5s ease;
        }
      `}</style>
    </div>
  );
}
