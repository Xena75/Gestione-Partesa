import React, { useState, useEffect } from 'react';
import { Settings, Database, Mail, Clock, Save, TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface BackupConfig {
  id: string;
  config_key: string;
  config_value: string;
  config_category: 'database' | 'storage' | 'email' | 'schedule' | 'advanced';
  description?: string;
  is_encrypted: boolean;
}

interface ConfigCategory {
  database: BackupConfig[];
  storage: BackupConfig[];
  email: BackupConfig[];
  schedule: BackupConfig[];
  advanced: BackupConfig[];
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

const BackupConfigManager: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigCategory>({
    database: [],
    storage: [],
    email: [],
    schedule: [],
    advanced: []
  });
  const [activeTab, setActiveTab] = useState<keyof ConfigCategory>('database');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Configurazioni predefinite con descrizioni
  const configDescriptions: Record<string, string> = {
    'db_host': 'Indirizzo del server database MySQL',
    'db_port': 'Porta del server database (default: 3306)',
    'db_user': 'Username per la connessione al database',
    'db_password': 'Password per la connessione al database',
    'backup_path': 'Percorso di destinazione per i file di backup',
    'temp_path': 'Percorso per i file temporanei durante il backup',
    'retention_days': 'Giorni di conservazione dei backup (0 = illimitato)',
    'compression_level': 'Livello di compressione (0-9, 0=nessuna, 9=massima)',
    'email_host': 'Server SMTP per l\'invio delle notifiche',
    'email_port': 'Porta del server SMTP (587 per TLS, 465 per SSL)',
    'email_user': 'Username per l\'autenticazione SMTP',
    'email_password': 'Password per l\'autenticazione SMTP',
    'email_from': 'Indirizzo email mittente per le notifiche',
    'email_to': 'Indirizzi email destinatari (separati da virgola)',
    'schedule_full': 'Pianificazione backup completi (formato cron)',
    'schedule_incremental': 'Pianificazione backup incrementali (formato cron)',
    'schedule_differential': 'Pianificazione backup differenziali (formato cron)',
    'max_parallel_jobs': 'Numero massimo di job di backup simultanei',
    'timeout_minutes': 'Timeout in minuti per i job di backup',
    'enable_notifications': 'Abilita notifiche email (true/false)'
  };

  // Carica le configurazioni
  const loadConfigs = async () => {
    try {
      setError(null);
      const response = await fetch('/api/backup/config');
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle configurazioni');
      }
      const data = await response.json();
      setConfigs(data.configs);
    } catch (err) {
      console.error('Errore nel caricamento configurazioni:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  // Salva le configurazioni
  const saveConfigs = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const allConfigs = Object.values(configs).flat();
      const response = await fetch('/api/backup/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configs: allConfigs })
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio delle configurazioni');
      }
      
      setUnsavedChanges(new Set());
      setSuccessMessage('Configurazioni salvate con successo');
      
      // Nascondi il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Errore nel salvataggio:', err);
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  // Test connessione database
  const testDatabaseConnection = async () => {
    try {
      const response = await fetch('/api/backup/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test_type: 'database' })
      });
      
      const result = await response.json();
      setTestResults(prev => ({ ...prev, database: result }));
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        database: { 
          success: false, 
          message: 'Errore nel test di connessione' 
        } 
      }));
    }
  };

  // Test configurazione email
  const testEmailConfiguration = async () => {
    try {
      const response = await fetch('/api/backup/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test_type: 'email' })
      });
      
      const result = await response.json();
      setTestResults(prev => ({ ...prev, email: result }));
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        email: { 
          success: false, 
          message: 'Errore nel test email' 
        } 
      }));
    }
  };

  // Aggiorna valore configurazione
  const updateConfigValue = (category: keyof ConfigCategory, configKey: string, newValue: string) => {
    setConfigs(prev => ({
      ...prev,
      [category]: prev[category].map(config => 
        config.config_key === configKey 
          ? { ...config, config_value: newValue }
          : config
      )
    }));
    
    setUnsavedChanges(prev => new Set([...prev, configKey]));
  };

  // Effetto per il caricamento iniziale
  useEffect(() => {
    loadConfigs();
  }, []);

  // Render del campo di input
  const renderConfigField = (config: BackupConfig, category: keyof ConfigCategory) => {
    const isPassword = config.config_key.toLowerCase().includes('password');
    const isChanged = unsavedChanges.has(config.config_key);
    
    return (
      <div key={config.config_key} className="mb-3">
        <label className="form-label fw-medium">
          {config.config_key.replace(/_/g, ' ').toUpperCase()}
          {isChanged && <span className="text-warning ms-1">*</span>}
        </label>
        <input
          type={isPassword ? 'password' : 'text'}
          value={config.config_value}
          onChange={(e) => updateConfigValue(category, config.config_key, e.target.value)}
          className={`form-control ${
            isChanged ? 'border-warning bg-warning-subtle' : ''
          }`}
          placeholder={configDescriptions[config.config_key] || 'Inserisci valore'}
        />
        {configDescriptions[config.config_key] && (
          <div className="form-text">{configDescriptions[config.config_key]}</div>
        )}
      </div>
    );
  };

  // Render del risultato del test
  const renderTestResult = (testKey: string) => {
    const result = testResults[testKey];
    if (!result) return null;
    
    return (
      <div className={`alert mt-3 d-flex align-items-center ${
        result.success ? 'alert-success' : 'alert-danger'
      }`}>
        {result.success ? (
          <CheckCircle size={16} className="me-2" />
        ) : (
          <XCircle size={16} className="me-2" />
        )}
        <span>
          {result.message}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center p-4">
        <div className="spinner-border text-primary me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="text-muted">Caricamento configurazioni...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h3 className="h5 mb-0 d-flex align-items-center">
          <Settings size={20} className="me-2 text-primary" />
          Configurazioni Backup
        </h3>
        <div className="d-flex align-items-center">
          {unsavedChanges.size > 0 && (
            <span className="text-warning d-flex align-items-center me-3">
              <AlertTriangle size={16} className="me-1" />
              {unsavedChanges.size} modifiche non salvate
            </span>
          )}
          <button
            onClick={saveConfigs}
            disabled={isSaving || unsavedChanges.size === 0}
            className="btn btn-primary d-flex align-items-center"
          >
            <Save size={16} className="me-2" />
            {isSaving ? 'Salvataggio...' : 'Salva Configurazioni'}
          </button>
        </div>
      </div>

      {/* Messaggi di stato */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <XCircle size={20} className="me-2" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="alert alert-success d-flex align-items-center mb-4">
          <CheckCircle size={20} className="me-2" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {Object.keys(configs).map((category) => {
          const categoryKey = category as keyof ConfigCategory;
          const icons = {
            database: Database,
            storage: Settings,
            email: Mail,
            schedule: Clock,
            advanced: Settings
          };
          const Icon = icons[categoryKey];
          
          return (
            <li key={category} className="nav-item">
              <button
                onClick={() => setActiveTab(categoryKey)}
                className={`nav-link d-flex align-items-center ${
                  activeTab === category ? 'active' : ''
                }`}
              >
                <Icon size={16} className="me-2" />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Contenuto del tab attivo */}
      <div className="mt-4">
        <div className="row">
          {configs[activeTab].map((config) => (
            <div key={config.config_key} className="col-md-6 mb-4">
              {renderConfigField(config, activeTab)}
            </div>
          ))}
        </div>
        
        {/* Pulsanti di test per database ed email */}
        {activeTab === 'database' && (
          <div className="mt-4 pt-4 border-top">
            <button
              onClick={testDatabaseConnection}
              className="btn btn-success d-flex align-items-center"
            >
              <TestTube size={16} className="me-2" />
              Test Connessione Database
            </button>
            {renderTestResult('database')}
          </div>
        )}
        
        {activeTab === 'email' && (
          <div className="mt-4 pt-4 border-top">
            <button
              onClick={testEmailConfiguration}
              className="btn btn-success d-flex align-items-center"
            >
              <TestTube size={16} className="me-2" />
              Test Configurazione Email
            </button>
            {renderTestResult('email')}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupConfigManager;