'use client';

import { useState, useRef, useCallback } from 'react';

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  uploadedFile: File | null;
}

export default function UploadZone({ onFileUpload, isUploading, uploadedFile }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Controlla estensione
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Formato file non supportato. Utilizza solo file Excel (.xlsx, .xls)');
      return false;
    }

    // Controlla dimensione (50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File troppo grande. Dimensione massima: 50MB');
      return false;
    }

    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter === 1) {
      setIsDragOver(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="upload-zone-container">
      {/* Input file nascosto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Zona drag & drop */}
      <div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="upload-content">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <h5>Caricamento in corso...</h5>
            <p className="text-muted">Analisi del file in corso</p>
          </div>
        ) : uploadedFile ? (
          <div className="upload-content">
            <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
              <span className="fs-1">✅</span>
            </div>
            <h5>File caricato con successo!</h5>
            <p className="text-muted mb-2">{uploadedFile.name}</p>
            <small className="text-muted">{formatFileSize(uploadedFile.size)}</small>
          </div>
        ) : (
          <div className="upload-content">
            <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
              <span className="fs-1">📁</span>
            </div>
            <h5>Trascina qui il file Excel</h5>
            <p className="text-muted mb-3">oppure clicca per selezionare</p>
            <div className="btn btn-outline-primary">
              Seleziona File
            </div>
          </div>
        )}
      </div>

      {/* Stili CSS inline per l'upload zone */}
      <style jsx>{`
        .upload-zone-container {
          width: 100%;
        }
        
        .upload-zone {
          border: 2px dashed #dee2e6;
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #f8f9fa;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .upload-zone:hover {
          border-color: #007bff;
          background-color: #f0f8ff;
        }
        
        .upload-zone.drag-over {
          border-color: #007bff;
          background-color: #e3f2fd;
          transform: scale(1.02);
        }
        
        .upload-zone.uploading {
          border-color: #28a745;
          background-color: #f8fff9;
          cursor: not-allowed;
        }
        
        .upload-content {
          width: 100%;
        }
        
        .upload-zone.uploading:hover {
          transform: none;
        }
      `}</style>
    </div>
  );
}
