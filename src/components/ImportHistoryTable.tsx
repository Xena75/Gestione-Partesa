'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ImportSession {
  session_id: string;
  total_rows: number;
  imported_rows: number;
  error_count: number;
  duration: number;
  created_at: string;
  status: 'success' | 'partial' | 'error';
}

interface ImportHistoryTableProps {
  sessions: ImportSession[];
}

export default function ImportHistoryTable({ sessions }: ImportHistoryTableProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'partial': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success';
      case 'partial': return 'bg-warning';
      case 'error': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Completata';
      case 'partial': return 'Parziale';
      case 'error': return 'Fallita';
      default: return 'Sconosciuto';
    }
  };

  const formatDate = (dateString: string) => {
    // IMPORTANTE: Mostra esattamente la data/ora presente nel database senza conversioni timezone
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSuccessRate = (imported: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((imported / total) * 100);
  };

  const toggleSessionDetails = (sessionId: string) => {
    setSelectedSession(selectedSession === sessionId ? null : sessionId);
  };

  return (
    <div className="import-history-table">
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>📊 Status</th>
              <th>🆔 Session ID</th>
              <th>📅 Data</th>
              <th>📈 Righe</th>
              <th>✅ Success Rate</th>
              <th>⏱️ Durata</th>
              <th>🔧 Azioni</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.session_id} className="align-middle">
                {/* Status */}
                <td>
                  <span className={`badge ${getStatusBadge(session.status)}`}>
                    {getStatusIcon(session.status)} {getStatusText(session.status)}
                  </span>
                </td>

                {/* Session ID */}
                <td>
                  <code className="small">{session.session_id}</code>
                </td>

                {/* Data */}
                <td>
                  <small>{formatDate(session.created_at)}</small>
                </td>

                {/* Righe */}
                <td>
                  <div className="d-flex flex-column">
                    <span className="fw-bold">{session.imported_rows}</span>
                    <small className="text-muted">
                      di {session.total_rows} totali
                    </small>
                  </div>
                </td>

                {/* Success Rate */}
                <td>
                  <div className="d-flex align-items-center">
                    <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                      <div 
                        className={`progress-bar ${getStatusBadge(session.status)}`}
                        style={{ width: `${getSuccessRate(session.imported_rows, session.total_rows)}%` }}
                      />
                    </div>
                    <small className="fw-bold">
                      {getSuccessRate(session.imported_rows, session.total_rows)}%
                    </small>
                  </div>
                </td>

                {/* Durata */}
                <td>
                  <small>{formatDuration(session.duration)}</small>
                </td>

                {/* Azioni */}
                <td>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => toggleSessionDetails(session.session_id)}
                      title="Dettagli"
                    >
                      👁️
                    </button>
                    <Link
                      href={`/import_viaggi_PoD/details/${session.session_id}`}
                      className="btn btn-outline-info btn-sm"
                      title="Visualizza Dati"
                    >
                      📊
                    </Link>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => {
                        if (confirm(`Eliminare l'importazione ${session.session_id}?`)) {
                          // TODO: Implementare eliminazione
                          alert('Funzionalità eliminazione non ancora implementata');
                        }
                      }}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dettagli Espandibili */}
      {selectedSession && (
        <div className="border-top">
          <div className="p-3 bg-light">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">📋 Dettagli Importazione</h6>
              <button
                className="btn-close"
                onClick={() => setSelectedSession(null)}
              />
            </div>
            
            {(() => {
              const session = sessions.find(s => s.session_id === selectedSession);
              if (!session) return null;

              return (
                <div className="row">
                  <div className="col-md-6">
                    <ul className="list-unstyled mb-0">
                      <li><strong>Session ID:</strong> <code>{session.session_id}</code></li>
                      <li><strong>Data Creazione:</strong> {formatDate(session.created_at)}</li>
                      <li><strong>Durata:</strong> {formatDuration(session.duration)}</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-unstyled mb-0">
                      <li><strong>Righe Totali:</strong> {session.total_rows}</li>
                      <li><strong>Righe Importate:</strong> {session.imported_rows}</li>
                      <li><strong>Errori:</strong> {session.error_count}</li>
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Paginazione (se necessario) */}
      {sessions.length > 10 && (
        <div className="card-footer bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Mostrando {sessions.length} importazioni
            </small>
            <div className="btn-group btn-group-sm">
              <button className="btn btn-outline-primary" disabled>
                ← Precedente
              </button>
              <button className="btn btn-outline-primary" disabled>
                Successiva →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
