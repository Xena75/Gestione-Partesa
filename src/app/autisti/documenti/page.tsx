'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Upload, AlertTriangle, Calendar, Download, Eye, Plus } from 'lucide-react';
import { formatDateItalian, formatDateInput, handleDateInputChange, convertItalianToISO, isValidItalianDate } from '@/lib/date-utils';

interface Document {
  id: number;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  expiry_date?: string;
  status: 'valido' | 'scaduto' | 'in_scadenza' | 'da_rinnovare';
  notes?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  giorni_alla_scadenza?: number;
}

interface UploadFormData {
  document_type: string;
  expiry_date: string;
  notes: string;
  file: File | null;
}

export default function AutistiDocumentiPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UploadFormData>({
    document_type: '',
    expiry_date: '',
    notes: '',
    file: null
  });

  // Funzione per trovare l'ID del dipendente basato sull'username
  const findEmployeeId = async (username: string): Promise<string | null> => {
    try {
      console.log('Cercando dipendente per username:', username);
      
      // Chiama l'API per recuperare tutti i dipendenti
      const response = await fetch('/api/employees');
      
      if (!response.ok) {
        console.error('Errore nel recupero dipendenti:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('Risposta API employees:', data);
      
      if (!data.success || !data.data) {
        console.error('Nessun dipendente trovato');
        return null;
      }
      
      // Cerca il dipendente corrispondente
      const employee = data.data.find((emp: any) => {
        // Cerca per email, username_login, ID o nome/cognome
        const emailMatch = emp.email === `${username}@partesa.it`;
        const usernameLoginMatch = emp.username_login === `${username}@partesa.it`;
        const idMatch = emp.id === username;
        const nameMatch = emp.id === username.replace('.', ' ').split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        console.log('Controllo dipendente:', emp.id, {
          emailMatch,
          usernameLoginMatch,
          idMatch,
          nameMatch
        });
        
        return emailMatch || usernameLoginMatch || idMatch || nameMatch;
      });
      
      if (employee) {
        console.log('Dipendente trovato:', employee.id);
        return employee.id;
      } else {
        console.log('Nessun dipendente corrispondente trovato');
        return null;
      }
      
    } catch (error) {
      console.error('Errore nella ricerca dipendente:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeEmployeeId = async () => {
      if (user) {
        console.log('=== INIZIO INIZIALIZZAZIONE ===');
        console.log('User object:', user);
        console.log('Username:', user.username);
        console.log('Inizializzazione employeeId per user:', user.username);
        
        const empId = await findEmployeeId(user.username);
        console.log('Employee ID trovato:', empId);
        setEmployeeId(empId);
        
        if (empId) {
          console.log('Chiamando fetchDocuments con empId:', empId);
          fetchDocuments(empId);
        } else {
          console.log('Nessun empId trovato, non chiamo fetchDocuments');
        }
        console.log('=== FINE INIZIALIZZAZIONE ===');
      } else {
        console.log('Nessun user disponibile');
      }
    };

    initializeEmployeeId();
  }, [user]);

  const fetchDocuments = async (passedEmployeeId?: string) => {
    const currentEmployeeId = passedEmployeeId || employeeId;
    
    if (!currentEmployeeId) {
      console.log('Nessun employeeId disponibile per il caricamento documenti');
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch tutti i documenti
      const encodedEmployeeId = encodeURIComponent(currentEmployeeId);
      const allDocsResponse = await fetch(`/api/employees/${encodedEmployeeId}/documents`);
      
      if (allDocsResponse.ok) {
        const allDocsData = await allDocsResponse.json();
        
        // Controllo di sicurezza: verifica che allDocsData.data sia un array
        if (allDocsData.success && Array.isArray(allDocsData.data)) {
          setDocuments(allDocsData.data);
        } else {
          console.warn('Risposta API documenti non valida:', allDocsData);
          setDocuments([]);
        }
      } else {
        console.error('Errore nel recupero documenti:', allDocsResponse.status);
        setDocuments([]);
      }

      // Fetch documenti in scadenza - usa l'endpoint generale con filtro
      const expiringResponse = await fetch(`/api/employees/documents/expiring`);
      
      if (expiringResponse.ok) {
        const expiringData = await expiringResponse.json();
        
        // Controllo di sicurezza: verifica che expiringData.data sia un array
        if (expiringData.success && Array.isArray(expiringData.data)) {
          // Filtra solo i documenti dell'utente corrente
          const userExpiringDocs = expiringData.data.filter((doc: any) => doc.employee_id === currentEmployeeId);
          setExpiringDocuments(userExpiringDocs);
        } else {
          console.warn('Risposta API documenti in scadenza non valida:', expiringData);
          setExpiringDocuments([]);
        }
      } else {
        console.error('Errore nel recupero documenti in scadenza:', expiringResponse.status);
        setExpiringDocuments([]);
      }

    } catch (error) {
      console.error('Errore caricamento documenti:', error);
      setError('Errore nel caricamento dei documenti');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      file
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const { formattedValue, newCursorPosition } = handleDateInputChange(value, e.target.selectionStart || 0);
    
    setFormData(prev => ({
      ...prev,
      expiry_date: formattedValue
    }));

    // Imposta la posizione del cursore dopo il rendering
    setTimeout(() => {
      if (e.target) {
        e.target.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const validateForm = (): boolean => {
    if (!formData.document_type) {
      setError('Il tipo di documento è obbligatorio');
      return false;
    }

    if (!formData.file) {
      setError('Seleziona un file da caricare');
      return false;
    }

    // Validazione file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (formData.file.size > maxSize) {
      setError('Il file non può superare i 10MB');
      return false;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(formData.file.type)) {
      setError('Tipo di file non supportato. Sono accettati solo PDF e immagini (JPG, PNG)');
      return false;
    }

    // Validazione data scadenza (opzionale ma se presente deve essere valida)
    if (formData.expiry_date && !isValidItalianDate(formData.expiry_date)) {
      setError('Formato data non valido. Usa il formato gg/mm/aaaa (es: 31/12/2025)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !employeeId) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      console.log('Uploading document for employee ID:', employeeId);
      console.log('User object:', user);
      
      const uploadFormData = new FormData();
      uploadFormData.append('document_type', formData.document_type);
      uploadFormData.append('document_name', `${formData.document_type} - ${employeeId}`);
      
      // Converte la data dal formato italiano (gg/mm/aaaa) al formato ISO (yyyy-mm-dd)
      const isoDate = formData.expiry_date ? convertItalianToISO(formData.expiry_date) : '';
      if (isoDate) {
        uploadFormData.append('expiry_date', isoDate);
      }
      
      uploadFormData.append('notes', formData.notes);
      uploadFormData.append('uploaded_by', user?.username || '');
      uploadFormData.append('file', formData.file!);

      const encodedEmployeeId = encodeURIComponent(employeeId);
      console.log('Calling API endpoint:', `/api/employees/${encodedEmployeeId}/documents`);
      const response = await fetch(`/api/employees/${encodedEmployeeId}/documents`, {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Documento caricato con successo!');
        setFormData({
          document_type: '',
          expiry_date: '',
          notes: '',
          file: null
        });
        setShowUploadForm(false);
        fetchDocuments(); // Ricarica i documenti
      } else {
        setError(result.error || 'Errore nel caricamento del documento');
      }
    } catch (error) {
      console.error('Errore upload documento:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };



  const getExpiryBadgeClass = (giorni?: number) => {
    if (!giorni) return 'bg-secondary';
    if (giorni <= 7) return 'bg-danger';
    if (giorni <= 30) return 'bg-warning';
    return 'bg-success';
  };

  const getExpiryText = (giorni?: number) => {
    if (!giorni) return 'Nessuna scadenza';
    if (giorni < 0) return 'Scaduto';
    if (giorni === 0) return 'Scade oggi';
    if (giorni === 1) return 'Scade domani';
    return `${giorni} giorni`;
  };

  const tipiDocumento = [
    'Patente di Guida',
    'CQC',
    'Carta Tachigrafica',
    'Certificato Medico',
    'Assicurazione',
    'Altro'
  ];

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="h3 mb-1">
                    <FileText className="me-2" size={24} />
                    I Miei Documenti
                  </h1>
                  <p className="mb-0 opacity-75">
                    Gestisci i tuoi documenti personali e controlla le scadenze
                  </p>
                </div>
                <button
                  className="btn btn-light"
                  onClick={() => setShowUploadForm(!showUploadForm)}
                >
                  <Plus className="me-2" size={16} />
                  Carica Documento
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert documenti in scadenza */}
      {expiringDocuments.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-warning" role="alert">
              <AlertTriangle className="me-2" size={20} />
              <strong>Attenzione!</strong> Hai {expiringDocuments.length} documento/i in scadenza nei prossimi 30 giorni.
            </div>
          </div>
        </div>
      )}

      {/* Form upload documento */}
      {showUploadForm && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card bg-dark border-secondary">
              <div className="card-header">
                <h5 className="text-light mb-0">
                  <Upload className="me-2" size={20} />
                  Carica Nuovo Documento
                </h5>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <AlertTriangle className="me-2" size={16} />
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="alert alert-success" role="alert">
                    <FileText className="me-2" size={16} />
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="document_type" className="form-label text-light">
                        Tipo Documento *
                      </label>
                      <select
                        id="document_type"
                        name="document_type"
                        className="form-select bg-dark text-light border-secondary"
                        value={formData.document_type}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Seleziona tipo documento</option>
                        {tipiDocumento.map((tipo) => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="expiry_date" className="form-label text-light">
                        Data Scadenza
                      </label>
                      <input
                        id="expiry_date"
                        name="expiry_date"
                        type="text"
                        className="form-control bg-dark text-light border-secondary"
                        value={formData.expiry_date}
                        onChange={handleDateChange}
                        placeholder="gg/mm/aaaa"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="file" className="form-label text-light">
                      File Documento *
                    </label>
                    <input
                      id="file"
                      name="file"
                      type="file"
                      className="form-control bg-dark text-light border-secondary"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                    <div className="form-text text-muted">
                      Formati supportati: PDF, JPG, PNG. Dimensione massima: 10MB
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="notes" className="form-label text-light">
                      Note
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control bg-dark text-light border-secondary"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Note aggiuntive (opzionale)"
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Caricamento...
                        </>
                      ) : (
                        <>
                          <Upload className="me-2" size={16} />
                          Carica Documento
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowUploadForm(false)}
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista documenti */}
      <div className="row">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <FileText className="me-2" size={20} />
                I Tuoi Documenti
              </h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Caricamento...</span>
                  </div>
                </div>
              ) : documents.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-dark table-striped">
                    <thead>
                      <tr>
                        <th>Tipo Documento</th>
                        <th>Nome File</th>
                        <th>Data Scadenza</th>
                        <th>Stato</th>
                        <th>Data Caricamento</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <span className="badge bg-info">
                              {doc.document_type}
                            </span>
                          </td>
                          <td>{doc.file_name}</td>
                          <td>
                            {doc.expiry_date ? formatDateItalian(doc.expiry_date) : '-'}
                          </td>
                          <td>
                            <span className={`badge ${getExpiryBadgeClass(doc.giorni_alla_scadenza)}`}>
                              {getExpiryText(doc.giorni_alla_scadenza)}
                            </span>
                          </td>
                          <td>{formatDateItalian(doc.created_at)}</td>
                          <td>
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => window.open(doc.file_path, '_blank')}
                                title="Visualizza"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                className="btn btn-outline-success"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_path;
                                  link.download = doc.file_name;
                                  link.click();
                                }}
                                title="Scarica"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <FileText size={48} className="mb-3 opacity-50" />
                  <p>Nessun documento caricato</p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowUploadForm(true)}
                  >
                    <Plus className="me-2" size={14} />
                    Carica il primo documento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Documenti in scadenza */}
      {expiringDocuments.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card bg-dark border-warning">
              <div className="card-header">
                <h5 className="text-warning mb-0">
                  <AlertTriangle className="me-2" size={20} />
                  Documenti in Scadenza
                </h5>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {expiringDocuments.map((doc) => (
                    <div key={doc.id} className="list-group-item bg-dark border-secondary text-light">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{doc.document_type}</h6>
                          <p className="mb-1">
                            Scadenza: {doc.expiry_date ? formatDateItalian(doc.expiry_date) : 'N/A'}
                          </p>
                          <small className="text-muted">{doc.file_name}</small>
                        </div>
                        <div className="text-end">
                          <span className={`badge ${getExpiryBadgeClass(doc.giorni_alla_scadenza)} mb-2`}>
                            {getExpiryText(doc.giorni_alla_scadenza)}
                          </span>
                          <br />
                          <button
                            className="btn btn-outline-warning btn-sm"
                            onClick={() => window.open(doc.file_path, '_blank')}
                          >
                            <Eye className="me-1" size={12} />
                            Visualizza
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}