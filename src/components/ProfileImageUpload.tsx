'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ProfileImageUploadProps {
  employeeId: string;
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
}

export default function ProfileImageUpload({ 
  employeeId, 
  currentImageUrl, 
  onImageUploaded, 
  onImageRemoved 
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/profile-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore nel caricamento');
      }

      setUploadProgress(100);
      onImageUploaded(result.foto_url);
      
    } catch (error) {
      console.error('❌ Errore nel caricamento:', error);
      alert(`Errore nel caricamento: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [employeeId, onImageUploaded]);

  const handleRemoveImage = async () => {
    if (!confirm('Sei sicuro di voler rimuovere la foto profilo?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/profile-image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: currentImageUrl
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore nella rimozione');
      }

      onImageRemoved();
      
    } catch (error) {
      console.error('❌ Errore nella rimozione:', error);
      alert(`Errore nella rimozione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: isUploading
  });

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-camera me-2"></i>
          Foto Profilo
        </h5>
      </div>
      <div className="card-body">
        {/* Foto attuale */}
        {currentImageUrl && (
          <div className="text-center mb-3">
            <img 
              src={currentImageUrl} 
              alt="Foto profilo" 
              className="img-thumbnail rounded-circle"
              style={{ width: '120px', height: '120px', objectFit: 'cover' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="mt-2">
              <button 
                type="button" 
                className="btn btn-outline-danger btn-sm"
                onClick={handleRemoveImage}
                disabled={isUploading}
              >
                <i className="fas fa-trash me-1"></i>
                Rimuovi Foto
              </button>
            </div>
          </div>
        )}

        {/* Area di upload */}
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary bg-opacity-10' 
              : 'border-secondary'
          } ${isUploading ? 'opacity-50' : ''}`}
          style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
        >
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div>
              <div className="spinner-border text-primary mb-2" role="status">
                <span className="visually-hidden">Caricamento...</span>
              </div>
              <p className="mb-0">Caricamento in corso... {uploadProgress}%</p>
              {uploadProgress > 0 && (
                <div className="progress mt-2" style={{ height: '4px' }}>
                  <div 
                    className="progress-bar" 
                    role="progressbar" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <i className="fas fa-cloud-upload-alt fa-2x text-secondary mb-2"></i>
              <p className="mb-1">
                {isDragActive 
                  ? 'Rilascia qui la foto...' 
                  : currentImageUrl 
                    ? 'Trascina una nuova foto qui o clicca per sostituire'
                    : 'Trascina una foto qui o clicca per selezionare'
                }
              </p>
              <small className="text-muted">
                Formati supportati: JPG, PNG, WebP (max 5MB)
              </small>
            </div>
          )}
        </div>

        {/* Informazioni aggiuntive */}
        <div className="mt-3">
          <small className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            La foto verrà ridimensionata automaticamente per l'ottimizzazione.
          </small>
        </div>
      </div>
    </div>
  );
}