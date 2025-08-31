'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UploadZone from '@/components/UploadZone';

export default function ImportPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadedFile(file);

    try {
      // Creare FormData per l'upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload del file
      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Errore durante l&apos;upload del file');
      }

      const result = await response.json();
      
      // Reindirizza alla pagina di mapping con i dati del file
      router.push(`/import/mapping?fileId=${result.fileId}&filename=${encodeURIComponent(file.name)}`);
      
    } catch (error) {
      console.error('Errore upload:', error);
      alert('Errore durante l\'upload del file. Riprova.');
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  }, [router]);

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">📤 Importazione File Excel</h1>
              <p className="mb-0 text-white-50">Carica file giornalieri per importare dati viaggi PoD</p>
            </div>
            <Link href="/" className="btn btn-outline-light">
              ← Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Card Upload */}
            <div className="card shadow-sm border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                    <span className="fs-1">📊</span>
                  </div>
                  <h2 className="card-title">Carica File Excel</h2>
                  <p className="text-muted">
                    Trascina qui il tuo file Excel (.xlsx) o clicca per selezionarlo
                  </p>
                </div>

                {/* Zona Upload */}
                <UploadZone 
                  onFileUpload={handleFileUpload}
                  isUploading={isUploading}
                  uploadedFile={uploadedFile}
                />

                {/* Informazioni */}
                <div className="mt-4">
                  <div className="alert alert-info">
                    <h6 className="alert-heading">ℹ️ Informazioni Importazione</h6>
                    <ul className="mb-0">
                      <li>Formati supportati: <strong>.xlsx</strong></li>
                      <li>Dimensione massima: <strong>10 MB</strong></li>
                      <li>Il file verrà analizzato automaticamente per il mapping delle colonne</li>
                      <li>Potrai configurare la mappatura prima dell&apos;importazione</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Mapping Salvati */}
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">💾 Mapping Salvati</h5>
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">
                  Configurazioni di mapping riutilizzabili per importazioni future
                </p>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" disabled>
                    Carica Mapping Salvati
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" disabled>
                    Gestisci Template
                  </button>
                </div>
              </div>
            </div>

            {/* Card Importazioni Recenti */}
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">📈 Importazioni Recenti</h5>
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">
                  Storico delle ultime importazioni effettuate
                </p>
                <Link href="/import/history" className="btn btn-outline-info btn-sm">
                  Visualizza Storico
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
