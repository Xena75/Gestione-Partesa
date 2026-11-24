'use client';

import Link from 'next/link';
import { Archive, ClipboardList, Ticket, Truck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type TabKey = 'trips' | 'receipts' | 'cadhoc' | 'anagrafiche';

interface TripRow {
  id: string;
  trip_number: string | null;
  order_ref: string | null;
  trip_date: string;
  carrier_description: string | null;
  carrier_cod_vettore: number | null;
  packages: number | null;
  service_notes: string | null;
  is_extra: number;
  client_amount: number | null;
  archived: number;
  billing_notes: string | null;
  version: number;
  cad_amount?: number | null;
  sub_amount?: number | null;
  payee_names?: string | null;
}

interface CompensationForm {
  cost_type: 'cad_hoc' | 'terzista';
  source_employee_id: string;
  source_company_id: string;
  booklet_ref: string;
  vouchers_count: string;
  voucher_unit_value: string;
  terzista_amount: string;
}

interface Beneficiary {
  id: string;
  name: string;
  kind: 'employee' | 'company';
  cdc: string | null;
  active: number;
  employee_id: string | null;
  company_id: number | null;
  version: number;
}

interface ViaggiEmployee {
  id: string;
  nominativo: string;
  cdc?: string | null;
  active: number | boolean;
}

interface ViaggiCompany {
  id: number;
  name: string;
  code?: string;
}

interface Carrier {
  Cod_Vettore: number;
  Descr_Vettore: string | null;
  Attivo?: number;
}

function money(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function dateIT(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('it-IT');
}

const emptyComp = (): CompensationForm => ({
  cost_type: 'cad_hoc',
  source_employee_id: '',
  source_company_id: '',
  booklet_ref: '',
  vouchers_count: '',
  voucher_unit_value: '10',
  terzista_amount: '',
});

export default function ExtraPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<TabKey>('trips');
  const [rows, setRows] = useState<TripRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [cadRows, setCadRows] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [viaggiEmployees, setViaggiEmployees] = useState<ViaggiEmployee[]>([]);
  const [viaggiCompanies, setViaggiCompanies] = useState<ViaggiCompany[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [dataDa, setDataDa] = useState('');
  const [dataA, setDataA] = useState('');
  const [archived, setArchived] = useState<'all' | '0' | '1'>('all');
  const [isExtra, setIsExtra] = useState<'all' | '0' | '1'>('all');
  const [hasCadHoc, setHasCadHoc] = useState<'all' | '0' | '1'>('all');
  const [amountPresence, setAmountPresence] = useState<'all' | 'missing' | 'zero' | 'present'>('all');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [sortBy, setSortBy] = useState<
    'trip_date' | 'trip_number' | 'service_notes' | 'carrier_description' | 'billing_notes'
  >('trip_date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [anagKind, setAnagKind] = useState<'all' | 'employee' | 'company'>('all');
  const [anagActive, setAnagActive] = useState<'all' | '0' | '1'>('all');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TripRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trip_number: '',
    order_ref: '',
    trip_date: '',
    carrier_cod_vettore: '',
    carrier_description: '',
    packages: '',
    service_notes: '',
    is_extra: true,
    client_amount: '',
    archived: false,
    billing_notes: '',
    version: 1,
  });
  const [comps, setComps] = useState<CompensationForm[]>([emptyComp()]);

  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TripRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cadDetail, setCadDetail] = useState<{ id: string; name: string } | null>(null);
  const [cadDetailRows, setCadDetailRows] = useState<TripRow[]>([]);
  const [cadDetailLoading, setCadDetailLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const viewBeneficiaryTrips = (id: string, name: string) => {
    if (!id) {
      showToast('Beneficiario senza anagrafica collegata');
      return;
    }
    setBeneficiaryId(id);
    setBeneficiaryName(name);
    setPage(1);
    setTab('trips');
  };

  const openCadBeneficiaryDetail = async (id: string, name: string) => {
    if (!id) {
      showToast('Beneficiario senza anagrafica collegata');
      return;
    }
    setCadDetail({ id, name });
    setCadDetailLoading(true);
    setCadDetailRows([]);
    try {
      const params = new URLSearchParams();
      params.set('beneficiaryId', id);
      params.set('page', '1');
      params.set('pageSize', '100');
      params.set('sortBy', 'trip_date');
      params.set('sortOrder', 'DESC');
      if (dataDa) params.set('dataDa', dataDa);
      if (dataA) params.set('dataA', dataA);
      params.set('archived', archived);
      const res = await fetch(`/api/extra/trips?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Errore dettaglio');
      setCadDetailRows(json.rows || []);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore');
      setCadDetail(null);
    } finally {
      setCadDetailLoading(false);
    }
  };

  const clearBeneficiaryFilter = () => {
    setBeneficiaryId('');
    setBeneficiaryName('');
    setPage(1);
  };

  const applyMonth = (value: string) => {
    setMonth(value);
    if (!value) {
      setDataDa('');
      setDataA('');
      return;
    }
    const [y, m] = value.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, '0');
    setDataDa(`${y}-${mm}-01`);
    setDataA(`${y}-${mm}-${String(last).padStart(2, '0')}`);
  };

  const buildTripParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (search.trim()) params.set('search', search.trim());
    if (dataDa) params.set('dataDa', dataDa);
    if (dataA) params.set('dataA', dataA);
    if (tab === 'receipts') {
      params.set('isExtra', '1');
      params.set('archived', '0');
    } else {
      params.set('archived', archived);
      params.set('isExtra', isExtra);
    }
    params.set('amountPresence', amountPresence);
    params.set('hasCadHoc', hasCadHoc);
    if (beneficiaryId) params.set('beneficiaryId', beneficiaryId);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    return params;
  }, [page, pageSize, search, dataDa, dataA, archived, isExtra, hasCadHoc, amountPresence, beneficiaryId, sortBy, sortOrder, tab]);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildTripParams();
      const [listRes, sumRes] = await Promise.all([
        fetch(`/api/extra/trips?${params}`),
        fetch(`/api/extra/summary?${params}`),
      ]);
      const listJson = await listRes.json();
      const sumJson = await sumRes.json();
      if (!listRes.ok || !listJson.success) throw new Error(listJson.error || 'Errore lista');
      setRows(listJson.rows || []);
      setTotal(listJson.total || 0);
      if (sumRes.ok && sumJson.success) setSummary(sumJson.data || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildTripParams]);

  const loadCad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dataDa) params.set('dataDa', dataDa);
      if (dataA) params.set('dataA', dataA);
      if (search.trim()) params.set('search', search.trim());
      if (archived !== 'all') params.set('archived', archived);
      const res = await fetch(`/api/extra/cad-hoc-summary?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Errore cad-hoc');
      setCadRows(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
      setCadRows([]);
    } finally {
      setLoading(false);
    }
  }, [dataDa, dataA, search, archived]);

  const loadBeneficiaries = useCallback(async () => {
    const res = await fetch('/api/extra/beneficiaries?active=all');
    const json = await res.json();
    if (res.ok && json.success) setBeneficiaries(json.data || []);
  }, []);

  const loadViaggiAnagrafiche = useCallback(async () => {
    const [empRes, coRes] = await Promise.all([fetch('/api/employees'), fetch('/api/companies')]);
    const empJson = await empRes.json();
    const coJson = await coRes.json();
    if (empRes.ok && empJson.success) setViaggiEmployees(empJson.data || []);
    else if (empRes.ok && Array.isArray(empJson)) setViaggiEmployees(empJson);
    if (coRes.ok) {
      const list = Array.isArray(coJson) ? coJson : coJson.data || [];
      setViaggiCompanies(list);
    }
  }, []);

  const loadCarriers = useCallback(async () => {
    const res = await fetch('/api/gestione/tab-vettori?page=1&pageSize=100&attivo=1');
    const json = await res.json();
    if (res.ok && json.success) setCarriers(json.data || []);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, search, dataDa, dataA, archived, isExtra, hasCadHoc, amountPresence, sortBy, sortOrder]);

  const toggleSort = (
    col: 'trip_date' | 'trip_number' | 'service_notes' | 'carrier_description' | 'billing_notes'
  ) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(col);
      setSortOrder(col === 'trip_date' ? 'DESC' : 'ASC');
    }
  };

  const sortMark = (
    col: 'trip_date' | 'trip_number' | 'service_notes' | 'carrier_description' | 'billing_notes'
  ) => (sortBy === col ? (sortOrder === 'ASC' ? ' ▲' : ' ▼') : '');

  useEffect(() => {
    if (tab === 'cadhoc') loadCad();
    else if (tab === 'anagrafiche') {
      setLoading(true);
      loadBeneficiaries().finally(() => setLoading(false));
    } else loadTrips();
  }, [tab, page, loadTrips, loadCad, loadBeneficiaries]);

  const ensureModalLookups = useCallback(async () => {
    const tasks: Promise<void>[] = [];
    if (!carriers.length) tasks.push(loadCarriers());
    if (!viaggiEmployees.length || !viaggiCompanies.length) tasks.push(loadViaggiAnagrafiche());
    if (tasks.length) await Promise.all(tasks);
  }, [carriers.length, viaggiEmployees.length, viaggiCompanies.length, loadCarriers, loadViaggiAnagrafiche]);

  const activeEmployees = useMemo(
    () => viaggiEmployees.filter((e) => e.active === 1 || e.active === true),
    [viaggiEmployees]
  );

  const filteredBeneficiaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return beneficiaries.filter((b) => {
      if (anagKind !== 'all' && b.kind !== anagKind) return false;
      if (anagActive === '1' && !b.active) return false;
      if (anagActive === '0' && !!b.active) return false;
      if (!q) return true;
      const hay = `${b.name} ${b.cdc || ''} ${b.employee_id || ''} ${b.company_id ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [beneficiaries, search, anagKind, anagActive]);

  const openNew = async () => {
    await ensureModalLookups();
    setFormErrors([]);
    setEditing(null);
    setForm({
      trip_number: '',
      order_ref: '',
      trip_date: new Date().toISOString().slice(0, 10),
      carrier_cod_vettore: '',
      carrier_description: '',
      packages: '',
      service_notes: '',
      is_extra: true,
      client_amount: '',
      archived: false,
      billing_notes: '',
      version: 1,
    });
    setComps([emptyComp()]);
    setShowModal(true);
  };

  const openEdit = async (row: TripRow) => {
    setLoading(true);
    try {
      setFormErrors([]);
      await ensureModalLookups();
      const res = await fetch(`/api/extra/trips/${row.id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Errore dettaglio');
      const t = json.data;
      setEditing(t);
      setForm({
        trip_number: t.trip_number || '',
        order_ref: t.order_ref || '',
        trip_date: String(t.trip_date).slice(0, 10),
        carrier_cod_vettore: t.carrier_cod_vettore != null ? String(t.carrier_cod_vettore) : '',
        carrier_description: t.carrier_description || '',
        packages: t.packages != null ? String(t.packages) : '',
        service_notes: t.service_notes || '',
        is_extra: !!t.is_extra,
        client_amount: t.client_amount != null ? String(t.client_amount) : '',
        archived: !!t.archived,
        billing_notes: t.billing_notes || '',
        version: t.version,
      });
      const loaded: CompensationForm[] = (t.compensations || []).map((c: any) => ({
        cost_type: c.cost_type,
        source_employee_id: c.beneficiary_employee_id || '',
        source_company_id: c.beneficiary_company_id != null ? String(c.beneficiary_company_id) : '',
        booklet_ref: c.booklet_ref || '',
        vouchers_count: c.vouchers_count != null ? String(c.vouchers_count) : '',
        voucher_unit_value: c.voucher_unit_value != null ? String(c.voucher_unit_value) : '10',
        terzista_amount: c.terzista_amount != null ? String(c.terzista_amount) : '',
      }));
      setComps(loaded.length ? loaded : [emptyComp()]);
      setShowModal(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  const saveTrip = async () => {
    const missing: string[] = [];
    if (!form.trip_date) missing.push('Data');
    if (!form.trip_number.trim()) missing.push('Viaggio');
    if (!form.order_ref.trim()) missing.push('Ordine/DDT');
    if (form.packages === '' || Number.isNaN(Number(form.packages))) missing.push('Colli');
    if (!form.carrier_cod_vettore) missing.push('Vettore');
    if (form.client_amount === '' || Number.isNaN(Number(form.client_amount))) missing.push('Importo extra');
    if (!form.service_notes.trim()) missing.push('Note servizio');
    comps.forEach((c, i) => {
      const n = i + 1;
      if (c.cost_type === 'cad_hoc') {
        const hasBuoni = c.vouchers_count !== '' && !Number.isNaN(Number(c.vouchers_count));
        if (hasBuoni && !c.booklet_ref.trim()) {
          missing.push(`Compenso #${n}: Blocchetto (obbligatorio con Buoni)`);
        }
      }
      if (c.cost_type === 'terzista' && c.source_company_id) {
        if (c.terzista_amount === '' || Number.isNaN(Number(c.terzista_amount))) {
          missing.push(`Compenso #${n}: Importo terzista (obbligatorio con Azienda)`);
        }
      }
    });
    if (missing.length) {
      setFormErrors(missing);
      return;
    }
    setFormErrors([]);
    setSaving(true);
    try {
      const compensations = comps
        .filter((c) => c.cost_type)
        .map((c) => ({
          cost_type: c.cost_type,
          source_employee_id: c.cost_type === 'cad_hoc' ? c.source_employee_id || null : null,
          source_company_id: c.cost_type === 'terzista' && c.source_company_id ? Number(c.source_company_id) : null,
          booklet_ref: c.booklet_ref || null,
          vouchers_count: c.vouchers_count === '' ? null : Number(c.vouchers_count),
          voucher_unit_value: c.voucher_unit_value === '' ? 10 : Number(c.voucher_unit_value),
          terzista_amount: c.terzista_amount === '' ? null : Number(c.terzista_amount),
        }))
        .filter((c) => {
          if (c.cost_type === 'cad_hoc') {
            return c.vouchers_count != null || c.booklet_ref || c.source_employee_id;
          }
          return c.terzista_amount != null || c.source_company_id != null;
        });

      const carrier = carriers.find((c) => String(c.Cod_Vettore) === form.carrier_cod_vettore);
      const payload = {
        trip_number: form.trip_number || null,
        order_ref: form.order_ref || null,
        trip_date: form.trip_date,
        carrier_cod_vettore: form.carrier_cod_vettore ? Number(form.carrier_cod_vettore) : null,
        carrier_description: carrier?.Descr_Vettore || form.carrier_description || null,
        packages: form.packages === '' ? null : Number(form.packages),
        service_notes: form.service_notes || null,
        is_extra: form.is_extra,
        client_amount: form.client_amount === '' ? null : Number(form.client_amount),
        archived: form.archived,
        billing_notes: form.billing_notes || null,
        compensations,
        version: form.version,
      };

      const res = editing
        ? await fetch(`/api/extra/trips/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/extra/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (res.status === 409) {
        alert(json.error + '\nRicarica i dati aggiornati.');
        if (json.current) await openEdit(json.current);
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.error || 'Salvataggio fallito');
      setShowModal(false);
      showToast(editing ? 'Viaggio aggiornato' : 'Viaggio creato');
      await loadTrips();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const archiveTrip = async (row: TripRow, archived: boolean) => {
    try {
      const res = await fetch(`/api/extra/trips/${row.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived, version: row.version }),
      });
      const json = await res.json();
      if (res.status === 409) {
        alert(json.error);
        await loadTrips();
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.error || 'Errore');
      showToast(archived ? 'Incasso registrato (Archivia)' : 'Archivia annullata');
      await loadTrips();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore');
    }
  };

  const askDeleteTrip = (row: TripRow) => {
    setDeleteTarget(row);
  };

  const confirmDeleteTrip = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/extra/trips/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Errore eliminazione');
      setDeleteTarget(null);
      showToast('Viaggio eliminato');
      await loadTrips();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore');
    } finally {
      setDeleting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dataDa) params.set('dataDa', dataDa);
      if (dataA) params.set('dataA', dataA);
      if (search.trim()) params.set('search', search.trim());
      if (archived !== 'all') params.set('archived', archived);
      if (beneficiaryId) params.set('beneficiaryId', beneficiaryId);

      const res = await fetch(`/api/extra/export?${params}`);
      if (!res.ok) throw new Error('Errore nell\'esportazione');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extra-cadhoc-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast('File Excel esportato con successo');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore esportazione');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">Extra Partesa</h1>
          <p className="text-muted mb-0">Modulo condiviso su database (ex Locale v2)</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
            Dashboard
          </Link>
          {(tab === 'trips' || tab === 'receipts') && (
            <button className="btn btn-primary btn-sm" onClick={openNew}>
              Nuovo viaggio
            </button>
          )}
        </div>
      </div>

      {toast && <div className="alert alert-success py-2">{toast}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <ul className="nav nav-tabs mb-3">
        {(
          [
            ['trips', 'Extra e viaggi'],
            ['receipts', 'Controllo incassi'],
            ['cadhoc', 'Riepilogo cad-hoc'],
            ['anagrafiche', 'Anagrafiche'],
          ] as [TabKey, string][]
        ).map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button
              className={`nav-link ${tab === key ? 'active' : ''}`}
              onClick={() => {
                if (key !== 'cadhoc') setCadDetail(null);
                setTab(key);
              }}
              type="button"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div className="card mb-3">
        <div className="card-body">
          <div className={`row g-1 align-items-end ${tab === 'trips' ? 'flex-nowrap' : ''}`}>
            <div className={tab === 'trips' ? 'col' : 'col-md-3'} style={tab === 'trips' ? { minWidth: 0, flex: '1.4 1 0' } : undefined}>
              <label className="form-label mb-1">Ricerca</label>
              <input
                className="form-control form-control-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === 'anagrafiche'
                    ? 'Nome, CDC, link...'
                    : tab === 'cadhoc'
                      ? 'Beneficiario, CDC...'
                      : 'Viaggio, note...'
                }
              />
            </div>
            {tab === 'anagrafiche' ? (
              <>
                <div className="col-md-2">
                  <label className="form-label mb-1">Tipo</label>
                  <select className="form-select form-select-sm" value={anagKind} onChange={(e) => setAnagKind(e.target.value as any)}>
                    <option value="all">Tutti</option>
                    <option value="employee">Dipendenti</option>
                    <option value="company">Aziende</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label mb-1">Stato</label>
                  <select className="form-select form-select-sm" value={anagActive} onChange={(e) => setAnagActive(e.target.value as any)}>
                    <option value="all">Tutti</option>
                    <option value="1">Attivi</option>
                    <option value="0">Disattivi</option>
                  </select>
                </div>
              </>
            ) : tab === 'cadhoc' ? (
              <>
                <div className="col-md-2">
                  <label className="form-label mb-1">Mese</label>
                  <input type="month" className="form-control form-control-sm" value={month} onChange={(e) => applyMonth(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label mb-1">Data da</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dataDa}
                    onChange={(e) => {
                      setMonth('');
                      setDataDa(e.target.value);
                    }}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label mb-1">Data a</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dataA}
                    onChange={(e) => {
                      setMonth('');
                      setDataA(e.target.value);
                    }}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label mb-1">Archivia</label>
                  <select className="form-select form-select-sm" value={archived} onChange={(e) => setArchived(e.target.value as any)}>
                    <option value="all">Tutti i viaggi</option>
                    <option value="0">Non archiviati</option>
                    <option value="1">Archiviati</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="col" style={{ minWidth: 0 }}>
                  <label className="form-label mb-1">Mese</label>
                  <input type="month" className="form-control form-control-sm" value={month} onChange={(e) => applyMonth(e.target.value)} />
                </div>
                <div className="col" style={{ minWidth: 0 }}>
                  <label className="form-label mb-1">Data da</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dataDa}
                    onChange={(e) => {
                      setMonth('');
                      setDataDa(e.target.value);
                    }}
                  />
                </div>
                <div className="col" style={{ minWidth: 0 }}>
                  <label className="form-label mb-1">Data a</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dataA}
                    onChange={(e) => {
                      setMonth('');
                      setDataA(e.target.value);
                    }}
                  />
                </div>
                {tab === 'trips' && (
                  <>
                    <div className="col" style={{ minWidth: 0 }}>
                      <label className="form-label mb-1">Archivia</label>
                      <select className="form-select form-select-sm" value={archived} onChange={(e) => setArchived(e.target.value as any)}>
                        <option value="all">Tutti</option>
                        <option value="0">Da gestire</option>
                        <option value="1">Archiviati</option>
                      </select>
                    </div>
                    <div className="col" style={{ minWidth: 0 }}>
                      <label className="form-label mb-1">Extra</label>
                      <select className="form-select form-select-sm" value={isExtra} onChange={(e) => setIsExtra(e.target.value as any)}>
                        <option value="all">Tutti</option>
                        <option value="1">Sì</option>
                        <option value="0">No</option>
                      </select>
                    </div>
                    <div className="col" style={{ minWidth: 0 }}>
                      <label className="form-label mb-1">Cad-hoc</label>
                      <select className="form-select form-select-sm" value={hasCadHoc} onChange={(e) => setHasCadHoc(e.target.value as any)}>
                        <option value="all">Tutti</option>
                        <option value="1">Sì</option>
                        <option value="0">No</option>
                      </select>
                    </div>
                  </>
                )}
                {(tab === 'trips' || tab === 'receipts') && (
                  <div className="col" style={{ minWidth: 0 }}>
                    <label className="form-label mb-1">Importo</label>
                    <select className="form-select form-select-sm" value={amountPresence} onChange={(e) => setAmountPresence(e.target.value as any)}>
                      <option value="all">Tutti</option>
                      <option value="missing">Mancante</option>
                      <option value="zero">Zero</option>
                      <option value="present">Presente</option>
                    </select>
                  </div>
                )}
              </>
            )}
            {beneficiaryId && (
              <div className="col-12">
                <div className="alert alert-info py-2 mb-0 d-flex align-items-center justify-content-between">
                  <span>
                    Filtro beneficiario: <strong>{beneficiaryName || beneficiaryId}</strong>
                  </span>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearBeneficiaryFilter}>
                    Rimuovi filtro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(tab === 'trips' || tab === 'receipts') && (
        <div className="row g-2 mb-3">
          {[
            {
              title: 'Extra aperti',
              count: summary.openExtraCount ?? 0,
              amount: Number(summary.openExtraAmount || 0),
              icon: ClipboardList,
              bg: '#fff8e6',
              border: '#f0ad4e',
              iconBg: '#f0ad4e',
            },
            {
              title: 'Extra archiviati',
              count: summary.archivedExtraCount ?? 0,
              amount: Number(summary.archivedExtraAmount || 0),
              icon: Archive,
              bg: '#e8f7ef',
              border: '#198754',
              iconBg: '#198754',
            },
            {
              title: 'Cad-hoc',
              count: summary.cadCount ?? 0,
              amount: Number(summary.cadAmount || 0),
              icon: Ticket,
              bg: '#eef4ff',
              border: '#0d6efd',
              iconBg: '#0d6efd',
            },
            {
              title: 'Terzisti',
              count: summary.subCount ?? 0,
              amount: Number(summary.subAmount || 0),
              icon: Truck,
              bg: '#e7f7f9',
              border: '#0d9aa8',
              iconBg: '#0d9aa8',
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div className="col-md-3" key={s.title}>
                <div
                  className="card h-100 border-0 shadow-sm"
                  style={{ background: s.bg, borderLeft: `4px solid ${s.border}` }}
                >
                  <div className="card-body py-3 d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white"
                      style={{ width: 44, height: 44, background: s.iconBg }}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-uppercase small fw-semibold text-secondary mb-1" style={{ letterSpacing: '0.03em' }}>
                        {s.title}
                      </div>
                      <div className="d-flex flex-wrap align-items-baseline gap-2">
                        <span className="fs-4 fw-bold lh-1">{s.count}</span>
                        <span className="text-muted">·</span>
                        <span className="fs-5 fw-bold lh-1">{money(s.amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">Caricamento...</div>
      ) : tab === 'cadhoc' ? (
        cadDetail ? (
          <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <button type="button" className="btn btn-sm btn-outline-secondary me-2" onClick={() => setCadDetail(null)}>
                  ← Torna al riepilogo
                </button>
                <strong>Viaggi cad-hoc · {cadDetail.name}</strong>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={exportToExcel}
                  disabled={exporting}
                >
                  {exporting ? 'Esportazione...' : 'Esporta in Excel'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => viewBeneficiaryTrips(cadDetail.id, cadDetail.name)}
                >
                  Apri in Extra e viaggi
                </button>
              </div>
            </div>
            {cadDetailLoading ? (
              <div className="text-center py-4">Caricamento...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Viaggio</th>
                      <th>Note servizio</th>
                      <th>Colli</th>
                      <th>Importo</th>
                      <th>Cad-hoc</th>
                      <th>Stato</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadDetailRows.map((r) => (
                      <tr key={r.id}>
                        <td>{dateIT(r.trip_date)}</td>
                        <td>
                          <div className="fw-semibold">{r.trip_number || '—'}</div>
                          <small className="text-muted">{r.order_ref || ''}</small>
                        </td>
                        <td>
                          {r.service_notes ? (
                            <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{r.service_notes}</div>
                          ) : '—'}
                        </td>
                        <td>{r.packages == null || Number.isNaN(Number(r.packages)) ? '—' : Math.round(Number(r.packages))}</td>
                        <td>{money(r.client_amount)}</td>
                        <td>{Number(r.cad_amount) > 0 ? money(Number(r.cad_amount)) : '—'}</td>
                        <td>
                          {r.archived ? (
                            <span className="badge text-bg-success">{r.is_extra ? 'Incassato' : 'Archiviato'}</span>
                          ) : r.is_extra ? (
                            <span className="badge text-bg-warning">Da incassare</span>
                          ) : (
                            <span className="badge text-bg-secondary">Servizio/costo</span>
                          )}
                        </td>
                        <td className="text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>
                            Modifica
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!cadDetailRows.length && (
                      <tr><td colSpan={8} className="text-muted">Nessun viaggio con i filtri attuali</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-end mb-3">
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={exportToExcel}
                disabled={exporting || loading}
              >
                {exporting ? 'Esportazione...' : 'Esporta in Excel'}
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle">
                <thead><tr><th>Beneficiario</th><th>Viaggi</th><th>Buoni</th><th>Importo</th><th></th></tr></thead>
              <tbody>
                {cadRows.map((r) => (
                  <tr key={r.beneficiary_id || r.beneficiary_name}>
                    <td>{r.beneficiary_name}</td>
                    <td>{r.trips}</td>
                    <td>{r.vouchers}</td>
                    <td>{money(Number(r.amount))}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        disabled={!r.beneficiary_id}
                        onClick={() => openCadBeneficiaryDetail(r.beneficiary_id, r.beneficiary_name)}
                      >
                        Visualizza viaggi
                      </button>
                    </td>
                  </tr>
                ))}
                {!cadRows.length && <tr><td colSpan={5} className="text-muted">Nessun dato</td></tr>}
              </tbody>
            </table>
            </div>
          </>
        )
      ) : tab === 'anagrafiche' ? (
        <div className="row g-3">
          <div className="col-12">
            <div className="alert alert-secondary py-2 mb-0">
              Anagrafiche gestite in{' '}
              <Link href="/gestione/dipendenti">Dipendenti</Link>
              {' / '}
              <Link href="/gestione/companies">Società</Link>
              . Qui vedi solo i beneficiari Extra già collegati (employee_id / company_id).
            </div>
          </div>
          <div className="col-12">
            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>CDC</th>
                    <th>Link</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBeneficiaries.map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.kind === 'employee' ? 'Dipendente' : 'Azienda'}</td>
                      <td>{b.cdc || '—'}</td>
                      <td className="small">
                        {b.kind === 'employee'
                          ? b.employee_id || '—'
                          : b.company_id != null
                            ? `company #${b.company_id}`
                            : '—'}
                      </td>
                      <td>{b.active ? 'Attivo' : 'Disattivo'}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => viewBeneficiaryTrips(b.id, b.name)}
                        >
                          Visualizza viaggi
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredBeneficiaries.length && (
                    <tr><td colSpan={6} className="text-muted">Nessun beneficiario con questi filtri</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('trip_date')}>
                    Data{sortMark('trip_date')}
                  </th>
                  <th role="button" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('trip_number')}>
                    Viaggio{sortMark('trip_number')}
                  </th>
                  <th role="button" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('service_notes')}>
                    Note servizio{sortMark('service_notes')}
                  </th>
                  <th>Colli</th>
                  <th role="button" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('carrier_description')}>
                    Vettore{sortMark('carrier_description')}
                  </th>
                  <th>Extra</th>
                  <th>Importo</th>
                  <th>Costi</th>
                  <th>Beneficiario</th>
                  <th role="button" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('billing_notes')}>
                    Note fatturazione{sortMark('billing_notes')}
                  </th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{dateIT(r.trip_date)}</td>
                    <td>
                      <div className="fw-semibold">{r.trip_number || '—'}</div>
                      <small className="text-muted">{r.order_ref || ''}</small>
                    </td>
                    <td>
                      {r.service_notes ? (
                        <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{r.service_notes}</div>
                      ) : '—'}
                    </td>
                    <td>{r.packages == null || Number.isNaN(Number(r.packages)) ? '—' : Math.round(Number(r.packages))}</td>
                    <td>{r.carrier_description || '—'}</td>
                    <td>{r.is_extra ? 'Sì' : 'No'}</td>
                    <td>{money(r.client_amount)}</td>
                    <td>
                      {Number(r.cad_amount) > 0 && <div>Cad {money(Number(r.cad_amount))}</div>}
                      {Number(r.sub_amount) > 0 && <div>Terz. {money(Number(r.sub_amount))}</div>}
                      {!Number(r.cad_amount) && !Number(r.sub_amount) && '—'}
                    </td>
                    <td>{r.payee_names || '—'}</td>
                    <td>
                      {r.billing_notes ? (
                        <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{r.billing_notes}</div>
                      ) : '—'}
                    </td>
                    <td>
                      {r.archived ? (
                        <span className="badge text-bg-success">{r.is_extra ? 'Incassato' : 'Archiviato'}</span>
                      ) : r.is_extra ? (
                        <span className="badge text-bg-warning">Da incassare</span>
                      ) : (
                        <span className="badge text-bg-secondary">Servizio/costo</span>
                      )}
                    </td>
                    <td className="text-nowrap">
                      <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(r)}>Modifica</button>
                      {r.is_extra && !r.archived && isAdmin ? (
                        <button type="button" className="btn btn-sm btn-success me-1" onClick={() => archiveTrip(r, true)}>Archivia</button>
                      ) : null}
                      {r.archived && isAdmin ? (
                        <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => archiveTrip(r, false)}>Ripristina</button>
                      ) : null}
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => askDeleteTrip(r)}>Elimina</button>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={12} className="text-muted">Nessun viaggio</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{total} risultati · pagina {page}/{totalPages}</small>
            <div className="btn-group">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prec</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Succ</button>
            </div>
          </div>
        </>
      )}

      {deleteTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.55)', zIndex: 1060 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Conferma eliminazione</h5>
                <button type="button" className="btn-close" disabled={deleting} onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-2">Stai per eliminare definitivamente questo viaggio:</p>
                <ul className="mb-3">
                  <li><strong>Data:</strong> {dateIT(deleteTarget.trip_date)}</li>
                  <li><strong>Viaggio:</strong> {deleteTarget.trip_number || '—'}</li>
                  <li><strong>Ordine:</strong> {deleteTarget.order_ref || '—'}</li>
                  <li><strong>Importo:</strong> {money(deleteTarget.client_amount)}</li>
                </ul>
                <p className="text-danger mb-0">L&apos;operazione non si può annullare.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                  Annulla
                </button>
                <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDeleteTrip}>
                  {deleting ? 'Eliminazione...' : 'Sì, elimina'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.45)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Modifica viaggio' : 'Nuovo viaggio'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {formErrors.length > 0 && (
                  <div className="alert alert-danger py-2">
                    <div className="fw-semibold mb-1">Mancano dati obbligatori:</div>
                    <ul className="mb-0 ps-3">
                      {formErrors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="row g-2">
                  <div className="col-md-3">
                    <label className="form-label">Data *</label>
                    <input type="date" className="form-control" value={form.trip_date} onChange={(e) => setForm({ ...form, trip_date: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Viaggio *</label>
                    <input className="form-control" required value={form.trip_number} onChange={(e) => setForm({ ...form, trip_number: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Ordine/DDT *</label>
                    <input className="form-control" required value={form.order_ref} onChange={(e) => setForm({ ...form, order_ref: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Colli *</label>
                    <input className="form-control" required type="number" min={0} step={1} value={form.packages} onChange={(e) => setForm({ ...form, packages: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Vettore *</label>
                    <select
                      className="form-select"
                      required
                      value={form.carrier_cod_vettore}
                      onChange={(e) => {
                        const c = carriers.find((x) => String(x.Cod_Vettore) === e.target.value);
                        setForm({
                          ...form,
                          carrier_cod_vettore: e.target.value,
                          carrier_description: c?.Descr_Vettore || '',
                        });
                      }}
                    >
                      <option value="">—</option>
                      {form.carrier_cod_vettore &&
                        !carriers.some((c) => String(c.Cod_Vettore) === form.carrier_cod_vettore) && (
                          <option value={form.carrier_cod_vettore}>
                            {form.carrier_description || form.carrier_cod_vettore} (non attivo)
                          </option>
                        )}
                      {carriers.map((c) => (
                        <option key={c.Cod_Vettore} value={c.Cod_Vettore}>{c.Descr_Vettore}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Importo extra *</label>
                    <input className="form-control" required type="number" step="0.01" value={form.client_amount} onChange={(e) => setForm({ ...form, client_amount: e.target.value })} />
                  </div>
                  <div className="col-md-3 d-flex align-items-end gap-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" checked={form.is_extra} onChange={(e) => setForm({ ...form, is_extra: e.target.checked })} id="isExtra" />
                      <label className="form-check-label" htmlFor="isExtra">Extra</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" checked={form.archived} onChange={(e) => setForm({ ...form, archived: e.target.checked })} id="archived" />
                      <label className="form-check-label" htmlFor="archived">Archivia</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Note servizio *</label>
                    <textarea className="form-control" required rows={2} value={form.service_notes} onChange={(e) => setForm({ ...form, service_notes: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Note fatturazione</label>
                    <textarea className="form-control" rows={2} value={form.billing_notes} onChange={(e) => setForm({ ...form, billing_notes: e.target.value })} />
                  </div>
                </div>

                <hr />
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Compensi</h6>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setComps([...comps, emptyComp()])}>Aggiungi</button>
                </div>
                {comps.map((c, idx) => (
                  <div className="border rounded p-2 mb-2" key={idx}>
                    <div className="row g-2">
                      <div className="col-md-3">
                        <select className="form-select form-select-sm" value={c.cost_type} onChange={(e) => {
                          const next = [...comps];
                          next[idx] = {
                            ...c,
                            cost_type: e.target.value as 'cad_hoc' | 'terzista',
                            source_employee_id: '',
                            source_company_id: '',
                          };
                          setComps(next);
                        }}>
                          <option value="cad_hoc">Cad-hoc</option>
                          <option value="terzista">Terzista</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        {c.cost_type === 'cad_hoc' ? (
                          <select
                            className="form-select form-select-sm"
                            value={c.source_employee_id}
                            onChange={(e) => {
                              const next = [...comps];
                              next[idx] = { ...c, source_employee_id: e.target.value };
                              setComps(next);
                            }}
                          >
                            <option value="">Dipendente (attivi)</option>
                            {activeEmployees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.nominativo}{e.cdc ? ` · ${e.cdc}` : ''}
                              </option>
                            ))}
                            {c.source_employee_id &&
                              !activeEmployees.some((e) => e.id === c.source_employee_id) && (
                                <option value={c.source_employee_id}>
                                  {viaggiEmployees.find((e) => e.id === c.source_employee_id)?.nominativo ||
                                    c.source_employee_id}{' '}
                                  (non attivo)
                                </option>
                              )}
                          </select>
                        ) : (
                          <select
                            className="form-select form-select-sm"
                            value={c.source_company_id}
                            onChange={(e) => {
                              const next = [...comps];
                              next[idx] = { ...c, source_company_id: e.target.value };
                              setComps(next);
                            }}
                          >
                            <option value="">Azienda</option>
                            {viaggiCompanies.map((co) => (
                              <option key={co.id} value={co.id}>{co.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {c.cost_type === 'cad_hoc' ? (
                        <>
                          <div className="col-md-2">
                            <input
                              className="form-control form-control-sm"
                              placeholder={c.vouchers_count !== '' ? 'Blocchetto *' : 'Blocchetto'}
                              required={c.vouchers_count !== ''}
                              value={c.booklet_ref}
                              onChange={(e) => {
                                const next = [...comps]; next[idx] = { ...c, booklet_ref: e.target.value }; setComps(next);
                              }}
                            />
                          </div>
                          <div className="col-md-1">
                            <input className="form-control form-control-sm" placeholder="Buoni" value={c.vouchers_count} onChange={(e) => {
                              const next = [...comps]; next[idx] = { ...c, vouchers_count: e.target.value }; setComps(next);
                            }} />
                          </div>
                          <div className="col-md-1">
                            <input className="form-control form-control-sm" placeholder="€/buono" value={c.voucher_unit_value} onChange={(e) => {
                              const next = [...comps]; next[idx] = { ...c, voucher_unit_value: e.target.value }; setComps(next);
                            }} />
                          </div>
                        </>
                      ) : (
                        <div className="col-md-3">
                          <input
                            className="form-control form-control-sm"
                            type="number"
                            step="0.01"
                            placeholder={c.source_company_id ? 'Importo terzista *' : 'Importo terzista'}
                            required={!!c.source_company_id}
                            value={c.terzista_amount}
                            onChange={(e) => {
                              const next = [...comps]; next[idx] = { ...c, terzista_amount: e.target.value }; setComps(next);
                            }}
                          />
                        </div>
                      )}
                      <div className="col-md-1">
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setComps(comps.filter((_, i) => i !== idx))}>×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annulla</button>
                <button className="btn btn-primary" disabled={saving} onClick={saveTrip}>
                  {saving ? 'Salvataggio...' : 'Salva sul server'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
