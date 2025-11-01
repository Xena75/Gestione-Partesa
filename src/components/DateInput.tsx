'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
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
  const [displayValue, setDisplayValue] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  // Aggiorna il display value quando cambia il prop value
  useEffect(() => {
    const newDisplayValue = convertISOToInput(value);
    setDisplayValue(newDisplayValue);
  }, [value, id, name]);

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

    // Converte il valore in formato ISO prima di chiamare onChange
    const isoValue = convertInputToISO(formattedValue);
    onChange(isoValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permette solo numeri, slash, backspace, delete, tab, escape, enter e frecce
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    const isNumber = /^[0-9]$/.test(e.key);
    const isSlash = e.key === '/';
    const isAllowedKey = allowedKeys.includes(e.key);
    const isCtrlA = e.ctrlKey && e.key === 'a';
    const isCtrlC = e.ctrlKey && e.key === 'c';
    const isCtrlV = e.ctrlKey && e.key === 'v';
    const isCtrlX = e.ctrlKey && e.key === 'x';
    const isCtrlZ = e.ctrlKey && e.key === 'z';

    if (!isNumber && !isSlash && !isAllowedKey && !isCtrlA && !isCtrlC && !isCtrlV && !isCtrlX && !isCtrlZ) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cursorPosition = inputRef.current?.selectionStart || 0;

    // Gestisce l'incollaggio con formattazione automatica
    const { formattedValue, newCursorPosition } = handleDateInputChange(pastedText, cursorPosition);
    
    const isValidInput = validateDateInputProgress(formattedValue);
    setIsValid(isValidInput);
    setDisplayValue(formattedValue);

    // Aggiorna la posizione del cursore
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    });

    // Converte e invia il valore
    const isoValue = convertInputToISO(formattedValue);
    onChange(isoValue);
  };

  const handleCalendarClick = () => {
    if (!disabled) {
      setShowDatePicker(true);
      
      // Attiva il date picker dopo un breve delay per assicurarsi che sia renderizzato
      setTimeout(() => {
        if (datePickerRef.current) {
          try {
            if (datePickerRef.current.showPicker) {
              datePickerRef.current.showPicker();
            } else {
              datePickerRef.current.click();
            }
          } catch (error) {
            // Fallback: simula un click sull'input
            datePickerRef.current.click();
          }
        }
      }, 10);
    }
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value; // Formato YYYY-MM-DD

    if (selectedDate) {
      const italianDate = convertISOToInput(selectedDate);
      setDisplayValue(italianDate);
      setIsValid(true);
      
      // Invia il valore ISO (selectedDate è già in formato ISO)
      onChange(selectedDate);
    } else {
      onChange('');
    }
    setShowDatePicker(false);
  };

  const handleDatePickerBlur = () => {
    // Nasconde il date picker quando perde il focus
    setTimeout(() => setShowDatePicker(false), 100);
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
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      <div className="input-group">
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
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`btn btn-outline-secondary ${disabled ? 'disabled' : ''}`}
            onClick={handleCalendarClick}
            disabled={disabled}
            style={{ borderColor: 'var(--bs-border-color)' }}
          >
            <Calendar size={16} />
          </button>
          {/* Input date che si sovrappone al pulsante quando attivo */}
          {showDatePicker && (
            <input
              ref={datePickerRef}
              type="date"
              value={value || ''}
              onChange={handleDatePickerChange}
              onBlur={handleDatePickerBlur}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                zIndex: 1000
              }}
            />
          )}
        </div>
      </div>
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
    </div>
  );
};

export default DateInput;