import { useEffect, useRef, useState } from "react";
import Icon from "./components/Icon";
import RouteMap from "./components/RouteMap";
import AgentPanel from "./components/AgentPanel";
import AuthPanel from "./components/ui/AuthPanel";
import Loader from "./components/ui/Loader";
import CircularSplitRoll from "./components/ui/CircularSplitRoll";
import { ROUTES } from "./data/routes";
import { getTripState, getFleetState, formatDuration } from "./lib/simulation";
import { readLocal, writeLocal } from "./lib/storage";
import { INCIDENT_TYPES, makeCandidates, rankCandidates, departureAdvice, mexicanTime } from "./lib/routeAgent";
import "./App.css";

const NAV = [
  ["trip", "route", "Mi viaje"],
  ["explore", "compass", "Explorar rutas"],
  ["saved", "heart", "Guardadas"],
  ["history", "clock", "Mis viajes"],
];
const PLACES = [...new Set(ROUTES.flatMap((r) => [r.origin, r.destination]))];
const isProfile = (p) =>
  p && typeof p.name === "string" && typeof p.email === "string";
const isHistory = (v) =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      x &&
      typeof x.id === "string" &&
      typeof x.routeId === "string" &&
      typeof x.destination === "string" &&
      Number.isFinite(x.date) &&
      Number.isFinite(x.minutes),
  );
function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <Icon name="route" size={25} />
      </span>
      <span>
        Movil<span className="brand-light">Tec</span>
        <small>TU CIUDAD, MÁS CERCA</small>
      </span>
    </div>
  );
}
function clockAt(seconds, baseTime) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  }).format(new Date(baseTime + seconds * 1000));
}

export default function App() {
  const [profile, setProfile] = useState(() =>
    readLocal("profile", null, isProfile),
  );
  const [view, setView] = useState("trip");
  const [selectedId, setSelectedId] = useState("01");
  const [stopIndex, setStopIndex] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState(() =>
    readLocal(
      "favorites",
      [],
      (v) => Array.isArray(v) && v.every((x) => ROUTES.some((r) => r.id === x)),
    ),
  );
  const [history, setHistory] = useState(() =>
    readLocal("history", [], isHistory),
  );
  const [trip, setTrip] = useState(null);
  const [speed, setSpeed] = useState(30);
  const [paused, setPaused] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [filter, setFilter] = useState({ origin: "", destination: "" });
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [storageIssue, setStorageIssue] = useState(false);
  const [alerts, setAlerts] = useState(true);
  const [goal, setGoal] = useState(() => mexicanTime(Date.now() + 90 * 60_000));
  const [autoAgent, setAutoAgent] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("direct");
  const [agentMessages, setAgentMessages] = useState([]);
  const timer = useRef(null);
  const headingRef = useRef(null);
  const dialogRef = useRef(null);
  const route = ROUTES.find((r) => r.id === selectedId) || ROUTES[0];
  const candidates = makeCandidates(route, stopIndex);
  const ranking = rankCandidates(candidates, incidents, stopIndex);
  const activePlanId = trip?.activePlanId || selectedPlanId;
  const activePlan = candidates.find((item) => item.id === activePlanId) || candidates[0];
  const activeScore = ranking.find((item) => item.id === activePlan.id);
  const routeForTrip = {
    ...activePlan.route,
    wait: activeScore?.waitMinutes ?? activePlan.route.wait,
    minutes: activePlan.route.minutes + (activeScore?.extraRide ?? 0),
  };
  const segmentStopIndex = trip?.segmentStopIndex ?? stopIndex;
  const segmentElapsed = Math.max(0, (trip?.elapsed ?? 0) - (trip?.segmentStartedAt ?? 0));
  const state = getTripState({
    route: routeForTrip,
    stopIndex: segmentStopIndex,
    elapsed: segmentElapsed,
  });
  const fleet = getFleetState({
    route: routeForTrip,
    stopIndex: segmentStopIndex,
    elapsed: segmentElapsed,
  });
  const passengerProgress = Math.max(
    0,
    (state.progress - routeForTrip.stops[segmentStopIndex].progress) /
      (1 - routeForTrip.stops[segmentStopIndex].progress),
  );
  const simulationNow = trip ? trip.startedAt + trip.elapsed * 1000 : Date.now();
  const remainingGoalMinutes = trip ? Math.ceil(state.remainingSeconds / 60) : ranking[0]?.totalMinutes;
  const advice = departureAdvice(goal, remainingGoalMinutes, simulationNow);
  const etaClock = trip ? mexicanTime(simulationNow + state.remainingSeconds * 1000) : null;
  const tracking = !!trip;
  const phase = tracking ? state.phase : "idle";
  const isArrived = phase === "arrived";
  const filteredRoutes = ROUTES.filter(
    (r) =>
      (!filter.origin || r.origin === filter.origin) &&
      (!filter.destination || r.destination === filter.destination),
  );
  const nextMinutes = Math.ceil(
    (tracking ? state.arrivalSeconds : route.wait * 60) / 60,
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!tracking || paused || isArrived) return;
    const t = setInterval(
      () =>
        setTrip((value) =>
          value ? { ...value, elapsed: value.elapsed + speed } : value,
        ),
      1000,
    );
    return () => clearInterval(t);
  }, [tracking, paused, isArrived, speed]);
  useEffect(() => {
    if (trip && autoAgent && !trip.autoTriggered && trip.elapsed >= 240 && !paused && state.phase !== "arrived") {
      simulateIncident("traffic", true);
      setTrip((current) => current ? { ...current, autoTriggered: true } : current);
    }
  }, [trip?.elapsed, trip?.autoTriggered, autoAgent, paused]);
  useEffect(() => {
    if (!trip?.pendingPlanId || state.phase === "arrived") return;
    const target = routeForTrip.stops[trip.pendingStopIndex];
    if (!target || state.progress < target.progress - 0.00001) return;
    setSelectedPlanId(trip.pendingPlanId);
    setTrip((current) => current?.pendingPlanId ? {
      ...current,
      activePlanId: current.pendingPlanId,
      segmentStartedAt: current.elapsed,
      segmentStopIndex: current.pendingStopIndex,
      pendingPlanId: null,
      pendingStopIndex: null,
    } : current);
    addAgentMessage("Cambio aplicado al llegar a la parada de conexión simulada.", "info", simulationNow);
  }, [trip?.elapsed, trip?.pendingPlanId, state.progress]);

  useEffect(() => {
    if (!cancelOpen) return;
    const previous = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") setCancelOpen(false);
      if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll("button");
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [cancelOpen]);

  function addAgentMessage(text, type = "info", at = Date.now()) {
    setAgentMessages((previous) => [{ id: crypto.randomUUID(), time: mexicanTime(at), text, type }, ...previous].slice(0, 10));
  }
  function simulateIncident(type, automatic = false) {
    if (!INCIDENT_TYPES[type] || isArrived) return;
    const event = { id: crypto.randomUUID(), type, planId: activePlanId };
    const updated = [...incidents, event];
    const next = rankCandidates(candidates, updated, stopIndex)[0];
    setIncidents(updated);
    const incidentText = `${automatic ? "Detección automática" : "Incidencia reportada"}: ${INCIDENT_TYPES[type].title} en ${activePlan.label}.`;
    addAgentMessage(incidentText, "incident", simulationNow);
    if (!next || !Number.isFinite(next.totalMinutes)) {
      setPaused(true);
      addAgentMessage("Todas las opciones evaluadas están bloqueadas. No podemos prometer una llegada a tiempo.", "incident", simulationNow);
      if (alerts) setToast("Sin alternativa disponible. Consulta los avisos del agente.");
      return;
    }
    if (next.id !== activePlanId) {
      if (trip && (state.phase === "riding" || state.phase === "boarding")) {
        const transferStop = Math.min(route.stops.length - 2, Math.max(segmentStopIndex + 1, Math.ceil(state.progress * (route.stops.length - 1))));
        setTrip((current) => current ? { ...current, pendingPlanId: next.id, pendingStopIndex: transferStop } : current);
        addAgentMessage(`Nueva ruta recomendada: ${next.label} (${next.totalMinutes} min estimados). Cambio programado en la siguiente parada simulada.`, "info", simulationNow);
      } else {
        setSelectedPlanId(next.id);
        if (trip) setTrip((current) => current ? { ...current, activePlanId: next.id, pendingPlanId: null, pendingStopIndex: null } : current);
        addAgentMessage(`Ruta recalculada automáticamente: ${next.label}. Nueva estimación: ${next.totalMinutes} min.`, "info", simulationNow);
      }
      if (alerts) setToast(`Agente: incidencia detectada. Alternativa: ${next.label}.`);
    } else {
      addAgentMessage(`Se mantiene ${next.label}: sigue siendo la opción más rápida (${next.totalMinutes} min).`, "info", simulationNow);
      if (alerts) setToast("Incidencia registrada. El agente recalculó las estimaciones.");
    }
  }
  function resetAgent() {
    if (trip && state.phase !== "waiting") return;
    setIncidents([]);
    setSelectedPlanId("direct");
    setTrip((current) => current ? { ...current, activePlanId: "direct", pendingPlanId: null, pendingStopIndex: null } : current);
    addAgentMessage("Escenario reiniciado. Ruta original restaurada.", "info", simulationNow);
  }
  function persist(key, value) {
    if (!writeLocal(key, value)) setStorageIssue(true);
  }
  function navigate(next) {
    setView(next);
    setNotice(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  function completeAuth(value) {
    setBusy(true);
    timer.current = setTimeout(() => {
      setProfile(value);
      persist("profile", value);
      setBusy(false);
    }, 900);
  }
  function selectRoute(value) {
    if (tracking) {
      setToast("Finaliza o cancela tu viaje actual para cambiar de ruta.");
      navigate("trip");
      return;
    }
    setSelectedId(value.id);
    setStopIndex(0);
    setIncidents([]);
    setSelectedPlanId("direct");
    setAgentMessages([]);
    if (!filteredRoutes.some((item) => item.id === value.id)) {
      setFilter({ origin: "", destination: "" });
      setOrigin("");
      setDestination("");
    }
    navigate("trip");
  }
  function favorite(id) {
    const saved = favoriteIds.includes(id);
    const value = saved
      ? favoriteIds.filter((x) => x !== id)
      : [...favoriteIds, id];
    setFavoriteIds(value);
    persist("favorites", value);
    setToast(
      saved
        ? "Ruta eliminada de tus guardadas."
        : "Ruta guardada. La encontrarás en Guardadas.",
    );
  }
  function startTrip() {
    setBusy(true);
    timer.current = setTimeout(() => {
      setTrip({ elapsed: 0, startedAt: Date.now(), activePlanId: selectedPlanId, segmentStartedAt: 0, segmentStopIndex: stopIndex, autoTriggered: false });
      addAgentMessage(`Seguimiento iniciado en ${activePlan.label}. El agente vigila el trayecto.`, "info");
      setPaused(false);
      setBusy(false);
      setToast(
        `Seguimiento iniciado. Cada segundo representa ${speed} segundos del viaje.`,
      );
    }, 700);
  }
  function finishTrip() {
    const value = [
      {
        id: crypto.randomUUID(),
        routeId: route.id,
        destination: route.destination,
        origin: route.stops[stopIndex].name,
        date: trip.startedAt,
        minutes: Math.round(state.rideSeconds / 60),
        planLabel: activePlan.label,
      },
      ...history,
    ].slice(0, 30);
    setHistory(value);
    persist("history", value);
    setTrip(null);
    setToast("¡Llegaste! Tu viaje quedó guardado en Mis viajes.");
    navigate("history");
  }
  function submitSearch(event) {
    event.preventDefault();
    setFilter({ origin, destination });
    const match = ROUTES.find(
      (r) =>
        (!origin || origin === r.origin) &&
        (!destination || destination === r.destination),
    );
    if (match && !tracking) {
      setSelectedId(match.id);
      setStopIndex(0);
      setIncidents([]);
      setSelectedPlanId("direct");
      setAgentMessages([]);
    }
  }
  const normalizedSearch = search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const catalog = ROUTES.filter((r) =>
    `${r.origin} ${r.destination}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(normalizedSearch),
  );

  if (!profile)
    return (
      <main className="welcome">
        <div className="welcome-header">
          <Brand />
          <span className="demo-pill">
            <span className="status-dot" />
            PROTOTIPO INTERACTIVO
          </span>
        </div>
        <div className="welcome-layout">
          <section className="welcome-story">
            <span className="eyebrow">HECHO PARA TU DÍA A DÍA</span>
            <h1>
              Menos espera.
              <br />
              Más <span>camino.</span>
            </h1>
            <p>
              Tu próxima unidad, tu ruta y tu tiempo.
              <br />
              Todo en un mismo lugar.
            </p>
            <div className="welcome-map">
              <RouteMap
                route={ROUTES[0]}
                stopIndex={1}
                onStopChange={() => {}}
                interactive={false}
              />
              <div className="welcome-eta">
                <span className="bus-icon">
                  <Icon name="bus" size={24} />
                </span>
                <div>
                  <span>Tu próxima unidad</span>
                  <strong>
                    En 4 minutos <Icon name="arrow" size={18} />
                  </strong>
                </div>
                <span className="small-badge">DEMO</span>
              </div>
            </div>
            <div className="welcome-facts">
              <span>
                <Icon name="route" />8 rutas para explorar
              </span>
              <span>
                <Icon name="shield" />
                Datos simulados
              </span>
            </div>
          </section>
          <div className="welcome-form">
            {busy ? (
              <div className="loading-panel">
                <Loader
                  title="Preparando tu espacio"
                  subtitle="Tu próximo viaje empieza aquí."
                />
              </div>
            ) : (
              <AuthPanel onComplete={completeAuth} />
            )}
          </div>
        </div>
        <footer className="welcome-footer">
          <span>MovilTec © 2026</span>
          <span>Ciudad de México · Una forma más clara de moverte.</span>
        </footer>
      </main>
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-caption">TU MOVILIDAD</div>
        <nav aria-label="Navegación principal">
          {NAV.map(([key, icon, label]) => (
            <button
              key={key}
              className={`nav-item ${view === key ? "active" : ""}`}
              aria-label={label}
              title={label}
              onClick={() => navigate(key)}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {key === "saved" && favoriteIds.length > 0 && (
                <span className="nav-count">{favoriteIds.length}</span>
              )}
              {key === "trip" && tracking && <i className="status-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-note">
            <span className="tiny-icon">
              <Icon name="leaf" size={21} />
            </span>
            <h3>Tu tiempo importa.</h3>
            <p>Planea tu siguiente trayecto con un poco más de calma.</p>
            <span>
              MUÉVETE A TU RITMO <Icon name="arrow" size={14} />
            </span>
          </div>
          <button
            className={`nav-item ${view === "help" ? "active" : ""}`}
            aria-label="Centro de ayuda"
            title="Centro de ayuda"
            onClick={() => navigate("help")}
          >
            <Icon name="help" />
            <span>Centro de ayuda</span>
          </button>
          <button
            className="profile-button"
            aria-label="Mi perfil"
            title="Mi perfil"
            onClick={() => navigate("profile")}
          >
            <span className="avatar">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{profile.name.split(" ")[0]}</strong>
              <small>Cuenta de demostración</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Mi espacio <span>/</span>{" "}
            <strong>
              {NAV.find((x) => x[0] === view)?.[2] ||
                (view === "help" ? "Centro de ayuda" : "Mi perfil")}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="location-label">
              <Icon name="pin" size={15} />
              Ciudad de México
            </span>
            <span className="demo-pill">
              <span className="status-dot" />
              DEMO
            </span>
            <button
              className={`icon-button notification-button ${alerts && (agentMessages.length || (tracking && (phase === "boarding" || isArrived))) ? "has-notice" : ""}`}
              aria-label="Ver avisos del viaje"
              aria-expanded={notice}
              onClick={() => setNotice(!notice)}
            >
              <Icon name="bell" />
            </button>
            {notice && (
              <div className="notification-popover">
                <strong>Avisos de tu viaje</strong>
                <p>
                  {!alerts ? "Los avisos visuales están desactivados en tu perfil."
                    : agentMessages.length ? agentMessages[0].text
                    : !tracking ? "Elige una ruta e inicia la simulación del agente."
                    : phase === "boarding" ? "Tu unidad llegó a la parada. Es momento de abordar."
                    : isArrived ? "Llegaste a tu destino. Finaliza para guardar tu viaje."
                    : "El agente supervisa tu trayecto simulado."}
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    setNotice(false);
                    navigate("trip");
                  }}
                >
                  Ver mi viaje <Icon name="arrow" size={15} />
                </button>
              </div>
            )}
          </div>
        </header>
        <main id="main" className="main-content">
          {storageIssue && (
            <div className="inline-warning" role="status">
              El navegador no permite guardar datos. Puedes continuar; los
              cambios se conservarán solo mientras mantengas abierta esta
              página.
            </div>
          )}
          {view === "trip" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    CADA VIAJE EMPIEZA CON UN BUEN PLAN
                  </div>
                  <h1 ref={headingRef} tabIndex={-1}>
                    {tracking
                      ? "Tu viaje, paso a paso."
                      : `¿A dónde vamos, ${profile.name.split(" ")[0]}?`}
                  </h1>
                  <p>
                    {tracking
                      ? "Sigue tu unidad y consulta lo que viene en tu camino."
                      : "Encuentra tu ruta. Conoce tu espera. Muévete con tranquilidad."}
                  </p>
                </div>
                <div className="today">
                  <Icon name="compass" size={18} />
                  <span>
                    CDMX <small>Tu ciudad, más cerca</small>
                  </span>
                </div>
              </div>
              <div className="journey-steps" aria-label="Pasos de tu viaje">
                {[
                  ["check", "Tu cuenta"],
                  ["route", "Elige tu ruta"],
                  ["pin", "Tu parada"],
                  ["bus", "En camino"],
                ].map(([icon, label], i) => (
                  <div
                    key={label}
                    className={
                      i === 0
                        ? "complete"
                        : i === (tracking ? 3 : 1)
                          ? "current"
                          : ""
                    }
                  >
                    <span>
                      <Icon name={icon} size={15} />
                    </span>
                    {label}
                    {i < 3 && <i />}
                  </div>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="planner-panel panel">
                  <div className="section-heading">
                    <h2>Planea tu viaje</h2>
                    <Icon name="route" size={18} />
                  </div>
                  <form onSubmit={submitSearch} className="planner-form">
                    <label htmlFor="origin">Punto de partida</label>
                    <div className="select-field">
                      <span className="origin-dot" />
                      <select
                        id="origin"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        disabled={tracking}
                      >
                        <option value="">Todos los orígenes</option>
                        {PLACES.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-connector" />
                    <label htmlFor="destination">¿A dónde quieres ir?</label>
                    <div className="select-field">
                      <Icon name="pin" size={17} />
                      <select
                        id="destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        disabled={tracking}
                      >
                        <option value="">Todos los destinos</option>
                        {PLACES.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="primary-button full-width"
                      disabled={tracking}
                    >
                      <Icon name="search" size={17} />
                      Buscar rutas
                      <Icon name="arrow" size={17} />
                    </button>
                  </form>
                  <div className="route-results-heading">
                    <h3>
                      Rutas disponibles <span>{filteredRoutes.length}</span>
                    </h3>
                    {(filter.origin || filter.destination) && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setFilter({ origin: "", destination: "" });
                          setOrigin("");
                          setDestination("");
                        }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div
                    className="route-results"
                    aria-label="Resultados de rutas"
                  >
                    {filteredRoutes.length ? (
                      filteredRoutes.map((r) => (
                        <button
                          key={r.id}
                          className={`route-option ${route.id === r.id ? "selected" : ""}`}
                          onClick={() => selectRoute(r)}
                          disabled={tracking}
                          aria-pressed={route.id === r.id}
                        >
                          <span className="route-number">{r.id}</span>
                          <span className="route-option-text">
                            <strong>{r.destination}</strong>
                            <small>{r.origin}</small>
                            <span>
                              <Icon name="clock" size={12} />
                              {r.minutes} min <i />
                              Llega en {r.wait} min
                            </span>
                          </span>
                          <Icon
                            name={route.id === r.id ? "check" : "chevron"}
                            size={16}
                          />
                        </button>
                      ))
                    ) : (
                      <div className="empty-results">
                        <Icon name="search" size={26} />
                        <h3>No hay una ruta directa</h3>
                        <p>
                          Prueba otro origen o destino. Este demo incluye solo
                          las ocho rutas del catálogo, en el sentido indicado.
                        </p>
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setFilter({ origin: "", destination: "" });
                            setOrigin("");
                            setDestination("");
                          }}
                        >
                          Mostrar las 8 rutas
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="catalog-note">
                    01–08 son referencias del catálogo demo.
                  </p>
                </section>
                <div className="trip-content">
                  {!filteredRoutes.length && (
                    <div className="inline-warning" role="status">
                      No hay coincidencias con tu búsqueda. La última ruta
                      consultada sigue visible como referencia; ajusta los
                      filtros para iniciar un viaje.
                    </div>
                  )}
                  <div className="route-context">
                    <div>
                      <span className="small-label">TU RUTA SELECCIONADA</span>
                      <h2>{route.destination}</h2>
                      <p>
                        <span className="route-label">{routeForTrip.id}</span>Desde{" "}
                        {route.origin}
                      </p>
                      {activePlanId !== "direct" && <p className="agent-changed-label"><Icon name="swap" size={13} /> Desvío recomendado por el agente · Simulado</p>}
                    </div>
                    <button
                      className={`icon-button favorite-button ${favoriteIds.includes(route.id) ? "is-favorite" : ""}`}
                      aria-label={
                        favoriteIds.includes(route.id)
                          ? "Quitar ruta de guardadas"
                          : "Guardar esta ruta"
                      }
                      aria-pressed={favoriteIds.includes(route.id)}
                      onClick={() => favorite(route.id)}
                    >
                      <Icon name="heart" />
                    </button>
                  </div>
                  <AgentPanel
                    goal={goal}
                    onGoalChange={setGoal}
                    ranking={ranking}
                    activeId={activePlanId}
                    advice={advice}
                    etaClock={etaClock}
                    pendingPlanId={trip?.pendingPlanId}
                    onIncident={simulateIncident}
                    onReset={resetAgent}
                    autoAgent={autoAgent}
                    onAutoAgentChange={setAutoAgent}
                    messages={agentMessages}
                    tracking={tracking}
                    canReset={Boolean(incidents.length) && (!tracking || phase === "waiting")}
                  />
                  <RouteMap
                    route={routeForTrip}
                    planId={activePlanId}
                    stopIndex={tracking ? segmentStopIndex : stopIndex}
                    onStopChange={(value) => { setStopIndex(value); setIncidents([]); setSelectedPlanId("direct"); setAgentMessages([]); }}
                    progress={tracking ? state.progress : undefined}
                    fleet={tracking ? fleet : undefined}
                    tracking={tracking}
                    phase={phase}
                  />
                  <div className="trip-summary">
                    <section className="stop-card panel">
                      <span className="small-label">
                        01 / TU PUNTO DE ENCUENTRO
                      </span>
                      <label htmlFor="boarding-stop">
                        <Icon name="pin" size={18} />
                        ¿Dónde vas a subir?
                      </label>
                      <select
                        id="boarding-stop"
                        value={stopIndex}
                        onChange={(e) => { setStopIndex(Number(e.target.value)); setIncidents([]); setSelectedPlanId("direct"); setAgentMessages([]); }}
                        disabled={tracking}
                      >
                        {route.stops.slice(0, -1).map((s, i) => (
                          <option key={s.id} value={i}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <p>
                        {stopIndex
                          ? "Parada intermedia ilustrativa del demo."
                          : "Aborda en el punto de partida de esta ruta."}
                      </p>
                    </section>
                    <section className="arrival-card">
                      <div>
                        <span className="small-label">
                          {isArrived
                            ? "YA ESTÁS AQUÍ"
                            : phase === "riding"
                              ? "TIEMPO A TU DESTINO"
                              : "PRÓXIMA UNIDAD"}
                        </span>
                        <strong>
                          {isArrived ? (
                            <Icon name="check" size={40} />
                          ) : phase === "riding" ? (
                            Math.ceil(state.remainingSeconds / 60)
                          ) : (
                            nextMinutes
                          )}
                          <small>{!isArrived && "min"}</small>
                        </strong>
                        <span>
                          {isArrived
                            ? "Viaje completado"
                            : `Unidad MX-${routeForTrip.id}1 · ${phase === "riding" ? "En camino" : "Tiempo estimado"}`}
                        </span>
                      </div>
                      <div className="arrival-spark">
                        <svg viewBox="0 0 150 60" aria-hidden="true">
                          <path
                            d="m0 45 22-10 22 5 22-20 22 6 20-18 42-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="m0 45 22-10 22 5 22-20 22 6 20-18 42-3V60H0Z"
                            fill="currentColor"
                            opacity=".08"
                          />
                        </svg>
                        <span>El camino se acerca</span>
                      </div>
                    </section>
                  </div>
                  <section className="tracking-panel panel">
                    <div className="tracking-heading">
                      <div>
                        <span className="small-label">
                          02 / {tracking ? "TU RECORRIDO" : "LISTO PARA SALIR"}
                        </span>
                        <h2>
                          {phase === "waiting"
                            ? "Tu unidad viene en camino"
                            : phase === "boarding"
                              ? "Es momento de abordar"
                              : phase === "riding"
                                ? "Disfruta el camino"
                                : isArrived
                                  ? "Llegaste a tu destino"
                                  : "Un viaje, todo a la vista."}
                        </h2>
                      </div>
                      <span className="duration-chip">
                        <Icon name="clock" size={15} />
                        {Math.ceil(state.rideSeconds / 60)} min de recorrido
                      </span>
                    </div>
                    {tracking ? (
                      <>
                        <div className="tracking-stats">
                          <div>
                            <small>
                              {phase === "waiting"
                                ? "Llega a tu parada"
                                : "Próxima parada"}
                            </small>
                            <strong>
                              {phase === "waiting"
                                ? formatDuration(state.arrivalSeconds)
                                : isArrived
                                  ? routeForTrip.destination
                                  : routeForTrip.stops[state.nextStopIndex]?.name ||
                                    routeForTrip.destination}
                            </strong>
                          </div>
                          <div>
                            <small>Llegada aproximada</small>
                            <strong>
                              {clockAt(
                                state.remainingSeconds,
                                trip.startedAt + trip.elapsed * 1000,
                              )}{" "}
                              <span>h</span>
                            </strong>
                          </div>
                          <div>
                            <small>Unidad</small>
                            <strong>
                                MX-{routeForTrip.id}1 <span>· Demo</span>
                            </strong>
                          </div>
                        </div>
                        <div
                          className="trip-progress"
                          role="progressbar"
                          aria-label="Progreso del viaje"
                          aria-valuenow={Math.round(passengerProgress * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span
                            style={{ width: `${passengerProgress * 100}%` }}
                          />
                        </div>
                        <div className="phase-labels">
                          <span
                            className={phase === "waiting" ? "current" : ""}
                          >
                            En espera
                          </span>
                          <span
                            className={phase === "boarding" ? "current" : ""}
                          >
                            Abordaje
                          </span>
                          <span className={phase === "riding" ? "current" : ""}>
                            En camino
                          </span>
                          <span className={isArrived ? "current" : ""}>
                            Llegada
                          </span>
                        </div>
                        {alerts && (phase === "boarding" || isArrived) && (
                          <div className="trip-status" role="status">
                            <Icon
                              name={isArrived ? "check" : "bell"}
                              size={18}
                            />
                            {isArrived
                              ? "¡Llegaste! Finaliza el viaje para guardarlo."
                              : "La unidad está en tu parada. El abordaje dura 30 segundos simulados."}
                          </div>
                        )}
                        {incidents.length > 0 && (
                          <div className="delay-note">
                            <Icon name="alert" size={15} />
                            {incidents.length} incidencia(s) simulada(s). El agente ha recalculado el recorrido.
                            {trip.pendingPlanId && " El desvío se activará en la siguiente parada."}
                          </div>
                        )}
                        <div className="simulation-controls">
                          <div>
                            <button
                              className="icon-button"
                              aria-label={
                                paused
                                  ? "Reanudar simulación"
                                  : "Pausar simulación"
                              }
                              onClick={() => setPaused(!paused)}
                              disabled={isArrived}
                            >
                              <Icon
                                name={paused ? "play" : "pause"}
                                size={16}
                              />
                            </button>
                            <label>
                              Velocidad
                              <select
                                aria-label="Velocidad de simulación"
                                value={speed}
                                onChange={(e) =>
                                  setSpeed(Number(e.target.value))
                                }
                              >
                                <option value={1}>×1</option>
                                <option value={30}>×30</option>
                                <option value={60}>×60</option>
                              </select>
                            </label>
                            <span className="speed-hint">
                              1 s = {speed} s de viaje
                            </span>
                          </div>
                          <span className="speed-hint">Las incidencias se simulan en el panel del agente.</span>
                        </div>
                        <div className="tracking-actions">
                          {isArrived ? (
                            <button
                              className="primary-button"
                              onClick={finishTrip}
                            >
                              Finalizar viaje
                              <Icon name="check" size={17} />
                            </button>
                          ) : (
                            <>
                              <button
                                className="text-button"
                                onClick={() => setCancelOpen(true)}
                              >
                                Cancelar seguimiento
                              </button>
                              {phase === "boarding" && (
                                <button
                                  className="primary-button"
                                  onClick={() =>
                                    setTrip((t) => ({
                                      ...t,
                                      elapsed: t.segmentStartedAt + state.waitSeconds + 30,
                                    }))
                                  }
                                >
                                  Ya estoy a bordo
                                  <Icon name="arrow" size={17} />
                                </button>
                              )}
                              <span className="live-caption">
                                <i className="status-dot" />
                                {paused
                                  ? "Simulación pausada"
                                  : "Simulación en curso"}
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="tracking-intro">
                          Consulta la llegada de tu unidad y acompaña cada etapa
                          hasta tu destino.
                        </p>
                        <div className="start-row">
                          <div className="mini-faces">
                            <span>
                              <Icon name="bus" size={17} />
                            </span>
                            <p>
                              Unidad <strong>MX-{routeForTrip.id}1</strong>
                              <small>
                                {routeForTrip.distance} km de ruta ilustrativa
                              </small>
                            </p>
                          </div>
                          <button
                            className="primary-button"
                            disabled={!filteredRoutes.length || !Number.isFinite(ranking[0]?.totalMinutes)}
                            onClick={startTrip}
                          >
                            Iniciar seguimiento
                            <Icon name="arrow" size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </div>
              <section className="following-units">
                <div className="section-heading">
                  <div>
                    <h2>Siempre hay un siguiente camino</h2>
                    <p>Próximas unidades en {routeForTrip.stops[segmentStopIndex].name}</p>
                  </div>
                  <span className="small-badge">ESTIMACIONES DEMO</span>
                </div>
                <div className="unit-grid">
                  {fleet.map((unit, n) => (
                    <div className="unit-card" key={unit.id}>
                      <span className="unit-bus">
                        <Icon name="bus" size={21} />
                      </span>
                      <div>
                        <strong>{unit.id}</strong>
                        <small>
                          {n === 0 ? "Tu unidad" : `Unidad siguiente ${n}`}
                        </small>
                      </div>
                      <span className="unit-time">
                        {tracking && unit.state.phase !== "waiting"
                          ? "Ya llegó"
                          : formatDuration(unit.state.arrivalSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {view === "explore" && (
            <>
              <PageHeading
                title="Un camino para cada día."
                text="Explora las ocho rutas de este primer prototipo."
                headingRef={headingRef}
              />
              <CircularSplitRoll items={ROUTES} onSelect={selectRoute} />
              <div className="catalog-toolbar">
                <h2>
                  Explora el catálogo <span className="muted">/ 08 rutas</span>
                </h2>
                <div className="search-field">
                  <Icon name="search" size={18} />
                  <input
                    aria-label="Buscar en el catálogo"
                    placeholder="Buscar origen o destino"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="catalog-grid">
                {catalog.map((r) => (
                  <RouteCard
                    key={r.id}
                    route={r}
                    saved={favoriteIds.includes(r.id)}
                    onFavorite={favorite}
                    onSelect={selectRoute}
                  />
                ))}
              </div>
              {!catalog.length && (
                <Empty
                  icon="search"
                  title="No encontramos esa ruta"
                  text="Prueba con el nombre de otra estación o colonia."
                />
              )}
              <p className="catalog-note">
                Las entradas 05 y 07 conservan la misma descripción de origen y
                destino que recibimos. Sus tiempos son escenarios de
                demostración, no variantes oficiales.
              </p>
            </>
          )}
          {view === "saved" && (
            <>
              <PageHeading
                title="Tus caminos de siempre."
                text="Guarda una ruta y vuelve a ella cuando la necesites."
                headingRef={headingRef}
              />
              {favoriteIds.length ? (
                <div className="catalog-grid">
                  {ROUTES.filter((r) => favoriteIds.includes(r.id)).map((r) => (
                    <RouteCard
                      key={r.id}
                      route={r}
                      saved
                      onFavorite={favorite}
                      onSelect={selectRoute}
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  icon="heart"
                  title="Aquí empieza tu rutina"
                  text="Toca el corazón de una ruta para tenerla siempre a la mano."
                  action="Explorar rutas"
                  onAction={() => navigate("explore")}
                />
              )}
            </>
          )}
          {view === "history" && (
            <>
              <PageHeading
                title="Cada viaje cuenta."
                text="Un pequeño registro de los caminos que ya recorriste."
                headingRef={headingRef}
              />
              {history.length ? (
                <div className="history-list">
                  {history.map((item) => (
                    <article className="history-card panel" key={item.id}>
                      <span className="history-check">
                        <Icon name="check" />
                      </span>
                      <div>
                        <span className="small-label">
                          VIAJE DEMO COMPLETADO ·{" "}
                          {new Intl.DateTimeFormat("es-MX", {
                            day: "numeric",
                            month: "short",
                            timeZone: "America/Mexico_City",
                          }).format(new Date(item.date))}
                        </span>
                        <h2>{item.destination}</h2>
                        <p>
                          Desde {item.origin} · {item.minutes} min de recorrido{item.planLabel ? ` · ${item.planLabel}` : ""}
                        </p>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          selectRoute(
                            ROUTES.find((r) => r.id === item.routeId) ||
                              ROUTES[0],
                          )
                        }
                      >
                        Volver a viajar
                        <Icon name="arrow" size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon="clock"
                  title="Tu primer viaje te espera"
                  text="Al finalizar un seguimiento, encontrarás aquí tu recorrido."
                  action="Planear mi viaje"
                  onAction={() => navigate("trip")}
                />
              )}
            </>
          )}
          {view === "help" && (
            <>
              <PageHeading
                title="Viaja con más claridad."
                text="Todo lo que necesitas para probar MovilTec."
                headingRef={headingRef}
              />
              <div className="help-layout">
                <section className="panel help-intro">
                  <span className="help-mark">
                    <Icon name="help" size={36} />
                  </span>
                  <h2>Estamos para orientarte.</h2>
                  <p>
                    Comienza con tu ruta, elige una parada y activa el
                    seguimiento. El demo te acompaña hasta el destino.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => navigate("trip")}
                  >
                    Vamos a mi viaje
                    <Icon name="arrow" size={17} />
                  </button>
                </section>
                <section className="faq-list">
                  {[
                    [
                      "¿Los tiempos y las unidades son reales?",
                      "No. Los tiempos, las paradas intermedias, las distancias y las unidades son ejemplos de demostración. El mapa es un esquema ilustrativo sin ubicación GPS. No uses este demo para planear un traslado real.",
                    ],
                    [
                      "¿Cómo funciona la simulación?",
                      "Al iniciar, el reloj avanza a velocidad ×30. El agente genera automáticamente una incidencia después de cuatro minutos simulados (si está activado). También puedes simular retrasos, tráfico o cierres desde el panel. Se comparan tres escenarios y se cambia el trayecto antes de abordar o en la siguiente parada simulada.",
                    ],
                    [
                      "¿Cómo se calcula el tiempo?",
                      "El algoritmo suma caminata, espera, recorrido restante y penalizaciones de incidencias. Elige el tiempo más corto, descarta corredores cerrados y calcula una hora ideal de salida con 5 minutos de margen. Las conexiones y desvíos son ficticios.",
                    ],
                    [
                      "¿Qué guarda mi cuenta?",
                      "El nombre y correo que ingresas, tus rutas guardadas y hasta 30 viajes terminados se guardan en este navegador. No se almacenan contraseñas. El inicio de sesión es una demostración y no valida credenciales reales. Usa datos ficticios.",
                    ],
                    [
                      "¿Por qué hay dos rutas a Chapultepec?",
                      "Las entradas 05 y 07 aparecen duplicadas en la lista original. Las conservamos como registros separados; sus tiempos no representan servicios oficiales distintos.",
                    ],
                    [
                      "¿Cómo reinicio mi experiencia?",
                      "En Mi perfil puedes cerrar la sesión demo para regresar al registro. También puedes borrar tus datos del demo: esto elimina el perfil, las rutas guardadas y el historial de este navegador.",
                    ],
                  ].map(([q, a]) => (
                    <details key={q}>
                      <summary>
                        {q}
                        <Icon name="plus" size={18} />
                      </summary>
                      <p>{a}</p>
                    </details>
                  ))}
                </section>
              </div>
            </>
          )}
          {view === "profile" && (
            <>
              <PageHeading
                title="Tu espacio, a tu manera."
                text="Preferencias y datos de tu cuenta de demostración."
                headingRef={headingRef}
              />
              <section className="profile-panel panel">
                <div className="profile-identity">
                  <span className="avatar large">
                    {profile.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2>{profile.name}</h2>
                    <p>{profile.email || "Acceso como invitado"}</p>
                    <span className="small-badge">PERFIL LOCAL · DEMO</span>
                  </div>
                </div>
                <div className="preference-row">
                  <div>
                    <h3>Avisos dentro de la app</h3>
                    <p>Recibe avisos de incidencias, cambios de ruta, abordaje y llegada dentro del demo.</p>
                  </div>
                  <button
                    className={`toggle ${alerts ? "on" : ""}`}
                    role="switch"
                    aria-checked={alerts}
                    aria-label="Avisos dentro de la app"
                    onClick={() => setAlerts(!alerts)}
                  >
                    <span />
                  </button>
                </div>
                <div className="profile-privacy">
                  <Icon name="shield" />
                  <p>
                    Estos datos viven en este navegador y son compartidos entre
                    las sesiones demo de este dispositivo. No se envían al
                    backend. La contraseña nunca se guarda.
                  </p>
                </div>
                <div className="profile-actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setTrip(null);
                      setProfile(null);
                      persist("profile", null);
                      setView("trip");
                    }}
                  >
                    <Icon name="logout" size={17} />
                    Cerrar sesión demo
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTrip(null);
                      setProfile(null);
                      setFavoriteIds([]);
                      setHistory([]);
                      persist("profile", null);
                      persist("favorites", []);
                      persist("history", []);
                      setView("trip");
                    }}
                  >
                    Borrar mis datos del demo
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("help")}
                  >
                    <Icon name="help" size={16} />
                    Centro de ayuda
                  </button>
                </div>
              </section>
            </>
          )}
          <footer className="app-footer">
            <span>
              <span className="status-dot" />
              Hecho para moverte con tranquilidad.
            </span>
            <span>Prototipo local · Tiempos y ubicaciones simulados</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {NAV.map(([key, icon, label]) => (
          <button
            key={key}
            aria-current={view === key ? "page" : undefined}
            className={view === key ? "active" : ""}
            onClick={() => navigate(key)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
        <button
          onClick={() => navigate("profile")}
          className={view === "profile" ? "active" : ""}
        >
          <Icon name="user" />
          <span>Mi perfil</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Cerrar mensaje"
            onClick={() => setToast("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {busy && (
        <div className="modal-backdrop">
          <div className="loading-panel">
            <Loader
              title="Preparando tu recorrido"
              subtitle="Conectando los puntos de tu próximo viaje."
            />
          </div>
        </div>
      )}
      {cancelOpen && (
        <div className="modal-backdrop">
          <section
            className="confirm-panel panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            ref={dialogRef}
          >
            <Icon name="route" size={30} />
            <h2 id="cancel-title">¿Dejar este seguimiento?</h2>
            <p>
              Podrás iniciar otro cuando quieras. Este recorrido no se guardará
              como completado.
            </p>
            <div>
              <button
                className="primary-button"
                onClick={() => setCancelOpen(false)}
              >
                Continuar mi viaje
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setTrip(null);
                  setCancelOpen(false);
                  setToast("Seguimiento cancelado. Puedes elegir otra ruta.");
                }}
              >
                Sí, cancelar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function PageHeading({ title, text, headingRef }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">MovilTec / TU MOVILIDAD COTIDIANA</span>
        <h1 tabIndex={-1} ref={headingRef}>
          {title}
        </h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Empty({ icon, title, text, action, onAction }) {
  return (
    <div className="empty-state panel">
      <span>
        <Icon name={icon} size={32} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="primary-button" onClick={onAction}>
          {action}
          <Icon name="arrow" size={17} />
        </button>
      )}
    </div>
  );
}
function RouteCard({ route, saved, onFavorite, onSelect }) {
  return (
    <article className="catalog-card panel">
      <div className="catalog-card-top">
        <span className="route-number">{route.id}</span>
        <span className="small-label">RUTA DEL CATÁLOGO</span>
        <button
          className={`icon-button favorite-button ${saved ? "is-favorite" : ""}`}
          aria-label={`${saved ? "Quitar" : "Guardar"} ruta ${route.id}`}
          aria-pressed={saved}
          onClick={() => onFavorite(route.id)}
        >
          <Icon name="heart" size={18} />
        </button>
      </div>
      <div className="catalog-endpoints">
        <p>{route.origin}</p>
        <Icon name="arrow" size={20} />
        <h3>{route.destination}</h3>
      </div>
      <div className="catalog-card-bottom">
        <span>
          <Icon name="clock" size={14} />
          {route.minutes} min <small>estimados</small>
        </span>
        <button className="text-button" onClick={() => onSelect(route)}>
          Elegir ruta
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </article>
  );
}
