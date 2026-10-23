import assert from "node:assert/strict";
import { ROUTES } from "../src/data/routes.js";
import {
  formatDuration,
  getFleetState,
  getTripState,
} from "../src/lib/simulation.js";

const route = ROUTES[0];
const wait = route.wait * 60;
const ride = route.minutes * 60;
const state = (elapsed, options = {}) =>
  getTripState({ route, stopIndex: 0, elapsed, ...options });

assert.equal(ROUTES.length, 8);
assert.deepEqual(
  ROUTES.map((item) => item.id),
  ["01", "02", "03", "04", "05", "06", "07", "08"],
);
assert.equal(ROUTES[4].origin, ROUTES[6].origin);
assert.equal(ROUTES[4].destination, ROUTES[6].destination);

assert.equal(state(0).phase, "waiting");
assert.equal(state(0).remainingSeconds, wait + 30 + ride);
assert.equal(state(wait - 1).arrivalSeconds, 1);
assert.equal(state(wait).phase, "boarding");
assert.equal(state(wait).arrivalSeconds, 0);
assert.equal(state(wait + 29.99).phase, "boarding");
assert.equal(state(wait + 30).phase, "riding");
assert.equal(state(wait + 30 + ride / 2).progress, 0.5);
assert.equal(state(wait + 30 + ride).phase, "arrived");
assert.equal(state(wait + 30 + ride + 600).remainingSeconds, 0);
assert.equal(state(wait + 30 + ride + 600).progress, 1);
assert.equal(state(wait + 30 + ride).nextStopIndex, route.stops.length - 1);

// A delay shifts boarding and arrival together, preserving the in-vehicle duration.
assert.equal(state(wait, { delay: 120 }).phase, "waiting");
assert.equal(state(wait, { delay: 120 }).arrivalSeconds, 120);
assert.equal(state(wait + 120, { delay: 120 }).phase, "boarding");
assert.equal(state(wait + 120 + 30 + ride, { delay: 120 }).phase, "arrived");
assert.equal(state(0, { delay: 120 }).waitSeconds, wait);
assert.equal(state(0, { delay: 120 }).rideSeconds, ride);

// Adding a delay preserves covered distance and holds the unit before boarding.
const beforeDelay = state(wait / 2, { stopIndex: 2 });
const withDelay = state(wait / 2, { stopIndex: 2, delay: 180 });
assert.equal(withDelay.progress, beforeDelay.progress);
assert.equal(withDelay.arrivalSeconds - beforeDelay.arrivalSeconds, 180);
assert.equal(withDelay.remainingSeconds - beforeDelay.remainingSeconds, 180);
const heldUnit = state(wait + 120, { stopIndex: 2, delay: 180 });
assert.ok(heldUnit.progress >= withDelay.progress);
assert.ok(heldUnit.progress < route.stops[2].progress);
assert.equal(
  heldUnit.progress,
  state(wait + 179, { stopIndex: 2, delay: 180 }).progress,
);
assert.equal(
  state(wait + 180, { stopIndex: 2, delay: 180 }).progress,
  route.stops[2].progress,
);
assert.equal(state(wait + 120, { delay: 180 }).progress, 0);

// All three vehicles use their own schedule, keeping card ETAs and map positions aligned.
const fleet = getFleetState({ route, stopIndex: 2, elapsed: 120, delay: 180 });
assert.deepEqual(
  fleet.map((unit) => unit.id),
  ["MX-011", "MX-012", "MX-013"],
);
assert.equal(fleet[0].state.arrivalSeconds, wait + 180 - 120);
assert.equal(
  fleet[1].state.arrivalSeconds - fleet[0].state.arrivalSeconds,
  route.frequency * 60,
);
assert.equal(
  fleet[2].state.arrivalSeconds - fleet[1].state.arrivalSeconds,
  route.frequency * 60,
);
const laterFleet = getFleetState({
  route,
  stopIndex: 0,
  elapsed: wait + 30 + route.frequency * 60,
});
assert.equal(laterFleet[0].state.phase, "riding");
assert.equal(laterFleet[1].state.phase, "riding");
assert.equal(laterFleet[1].state.progress, 0);
assert.equal(laterFleet[2].state.phase, "waiting");
assert.ok(laterFleet[0].state.progress > laterFleet[1].state.progress);

// Boarding midway must keep position, remaining trip, and next-stop labels consistent.
for (const item of ROUTES) {
  for (let index = 0; index < item.stops.length - 1; index += 1) {
    const at = (elapsed) =>
      getTripState({ route: item, stopIndex: index, elapsed });
    const start = item.stops[index].progress;
    const expectedRide = item.minutes * 60 * (1 - start);
    const boarding = item.wait * 60;
    assert.equal(at(0).nextStopIndex, index);
    assert.ok(at(0).progress <= start);
    assert.equal(at(boarding).progress, start);
    assert.equal(at(boarding).rideSeconds, expectedRide);
    assert.equal(at(boarding + 30).nextStopIndex, index + 1);
    assert.ok(
      Math.abs(
        at(boarding + 30 + expectedRide / 2).progress -
          (start + (1 - start) / 2),
      ) < 1e-9,
    );
    assert.equal(at(boarding + 30 + expectedRide).phase, "arrived");
    assert.equal(at(boarding + 30 + expectedRide).remainingSeconds, 0);
  }
}

assert.equal(
  state(0, { stopIndex: 5 }).rideSeconds,
  ride * (1 - route.stops[4].progress),
);
assert.equal(state(-100).arrivalSeconds, wait);
assert.equal(state(0, { delay: -120 }).arrivalSeconds, wait);
assert.equal(formatDuration(240), "4 min");
assert.equal(formatDuration(241), "5 min");
assert.equal(formatDuration(1), "1 min");
assert.equal(formatDuration(0), "Llegando");
assert.equal(formatDuration(-50), "Llegando");
assert.equal(formatDuration(Number.NaN), "Llegando");

console.log(
  "Simulación verificada: ocho rutas, fases, demoras y todas las paradas de abordaje.",
);
