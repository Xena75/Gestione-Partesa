// src/components/analytics/DeliveryAnalyticsFilters.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar, Filter, RotateCcw, Download, Search } from 'lucide-react';
// Removed direct import to avoid client-side MySQL issues

export interface AnalyticsFilters {
  dataDa?: string;
  dataA?: string;
  bu?: string;
  divisione?: string;
  deposito?: string;
  vettore?: string;
  tipologia?: string;
  cliente?: string;
  mese?: string;
}

interface DeliveryAnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onExportData?: () => void;
  loading?: boolean;
}

export default function DeliveryAnalyticsFilters({
  filters,
  onFiltersChange,
  onExportData,
  loading = false
}: DeliveryAnalyticsFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<{
    depositi: string[];
    vettori: string[];
    tipologie: string[];
    bu: string[];
    divisioni: string[];
    mesi: string[];
  }>({
    depositi: [],
    vettori: [],
    tipologie: [],
    bu: [],
    divisioni: [],
    mesi: []
  });

  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(filters);
  const [searchTerm, setSearchTerm] = useState(filters.cliente || '');

  // Carica opzioni filtri
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await fetch('/api/analytics/delivery/filters');
        if (!response.ok) {
          throw new Error('Errore nel caricamento filtri');
        }
        const options = await response.json();
        setFilterOptions(options);
      } catch (error) {
        console.error('Errore caricamento opzioni filtri:', error);
      }
    };

    loadFilterOptions();
  }, []);

  // Applica filtri con debounce per il cliente
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.cliente) {
        handleFilterChange('cliente', searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters: AnalyticsFilters = {};
    setLocalFilters(emptyFilters);
    setSearchTerm('');
    onFiltersChange(emptyFilters);
  };

  // Imposta date di default (ultimo mese)
  const getDefaultDates = () => {
    const oggi = new Date();
    const unMeseFa = new Date();
    unMeseFa.setMonth(oggi.getMonth() - 1);
    
    return {
      dataDa: unMeseFa.toISOString().split('T')[0],
      dataA: oggi.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();

  return (
    <Card className="p-6 mb-6 bg-white shadow-sm border-0">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Filtri Analytics</h3>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            disabled={loading}
            className="text-gray-600 hover:text-gray-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          {onExportData && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportData}
              disabled={loading}
              className="text-green-600 hover:text-green-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Esporta
            </Button>
          )}
        </div>
      </div>

      {/* Prima riga - Filtri temporali */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Data Da
          </label>
          <Input
            type="date"
            value={localFilters.dataDa || defaultDates.dataDa}
            onChange={(e) => handleFilterChange('dataDa', e.target.value)}
            disabled={loading}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Data A
          </label>
          <Input
            type="date"
            value={localFilters.dataA || defaultDates.dataA}
            onChange={(e) => handleFilterChange('dataA', e.target.value)}
            disabled={loading}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Mese</label>
          <Select
            value={localFilters.mese || 'Tutti'}
            onValueChange={(value) => handleFilterChange('mese', value)}
            disabled={loading}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Tutti i mesi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tutti">Tutti i mesi</SelectItem>
              {filterOptions.mesi.map((mese) => (
                <SelectItem key={mese} value={mese.split('-')[0]}>
                  {mese}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">BU</label>
          <Select
            value={localFilters.bu || 'Tutti'}
            onValueChange={(value) => handleFilterChange('bu', value)}
            disabled={loading}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Tutte le BU" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tutti">Tutte le BU</SelectItem>
              {filterOptions.bu.map((bu) => (
                <SelectItem key={bu} value={bu}>
                  {bu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Divisione</label>
          <Select
            value={localFilters.divisione || 'Tutte'}
            onValueChange={(value) => handleFilterChange('divisione', value)}
            disabled={loading}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Tutte le divisioni" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tutte">Tutte le divisioni</SelectItem>
              {filterOptions.divisioni.map((div) => (
                <SelectItem key={div} value={div}>
                  {div}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Deposito</label>
          <Select
            value={localFilters.deposito || 'Tutti'}
            onValueChange={(value) => handleFilterChange('deposito', value)}
            disabled={loading}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Tutti i depositi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tutti">Tutti i depositi</SelectItem>
              {filterOptions.depositi.map((dep) => (
                <SelectItem key={dep} value={dep}>
                  {dep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seconda riga - Altri filtri */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Vettore</label>
          <Select
            value={localFilters.vettore || 'Tutti'}
            onValueChange={(value) => handleFilterChange('vettore', value)}
            disabled={loading}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Tutti i vettori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tutti">Tutti i vettori</SelectItem>
              {filterOptions.vettori.map((vettore) => (
                <SelectItem key={vettore} value={vettore}>
                  {vettore}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Tipologia</label>
          <Select
            value={localFilters.tipologia || 'Tutte'}
            onValueChange={(value) => handleFilterChange('tipologia', value)}
            disabled={loading}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Tutte le tipologie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tutte">Tutte le tipologie</SelectItem>
              {filterOptions.tipologie.map((tip) => (
                <SelectItem key={tip} value={tip}>
                  {tip}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col lg:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1">
            <Search className="w-4 h-4 inline mr-1" />
            Cerca Cliente
          </label>
          <Input
            type="text"
            placeholder="Cerca per nome cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
            className="text-sm"
          />
        </div>
      </div>

      {/* Indicatore filtri attivi */}
      {Object.keys(localFilters).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Filtri attivi:</span>
            {Object.entries(localFilters).map(([key, value]) => {
              if (!value || value === 'Tutti' || value === 'Tutte') return null;
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  {key}: {value}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
