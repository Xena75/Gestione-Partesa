'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UploadZone from '@/components/UploadZone';
import SavedMappingsModal from '@/components/SavedMappingsModal';

export default function ImportPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMappingsModal, setShowMappingsModal] = useState(false);
  const [currentFileInfo, setCurrentFileInfo] = useState<{fileId: string, filename: string} | null>(null);

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
      
      // Salva le informazioni del file caricato
      setUploadedFile(file);
      setCurrentFileInfo({
        fileId: result.fileId,
        filename: file.name
      });
      
      // File caricato con successo, l'utente decide cosa fare
      console.log('File caricato:', file.name, 'File ID:', result.fileId);
      
    } catch (error) {
      console.error('Errore upload:', error);
      alert('Errore durante l\'upload del file. Riprova.');
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

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

                 {/* Azioni dopo il caricamento */}
                 {currentFileInfo && !isUploading && (
                   <div className="mt-4">
                     <div className="alert alert-success">
                       <h6 className="alert-heading">✅ File caricato con successo!</h6>
                       <p className="mb-3">
                         <strong>File:</strong> {currentFileInfo.filename}<br/>
                         <strong>File ID:</strong> {currentFileInfo.fileId}
                       </p>
                       <div className="d-flex gap-2 flex-wrap">
                         <button 
                           className="btn btn-primary"
                           onClick={() => setShowMappingsModal(true)}
                         >
                           💾 Usa Mapping Salvato
                         </button>
                         <button 
                           className="btn btn-outline-primary"
                           onClick={() => router.push(`/import/mapping?fileId=${currentFileInfo.fileId}&filename=${encodeURIComponent(currentFileInfo.filename)}&blobUrl=${encodeURIComponent(currentFileInfo.blobUrl)}`)}
                         >
                           📝 Crea Nuovo Mapping
                         </button>
                       </div>
                     </div>
                   </div>
                 )}

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
       
       {/* Modal per i mapping salvati */}
       {currentFileInfo && (
         <SavedMappingsModal
           isOpen={showMappingsModal}
           onClose={() => setShowMappingsModal(false)}
           fileId={currentFileInfo.fileId}
           filename={currentFileInfo.filename}
           blobUrl={currentFileInfo.blobUrl}
         />
       )}
     </div>
   );
 }
