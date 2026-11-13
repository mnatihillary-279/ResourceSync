import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownUp, CheckCircle2, CloudOff, Database,
  Edit3, Plus, RefreshCw, Search, Trash2, Wifi, WifiOff, X
} from "lucide-react";
import {
  createResource, deleteResource, initializeResourceState,
  recordMap, updateResource
} from "./services/resourceService.js";
import { loadSnapshot } from "./services/database.js";
import { refreshFromServer, synchronizePendingOperations } from "./services/syncService.js";

const EMPTY_FORM = {
  name: "", category: "Medical supplies", quantity: "0",
  minimumStock: "0", location: ""
};

function ResourceForm({ initialValue, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initialValue || EMPTY_FORM);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <form className="resource-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Resource name<input name="name" value={form.name} onChange={change} required maxLength="100" /></label>
        <label>Category
          <select name="category" value={form.category} onChange={change}>
            <option>Medical supplies</option>
            <option>Equipment</option>
            <option>Medicines</option>
            <option>General supplies</option>
          </select>
        </label>
        <label>Quantity<input name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={change} required /></label>
        <label>Minimum stock<input name="minimumStock" type="number" min="0" step="1" value={form.minimumStock} onChange={change} required /></label>
        <label className="full-width">Storage location<input name="location" value={form.location} onChange={change} required maxLength="100" /></label>
      </div>
      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onCancel}><X size={16}/> Cancel</button>
        <button className="button button-primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save resource"}</button>
      </div>
    </form>
  );
}

export default function App() {
  const [resources, setResources] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const syncLock = useRef(false);

  const refreshLocal = useCallback(async () => {
    const snapshot = await loadSnapshot();
    setResources(snapshot.resources.filter((resource) => !resource.deleted));
    setPendingCount(snapshot.pendingOperations.length);
  }, []);

  const refreshConflicts = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const response = await fetch("/api/conflicts");
      if (response.ok) setConflicts(await response.json());
    } catch {
      // The conflict log remains available when the connection returns.
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return;
    syncLock.current = true;
    setSyncing(true);
    try {
      const result = await synchronizePendingOperations();
      await refreshFromServer();
      await refreshLocal();
      await refreshConflicts();
      setLastSync(new Date());
      setNotice(result.synchronized
        ? `${result.synchronized} operation(s) synchronized.`
        : "Everything is up to date.");
    } catch (error) {
      setNotice(`${error.message} Pending work has been retained.`);
      await refreshLocal();
    } finally {
      syncLock.current = false;
      setSyncing(false);
    }
  }, [refreshConflicts, refreshLocal]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await initializeResourceState();
        if (active) await refreshLocal();
        if (navigator.onLine && active) await syncNow();
      } catch (error) {
        if (active) setNotice(`Local database error: ${error.message}`);
      }
    }

    function onlineHandler() {
      setOnline(true);
      syncNow();
    }
    function offlineHandler() {
      setOnline(false);
      setNotice("Offline mode: changes will be saved on this device.");
    }

    initialize();
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      active = false;
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [refreshLocal, syncNow]);

  async function save(form) {
    setSaving(true);
    try {
      if (editing) await updateResource(editing.id, form);
      else await createResource(form);
      setFormOpen(false);
      setEditing(null);
      await refreshLocal();
      setNotice(navigator.onLine
        ? "Saved locally. Synchronization will run now."
        : "Saved on this device. It is waiting for synchronization.");
      if (navigator.onLine) await syncNow();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(resource) {
    if (!window.confirm(`Delete ${resource.name}? This will be synchronized when connected.`)) return;
    try {
      await deleteResource(resource.id);
      await refreshLocal();
      setNotice("Deletion saved locally.");
      if (navigator.onLine) await syncNow();
    } catch (error) {
      setNotice(error.message);
    }
  }

  function edit(resource) {
    setEditing(resource);
    setFormOpen(true);
  }

  const filteredResources = useMemo(() => {
    const query = search.toLowerCase();
    return resources.filter((resource) =>
      [resource.name, resource.category, resource.location].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [resources, search]);

  const lowStock = resources.filter((resource) => resource.quantity <= resource.minimumStock).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">R</div>
        <div className="brand-copy"><strong>ResourceSync</strong><span>RESOURCE MANAGEMENT</span></div>
        <div className="sidebar-rule" />
        <div className="nav-item active"><Database size={18}/> Inventory</div>
        <div className="sidebar-bottom">
          <div className="sidebar-caption">SDG 3 · GOOD HEALTH</div>
          <p>Reliable resource records, even when connectivity is not.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">OPERATIONS / INVENTORY</span><h1>Resource overview</h1></div>
          <div className={`connection-pill ${online ? "connected" : "disconnected"}`}>
            {online ? <Wifi size={15}/> : <WifiOff size={15}/>}
            {online ? "Network available" : "Offline mode"}
          </div>
        </header>

        <section className="intro-row">
          <div><h2>Resource inventory</h2><p>Manage supplies locally and synchronize when connectivity returns.</p></div>
          <button className="button button-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={17}/> Add resource
          </button>
        </section>

        <section className="metrics-grid">
          <article className="metric-card"><span className="metric-icon blue"><Database size={18}/></span><span className="metric-label">ACTIVE RESOURCES</span><strong>{resources.length}</strong><small>Stored on this device</small></article>
          <article className="metric-card"><span className="metric-icon amber"><ArrowDownUp size={18}/></span><span className="metric-label">PENDING OPERATIONS</span><strong>{pendingCount}</strong><small>Waiting for server acknowledgement</small></article>
          <article className="metric-card"><span className="metric-icon red"><Activity size={18}/></span><span className="metric-label">LOW STOCK</span><strong>{lowStock}</strong><small>At or below minimum quantity</small></article>
          <article className="metric-card"><span className="metric-icon green"><CheckCircle2 size={18}/></span><span className="metric-label">SYNC CONFLICTS</span><strong>{conflicts.length}</strong><small>Recorded server-side decisions</small></article>
        </section>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}

        {formOpen && (
          <section className="panel form-panel">
            <div className="panel-heading"><div><h3>{editing ? "Edit resource" : "Add a resource"}</h3><p>Changes are persisted locally before synchronization.</p></div></div>
            <ResourceForm
              key={editing?.id || "new"}
              initialValue={editing ? {
                name: editing.name, category: editing.category,
                quantity: String(editing.quantity), minimumStock: String(editing.minimumStock),
                location: editing.location
              } : EMPTY_FORM}
              onSave={save}
              onCancel={() => { setFormOpen(false); setEditing(null); }}
              saving={saving}
            />
          </section>
        )}

        <section className="panel inventory-panel">
          <div className="panel-heading">
            <div><h3>Tracked resources</h3><p>{resources.length} resource record(s)</p></div>
            <div className="toolbar">
              <div className="search-box"><Search size={16}/><input placeholder="Search resources…" value={search} onChange={(event) => setSearch(event.target.value)}/></div>
              <button className="button button-secondary sync-button" onClick={syncNow} disabled={!online || syncing}>
                <RefreshCw size={16} className={syncing ? "spin" : ""}/> {syncing ? "Syncing" : "Sync now"}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>RESOURCE</th><th>CATEGORY</th><th>QUANTITY</th><th>LOCATION</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {filteredResources.map((resource) => {
                  const isLow = resource.quantity <= resource.minimumStock;
                  return <tr key={resource.id}>
                    <td><strong>{resource.name}</strong><span className="record-id">{resource.id.slice(0, 8)}</span></td>
                    <td>{resource.category}</td>
                    <td><strong>{resource.quantity}</strong><span className="record-id">Minimum {resource.minimumStock}</span></td>
                    <td>{resource.location}</td>
                    <td><span className={`status-tag ${isLow ? "low" : "available"}`}>{isLow ? "Low stock" : "Available"}</span></td>
                    <td><div className="row-actions"><button onClick={() => edit(resource)} aria-label={`Edit ${resource.name}`}><Edit3 size={16}/></button><button onClick={() => remove(resource)} aria-label={`Delete ${resource.name}`}><Trash2 size={16}/></button></div></td>
                  </tr>;
                })}
                {!filteredResources.length && <tr><td colSpan="6" className="empty-state"><CloudOff size={22}/><strong>No resources found</strong><span>Add a resource or change your search.</span></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <span>{pendingCount ? `${pendingCount} operation(s) awaiting acknowledgement` : "No pending operations"}</span>
          <span>{lastSync ? `Last sync attempt: ${lastSync.toLocaleTimeString()}` : "Synchronization status will appear here"}</span>
        </footer>
      </main>
    </div>
  );
}
