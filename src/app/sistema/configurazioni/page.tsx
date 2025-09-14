'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Database, Bell, Shield, Save, ArrowLeft, Server, Clock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ConfigurazioniPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Stati per le configurazioni
  const [generalConfig, setGeneralConfig] = useState({
    appName: 'Gestione Partesa',
    timezone: 'Europe/Rome',
    language: 'it',
    maintenanceMode: false
  });
  
  const [backupConfig, setBackupConfig] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    backupPath: '/backup',
    compressionEnabled: true
  });
  
  const [notificationConfig, setNotificationConfig] = useState({
    emailNotifications: true,
    backupNotifications: true,
    errorNotifications: true,
    adminEmail: 'admin@partesa.com'
  });
  
  const [securityConfig, setSecurityConfig] = useState({
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireSpecialChars: true,
    twoFactorAuth: false
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const response = await fetch('/api/sistema/configurazioni');
      if (response.ok) {
        const data = await response.json();
        if (data.general) setGeneralConfig(data.general);
        if (data.backup) setBackupConfig(data.backup);
        if (data.notifications) setNotificationConfig(data.notifications);
        if (data.security) setSecurityConfig(data.security);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle configurazioni:', error);
    }
  };

  const saveConfigurations = async () => {
    setLoading(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/api/sistema/configurazioni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          general: generalConfig,
          backup: backupConfig,
          notifications: notificationConfig,
          security: securityConfig
        }),
      });
      
      if (response.ok) {
        setSaveMessage('Configurazioni salvate con successo!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Errore nel salvataggio delle configurazioni.');
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setSaveMessage('Errore nel salvataggio delle configurazioni.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <h4>Accesso Negato</h4>
          <p>Solo gli amministratori possono accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-outline-secondary me-3"
            onClick={() => router.back()}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="h3 mb-0">
              <Settings className="me-2" size={24} />
              Configurazioni Sistema
            </h1>
            <p className="text-muted mb-0">Gestisci le impostazioni dell'applicazione</p>
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={saveConfigurations}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
          ) : (
            <Save className="me-2" size={16} />
          )}
          Salva Configurazioni
        </button>
      </div>

      {/* Messaggio di salvataggio */}
      {saveMessage && (
        <div className={`alert ${saveMessage.includes('successo') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
          {saveMessage}
        </div>
      )}

      <div className="row">
        {/* Impostazioni Generali */}
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">
                <Server className="me-2" size={20} />
                Impostazioni Generali
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Nome Applicazione</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={generalConfig.appName}
                  onChange={(e) => setGeneralConfig({...generalConfig, appName: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Fuso Orario</label>
                <select 
                  className="form-select"
                  value={generalConfig.timezone}
                  onChange={(e) => setGeneralConfig({...generalConfig, timezone: e.target.value})}
                >
                  <option value="Europe/Rome">Europa/Roma</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">Europa/Londra</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Lingua</label>
                <select 
                  className="form-select"
                  value={generalConfig.language}
                  onChange={(e) => setGeneralConfig({...generalConfig, language: e.target.value})}
                >
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={generalConfig.maintenanceMode}
                  onChange={(e) => setGeneralConfig({...generalConfig, maintenanceMode: e.target.checked})}
                />
                <label className="form-check-label">
                  Modalità Manutenzione
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Configurazioni Backup */}
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">
                <Database className="me-2" size={20} />
                Configurazioni Backup
              </h5>
            </div>
            <div className="card-body">
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={backupConfig.autoBackup}
                  onChange={(e) => setBackupConfig({...backupConfig, autoBackup: e.target.checked})}
                />
                <label className="form-check-label">
                  Backup Automatico
                </label>
              </div>
              <div className="mb-3">
                <label className="form-label">Frequenza Backup</label>
                <select 
                  className="form-select"
                  value={backupConfig.backupFrequency}
                  onChange={(e) => setBackupConfig({...backupConfig, backupFrequency: e.target.value})}
                >
                  <option value="hourly">Ogni ora</option>
                  <option value="daily">Giornaliero</option>
                  <option value="weekly">Settimanale</option>
                  <option value="monthly">Mensile</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Giorni di Retention</label>
                <input 
                  type="number" 
                  className="form-control"
                  value={backupConfig.retentionDays}
                  onChange={(e) => setBackupConfig({...backupConfig, retentionDays: parseInt(e.target.value)})}
                  min="1"
                  max="365"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Percorso Backup</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={backupConfig.backupPath}
                  onChange={(e) => setBackupConfig({...backupConfig, backupPath: e.target.value})}
                />
              </div>
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={backupConfig.compressionEnabled}
                  onChange={(e) => setBackupConfig({...backupConfig, compressionEnabled: e.target.checked})}
                />
                <label className="form-check-label">
                  Compressione Abilitata
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Gestione Notifiche */}
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">
                <Bell className="me-2" size={20} />
                Gestione Notifiche
              </h5>
            </div>
            <div className="card-body">
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={notificationConfig.emailNotifications}
                  onChange={(e) => setNotificationConfig({...notificationConfig, emailNotifications: e.target.checked})}
                />
                <label className="form-check-label">
                  Notifiche Email
                </label>
              </div>
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={notificationConfig.backupNotifications}
                  onChange={(e) => setNotificationConfig({...notificationConfig, backupNotifications: e.target.checked})}
                />
                <label className="form-check-label">
                  Notifiche Backup
                </label>
              </div>
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={notificationConfig.errorNotifications}
                  onChange={(e) => setNotificationConfig({...notificationConfig, errorNotifications: e.target.checked})}
                />
                <label className="form-check-label">
                  Notifiche Errori
                </label>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  <Mail className="me-1" size={16} />
                  Email Amministratore
                </label>
                <input 
                  type="email" 
                  className="form-control"
                  value={notificationConfig.adminEmail}
                  onChange={(e) => setNotificationConfig({...notificationConfig, adminEmail: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Impostazioni Sicurezza */}
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">
                <Shield className="me-2" size={20} />
                Impostazioni Sicurezza
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Timeout Sessione (minuti)</label>
                <input 
                  type="number" 
                  className="form-control"
                  value={securityConfig.sessionTimeout}
                  onChange={(e) => setSecurityConfig({...securityConfig, sessionTimeout: parseInt(e.target.value)})}
                  min="5"
                  max="480"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Max Tentativi Login</label>
                <input 
                  type="number" 
                  className="form-control"
                  value={securityConfig.maxLoginAttempts}
                  onChange={(e) => setSecurityConfig({...securityConfig, maxLoginAttempts: parseInt(e.target.value)})}
                  min="3"
                  max="10"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Lunghezza Minima Password</label>
                <input 
                  type="number" 
                  className="form-control"
                  value={securityConfig.passwordMinLength}
                  onChange={(e) => setSecurityConfig({...securityConfig, passwordMinLength: parseInt(e.target.value)})}
                  min="6"
                  max="20"
                />
              </div>
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={securityConfig.requireSpecialChars}
                  onChange={(e) => setSecurityConfig({...securityConfig, requireSpecialChars: e.target.checked})}
                />
                <label className="form-check-label">
                  Richiedi Caratteri Speciali
                </label>
              </div>
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={securityConfig.twoFactorAuth}
                  onChange={(e) => setSecurityConfig({...securityConfig, twoFactorAuth: e.target.checked})}
                />
                <label className="form-check-label">
                  Autenticazione a Due Fattori
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}