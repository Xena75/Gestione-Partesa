/**
 * Formatta la dimensione di un file in formato leggibile
 * @param bytes - Dimensione in bytes
 * @returns Stringa formattata (es. "2.5 MB", "1.2 GB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  if (i === 0) {
    return `${bytes} B`;
  }
  
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(1)} ${sizes[i]}`;
}

/**
 * Formatta la dimensione con icona appropriata
 * @param bytes - Dimensione in bytes
 * @returns Oggetto con dimensione formattata e classe CSS per l'icona
 */
export function formatFileSizeWithIcon(bytes: number | null | undefined): {
  size: string;
  iconClass: string;
  colorClass: string;
} {
  const formattedSize = formatFileSize(bytes);
  
  if (!bytes || bytes === 0) {
    return {
      size: formattedSize,
      iconClass: 'text-gray-400',
      colorClass: 'text-gray-500'
    };
  }

  // Determina colore e icona in base alla dimensione
  const mb = bytes / (1024 * 1024);
  
  if (mb < 10) {
    return {
      size: formattedSize,
      iconClass: 'text-green-500',
      colorClass: 'text-green-600'
    };
  } else if (mb < 100) {
    return {
      size: formattedSize,
      iconClass: 'text-yellow-500',
      colorClass: 'text-yellow-600'
    };
  } else if (mb < 1000) {
    return {
      size: formattedSize,
      iconClass: 'text-orange-500',
      colorClass: 'text-orange-600'
    };
  } else {
    return {
      size: formattedSize,
      iconClass: 'text-red-500',
      colorClass: 'text-red-600'
    };
  }
}