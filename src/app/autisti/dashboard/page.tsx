'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, FileText, Clock, AlertTriangle, User, MapPin } from 'lucide-react';

interface EmployeeData {
  id: number;
  nome: string;
  cognome: string;
  codice_dipendente: string;
  telefono: string;
  email: string;
  data_assunzione: string;
  ferie_residue: number;
  documenti_in_scadenza: number;
  richieste_ferie_pending: number;
}

interface RecentLeaveRequest {
  id: number;
  data_inizio: string;
  data_fine: string;
  giorni_richiesti: number;
  stato: string;
  data_richiesta: string;
}

interface ExpiringDocument {
  id: number;
  tipo_documento: string;
  data_scadenza: string;
  giorni_alla_scadenza: number;
}

export default function AutistiDashboardPage() {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [recentLeaveRequests, setRecentLeaveRequests] = useState<RecentLeaveRequest[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dati dipendente
      const employeeResponse = await fetch(`/api/employees/${user?.id}`);
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        setEmployeeData(employeeData);
      }

      // Fetch richieste ferie recenti
      const leaveResponse = await fetch(`/api/employees/${user?.id}/leave?limit=5`);
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json();
        setRecentLeaveRequests(leaveData);
      }

      // Fetch documenti in scadenza
      const documentsResponse = await fetch(`/api/employees/${user?.id}/documents?expiring=true`);
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setExpiringDocuments(documentsData);
      }

    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approvata':
        return 'bg-success';
      case 'rifiutata':
        return 'bg-danger';
      case 'in_attesa':
      case 'pending':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approvata':
        return 'Approvata';
      case 'rifiutata':
        return 'Rifiutata';
      case 'in_attesa':
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="text-light mt-3">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <AlertTriangle className="me-2" size={20} />
        {error}
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header di benvenuto */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h3 mb-1">
                    <User className="me-2" size={24} />
                    Benvenuto, {employeeData?.nome} {employeeData?.cognome}
                  </h1>
                  <p className="mb-0 opacity-75">
                    Codice Dipendente: {employeeData?.codice_dipendente} | 
                    Data Assunzione: {employeeData?.data_assunzione ? formatDate(employeeData.data_assunzione) : 'N/A'}
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    <span className="badge bg-light text-primary fs-6 mb-1">
                      Ferie Residue: {employeeData?.ferie_residue || 0} giorni
                    </span>
                    <small className="opacity-75">
                      Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards di riepilogo */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-success">
            <div className="card-body text-center">
              <Calendar className="text-success mb-2" size={32} />
              <h5 className="text-success">{employeeData?.ferie_residue || 0}</h5>
              <p className="text-light mb-0">Giorni di Ferie</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-warning">
            <div className="card-body text-center">
              <Clock className="text-warning mb-2" size={32} />
              <h5 className="text-warning">{employeeData?.richieste_ferie_pending || 0}</h5>
              <p className="text-light mb-0">Richieste in Attesa</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-danger">
            <div className="card-body text-center">
              <AlertTriangle className="text-danger mb-2" size={32} />
              <h5 className="text-danger">{expiringDocuments.length}</h5>
              <p className="text-light mb-0">Documenti in Scadenza</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-info">
            <div className="card-body text-center">
              <FileText className="text-info mb-2" size={32} />
              <h5 className="text-info">{employeeData?.documenti_in_scadenza || 0}</h5>
              <p className="text-light mb-0">Documenti Totali</p>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <MapPin className="me-2" size={20} />
                Azioni Rapide
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-2">
                  <a href="/autisti/ferie" className="btn btn-primary w-100">
                    <Calendar className="me-2" size={16} />
                    Richiedi Ferie
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <a href="/autisti/documenti" className="btn btn-info w-100">
                    <FileText className="me-2" size={16} />
                    I Miei Documenti
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <a href="/autisti/ferie?tab=storico" className="btn btn-secondary w-100">
                    <Clock className="me-2" size={16} />
                    Storico Ferie
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <button className="btn btn-outline-light w-100" onClick={fetchDashboardData}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Aggiorna
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Richieste ferie recenti */}
        <div className="col-md-6 mb-4">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <Calendar className="me-2" size={20} />
                Richieste Ferie Recenti
              </h5>
            </div>
            <div className="card-body">
              {recentLeaveRequests.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentLeaveRequests.map((request) => (
                    <div key={request.id} className="list-group-item bg-dark border-secondary text-light">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">
                            {formatDate(request.data_inizio)} - {formatDate(request.data_fine)}
                          </h6>
                          <p className="mb-1">
                            {request.giorni_richiesti} giorni richiesti
                          </p>
                          <small className="text-muted">
                            Richiesta del {formatDate(request.data_richiesta)}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(request.stato)}`}>
                          {getStatusText(request.stato)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <Calendar size={48} className="mb-3 opacity-50" />
                  <p>Nessuna richiesta di ferie recente</p>
                  <a href="/autisti/ferie" className="btn btn-primary btn-sm">
                    Richiedi Ferie
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documenti in scadenza */}
        <div className="col-md-6 mb-4">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <AlertTriangle className="me-2" size={20} />
                Documenti in Scadenza
              </h5>
            </div>
            <div className="card-body">
              {expiringDocuments.length > 0 ? (
                <div className="list-group list-group-flush">
                  {expiringDocuments.map((doc) => (
                    <div key={doc.id} className="list-group-item bg-dark border-secondary text-light">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{doc.tipo_documento}</h6>
                          <p className="mb-1">
                            Scadenza: {formatDate(doc.data_scadenza)}
                          </p>
                        </div>
                        <span className={`badge ${doc.giorni_alla_scadenza <= 30 ? 'bg-danger' : 'bg-warning'}`}>
                          {doc.giorni_alla_scadenza} giorni
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <FileText size={48} className="mb-3 opacity-50" />
                  <p>Nessun documento in scadenza</p>
                  <a href="/autisti/documenti" className="btn btn-info btn-sm">
                    Visualizza Documenti
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}