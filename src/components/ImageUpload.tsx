'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  travelId: string;
  type: 'mezzo' | 'ritiri';
  onImageUploaded: () => void;
}

export default function ImageUpload({ travelId, type, onImageUploaded }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await fetch(`/api/viaggi/${travelId}/images`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Errore nel caricamento di ${file.name}`);
        }

        setUploadProgress(((i + 1) / acceptedFiles.length) * 100);
      }

      onImageUploaded();
    } catch (error) {
      console.error('❌ Errore nel caricamento:', error);
      alert(`Errore nel caricamento: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [travelId, type, onImageUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  return (
    <div className="image-upload-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${isUploading ? 'uploading' : ''}`}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="text-center">
            <div className="spinner-border text-primary mb-2" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <p className="mb-0">Caricamento in corso...</p>
            <div className="progress mt-2">
              <div 
                className="progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {isDragActive ? (
              <p className="mb-0">Rilascia i file qui...</p>
            ) : (
              <>
                <p className="mb-2">
                  <strong>Trascina qui i file</strong> o clicca per selezionarli
                </p>
                <p className="text-muted mb-0">
                  Supporta: JPG, PNG, GIF, WebP, PDF
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .image-upload-container {
          margin-top: 1rem;
        }
        
        .dropzone {
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #f8f9fa;
        }
        
        .dropzone:hover {
          border-color: #007bff;
          background-color: #e3f2fd;
        }
        
        .dropzone.active {
          border-color: #28a745;
          background-color: #d4edda;
        }
        
        .dropzone.uploading {
          border-color: #007bff;
          background-color: #e3f2fd;
          cursor: not-allowed;
        }
        
        .progress {
          height: 8px;
          border-radius: 4px;
          background-color: #e9ecef;
        }
        
        .progress-bar {
          height: 100%;
          background-color: #007bff;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
}
