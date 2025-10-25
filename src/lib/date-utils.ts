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
  } catch {
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
  } catch {
    return '';
  }
};

/**
 * Funzione per formattare le date in formato italiano gg/mm/aaaa
 * Specificamente per le date di scadenza documenti
 */
export const formatDateItalian = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === '') return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
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
  } catch {
    return false;
  }
};

/**
 * Converte una data dal formato italiano (dd/mm/yyyy) al formato ISO (yyyy-mm-dd)
 */
export const convertItalianToISO = (italianDate: string): string => {
  if (!italianDate || italianDate.trim() === '') return '';
  
  // Verifica che il formato sia dd/mm/yyyy
  const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  if (!dateRegex.test(italianDate)) return '';
  
  try {
    const [day, month, year] = italianDate.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) return '';
    
    const isoYear = date.getFullYear();
    const isoMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    const isoDay = date.getDate().toString().padStart(2, '0');
    
    return `${isoYear}-${isoMonth}-${isoDay}`;
  } catch {
    return '';
  }
};

/**
 * Converte una data dal formato ISO (yyyy-mm-dd) al formato italiano (dd/mm/yyyy)
 */
export const convertISOToItalian = (isoDate: string): string => {
  if (!isoDate || isoDate.trim() === '') return '';
  
  // Verifica che il formato sia yyyy-mm-dd
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(isoDate)) return '';
  
  try {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) return '';
    
    const italianDay = date.getDate().toString().padStart(2, '0');
    const italianMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    const italianYear = date.getFullYear();
    
    return `${italianDay}/${italianMonth}/${italianYear}`;
  } catch {
    return '';
  }
};

/**
 * Valida se una stringa è nel formato italiano dd/mm/yyyy
 */
export const isValidItalianDate = (dateString: string): boolean => {
  if (!dateString || dateString.trim() === '') return false;
  
  const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  if (!dateRegex.test(dateString)) return false;
  
  try {
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Verifica che la data sia valida e corrisponda ai valori inseriti
    return !isNaN(date.getTime()) && 
           date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year &&
           year >= 1900 && year <= 2100;
  } catch {
    return false;
  }
};

/**
 * Formatta automaticamente l'input dell'utente aggiungendo le barre oblique
 * L'utente digita solo numeri, le "/" vengono aggiunte automaticamente
 * Esempio: "25121990" → "25/12/1990"
 */
export const formatDateInput = (value: string): string => {
  // Rimuove tutto tranne i numeri
  const numbersOnly = value.replace(/\D/g, '');
  
  // Limita a 8 cifre (ddmmyyyy)
  const limited = numbersOnly.slice(0, 8);
  
  // Aggiunge le barre oblique automaticamente
  if (limited.length >= 3 && limited.length <= 4) {
    return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  } else if (limited.length >= 5) {
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  }
  
  return limited;
};

/**
 * Gestisce l'evento onChange per input date con auto-completamento
 * Restituisce il valore formattato e la posizione del cursore
 */
export const handleDateInputChange = (
  value: string,
  cursorPosition: number
): { formattedValue: string; newCursorPosition: number } => {
  const oldValue = value;
  const formattedValue = formatDateInput(value);
  
  // Calcola la nuova posizione del cursore basandosi sui numeri digitati
  const numbersOnly = value.replace(/\D/g, '');
  let newCursorPosition = cursorPosition;
  
  // Se sono state aggiunte delle barre, aggiusta la posizione del cursore
  const oldSlashCount = (oldValue.match(/\//g) || []).length;
  const newSlashCount = (formattedValue.match(/\//g) || []).length;
  const addedSlashes = newSlashCount - oldSlashCount;
  
  if (addedSlashes > 0) {
    // Se sono state aggiunte barre, sposta il cursore dopo di esse
    newCursorPosition = cursorPosition + addedSlashes;
  }
  
  // Assicurati che il cursore non vada oltre la fine della stringa
  newCursorPosition = Math.min(newCursorPosition, formattedValue.length);
  
  return { formattedValue, newCursorPosition };
};

/**
 * Valida l'input durante la digitazione
 * Restituisce true se l'input è valido o parzialmente valido
 */
export const validateDateInputProgress = (value: string): boolean => {
  // Rimuove le barre oblique per controllare solo i numeri
  const numbersOnly = value.replace(/\//g, '');
  
  // Deve contenere solo numeri
  if (!/^\d*$/.test(numbersOnly)) return false;
  
  // Non più di 8 cifre
  if (numbersOnly.length > 8) return false;
  
  // Se ha almeno 2 cifre, controlla che il giorno sia valido (01-31)
  if (numbersOnly.length >= 2) {
    const day = parseInt(numbersOnly.slice(0, 2));
    if (day < 1 || day > 31) return false;
  }
  
  // Se ha almeno 4 cifre, controlla che il mese sia valido (01-12)
  if (numbersOnly.length >= 4) {
    const month = parseInt(numbersOnly.slice(2, 4));
    if (month < 1 || month > 12) return false;
  }
  
  // Se ha 8 cifre, controlla che l'anno sia ragionevole
  if (numbersOnly.length === 8) {
    const year = parseInt(numbersOnly.slice(4, 8));
    if (year < 1900 || year > 2100) return false;
    
    // Verifica che la data completa sia valida
    const day = parseInt(numbersOnly.slice(0, 2));
    const month = parseInt(numbersOnly.slice(2, 4));
    const date = new Date(year, month - 1, day);
    
    return !isNaN(date.getTime()) && 
           date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year;
  }
  
  return true;
};

/**
 * Converte l'input dell'utente (formato italiano) in formato ISO per il database
 */
export const convertInputToISO = (inputValue: string): string => {
  // Se l'input non è completo, restituisce stringa vuota
  if (!inputValue || inputValue.length !== 10) return '';
  
  return convertItalianToISO(inputValue);
};

/**
 * Converte una data dal database (ISO) per l'input dell'utente (formato italiano)
 */
export const convertISOToInput = (isoValue: string): string => {
  if (!isoValue) return '';
  
  return convertISOToItalian(isoValue);
};
