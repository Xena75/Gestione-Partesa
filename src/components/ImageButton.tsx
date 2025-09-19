'use client';

import { useState, useEffect } from 'react';

interface ImageButtonProps {
  numeroViaggio: string;
  onShowImages: (numeroViaggio: string) => void;
}

export default function ImageButton({ numeroViaggio, onShowImages }: ImageButtonProps) {
  const [imageCount, setImageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Carica il conteggio immagini al mount del componente
  useEffect(() => {
    const fetchImageCount = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/viaggi/images/count?numeroViaggio=${numeroViaggio}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setImageCount(data.count || 0);
      } catch (error) {
        console.error(`Errore nel caricamento conteggio immagini per viaggio ${numeroViaggio}:`, error);
        setImageCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageCount();
  }, [numeroViaggio]);

  const handleClick = () => {
    onShowImages(numeroViaggio);
  };

  if (isLoading) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled
      >
        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        Caricando...
      </button>
    );
  }
  
  return (
    <button
      type="button"
      className={`btn btn-sm ${imageCount > 0 ? 'btn-success' : 'btn-secondary'}`}
      onClick={handleClick}
      data-bs-toggle="modal"
      data-bs-target="#imagesModal"
    >
      {imageCount > 0 ? `${imageCount} Immagini` : 'Nessuna immagine'}
    </button>
  );
}