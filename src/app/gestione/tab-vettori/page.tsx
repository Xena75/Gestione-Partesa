'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface TabVettore {
  Cod_Vettore: number;
  Descr_Vettore: string | null;
  Tipo_Vettore: string | null;
  Azienda_Vettore: string | null;
  Nome_Vettore: string | null;
  Cognome_Vettore: string | null;
  Cellulare_Vettore: string | null;
  Email_Vettore: string | null;
  Data_Modifica: string | null;
  Targa_Mezzo: string | null;
  Id_Tariffa: string | null;
}

const emptyForm: Record<string, string> = {
  Cod_Vettore: '',
  Descr_Vettore: '',
  Tipo_Vettore: '',
  Azienda_Vettore: '',
  Nome_Vettore: '',
  Cognome_Vettore: '',
  Cellulare_Vettore: '',
  Email_Vettore: '',
  Targa_Mezzo: '',
  Id_Tariffa: '2',
};

function TabVettoriContent() {
  const [rows, setRows] = useState<TabVettore[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCod, setEditingCod] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (searchDebounced.trim()) params.set('search', searchDebounced.trim());
      const res = await fetch(`/api/gestione/tab-vettori?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setRows(json.data);
      setTotal(json.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditingCod(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (r: TabVettore) => {
    setEditingCod(String(r.Cod_Vettore));
    setForm({
      Cod_Vettore: String(r.Cod_Vettore),
      Descr_Vettore: r.Descr_Vettore ?? '',
      Tipo_Vettore: r.Tipo_Vettore ?? '',
      Azienda_Vettore: r.Azienda_Vettore ?? '',
      Nome_Vettore: r.Nome_Vettore ?? '',
      Cognome_Vettore: r.Cognome_Vettore ?? '',
      Cellulare_Vettore: r.Cellulare_Vettore ?? '',
      Email_Vettore: r.Email_Vettore ?? '',
      Targa_Mezzo: r.Targa_Mezzo ?? '',
      Id_Tariffa: r.Id_Tariffa ?? '2',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const codNum = Number(form.Cod_Vettore.replace(',', '.'));
    if (!Number.isFinite(codNum)) {
      alert('Cod_Vettore obbligatorio e numerico');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        Cod_Vettore: codNum,
        Descr_Vettore: form.Descr_Vettore || null,
        Tipo_Vettore: form.Tipo_Vettore || null,
        Azienda_Vettore: form.Azienda_Vettore || null,
        Nome_Vettore: form.Nome_Vettore || null,
        Cognome_Vettore: form.Cognome_Vettore || null,
        Cellulare_Vettore: form.Cellulare_Vettore || null,
        Email_Vettore: form.Email_Vettore || null,
        Targa_Mezzo: form.Targa_Mezzo || null,
        Id_Tariffa: form.Id_Tariffa || '2',
      };

      if (editingCod === null) {
        const res = await fetch('/api/gestione/tab-vettori', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Salvataggio fallito');
        }
      } else {
        const res = await fetch(
          `/api/gestione/tab-vettori/${encodeURIComponent(editingCod)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Salvataggio fallito');
        }
      }

      setShowModal(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-0">Anagrafica vettori</h1>
          <p className="text-muted small mb-0">
            Tabella <code>tab_vettori</code> — database <strong>gestionelogistica</strong>. Collega il{' '}
            <strong>Cod_Vettore</strong> a descrizione e nominativo corretti.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-success" onClick={openNew}>
            <i className="bi bi-plus-lg me-1" />
            Nuovo vettore
          </button>
          <Link href="/dashboard" className="btn btn-outline-secondary">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label className="form-label mb-1">Cerca (codice, descrizione, nome, azienda…)</label>
              <input
                type="search"
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtra…"
              />
            </div>
            <div className="col-md-6 text-md-end small text-muted">
              {total > 0 && (
                <>
                  Record: <strong>{total}</strong> — Pagina {page} / {totalPages}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">Caricamento…</div>
      ) : (
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-sm table-hover table-striped mb-0">
            <thead className="table-dark">
              <tr>
                <th>Cod.</th>
                <th>Descrizione</th>
                <th>Tipo</th>
                <th>Azienda</th>
                <th>Nome</th>
                <th>Cognome</th>
                <th>Cell.</th>
                <th>Targa</th>
                <th>Tariffa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.Cod_Vettore}>
                  <td>{r.Cod_Vettore}</td>
                  <td>{r.Descr_Vettore}</td>
                  <td>{r.Tipo_Vettore}</td>
                  <td>{r.Azienda_Vettore}</td>
                  <td>{r.Nome_Vettore}</td>
                  <td>{r.Cognome_Vettore}</td>
                  <td>{r.Cellulare_Vettore}</td>
                  <td>{r.Targa_Mezzo}</td>
                  <td>{r.Id_Tariffa}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => openEdit(r)}
                    >
                      Modifica
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error && (
            <div className="p-4 text-center text-muted">Nessun record trovato.</div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-3 d-flex justify-content-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Precedente
          </button>
          <span className="align-self-center small">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Successiva
          </button>
        </nav>
      )}

      {showModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingCod === null ? 'Nuovo vettore' : `Modifica vettore ${editingCod}`}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Chiudi"
                  onClick={() => setShowModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Cod_Vettore *</label>
                    <input
                      className="form-control"
                      value={form.Cod_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Cod_Vettore: e.target.value }))}
                    />
                    {editingCod !== null && (
                      <small className="text-muted">
                        Puoi correggere il codice: deve restare univoco (non duplicare un codice esistente).
                      </small>
                    )}
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Descr_Vettore</label>
                    <input
                      className="form-control"
                      value={form.Descr_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Descr_Vettore: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Tipo_Vettore</label>
                    <input
                      className="form-control"
                      value={form.Tipo_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Tipo_Vettore: e.target.value }))}
                      placeholder="es. Dipendente, Terzista"
                    />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Azienda_Vettore</label>
                    <input
                      className="form-control"
                      value={form.Azienda_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Azienda_Vettore: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nome_Vettore</label>
                    <input
                      className="form-control"
                      value={form.Nome_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Nome_Vettore: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Cognome_Vettore</label>
                    <input
                      className="form-control"
                      value={form.Cognome_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Cognome_Vettore: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Cellulare_Vettore</label>
                    <input
                      className="form-control"
                      value={form.Cellulare_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Cellulare_Vettore: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email_Vettore</label>
                    <input
                      className="form-control"
                      type="email"
                      value={form.Email_Vettore}
                      onChange={(e) => setForm((f) => ({ ...f, Email_Vettore: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Targa_Mezzo</label>
                    <input
                      className="form-control"
                      value={form.Targa_Mezzo}
                      onChange={(e) => setForm((f) => ({ ...f, Targa_Mezzo: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Id_Tariffa</label>
                    <input
                      className="form-control"
                      value={form.Id_Tariffa}
                      onChange={(e) => setForm((f) => ({ ...f, Id_Tariffa: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabVettoriPage() {
  return (
    <Suspense fallback={<div className="p-4">Caricamento…</div>}>
      <TabVettoriContent />
    </Suspense>
  );
}
