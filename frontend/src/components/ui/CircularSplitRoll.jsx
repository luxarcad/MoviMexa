import { useState } from 'react'
import './circular-split-roll.css'

function RouteTile({ number, variant }) {
  return (
    <div className={`mm-roll__tile mm-roll__tile--${variant % 3}`}>
      <span className="mm-roll__tile-label">MOVIMEXA</span>
      <svg viewBox="0 0 160 108" fill="none" className="mm-roll__drawing">
        <path className="mm-roll__street" d="M-8 26H50L83 59H174M25-5V119M117-5V42L81 78V119M-8 92H170" />
        <path className="mm-roll__line" d="M26 80V40C26 34 32 28 38 28H79C86 28 91 34 91 41V67C91 74 96 80 103 80H133" />
        <circle cx="26" cy="80" r="5" className="mm-roll__station" />
        <circle cx="91" cy="55" r="4" className="mm-roll__station" />
        <circle cx="133" cy="80" r="6" className="mm-roll__station" />
        <rect x="65" y="17" width="24" height="21" rx="6" className="mm-roll__bus" />
        <path d="M71 22H83V29H71Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M72 34H73M81 34H82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="mm-roll__tile-footer">RUTA <strong>{String(number).padStart(2, '0')}</strong><span>↗</span></span>
    </div>
  )
}

/** A compact, button-controlled adaptation of the supplied split circular gallery. */
export default function CircularSplitRoll({ items = [], onSelect, className = '' }) {
  const [position, setPosition] = useState(0)
  const total = items.length
  const activeIndex = total ? ((position % total) + total) % total : 0
  const active = items[activeIndex]

  if (!active) {
    return <p className="mm-roll__empty">Aún no hay rutas para explorar.</p>
  }

  return (
    <section className={`mm-roll ${className}`} aria-label="Explorador de rutas" aria-roledescription="carrusel">
      <div className="mm-roll__content">
        <span className="mm-roll__eyebrow">CONECTA CON TU CIUDAD</span>
        <div className="mm-roll__route" aria-live="polite" aria-atomic="true">
          <span className="mm-roll__route-number">Ruta {active.id}</span>
          <h3>{active.origin}<span className="mm-roll__arrow" aria-hidden="true">↘</span><span>{active.destination}</span></h3>
          <p>{active.minutes} min de recorrido <span aria-hidden="true">·</span> llegada en {active.wait} min</p>
        </div>
        <div className="mm-roll__actions">
          <button type="button" className="mm-roll__select" onClick={() => onSelect?.(active)}>
            Ver esta ruta <span aria-hidden="true">↗</span>
          </button>
          <div className="mm-roll__navigation">
            <button type="button" onClick={() => setPosition((value) => value - 1)} aria-label="Ruta anterior" disabled={total < 2}>←</button>
            <span className="mm-roll__count" aria-label={`Ruta ${activeIndex + 1} de ${total}`}>{String(activeIndex + 1).padStart(2, '0')}<span> / {String(total).padStart(2, '0')}</span></span>
            <button type="button" onClick={() => setPosition((value) => value + 1)} aria-label="Ruta siguiente" disabled={total < 2}>→</button>
          </div>
        </div>
      </div>
      <div className="mm-roll__orbit" aria-hidden="true">
        <div className="mm-roll__ellipse" />
        <span className="mm-roll__orbit-label">TU PRÓXIMA CONEXIÓN</span>
        {items.map((route, index) => {
          const angle = ((index - activeIndex) / total) * Math.PI * 2
          const depth = (Math.cos(angle) + 1) / 2
          return (
            <div
              key={route.id}
              className="mm-roll__orbiter"
              style={{
                transform: `translate(${Math.sin(angle) * 122}px, ${(Math.cos(angle) - 0.3) * 56}px) scale(${0.55 + depth * 0.45}) rotate(${Math.sin(angle) * -14}deg)`,
                opacity: index === activeIndex ? 1 : 0.12 + depth * 0.25,
                zIndex: Math.round(depth * 10),
              }}
            >
              <RouteTile number={route.id} variant={index} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
