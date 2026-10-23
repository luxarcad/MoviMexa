const BOARDING_SECONDS = 30;
const nonNegative = (value) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** A deterministic demo clock: all durations are seconds, route minutes are minutes. */
export function getTripState({ route, stopIndex = 0, elapsed = 0, delay = 0 }) {
  // The destination cannot be a boarding stop. Invalid selections fall back safely.
  const selectedIndex = clamp(
    Number.isFinite(stopIndex) ? Math.floor(stopIndex) : 0,
    0,
    route.stops.length - 2,
  );
  const stop = route.stops[selectedIndex];
  const clock = nonNegative(elapsed);
  const waitSeconds = nonNegative(route.wait) * 60;
  const boardingAt = waitSeconds + nonNegative(delay);
  const departureAt = boardingAt + BOARDING_SECONDS;
  const rideSeconds = nonNegative(route.minutes) * 60 * (1 - stop.progress);
  const destinationAt = departureAt + rideSeconds;

  let phase;
  let progress;
  if (clock < boardingAt) {
    phase = "waiting";
    const approachStart = Math.max(0, stop.progress - 0.18);
    // Added waiting time holds the unit just before the stop; it never rewinds
    // distance already covered. At an origin stop the schematic position stays 0.
    const approachEnd = Math.max(0, stop.progress - 0.006);
    const approachFraction =
      waitSeconds > 0 ? clamp(clock / waitSeconds, 0, 1) : 1;
    progress = approachStart + (approachEnd - approachStart) * approachFraction;
  } else if (clock < departureAt) {
    phase = "boarding";
    progress = stop.progress;
  } else if (clock < destinationAt) {
    phase = "riding";
    progress =
      stop.progress +
      (1 - stop.progress) * ((clock - departureAt) / rideSeconds);
  } else {
    phase = "arrived";
    progress = 1;
  }

  const nextStop = route.stops.findIndex(
    (candidate) => candidate.progress > progress + 1e-9,
  );
  const nextStopIndex =
    phase === "waiting" || phase === "boarding"
      ? selectedIndex
      : nextStop === -1
        ? route.stops.length - 1
        : nextStop;

  return {
    phase,
    arrivalSeconds: Math.max(0, boardingAt - clock),
    remainingSeconds: Math.max(0, destinationAt - clock),
    progress: clamp(progress, 0, 1),
    rideSeconds,
    waitSeconds,
    nextStopIndex,
  };
}

/** The same clock drives every marker and arrival card, with staggered schedules. */
export function getFleetState({
  route,
  stopIndex = 0,
  elapsed = 0,
  delay = 0,
}) {
  return [0, 1, 2].map((index) => ({
    id: `MX-${route.id}${index + 1}`,
    state: getTripState({
      route: { ...route, wait: route.wait + index * route.frequency },
      stopIndex,
      elapsed,
      delay,
    }),
  }));
}

export function formatDuration(seconds) {
  const remaining = nonNegative(seconds);
  return remaining === 0 ? "Llegando" : `${Math.ceil(remaining / 60)} min`;
}
