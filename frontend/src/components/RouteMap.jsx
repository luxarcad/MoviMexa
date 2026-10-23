import { useId, useState } from "react";
import Icon from "./Icon";

const POINTS = [
  [110, 345],
  [225, 345],
  [315, 255],
  [440, 255],
  [535, 160],
  [660, 160],
];
function pointAt(progress) {
  const part = Math.min(4.9999, Math.max(0, progress) * 5);
  const i = Math.floor(part),
    t = part - i;
  return [
    POINTS[i][0] + (POINTS[i + 1][0] - POINTS[i][0]) * t,
    POINTS[i][1] + (POINTS[i + 1][1] - POINTS[i][1]) * t,
  ];
}

export default function RouteMap({
  route,
  stopIndex,
  onStopChange,
  progress,
  fleet,
  tracking,
  phase,
  interactive = true,
}) {
  const id = useId().replaceAll(":", "");
  const [zoom, setZoom] = useState(1);
  const position = pointAt(progress ?? 0.07);
  return (
    <section className="map-panel" aria-label="Mapa esquemático de la ruta">
      <div className="map-top">
        <span className="map-tag">
          <span className="status-dot" />{" "}
          {tracking ? "Seguimiento simulado" : "Vista de la ruta"}
        </span>
        <span className="map-city">CIUDAD DE MÉXICO</span>
      </div>
      <svg
        className="city-map"
        viewBox="0 0 780 490"
        role="img"
        aria-label={`Esquema ilustrativo: ${route.origin} a ${route.destination}. Parada elegida: ${route.stops[stopIndex].name}.`}
      >
        <defs>
          <pattern
            id={`${id}blocks`}
            width="98"
            height="83"
            patternTransform="rotate(-11)"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="9"
              y="9"
              width="77"
              height="62"
              rx="11"
              fill="#242420"
              stroke="#30302a"
            />
            <path d="M48 10v60M10 40h76" stroke="#292a24" strokeWidth="2" />
          </pattern>
          <filter id={`${id}glow`}>
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width="780" height="490" fill={`url(#${id}blocks)`} />
        <g
          transform={`translate(${390 * (1 - zoom)} ${245 * (1 - zoom)}) scale(${zoom})`}
        >
          <path
            d="M-50 200 210 130 440 170 830 85M80 -40 200 165 245 490M430 -40 490 130 610 520M-20 440 240 410 460 350 850 310"
            stroke="#3b3b33"
            strokeWidth="15"
            fill="none"
          />
          <path
            d="m-50 200 260-70 230 40 390-85M80-40 120 205 45 325M430-40 60 170 120 390M-20 440 260-30 220-60 390-40"
            stroke="#21221d"
            strokeWidth="10"
            fill="none"
          />
          <path
            d="m570 20 88 5 48 54-66 30-70-20ZM55 230l80-20 29 52-88 22ZM373 366l67-7 35 75-88 15Z"
            fill="#30382e"
            stroke="#3c4437"
          />
          <text x="570" y="65" className="map-area">
            ÁREA VERDE
          </text>
          <text x="365" y="105" className="map-area">
            ZONA NORTE
          </text>
          <text x="360" y="443" className="map-area">
            ZONA CENTRO
          </text>
          <path
            d="M110 345H225L315 255H440L535 160H660"
            stroke="#d6d5d1"
            strokeWidth="15"
            opacity=".15"
            fill="none"
            filter={`url(#${id}glow)`}
          />
          <path
            d="M110 345H225L315 255H440L535 160H660"
            stroke="#bab9ad"
            strokeWidth="5"
            strokeLinejoin="round"
            fill="none"
          />
          {POINTS.map(([x, y], i) => (
            <g
              key={i}
              role={interactive && !tracking && i < 5 ? "button" : undefined}
              tabIndex={interactive && !tracking && i < 5 ? 0 : undefined}
              aria-label={`Elegir ${route.stops[i].name}`}
              onClick={() => interactive && !tracking && i < 5 && onStopChange(i)}
              onKeyDown={(event) => {
                if (interactive && !tracking && i < 5 && ["Enter", " "].includes(event.key)) {
                  event.preventDefault();
                  onStopChange(i);
                }
              }}
            >
              <title>{route.stops[i].name}</title>
              <circle cx={x} cy={y} r="17" fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={i === stopIndex ? 12 : 6}
                fill={i === stopIndex ? "#e5e4e2" : "#292724"}
                stroke="#e5e4e2"
                strokeWidth="3"
              />
              {i === stopIndex && (
                <circle
                  cx={x}
                  cy={y}
                  r="23"
                  fill="none"
                  stroke="#e5e4e2"
                  opacity=".25"
                />
              )}
            </g>
          ))}
          <text x="110" y="389" className="map-endpoint">
            ORIGEN
          </text>
          <text x="660" y="128" className="map-endpoint" textAnchor="end">
            DESTINO
          </text>
          <g
            transform={`translate(${position[0]} ${position[1]})`}
            className="map-unit"
          >
            <circle r="29" fill="#d6d5d1" opacity=".11" />
            <rect
              x="-18"
              y="-18"
              width="36"
              height="36"
              rx="12"
              fill="#e5e4e2"
              stroke="#1c1b17"
              strokeWidth="3"
            />
            <path
              d="M-7 7h14V-6a2 2 0 0 0-2-2H-5a2 2 0 0 0-2 2V7Zm0-7H7M-4 4h.1M4 4h.1M-5 7v3M5 7v3"
              stroke="#292724"
              strokeWidth="1.8"
              fill="none"
            />
          </g>
          {fleet?.slice(1).map((unit, i) => {
            const [x, y] = pointAt(unit.state.progress);
            return (
              <g key={unit.id}>
                <title>
                  {unit.id}: {Math.ceil(unit.state.arrivalSeconds / 60)} min
                  hasta tu parada
                </title>
                <circle
                  cx={x}
                  cy={y}
                  r="7"
                  fill="#8d9381"
                  stroke="#24241f"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={y - 30 - i * 18}
                  textAnchor="middle"
                  fill="#d6d5d1"
                  fontSize="10"
                >
                  {unit.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-key">
        <span>
          <i className="key-line" />
          Recorrido
        </span>
        <span>
          <i className="key-dot" />
          Parada
        </span>
      </div>
      {interactive && <div className="map-controls">
        <button
          className="icon-button"
          aria-label="Acercar mapa"
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
          disabled={zoom >= 1.5}
        >
          <Icon name="plus" size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Alejar mapa"
          onClick={() => setZoom((z) => Math.max(1, z - 0.15))}
          disabled={zoom <= 1}
        >
          <Icon name="minus" size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Centrar mapa"
          onClick={() => setZoom(1)}
        >
          <Icon name="target" size={17} />
        </button>
      </div>}
      <div className="map-bottom">
        <Icon name="pin" size={16} />
        <span>
          {tracking
            ? phase === "arrived"
              ? "Llegaste a tu destino"
              : route.stops[stopIndex].name
            : "Elige tu parada en el panel del viaje"}
        </span>
        <span className="map-disclaimer">Mapa ilustrativo · Sin GPS</span>
      </div>
    </section>
  );
}
