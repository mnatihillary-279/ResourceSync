
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  ArrowDownUp,
  CheckCircle2,
  CloudOff,
  Database,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
  X,
  ArrowRight,
  PackageCheck,
  MapPin,
  Info
} from "lucide-react";

import {
  createResource,
  deleteResource,
  initializeResourceState,
  updateResource,
  recordConsumption
} from "./services/resourceService.js";

import { loadSnapshot } from "./services/database.js";

import {
  refreshFromServer,
  synchronizePendingOperations
} from "./services/syncService.js";

import {
  generateRescueRecommendations
} from "./services/resourceRescue.js";

const EMPTY_FORM = {
  name: "",
  category: "Medical supplies",
  quantity: "0",
  minimumStock: "0",
  location: ""
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
        <label>
          Resource name
          <input
            name="name"
            value={form.name}
            onChange={change}
            required
            maxLength="100"
          />
        </label>

        <label>
          Category
          <select name="category" value={form.category} onChange={change}>
            <option>Medical supplies</option>
            <option>Equipment</option>
            <option>Medicines</option>
            <option>General supplies</option>
          </select>
        </label>

        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            value={form.quantity}
            onChange={change}
            required
          />
        </label>

        <label>
          Minimum stock
          <input
            name="minimumStock"
            type="number"
            min="0"
            step="1"
            value={form.minimumStock}
            onChange={change}
            required
          />
        </label>

        <label className="full-width">
          Storage location
          <input
            name="location"
            value={form.location}
            onChange={change}
            required
            maxLength="100"
          />
        </label>
      </div>

      <div className="form-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
        >
          <X size={16} /> Cancel
        </button>

        <button
          className="button button-primary"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save resource"}
        </button>
      </div>
    </form>
  );
}

function ResourceRescuePanel({ recommendations }) {
  return (
    <section className="panel rescue-panel">
      <div className="rescue-hero">
        <div className="rescue-hero-content">
          <div className="rescue-kicker">
            <span className="rescue-status-dot" />
            RESOURCE OPTIMIZATION
          </div>

          <h2>Resource Rescue Engine</h2>

          <p>
            Identify redistribution opportunities by matching surplus
            resources with shortages across locations.
          </p>
        </div>

        <div className="rescue-hero-stat">
          <strong>{recommendations.length}</strong>
          <span>OPPORTUNITIES</span>
        </div>
      </div>

      <div className="rescue-panel-body">
        <div className="rescue-section-heading">
          <div>
            <h3>Transfer recommendations</h3>
            <p>Suggested movements based on current inventory levels.</p>
          </div>

          <span className="rescue-count">
            {recommendations.length} found
          </span>
        </div>

        {recommendations.length > 0 ? (
          <div className="rescue-grid">
            {recommendations.map((recommendation, index) => (
              <article className="rescue-card" key={recommendation.id}>
                <div className="rescue-card-heading">
                  <div className="rescue-product">
                    <span className="rescue-product-icon">
                      <PackageCheck size={19} />
                    </span>

                    <div>
                      <span className="rescue-category">
                        {recommendation.category}
                      </span>
                      <h4>{recommendation.resourceName}</h4>
                    </div>
                  </div>

                  <span className="rescue-index">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="rescue-quantity-block">
                  <div className="rescue-quantity-main">
                    <strong>{recommendation.transferQuantity}</strong>
                    <span>units</span>
                  </div>

                  <span className="rescue-quantity-caption">
                    Suggested transfer quantity
                  </span>
                </div>

                <div className="rescue-route">
                  <div className="rescue-route-location">
                    <span className="rescue-route-marker source-marker" />
                    <div className="rescue-route-details">
                      <span className="route-label">SOURCE LOCATION</span>
                      <strong>{recommendation.sourceLocation}</strong>
                      <small>Surplus identified</small>
                    </div>
                  </div>

                  <div className="rescue-route-middle">
                    <span />
                    <ArrowRight size={17} />
                    <span />
                  </div>

                  <div className="rescue-route-location">
                    <span className="rescue-route-marker destination-marker" />
                    <div className="rescue-route-details">
                      <span className="route-label">DESTINATION</span>
                      <strong>{recommendation.destinationLocation}</strong>
                      <small>Shortage identified</small>
                    </div>
                  </div>
                </div>

                <div className="rescue-reason">
                  <span className="rescue-reason-icon">
                    <Info size={15} />
                  </span>
                  <div>
                    <strong>Recommendation rationale</strong>
                    <p>{recommendation.reason}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rescue-empty">
            <div className="rescue-empty-icon">
              <ArrowDownUp size={25} />
            </div>

            <h4>No transfer opportunities found</h4>

            <p>
              The engine looks for matching resource names and categories
              where one location has surplus and another has a shortage.
            </p>

            <div className="rescue-empty-hint">
              Recommendations will appear automatically when qualifying
              inventory records are available.
            </div>
          </div>
        )}

        <div className="rescue-disclaimer">
          <Info size={16} />
          <p>
            <strong>Advisory only.</strong> Verify physical stock and approve
            transfers through your normal process. This engine does not
            move stock or modify inventory records.
          </p>
        </div>
      </div>
    </section>
  );
}

function DemandFlowPanel({ movements }) {
  const demoMovements = useMemo(() => {
    const now = Date.now();

    const daysAgo = (days) =>
      new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

    return [
      {
        name: "Surgical Gloves",
        category: "Medical supplies",
        location: "East Clinic",
        quantity: 12,
        occurredAt: daysAgo(1),
        type: "CONSUMPTION"
      },
      {
        name: "Surgical Gloves",
        category: "Medical supplies",
        location: "East Clinic",
        quantity: 18,
        occurredAt: daysAgo(5),
        type: "CONSUMPTION"
      },
      {
        name: "Surgical Gloves",
        category: "Medical supplies",
        location: "West Clinic",
        quantity: 8,
        occurredAt: daysAgo(2),
        type: "CONSUMPTION"
      },
      {
        name: "Paracetamol",
        category: "Medicines",
        location: "East Clinic",
        quantity: 20,
        occurredAt: daysAgo(3),
        type: "CONSUMPTION"
      },
      {
        name: "Paracetamol",
        category: "Medicines",
        location: "West Clinic",
        quantity: 15,
        occurredAt: daysAgo(4),
        type: "CONSUMPTION"
      },
      {
        name: "Paracetamol",
        category: "Medicines",
        location: "Main Pharmacy",
        quantity: 35,
        occurredAt: daysAgo(8),
        type: "CONSUMPTION"
      }
    ];
  }, []);

  const hasActualMovements = movements.some(
    (movement) => movement.type === "CONSUMPTION"
  );

  const displayedMovements = hasActualMovements
    ? movements
    : demoMovements;

  const summaries = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const totals = new Map();

    for (const movement of displayedMovements) {
      const timestamp = Date.parse(movement.occurredAt);

      if (
        movement.type !== "CONSUMPTION" ||
        !Number.isFinite(movement.quantity) ||
        !Number.isFinite(timestamp) ||
        timestamp < cutoff
      ) {
        continue;
      }

      const key = JSON.stringify([
        movement.name.trim().toLowerCase(),
        movement.category.trim().toLowerCase(),
        movement.location.trim().toLowerCase()
      ]);

      if (!totals.has(key)) {
        totals.set(key, {
          name: movement.name,
          category: movement.category,
          location: movement.location,
          quantity: 0,
          events: 0,
          latest: timestamp
        });
      }

      const entry = totals.get(key);

      entry.quantity += movement.quantity;
      entry.events += 1;
      entry.latest = Math.max(entry.latest, timestamp);
    }

    return [...totals.values()].sort(
      (a, b) => b.quantity - a.quantity
    );
  }, [displayedMovements]);

  const totalConsumed = summaries.reduce(
    (total, entry) => total + entry.quantity,
    0
  );

  const totalEvents = summaries.reduce(
    (total, entry) => total + entry.events,
    0
  );

  const totalLocations = new Set(
    summaries.map((entry) => entry.location)
  ).size;

  return (
    <section className="panel demand-panel">
      <div className="panel-heading">
        <div>
          <div className="section-kicker">
            CONSUMPTION INTELLIGENCE
          </div>

          <h3>Recorded Demand Flow</h3>

          <p>
            Consumption activity across resource locations over
            the last 30 days.
          </p>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 11px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            background: hasActualMovements ? "#dcfce7" : "#fef3c7",
            color: hasActualMovements ? "#166534" : "#92400e",
            whiteSpace: "nowrap"
          }}
        >
          {hasActualMovements ? "LOCAL RECORDS" : "DEMO DATA"}
        </span>
      </div>

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-icon blue">
            <Activity size={18} />
          </span>

          <span className="metric-label">TOTAL CONSUMED</span>
          <strong>{totalConsumed}</strong>
          <small>Units in the last 30 days</small>
        </article>

        <article className="metric-card">
          <span className="metric-icon green">
            <Database size={18} />
          </span>

          <span className="metric-label">CONSUMPTION EVENTS</span>
          <strong>{totalEvents}</strong>
          <small>Recorded activity entries</small>
        </article>

        <article className="metric-card">
          <span className="metric-icon amber">
            <MapPin size={18} />
          </span>

          <span className="metric-label">LOCATIONS</span>
          <strong>{totalLocations}</strong>
          <small>Locations with activity</small>
        </article>
      </div>

      {summaries.length > 0 ? (
        <div className="demand-grid">
          {summaries.map((entry) => (
            <article
              className="demand-card"
              key={`${entry.name}-${entry.category}-${entry.location}`}
            >
              <div className="demand-card-top">
                <div>
                  <span className="rescue-category">
                    {entry.category}
                  </span>

                  <h4>{entry.name}</h4>

                  <span className="demand-location">
                    <MapPin size={12} />
                    {entry.location}
                  </span>
                </div>

                <div className="demand-total">
                  <strong>{entry.quantity}</strong>
                  <span>UNITS</span>
                </div>
              </div>

              <div className="demand-event-count">
                <Activity size={14} />
                {entry.events} consumption event(s)
              </div>

              <div className="demand-reason">
                Latest activity:{" "}
                {new Date(entry.latest).toLocaleDateString()}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="demand-empty">
          <Activity size={23} />
          <strong>No consumption activity</strong>
          <p>
            Consumption records will appear here when stock
            usage is recorded.
          </p>
        </div>
      )}

      <div className="demand-disclaimer">
        <Info size={15} />
        <span>
          {hasActualMovements
            ? "These are consumption records stored on this device. They do not necessarily represent all facility activity."
            : "DEMONSTRATION DATA: These sample figures are illustrative. They do not represent actual stock consumption and do not modify inventory."}
        </span>
      </div>
    </section>
  );
}

export default function App() {
  const [resources, setResources] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [movementEvents, setMovementEvents] = useState([]);
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

    setResources(
      snapshot.resources.filter((resource) => !resource.deleted)
    );

    setPendingCount(snapshot.pendingOperations.length);
    setMovementEvents(snapshot.resourceMovements || []);
  }, []);

  const refreshConflicts = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const response = await fetch("/api/conflicts");

      if (response.ok) {
        setConflicts(await response.json());
      }
    } catch {
      // The conflict log remains available when connectivity returns.
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

      setNotice(
        result.synchronized
          ? `${result.synchronized} operation(s) synchronized.`
          : "Everything is up to date."
      );
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

        if (active) {
          await refreshLocal();
        }

        if (navigator.onLine && active) {
          await syncNow();
        }
      } catch (error) {
        if (active) {
          setNotice(`Local database error: ${error.message}`);
        }
      }
    }

    function onlineHandler() {
      setOnline(true);
      syncNow();
    }

    function offlineHandler() {
      setOnline(false);

      setNotice(
        "Offline mode: changes will be saved on this device."
      );
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
      if (editing) {
        await updateResource(editing.id, form);
      } else {
        await createResource(form);
      }

      setFormOpen(false);
      setEditing(null);

      await refreshLocal();

      setNotice(
        navigator.onLine
          ? "Saved locally. Synchronization will run now."
          : "Saved on this device. It is waiting for synchronization."
      );

      if (navigator.onLine) {
        await syncNow();
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(resource) {
    if (
      !window.confirm(
        `Delete ${resource.name}? This will be synchronized when connected.`
      )
    ) {
      return;
    }

    try {
      await deleteResource(resource.id);
      await refreshLocal();

      setNotice("Deletion saved locally.");

      if (navigator.onLine) {
        await syncNow();
      }
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function consume(resource) {
    const answer = window.prompt(
      `How many units of ${resource.name} were consumed at ${resource.location}?`
    );

    if (answer === null) return;

    const quantity = Number(answer);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setNotice("Enter a positive whole number.");
      return;
    }

    try {
      await recordConsumption(resource.id, quantity);
      await refreshLocal();

      setNotice(
        `${quantity} units of ${resource.name} consumption recorded.`
      );

      if (navigator.onLine) {
        await syncNow();
      }
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
      [
        resource.name,
        resource.category,
        resource.location
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [resources, search]);

  const lowStock = resources.filter(
    (resource) => resource.quantity <= resource.minimumStock
  ).length;

  const rescueRecommendations = useMemo(
    () => generateRescueRecommendations(resources),
    [resources]
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">R</div>

        <div className="brand-copy">
          <strong>ResourceSync</strong>
          <span>RESOURCE MANAGEMENT</span>
        </div>

        <div className="sidebar-rule" />

        <div className="nav-item active">
          <Database size={18} /> Inventory
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-caption">SDG 3 · GOOD HEALTH</div>
          <p>
            Reliable resource records, even when connectivity is not.
          </p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">OPERATIONS / INVENTORY</span>
            <h1>Resource overview</h1>
          </div>

          <div
            className={`connection-pill ${
              online ? "connected" : "disconnected"
            }`}
          >
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
            {online ? "Network available" : "Offline mode"}
          </div>
        </header>

        <section className="intro-row">
          <div>
            <h2>Resource inventory</h2>
            <p>
              Manage supplies locally and synchronize when connectivity returns.
            </p>
          </div>

          <button
            className="button button-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={17} /> Add resource
          </button>
        </section>

        <section className="metrics-grid">
          <article className="metric-card">
            <span className="metric-icon blue">
              <Database size={18} />
            </span>

            <span className="metric-label">ACTIVE RESOURCES</span>
            <strong>{resources.length}</strong>
            <small>Stored on this device</small>
          </article>

          <article className="metric-card">
            <span className="metric-icon amber">
              <ArrowDownUp size={18} />
            </span>

            <span className="metric-label">PENDING OPERATIONS</span>
            <strong>{pendingCount}</strong>
            <small>Waiting for server acknowledgement</small>
          </article>

          <article className="metric-card">
            <span className="metric-icon red">
              <Activity size={18} />
            </span>

            <span className="metric-label">LOW STOCK</span>
            <strong>{lowStock}</strong>
            <small>At or below minimum quantity</small>
          </article>

          <article className="metric-card">
            <span className="metric-icon green">
              <CheckCircle2 size={18} />
            </span>

            <span className="metric-label">SYNC CONFLICTS</span>
            <strong>{conflicts.length}</strong>
            <small>Recorded server-side decisions</small>
          </article>
        </section>

        <ResourceRescuePanel
          recommendations={rescueRecommendations}
        />

        <DemandFlowPanel movements={movementEvents} />

        {notice && (
          <div className="notice" role="status">
            {notice}

            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {formOpen && (
          <section className="panel form-panel">
            <div className="panel-heading">
              <div>
                <h3>{editing ? "Edit resource" : "Add a resource"}</h3>
                <p>
                  Changes are persisted locally before synchronization.
                </p>
              </div>
            </div>

            <ResourceForm
              key={editing?.id || "new"}
              initialValue={
                editing
                  ? {
                      name: editing.name,
                      category: editing.category,
                      quantity: String(editing.quantity),
                      minimumStock: String(editing.minimumStock),
                      location: editing.location
                    }
                  : EMPTY_FORM
              }
              onSave={save}
              onCancel={() => {
                setFormOpen(false);
                setEditing(null);
              }}
              saving={saving}
            />
          </section>
        )}

        <section className="panel inventory-panel">
          <div className="panel-heading">
            <div>
              <h3>Tracked resources</h3>
              <p>{resources.length} resource record(s)</p>
            </div>

            <div className="toolbar">
              <div className="search-box">
                <Search size={16} />

                <input
                  placeholder="Search resources…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <button
                className="button button-secondary sync-button"
                onClick={syncNow}
                disabled={!online || syncing}
              >
                <RefreshCw
                  size={16}
                  className={syncing ? "spin" : ""}
                />

                {syncing ? "Syncing" : "Sync now"}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>RESOURCE</th>
                  <th>CATEGORY</th>
                  <th>QUANTITY</th>
                  <th>LOCATION</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredResources.map((resource) => {
                  const isLow =
                    resource.quantity <= resource.minimumStock;

                  return (
                    <tr key={resource.id}>
                      <td>
                        <strong>{resource.name}</strong>

                        <span className="record-id">
                          {resource.id.slice(0, 8)}
                        </span>
                      </td>

                      <td>{resource.category}</td>

                      <td>
                        <strong>{resource.quantity}</strong>

                        <span className="record-id">
                          Minimum {resource.minimumStock}
                        </span>
                      </td>

                      <td>{resource.location}</td>

                      <td>
                        <span
                          className={`status-tag ${
                            isLow ? "low" : "available"
                          }`}
                        >
                          {isLow ? "Low stock" : "Available"}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            onClick={() => consume(resource)}
                            disabled={resource.quantity <= 0}
                            aria-label={`Record consumption of ${resource.name}`}
                            title="Record consumption"
                          >
                            <Activity size={16} />
                          </button>

                          <button
                            onClick={() => edit(resource)}
                            aria-label={`Edit ${resource.name}`}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() => remove(resource)}
                            aria-label={`Delete ${resource.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filteredResources.length && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      <CloudOff size={22} />
                      <strong>No resources found</strong>
                      <span>
                        Add a resource or change your search.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <span>
            {pendingCount
              ? `${pendingCount} operation(s) awaiting acknowledgement`
              : "No pending operations"}
          </span>

          <span>
            {lastSync
              ? `Last sync attempt: ${lastSync.toLocaleTimeString()}`
              : "Synchronization status will appear here"}
          </span>
        </footer>
      </main>
    </div>
  );
}
