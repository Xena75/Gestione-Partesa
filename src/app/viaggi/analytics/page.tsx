'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, AlertCircle, RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown, Truck, Users, Package, Weight, Route, ClipboardList, MapPin, Clock } from 'lucide-react';

interface Option {
  key: string;
  label: string;
}

interface MetaResponse {
  anni: number[];
  magazzini: string[];
  trasportatori: string[];
  tipiVettore: string[];
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
  viaggi: number;
  trasportatori: number;
  colli: number;
  peso: number;
  km: number;
  ordini: number;
  toccate: number;
  orePod: number;
}

interface PivotResponse {
  anno: number;
  measure: string;
  measureLabel: string;
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

const MESI_FILTRO: Option[] = [
  { key: '1', label: 'Gennaio' },
  { key: '2', label: 'Febbraio' },
  { key: '3', label: 'Marzo' },
  { key: '4', label: 'Aprile' },
  { key: '5', label: 'Maggio' },
  { key: '6', label: 'Giugno' },
  { key: '7', label: 'Luglio' },
  { key: '8', label: 'Agosto' },
  { key: '9', label: 'Settembre' },
  { key: '10', label: 'Ottobre' },
  { key: '11', label: 'Novembre' },
  { key: '12', label: 'Dicembre' }
];

const DIM_FALLBACK: Option[] = [
  { key: 'trasportatore', label: 'Trasportatore' },
  { key: 'mese', label: 'Mese' },
  { key: 'giorno', label: 'Giorno settimana' },
  { key: 'magazzino', label: 'Magazzino' }
];

// 'row' = colonna delle etichette di riga; 'totale' = colonna totale; altrimenti chiave colonna
type SortKey = 'row' | 'totale' | string;

export default function ViaggiAnalyticsPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [data, setData] = useState<PivotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anno, setAnno] = useState<number>(new Date().getFullYear());
  const [mese, setMese] = useState<string>('');
  const [magazzini, setMagazzini] = useState<string[]>([]);
  const [magazzinoOpen, setMagazzinoOpen] = useState(false);
  const [magazzinoSearch, setMagazzinoSearch] = useState('');
  const magazzinoRef = useRef<HTMLDivElement>(null);
  const [selTrasportatori, setSelTrasportatori] = useState<string[]>([]);
  const [trasportatoreMode, setTrasportatoreMode] = useState<'include' | 'exclude'>('include');
  const [trasportatoreOpen, setTrasportatoreOpen] = useState(false);
  const [trasportatoreSearch, setTrasportatoreSearch] = useState('');
  const trasportatoreRef = useRef<HTMLDivElement>(null);
  const [tipoVettore, setTipoVettore] = useState<string>('');
  const [measure, setMeasure] = useState<string>('viaggi');
  const [rowDim, setRowDim] = useState<string>('trasportatore');
  const [colDim, setColDim] = useState<string>('mese');

  const [sortBy, setSortBy] = useState<SortKey>('row');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Carica opzioni filtri
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await fetch('/api/viaggi/analytics?meta=1');
        if (!res.ok) throw new Error(`Errore HTTP: ${res.status}`);
        const json: MetaResponse = await res.json();
        setMeta(json);
        if (json.anni.length > 0 && !json.anni.includes(anno)) {
          setAnno(json.anni[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore caricamento filtri');
      }
    };
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('anno', String(anno));
      params.set('measure', measure);
      params.set('rowDim', rowDim);
      params.set('colDim', colDim);
      if (mese) params.set('mese', mese);
      magazzini.forEach((m) => params.append('magazzino', m));
      selTrasportatori.forEach((t) => params.append('trasportatore', t));
      if (selTrasportatori.length > 0) params.set('trasportatoreMode', trasportatoreMode);
      if (tipoVettore) params.set('tipoVettore', tipoVettore);

      const res = await fetch(`/api/viaggi/analytics?${params.toString()}`);
      if (!res.ok) throw new Error(`Errore HTTP: ${res.status}`);
      const json: PivotResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  }, [anno, mese, measure, rowDim, colDim, magazzini, selTrasportatori, trasportatoreMode, tipoVettore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset ordinamento al cambio dimensioni
  useEffect(() => {
    setSortBy('row');
    setSortDir('asc');
  }, [rowDim, colDim]);

  const toggleTrasportatore = (t: string) => {
    setSelTrasportatori((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const toggleMagazzino = (m: string) => {
    setMagazzini((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  // Chiusura dropdown al click esterno
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (trasportatoreRef.current && !trasportatoreRef.current.contains(target)) {
        setTrasportatoreOpen(false);
      }
      if (magazzinoRef.current && !magazzinoRef.current.contains(target)) {
        setMagazzinoOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const magazzinoOptions = useMemo(
    () =>
      (meta?.magazzini || []).filter((m) =>
        m.toLowerCase().includes(magazzinoSearch.toLowerCase())
      ),
    [meta, magazzinoSearch]
  );

  const magazzinoSummary = useMemo(
    () => (magazzini.length === 0 ? 'Tutti i magazzini' : `Selezionati: ${magazzini.length}`),
    [magazzini]
  );

  const trasportatoriOptions = useMemo(
    () =>
      (meta?.trasportatori || []).filter((t) =>
        t.toLowerCase().includes(trasportatoreSearch.toLowerCase())
      ),
    [meta, trasportatoreSearch]
  );

  const trasportatoreSummary = useMemo(() => {
    if (selTrasportatori.length === 0) return 'Tutti i trasportatori';
    const prefix = trasportatoreMode === 'exclude' ? 'Esclusi' : 'Selezionati';
    return `${prefix}: ${selTrasportatori.length}`;
  }, [selTrasportatori, trasportatoreMode]);

  const handleRowDimChange = (value: string) => {
    if (value === colDim) setColDim(rowDim);
    setRowDim(value);
  };

  const handleColDimChange = (value: string) => {
    if (value === rowDim) setRowDim(colDim);
    setColDim(value);
  };

  const dimensioni = meta?.dimensioni && meta.dimensioni.length > 0 ? meta.dimensioni : DIM_FALLBACK;

  const measureLabel = useMemo(
    () => data?.measureLabel || meta?.measures.find((m) => m.key === measure)?.label || '',
    [data, meta, measure]
  );

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortedRighe = useMemo(() => {
    if (!data) return [];
    const isNumericRowDim = data.rowDim === 'mese' || data.rowDim === 'giorno';
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

  const columns = data?.columns || [];
  // Per le misure "distinte" la somma delle celle non è additiva: nascondiamo i Totali
  const showTotals = data ? data.measure !== 'trasportatori' : true;
  const colSpanEmpty = columns.length + (showTotals ? 2 : 1);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h1 className="h4 mb-0 d-flex align-items-center gap-2">
          <BarChart3 size={22} className="text-primary" />
          Viaggi Analytics — Pivot {data ? `${data.rowDimLabel} × ${data.colDimLabel}` : 'dinamica'}
        </h1>
        <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={loadData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinner-border spinner-border-sm' : ''} />
          Aggiorna
        </button>
      </div>

      {/* KPI riepilogo */}
      <div className="row g-2 mb-3">
        {([
          { label: 'Viaggi', value: data?.kpi.viaggi, icon: Truck, color: 'primary' },
          { label: 'Trasportatori', value: data?.kpi.trasportatori, icon: Users, color: 'info' },
          { label: 'Colli', value: data?.kpi.colli, icon: Package, color: 'success' },
          { label: 'Peso (Kg)', value: data?.kpi.peso, icon: Weight, color: 'warning' },
          { label: 'Km', value: data?.kpi.km, icon: Route, color: 'secondary' },
          { label: 'Ordini', value: data?.kpi.ordini, icon: ClipboardList, color: 'danger' },
          { label: 'Toccate', value: data?.kpi.toccate, icon: MapPin, color: 'dark' },
          { label: 'Ore PoD', value: data?.kpi.orePod, icon: Clock, color: 'primary' }
        ] as const).map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div className="col-6 col-md-4 col-xl-3" key={kpi.label}>
              <div className="card h-100">
                <div className="card-body d-flex align-items-center gap-3 py-3">
                  <div className={`text-${kpi.color}`}>
                    <Icon size={26} />
                  </div>
                  <div>
                    <div className="text-muted small">{kpi.label}</div>
                    <div className="h5 mb-0 fw-bold">
                      {data ? formatNumber(kpi.value || 0) : '—'}
                    </div>
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
                {dimensioni.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Colonne</label>
              <select className="form-select form-select-sm" value={colDim} onChange={(e) => handleColDimChange(e.target.value)}>
                {dimensioni.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Misura</label>
              <select className="form-select form-select-sm" value={measure} onChange={(e) => setMeasure(e.target.value)}>
                {(meta?.measures || [{ key: 'viaggi', label: 'N° viaggi' }]).map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Anno</label>
              <select className="form-select form-select-sm" value={anno} onChange={(e) => setAnno(Number(e.target.value))}>
                {(meta?.anni && meta.anni.length > 0 ? meta.anni : [anno]).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Mese</label>
              <select className="form-select form-select-sm" value={mese} onChange={(e) => setMese(e.target.value)}>
                <option value="">Tutti i mesi</option>
                {MESI_FILTRO.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Tipo vettore</label>
              <select className="form-select form-select-sm" value={tipoVettore} onChange={(e) => setTipoVettore(e.target.value)}>
                <option value="">Tutti</option>
                {(meta?.tipiVettore || []).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Trasportatore</label>
              <div className="position-relative" ref={trasportatoreRef}>
                <button
                  type="button"
                  className="form-select form-select-sm text-start d-flex justify-content-between align-items-center"
                  onClick={() => setTrasportatoreOpen((o) => !o)}
                >
                  <span className={selTrasportatori.length === 0 ? 'text-muted' : ''}>{trasportatoreSummary}</span>
                </button>
                {trasportatoreOpen && (
                  <div
                    className="border rounded bg-white shadow-sm position-absolute w-100 mt-1 p-2"
                    style={{ zIndex: 1050, maxHeight: 320, overflowY: 'auto' }}
                  >
                    <div className="btn-group btn-group-sm w-100 mb-2" role="group" aria-label="Modalità filtro trasportatore">
                      <input
                        type="radio"
                        className="btn-check"
                        name="trasportatoreMode"
                        id="modeInclude"
                        checked={trasportatoreMode === 'include'}
                        onChange={() => setTrasportatoreMode('include')}
                      />
                      <label className="btn btn-outline-success" htmlFor="modeInclude">Includi</label>
                      <input
                        type="radio"
                        className="btn-check"
                        name="trasportatoreMode"
                        id="modeExclude"
                        checked={trasportatoreMode === 'exclude'}
                        onChange={() => setTrasportatoreMode('exclude')}
                      />
                      <label className="btn btn-outline-danger" htmlFor="modeExclude">Escludi</label>
                    </div>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      placeholder="Cerca trasportatore..."
                      value={trasportatoreSearch}
                      onChange={(e) => setTrasportatoreSearch(e.target.value)}
                    />
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small">{selTrasportatori.length} selezionati</span>
                      {selTrasportatori.length > 0 && (
                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setSelTrasportatori([])}>
                          Pulisci
                        </button>
                      )}
                    </div>
                    {trasportatoriOptions.length > 0 ? (
                      trasportatoriOptions.map((t, i) => (
                        <div className="form-check" key={t}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`tr-${i}`}
                            checked={selTrasportatori.includes(t)}
                            onChange={() => toggleTrasportatore(t)}
                          />
                          <label className="form-check-label" htmlFor={`tr-${i}`}>{t}</label>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted small px-1">Nessun risultato</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <label className="form-label fw-semibold small mb-1">Magazzino di partenza</label>
              <div className="position-relative" ref={magazzinoRef}>
                <button
                  type="button"
                  className="form-select form-select-sm text-start d-flex justify-content-between align-items-center"
                  onClick={() => setMagazzinoOpen((o) => !o)}
                >
                  <span className={magazzini.length === 0 ? 'text-muted' : ''}>{magazzinoSummary}</span>
                </button>
                {magazzinoOpen && (
                  <div
                    className="border rounded bg-white shadow-sm position-absolute w-100 mt-1 p-2"
                    style={{ zIndex: 1050, maxHeight: 320, overflowY: 'auto' }}
                  >
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      placeholder="Cerca magazzino..."
                      value={magazzinoSearch}
                      onChange={(e) => setMagazzinoSearch(e.target.value)}
                    />
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small">{magazzini.length} selezionati</span>
                      {magazzini.length > 0 && (
                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setMagazzini([])}>
                          Pulisci
                        </button>
                      )}
                    </div>
                    {magazzinoOptions.length > 0 ? (
                      magazzinoOptions.map((m, i) => (
                        <div className="form-check" key={m}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`mag-${i}`}
                            checked={magazzini.includes(m)}
                            onChange={() => toggleMagazzino(m)}
                          />
                          <label className="form-check-label" htmlFor={`mag-${i}`}>{m}</label>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted small px-1">Nessun risultato</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Tabella pivot */}
      <div className="card">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <span className="fw-semibold">
            {measureLabel}{data ? ` per ${data.rowDimLabel} e ${data.colDimLabel} — Anno ${data.anno}` : ''}
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
                  <th
                    key={col.key}
                    className="text-end user-select-none"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label} {renderSortIcon(col.key)}
                  </th>
                ))}
                {showTotals && (
                  <th
                    className="text-end table-secondary user-select-none"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('totale')}
                  >
                    Totale {renderSortIcon('totale')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRighe.length > 0 ? (
                sortedRighe.map((riga) => (
                  <tr key={riga.key}>
                    <td className="fw-semibold bg-white" style={{ position: 'sticky', left: 0 }}>{riga.label}</td>
                    {columns.map((col) => (
                      <td key={col.key} className="text-end">{formatNumber(riga.valori[col.key] || 0)}</td>
                    ))}
                    {showTotals && (
                      <td className="text-end fw-semibold table-secondary">{formatNumber(riga.totale)}</td>
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
    </div>
  );
}
