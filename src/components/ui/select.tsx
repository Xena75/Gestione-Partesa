// src/components/ui/select.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled?: boolean;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function Select({ value, onValueChange, disabled, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, disabled }}>
      <div ref={selectRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = '', children }: SelectTriggerProps) {
  const { isOpen, setIsOpen, disabled } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-300 
        bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none 
        focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed 
        disabled:opacity-50 ${className}
      `}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

export function SelectContent({ children }: SelectContentProps) {
  const { isOpen } = React.useContext(SelectContext);

  if (!isOpen) return null;

  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
      <div className="max-h-60 overflow-auto py-1">
        {children}
      </div>
    </div>
  );
}

export function SelectItem({ value, children }: SelectItemProps) {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext);

  const handleClick = () => {
    onValueChange?.(value);
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = React.useContext(SelectContext);
  
  return (
    <span className="text-gray-900">
      {value || <span className="text-gray-500">{placeholder}</span>}
    </span>
  );
}
