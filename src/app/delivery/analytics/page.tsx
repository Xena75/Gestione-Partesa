'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, AlertCircle, RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown, FileText, Package, Euro, Wallet, Truck, ClipboardList, MapPin, Users } from 'lucide-react';

interface Option {
  key: string;
  label: string;
}

interface MetaResponse {
  anni: number[];
  bu: string[];
  depositi: string[];
  tipologie: string[];
  vettori: string[];
  measures: Option[];
  dimensioni: Option[];
}

interface ColumnDef {
  key: string;
  label: string;
}

interface RigaPivot {
  key: string;
  label: string;
  valori: Record<string, number>;
  totale: number;
}

interface KpiData {
  righe: number;
  colli: number;
  compenso: number;
  tot_compenso: number;
  consegne: number;
  ordini: number;
  vettori: number;
  clienti: number;
}

interface PivotResponse {
  measure: string;
  measureLabel: string;
  isDistinct: boolean;
  rowDim: string;
  colDim: string;
  rowDimLabel: string;
  colDimLabel: string;
  kpi: KpiData;
  columns: ColumnDef[];
  righe: RigaPivot[];
  totaliCol: Record<string, number>;
  totaleGenerale: number;
}

const formatNumber = (value: number): string => {
  if (!value) return '—';
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value);
};

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('it-IT');
};

interface DetailResponse {
  mode: 'rows' | 'distinct';
  measure: string;
  rows: Record<string, string | number | null>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DetailSel {
  rowKey: string;
  rowLabel: string;
  colKey: string | null;
  colLabel: string | null;
}

const MESI_FILTRO: Option[] = [
  { key: '1', label: 'Gennaio' }, { key: '2', label: 'Febbraio' }, { key: '3', label: 'Marzo' },
  { key: '4', label: 'Aprile' }, { key: '5', label: 'Maggio' }, { key: '6', label: 'Giugno' },
  { key: '7', label: 'Luglio' }, { key: '8', label: 'Agosto' }, { key: '9', label: 'Settembre' },
  { key: '10', label: 'Ottobre' }, { key: '11', label: 'Novembre' }, { key: '12', label: 'Dicembre' }
];

type SortKey = 'row' | 'totale' | string;

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  allLabel: string;
  searchPlaceholder: string;
  idPrefix: string;
  mode?: 'include' | 'exclude';
  onModeChange?: (m: 'include' | 'exclude') => void;
}

function MultiSelectDropdown({
  label, options, selected, onChange, allLabel, searchPlaceholder, idPrefix, mode, onModeChange
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const summary = selected.length === 0
    ? allLabel
    : `${mode === 'exclude' ? 'Esclusi' : 'Selezionati'}: ${selected.length}`;

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <>
      <label className="form-label fw-semibold small mb-1">{label}</label>
      <div className="position-relative" ref={ref}>
        <button
          type="button"
          className="form-select form-select-sm text-start d-flex justify-content-between align-items-center"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={selected.length === 0 ? 'text-muted' : ''}>{summary}</span>
        </button>
        {open && (
          <div
            className="border rounded bg-white shadow-sm position-absolute w-100 mt-1 p-2"
            style={{ zIndex: 1050, maxHeight: 320, overflowY: 'auto' }}
          >
            {onModeChange && (
              <div className="btn-group btn-group-sm w-100 mb-2" role="group">
                <input type="radio" className="btn-check" name={`${idPrefix}-mode`} id={`${idPrefix}-inc`}
                  checked={mode === 'include'} onChange={() => onModeChange('include')} />
                <label className="btn btn-outline-success" htmlFor={`${idPrefix}-inc`}>Includi</label>
                <input type="radio" className="btn-check" name={`${idPrefix}-mode`} id={`${idPrefix}-exc`}
                  checked={mode === 'exclude'} onChange={() => onModeChange('exclude')} />
                <label className="btn btn-outline-danger" htmlFor={`${idPrefix}-exc`}>Escludi</label>
              </div>
            )}
            <input
              type="text"
              className="form-control form-control-sm mb-2"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small">{selected.length} selezionati</span>
              {selected.length > 0 && (
                <button type="button" className="btn btn-sm btn-link p-0" onClick={() => onChange([])}>Pulisci</button>
              )}
            </div>
            {filtered.length > 0 ? (
              filtered.map((o, i) => (
                <div className="form-check" key={o}>
                  <input className="form-check-input" type="checkbox" id={`${idPrefix}-${i}`}
                    checked={selected.includes(o)} onChange={() => toggle(o)} />
                  <label className="form-check-label" htmlFor={`${idPrefix}-${i}`}>{o}</label>
                </div>
              ))
            ) : (
              <div className="text-muted small px-1">Nessun risultato</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function DeliveryAnalyticsPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [data, setData] = useState<PivotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anno, setAnno] = useState<string>(String(new Date().getFullYear()));
  const [mese, setMese] = useState<string>('');
  const [measure, setMeasure] = useState<string>('righe');
  const [rowDim, setRowDim] = useState<string>('vettore');
  const [colDim, setColDim] = useState<string>('mese');
  const [bu, setBu] = useState<string[]>([]);
  const [depositi, setDepositi] = useState<string[]>([]);
  const [tipologie, setTipologie] = useState<string[]>([]);
  const [vettori, setVettori] = useState<string[]>([]);
  const [vettoreMode, setVettoreMode] = useState<'include' | 'exclude'>('include');

  const [sortBy, setSortBy] = useState<SortKey>('row');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [detailSel, setDetailSel] = useState<DetailSel | null>(null);
  const [detailData, setDetailData] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await fetch('/api/delivery/analytics?meta=1');
        if (!res.ok) throw new Error(`Errore HTTP: ${res.status}`);
        const json: MetaResponse = await res.json();
        setMeta(json);
        if (json.anni.length > 0 && !json.anni.includes(Number(anno))) {
          setAnno(String(json.anni[0]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore caricamento filtri');
      }
    };
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('anno', anno);
    if (mese) params.set('mese', mese);
    bu.forEach((v) => params.append('bu', v));
    depositi.forEach((v) => params.append('dep', v));
    tipologie.forEach((v) => params.append('tipologia', v));
    vettori.forEach((v) => params.append('vettore', v));
    if (vettori.length > 0) params.set('vettoreMode', vettoreMode);
    return params;
  }, [anno, mese, bu, depositi, tipologie, vettori, vettoreMode]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDetailSel(null);
      setDetailData(null);
      const params = new URLSearchParams();
      params.set('anno', anno);
      if (mese) params.set('mese', mese);
      params.set('measure', measure);
      params.set('rowDim', rowDim);
      params.set('colDim', colDim);
      bu.forEach((v) => params.append('bu', v));
      depositi.forEach((v) => params.append('dep', v));
      tipologie.forEach((v) => params.append('tipologia', v));
      vettori.forEach((v) => params.append('vettore', v));
      if (vettori.length > 0) params.set('vettoreMode', vettoreMode);

      const res = await fetch(`/api/delivery/analytics?${params.toString()}`);
      if (!res.ok) throw new Error(`Errore HTTP: ${res.status}`);
      const json: PivotResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  }, [anno, mese, measure, rowDim, colDim, bu, depositi, tipologie, vettori, vettoreMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSortBy('row');
    setSortDir('asc');
  }, [rowDim, colDim]);

  const fetchDetail = useCallback(async (sel: DetailSel, page: number) => {
    if (!data) return;
    try {
      setDetailLoading(true);
      const params = buildFilterParams();
      params.set('detail', '1');
      params.set('rowDim', data.rowDim);
      params.set('rowValue', sel.rowKey);
      if (sel.colKey !== null) {
        params.set('colDim', data.colDim);
        params.set('colValue', sel.colKey);
      }
      params.set('measure', measure);
      params.set('page', String(page));
      params.set('limit', '50');
      const res = await fetch(`/api/delivery/analytics?${params.toString()}`);
      if (!res.ok) throw new Error(`Errore HTTP: ${res.status}`);
      const json: DetailResponse = await res.json();
      setDetailData(json);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, [data, buildFilterParams, measure]);

  const openDetail = (riga: RigaPivot, col?: { key: string; label: string }) => {
    const colKey = col ? col.key : null;
    const colLabel = col ? col.label : null;
    if (detailSel && detailSel.rowKey === riga.key && detailSel.colKey === colKey) {
      setDetailSel(null);
      setDetailData(null);
      return;
    }
    const sel: DetailSel = { rowKey: riga.key, rowLabel: riga.label, colKey, colLabel };
    setDetailSel(sel);
    fetchDetail(sel, 1);
  };

  const closeDetail = () => {
    setDetailSel(null);
    setDetailData(null);
  };

  const goToDetailPage = (page: number) => {
    if (!detailSel || !detailData) return;
    if (page < 1 || page > detailData.totalPages) return;
    fetchDetail(detailSel, page);
  };

  const handleRowDimChange = (value: string) => {
    if (value === colDim) setColDim(rowDim);
    setRowDim(value);
  };
  const handleColDimChange = (value: string) => {
    if (value === rowDim) setRowDim(colDim);
    setColDim(value);
  };

  const dimensioni = meta?.dimensioni && meta.dimensioni.length > 0 ? meta.dimensioni : [];

  const measureLabel = useMemo(
    () => data?.measureLabel || meta?.measures.find((m) => m.key === measure)?.label || '',
    [data, meta, measure]
  );

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  const sortedRighe = useMemo(() => {
    if (!data) return [];
    const isNumericRowDim = ['mese', 'anno', 'settimana', 'giorno'].includes(data.rowDim);
    const righe = [...data.righe];
    righe.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'row') {
        cmp = isNumericRowDim
          ? Number(a.key) - Number(b.key)
          : a.label.localeCompare(b.label, 'it', { sensitivity: 'base' });
      } else if (sortBy === 'totale') {
        cmp = a.totale - b.totale;
      } else {
        cmp = (a.valori[sortBy] || 0) - (b.valori[sortBy] || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return righe;
  }, [data, sortBy, sortDir]);

  const renderSortIcon = (key: SortKey) => {
    if (sortBy !== key) return <ChevronsUpDown size={13} className="ms-1 text-muted" />;
    return sortDir === 'asc'
      ? <ArrowUp size={13} className="ms-1 text-primary" />
      : <ArrowDown size={13} className="ms-1 text-primary" />;
  };

  const detailColumns = useMemo<{ key: string; label: string; type: 'text' | 'date' | 'number' }[]>(() => {
    if (!detailData) return [];
    if (detailData.mode === 'distinct') {
      if (detailData.measure === 'consegne_distinte') {
        return [
          { key: 'valore', label: 'Consegna', type: 'text' },
          { key: 'ordine', label: 'Ordine', type: 'text' },
          { key: 'ragione_sociale', label: 'Cliente', type: 'text' },
          { key: 'descr_vettore', label: 'Vettore', type: 'text' },
          { key: 'viaggi', label: 'Viaggi', type: 'number' },
          { key: 'righe', label: 'N° righe', type: 'number' },
          { key: 'colli', label: 'Colli', type: 'number' },
          { key: 'compenso', label: 'Compenso', type: 'number' },
          { key: 'tot_compenso', label: 'Tot. compenso', type: 'number' }
        ];
      }
      if (detailData.measure === 'ordini_distinti') {
        return [
          { key: 'valore', label: 'Ordine', type: 'text' },
          { key: 'ragione_sociale', label: 'Cliente', type: 'text' },
          { key: 'descr_vettore', label: 'Vettore', type: 'text' },
          { key: 'viaggi', label: 'Viaggi', type: 'number' },
          { key: 'consegne', label: 'Consegne', type: 'number' },
          { key: 'righe', label: 'N° righe', type: 'number' },
          { key: 'colli', label: 'Colli', type: 'number' },
          { key: 'compenso', label: 'Compenso', type: 'number' },
          { key: 'tot_compenso', label: 'Tot. compenso', type: 'number' }
        ];
      }
      // vettori_distinti
      return [
        { key: 'valore', label: 'Vettore', type: 'text' },
        { key: 'cod_vettore', label: 'Cod. vettore', type: 'text' },
        { key: 'viaggi', label: 'Viaggi', type: 'number' },
        { key: 'consegne', label: 'Consegne', type: 'number' },
        { key: 'ordini', label: 'Ordini', type: 'number' },
        { key: 'righe', label: 'N° righe', type: 'number' },
        { key: 'colli', label: 'Colli', type: 'number' },
        { key: 'compenso', label: 'Compenso', type: 'number' },
        { key: 'tot_compenso', label: 'Tot. compenso', type: 'number' }
      ];
    }
    // mode 'rows'
    return [
      { key: 'data_mov_merce', label: 'Data', type: 'date' },
      { key: 'viaggio', label: 'Viaggio', type: 'text' },
      { key: 'ordine', label: 'Ordine', type: 'text' },
      { key: 'consegna_num', label: 'Consegna', type: 'text' },
      { key: 'ragione_sociale', label: 'Cliente', type: 'text' },
      { key: 'descr_vettore', label: 'Vettore', type: 'text' },
      { key: 'bu', label: 'BU', type: 'text' },
      { key: 'dep', label: 'Deposito', type: 'text' },
      { key: 'tipologia', label: 'Tipologia', type: 'text' },
      { key: 'colli', label: 'Colli', type: 'number' },
      { key: 'compenso', label: 'Compenso', type: 'number' },
      { key: 'tot_compenso', label: 'Tot. compenso', type: 'number' }
    ];
  }, [detailData]);

  const columns = data?.columns || [];
  const showTotals = data ? !data.isDistinct : true;
  const colSpanEmpty = columns.length + (showTotals ? 2 : 1);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h1 className="h4 mb-0 d-flex align-items-center gap-2">
          <BarChart3 size={22} className="text-primary" />
          Delivery Analytics — Pivot {data ? `${data.rowDimLabel} × ${data.colDimLabel}` : 'dinamica'}
        </h1>
        <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={loadData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinner-border spinner-border-sm' : ''} />
          Aggiorna
        </button>
      </div>

      {/* KPI riepilogo */}
      <div className="row g-2 mb-3">
        {([
          { label: 'Righe', value: data?.kpi.righe, icon: FileText, color: 'primary' },
          { label: 'Colli', value: data?.kpi.colli, icon: Package, color: 'success' },
          { label: 'Compenso (€)', value: data?.kpi.compenso, icon: Euro, color: 'warning' },
          { label: 'Tot. compenso (€)', value: data?.kpi.tot_compenso, icon: Wallet, color: 'danger' },
          { label: 'Consegne', value: data?.kpi.consegne, icon: MapPin, color: 'info' },
          { label: 'Ordini', value: data?.kpi.ordini, icon: ClipboardList, color: 'secondary' },
          { label: 'Vettori', value: data?.kpi.vettori, icon: Truck, color: 'dark' },
          { label: 'Clienti', value: data?.kpi.clienti, icon: Users, color: 'primary' }
        ] as const).map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div className="col-6 col-md-4 col-xl-3" key={kpi.label}>
              <div className="card h-100">
                <div className="card-body d-flex align-items-center gap-3 py-3">
                  <div className={`text-${kpi.color}`}><Icon size={26} /></div>
                  <div>
                    <div className="text-muted small">{kpi.label}</div>
                    <div className="h5 mb-0 fw-bold">{data ? formatNumber(kpi.value || 0) : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtri */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2">
            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Righe</label>
              <select className="form-select form-select-sm" value={rowDim} onChange={(e) => handleRowDimChange(e.target.value)}>
                {dimensioni.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Colonne</label>
              <select className="form-select form-select-sm" value={colDim} onChange={(e) => handleColDimChange(e.target.value)}>
                {dimensioni.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Misura</label>
              <select className="form-select form-select-sm" value={measure} onChange={(e) => setMeasure(e.target.value)}>
                {(meta?.measures || [{ key: 'righe', label: 'N° righe' }]).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Anno</label>
              <select className="form-select form-select-sm" value={anno} onChange={(e) => setAnno(e.target.value)}>
                <option value="all">Tutti gli anni</option>
                {(meta?.anni && meta.anni.length > 0 ? meta.anni : [Number(anno)]).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Mese</label>
              <select className="form-select form-select-sm" value={mese} onChange={(e) => setMese(e.target.value)}>
                <option value="">Tutti i mesi</option>
                {MESI_FILTRO.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <MultiSelectDropdown label="BU" options={meta?.bu || []} selected={bu} onChange={setBu}
                allLabel="Tutte le BU" searchPlaceholder="Cerca BU..." idPrefix="bu" />
            </div>
            <div className="col-6 col-lg-3">
              <MultiSelectDropdown label="Deposito" options={meta?.depositi || []} selected={depositi} onChange={setDepositi}
                allLabel="Tutti i depositi" searchPlaceholder="Cerca deposito..." idPrefix="dep" />
            </div>
            <div className="col-6 col-lg-3">
              <MultiSelectDropdown label="Tipologia" options={meta?.tipologie || []} selected={tipologie} onChange={setTipologie}
                allLabel="Tutte le tipologie" searchPlaceholder="Cerca tipologia..." idPrefix="tip" />
            </div>
            <div className="col-6 col-lg-3">
              <MultiSelectDropdown label="Vettore" options={meta?.vettori || []} selected={vettori} onChange={setVettori}
                allLabel="Tutti i vettori" searchPlaceholder="Cerca vettore..." idPrefix="vet"
                mode={vettoreMode} onModeChange={setVettoreMode} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <AlertCircle size={18} />{error}
        </div>
      )}

      {/* Tabella pivot */}
      <div className="card">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <span className="fw-semibold">
            {measureLabel}{data ? ` per ${data.rowDimLabel} e ${data.colDimLabel}` : ''}
          </span>
          {loading && <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />}
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-bordered table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th
                  style={{ minWidth: 220, position: 'sticky', left: 0, cursor: 'pointer' }}
                  className="bg-light user-select-none"
                  onClick={() => handleSort('row')}
                >
                  {data?.rowDimLabel || 'Riga'} {renderSortIcon('row')}
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="text-end user-select-none" style={{ cursor: 'pointer' }} onClick={() => handleSort(col.key)}>
                    {col.label} {renderSortIcon(col.key)}
                  </th>
                ))}
                {showTotals && (
                  <th className="text-end table-secondary user-select-none" style={{ cursor: 'pointer' }} onClick={() => handleSort('totale')}>
                    Totale {renderSortIcon('totale')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRighe.length > 0 ? (
                sortedRighe.map((riga) => (
                  <tr key={riga.key} className={detailSel?.rowKey === riga.key ? 'table-active' : ''}>
                    <td
                      className="fw-semibold bg-white text-primary"
                      style={{ position: 'sticky', left: 0, cursor: 'pointer' }}
                      onClick={() => openDetail(riga)}
                      title="Mostra dettaglio (intera riga)"
                    >
                      {riga.label}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`text-end${detailSel?.rowKey === riga.key && detailSel?.colKey === col.key ? ' table-primary' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openDetail(riga, col)}
                        title={`Dettaglio ${riga.label} · ${col.label}`}
                      >
                        {formatNumber(riga.valori[col.key] || 0)}
                      </td>
                    ))}
                    {showTotals && (
                      <td
                        className="text-end fw-semibold table-secondary"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openDetail(riga)}
                        title="Dettaglio (intera riga)"
                      >
                        {formatNumber(riga.totale)}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={colSpanEmpty} className="text-center text-muted py-4">
                    {loading ? 'Caricamento...' : 'Nessun dato per i filtri selezionati'}
                  </td>
                </tr>
              )}
            </tbody>
            {data && sortedRighe.length > 0 && showTotals && (
              <tfoot>
                <tr className="table-secondary fw-semibold">
                  <td style={{ position: 'sticky', left: 0 }} className="table-secondary">Totale</td>
                  {columns.map((col) => (
                    <td key={col.key} className="text-end">{formatNumber(data.totaliCol[col.key] || 0)}</td>
                  ))}
                  <td className="text-end">{formatNumber(data.totaleGenerale)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Dettaglio (al clic su etichetta di riga o su una cella) */}
      {detailSel && (
        <div className="card mt-3">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <span className="fw-semibold">
              Dettaglio ({measureLabel}) — {data?.rowDimLabel}: {detailSel.rowLabel}
              {detailSel.colKey !== null ? ` · ${data?.colDimLabel}: ${detailSel.colLabel}` : ''}
              {detailData ? ` (${formatNumber(detailData.total)} ${detailData.mode === 'distinct' ? 'voci' : 'righe'})` : ''}
            </span>
            <div className="d-flex align-items-center gap-2">
              {detailLoading && <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />}
              <button className="btn btn-sm btn-outline-secondary" onClick={closeDetail}>Chiudi</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  {detailColumns.map((c) => (
                    <th key={c.key} className={c.type === 'number' ? 'text-end' : ''}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailData && detailData.rows.length > 0 ? (
                  detailData.rows.map((r, i) => (
                    <tr key={i}>
                      {detailColumns.map((c) => {
                        const raw = r[c.key];
                        if (c.type === 'number') {
                          return <td key={c.key} className="text-end">{formatNumber(Number(raw) || 0)}</td>;
                        }
                        if (c.type === 'date') {
                          return <td key={c.key}>{formatDate(raw as string | null)}</td>;
                        }
                        return <td key={c.key}>{raw !== null && raw !== undefined && raw !== '' ? String(raw) : '—'}</td>;
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Math.max(1, detailColumns.length)} className="text-center text-muted py-4">
                      {detailLoading ? 'Caricamento...' : 'Nessuna riga di dettaglio'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {detailData && detailData.totalPages > 1 && (
            <div className="card-footer d-flex justify-content-between align-items-center">
              <span className="text-muted small">
                Pagina {detailData.page} di {detailData.totalPages}
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={detailData.page <= 1 || detailLoading}
                  onClick={() => goToDetailPage(detailData.page - 1)}
                >
                  Precedente
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={detailData.page >= detailData.totalPages || detailLoading}
                  onClick={() => goToDetailPage(detailData.page + 1)}
                >
                  Successiva
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
