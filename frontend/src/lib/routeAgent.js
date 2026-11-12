/** Motor determinista del agente de MoviMexa. Todos los datos son simulados. */
export const INCIDENT_TYPES = {
  delay: {
    title: "Unidad con retraso",
    description: "El autobús reporta una demora de 18 minutos.",
    waitPenalty: 18,
    ridePenalty: 0,
    blocked: false,
  },
  traffic: {
    title: "Tráfico intenso",
    description: "Congestión en el corredor: +24 minutos estimados.",
    waitPenalty: 0,
    ridePenalty: 24,
    blocked: false,
  },
  closure: {
    title: "Cierre vial",
    description: "El corredor queda temporalmente inhabilitado.",
    waitPenalty: 0,
    ridePenalty: 0,
    blocked: true,
  },
};

const safe = (n) => (Number.isFinite(n) ? Math.max(0, n) : 0);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Conserva origen y destino; los trayectos alternos NO son líneas RTP reales. */
export function makeCandidates(route, stopIndex = 0) {
  const selected = clamp(Math.trunc(stopIndex), 0, route.stops.length - 2);
  const variant = (code, extraRide, extraWait, label) => ({
    ...route,
    id: `${route.id}-${code}`,
    minutes: route.minutes + extraRide,
    wait: route.wait + extraWait,
    frequency: route.frequency + extraWait,
    stops: route.stops.map((stop, i) =>
      i === 0 || i === route.stops.length - 1 || i === selected
        ? { ...stop, id: `${route.id}-${code}-${i}` }
        : { ...stop, id: `${route.id}-${code}-${i}`, name: `${label} · punto ${i}` },
    ),
  });
  return [
    { id: "direct", label: `Ruta ${route.id} · Original`, details: "Servicio directo del catálogo demo", walkMinutes: 2, route },
    { id: "detour", label: "Alternativa A · Desvío", details: "Recorrido por corredor secundario ficticio", walkMinutes: 3, route: variant("A", 5, 2, "Desvío simulado") },
    { id: "transfer", label: "Alternativa B · Conexión", details: "Transbordo ficticio con espera adicional", walkMinutes: 4, route: variant("B", 10, 4, "Conexión simulada") },
  ];
}

/**
 * ETA = caminata + espera + viaje restante + penalizaciones incidentales.
 * Un cierre elimina la opción. Empates favorecen la ruta original.
 */
export function rankCandidates(candidates, incidents = [], stopIndex = 0) {
  const result = candidates.map((candidate, order) => {
    const progress = candidate.route.stops[clamp(stopIndex, 0, candidate.route.stops.length - 2)].progress;
    const applicable = incidents.filter((event) => event.planId === candidate.id);
    const blocked = applicable.some((event) => INCIDENT_TYPES[event.type]?.blocked);
    const additionalWait = applicable.reduce((sum, event) => sum + (INCIDENT_TYPES[event.type]?.waitPenalty || 0), 0);
    const additionalRide = applicable.reduce((sum, event) => sum + (INCIDENT_TYPES[event.type]?.ridePenalty || 0), 0);
    const waitMinutes = candidate.route.wait + additionalWait;
    const rideMinutes = candidate.route.minutes * (1 - progress) + additionalRide;
    return {
      ...candidate,
      waitMinutes,
      rideMinutes,
      extraRide: additionalRide,
      totalMinutes: blocked ? Infinity : Math.ceil(candidate.walkMinutes + waitMinutes + rideMinutes + 0.5),
      blocked,
      order,
    };
  });
  return result.sort((a, b) => a.totalMinutes - b.totalMinutes || a.order - b.order);
}

export function getBestCandidate(candidates, incidents = [], stopIndex = 0) {
  return rankCandidates(candidates, incidents, stopIndex)[0];
}

// Se calculan en hora de CDMX para no depender de la zona del navegador.
export function mexicoClock(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const hour = Number(parts.find((x) => x.type === "hour")?.value || 0);
  const minute = Number(parts.find((x) => x.type === "minute")?.value || 0);
  return { hour, minute, total: hour * 60 + minute };
}

export function mexicanTime(timestamp = Date.now()) {
  const { hour, minute } = mexicoClock(timestamp);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Resultado en minutos desde "ahora". Si la hora pasó, se considera mañana. */
export function departureAdvice(goal, totalMinutes, timestamp = Date.now(), safetyBuffer = 5) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(goal) || !Number.isFinite(totalMinutes)) return null;
  const [hours, minutes] = goal.split(":").map(Number);
  const target = hours * 60 + minutes;
  const current = mexicoClock(timestamp).total;
  const available = (target - current + 1440) % 1440;
  const leaveIn = available - totalMinutes - safetyBuffer;
  const plannedLeave = (target - totalMinutes - safetyBuffer + 2880) % 1440;
  const hhmm = `${String(Math.floor(plannedLeave / 60)).padStart(2, "0")}:${String(plannedLeave % 60).padStart(2, "0")}`;
  return { available, leaveIn, time: hhmm, buffer: safetyBuffer, onTime: leaveIn >= 0 };
}
