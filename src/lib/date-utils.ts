/**
 * Funzione per formattare le date in formato europeo dd-mm-yyyy
 * Gestisce tutti i formati di data comuni e li converte al formato europeo
 */
export const formatDateEuropean = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === '') return '-';
  
  try {
    let date: Date;
    const cleanDate = dateString.trim();
    
    // Gestisce formato ISO completo (yyyy-mm-ddTHH:mm:ss.sssZ)
    if (cleanDate.includes('T')) {
      date = new Date(cleanDate);
    }
    // Gestisce formato ISO semplice (yyyy-mm-dd)
    else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      const [year, month, day] = cleanDate.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
    // Gestisce formato con slash (mm/dd/yyyy o dd/mm/yyyy)
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
      const parts = cleanDate.split('/');
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      
      // Se il primo numero è > 12, è sicuramente formato europeo (dd/mm/yyyy)
      if (first > 12) {
        const [day, month, year] = parts.map(Number);
        date = new Date(year, month - 1, day);
      }
      // Se il secondo numero è > 12, è sicuramente formato americano (mm/dd/yyyy)
      else if (second > 12) {
        const [month, day, year] = parts.map(Number);
        date = new Date(year, month - 1, day);
      }
      // Se entrambi sono <= 12, assumiamo formato americano (mm/dd/yyyy)
      else {
        const [month, day, year] = parts.map(Number);
        date = new Date(year, month - 1, day);
      }
    }
    // Altri formati - prova parsing standard
    else {
      date = new Date(cleanDate);
    }
    
    // Verifica che la data sia valida
    if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
      return '-';
    }
    
    // Formatta in formato europeo dd-mm-yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Funzione per formattare le date in formato ISO (yyyy-mm-dd) per input HTML
 */
export const formatDateISO = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === '') return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
};

/**
 * Funzione per validare se una stringa è una data valida
 */
export const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString || dateString.trim() === '') return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
  } catch (error) {
    return false;
  }
};
