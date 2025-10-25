'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  formatDateInput, 
  handleDateInputChange, 
  validateDateInputProgress,
  convertInputToISO,
  convertISOToInput
} from '@/lib/date-utils';

interface DateInputProps {
  value?: string; // Valore in formato ISO (yyyy-mm-dd) dal database
  onChange: (isoValue: string) => void; // Callback con valore ISO per il database
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  label?: string;
  error?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value = '',
  onChange,
  placeholder = 'gg/mm/aaaa',
  className = '',
  disabled = false,
  required = false,
  name,
  id,
  label,
  error
}) => {
  // Converte il valore ISO in formato italiano per la visualizzazione
  const [displayValue, setDisplayValue] = useState(() => convertISOToInput(value));
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Aggiorna il display value quando cambia il prop value
  useEffect(() => {
    const newDisplayValue = convertISOToInput(value);
    setDisplayValue(newDisplayValue);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Gestisce l'auto-completamento
    const { formattedValue, newCursorPosition } = handleDateInputChange(inputValue, cursorPosition);
    
    // Valida l'input durante la digitazione
    const isValidInput = validateDateInputProgress(formattedValue);
    setIsValid(isValidInput);

    // Aggiorna il valore visualizzato
    setDisplayValue(formattedValue);

    // Aggiorna la posizione del cursore in modo sincrono
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    });

    // Se l'input è completo e valido, converte in ISO e chiama onChange
    if (formattedValue.length === 10 && isValidInput) {
      const isoValue = convertInputToISO(formattedValue);
      onChange(isoValue);
    } else {
      // Se l'input non è completo o non è valido, passa una stringa vuota
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permette solo numeri, backspace, delete, tab, escape, enter e frecce
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Permette numeri (0-9)
    if (e.key >= '0' && e.key <= '9') {
      return;
    }

    // Blocca tutti gli altri caratteri
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Estrae solo i numeri dal testo incollato
    const numbersOnly = pastedText.replace(/\D/g, '');
    
    if (numbersOnly.length > 0) {
      const formattedValue = formatDateInput(numbersOnly);
      const isValidInput = validateDateInputProgress(formattedValue);
      
      setDisplayValue(formattedValue);
      setIsValid(isValidInput);

      if (formattedValue.length === 10 && isValidInput) {
        const isoValue = convertInputToISO(formattedValue);
        onChange(isoValue);
      }
    }
  };

  const inputClasses = `
    form-control
    ${!isValid ? 'is-invalid' : ''}
    ${className}
  `.trim();

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={inputClasses}
        disabled={disabled}
        required={required}
        maxLength={10}
        autoComplete="off"
      />
      {!isValid && (
        <div className="invalid-feedback">
          Inserisci una data valida nel formato gg/mm/aaaa
        </div>
      )}
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
      <div className="form-text">
        Digita solo i numeri, le barre oblique si aggiungono automaticamente
      </div>
    </div>
  );
};

export default DateInput;