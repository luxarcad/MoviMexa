import Icon from "./Icon";

export default function AgentPanel({
  goal, onGoalChange, ranking, activeId, advice, etaClock, pendingPlanId, onIncident,
  onReset, autoAgent, onAutoAgentChange, messages, tracking, canReset,
}) {
  const chosen = ranking[0];
  return (
    <section className="agent-panel panel" aria-label="Agente simulado de movilidad">
      <div className="agent-heading">
        <div>
          <span className="small-label">AGENTE / PLANIFICACIÓN INTELIGENTE</span>
          <h2><Icon name="compass" size={20} /> Agente de movilidad</h2>
          <p>Evalúa alternativas, detecta retrasos y recomienda cómo llegar a tiempo.</p>
        </div>
        <span className="agent-demo"><i className="status-dot" /> AGENTE DEMO</span>
      </div>
      <div className="agent-timebar">
        <label htmlFor="arrival-goal">Quiero llegar a las</label>
        <input id="arrival-goal" type="time" value={goal} onChange={(e) => onGoalChange(e.target.value)} />
        <div className="agent-forecast">
          <span>Ruta recomendada</span>
          <strong>{chosen?.label}</strong>
          <small>{Number.isFinite(chosen?.totalMinutes) ? `${chosen.totalMinutes} min totales (incluye caminar y esperar)` : "Sin paso disponible"}</small>
        </div>
      </div>
      <div className={`agent-departure ${advice?.onTime ? "" : "agent-departure-urgent"}`} role="status">
        <Icon name={advice?.onTime ? "clock" : "alert"} size={22} />
        <div>
          <small>{tracking ? "HORA ESTIMADA DE LLEGADA · CDMX" : "HORA IDEAL DE SALIDA · CDMX"}</small>
          <strong>{tracking ? etaClock || "Calculando" : advice ? advice.time : "Sin alternativa"}</strong>
          <p>{!advice ? "No existe una ruta disponible en este escenario." : tracking ? advice.leaveIn >= 0 ? `Llegada prevista a las ${etaClock}. Margen de ${advice.leaveIn} min frente al objetivo de las ${goal} (incluye 5 min de seguridad).` : `Con el retraso actual, se estima una llegada ${Math.ceil(-advice.leaveIn)} min fuera del margen de seguridad para las ${goal}.` : advice.leaveIn > 0 ? `Sal dentro de ${Math.ceil(advice.leaveIn)} min para llegar a las ${goal}, con ${advice.buffer} min de margen.` : advice.leaveIn === 0 ? "Debes salir ahora para llegar a tiempo." : `Con estas condiciones llegarías tarde si sales ahora. Necesitas ${Math.ceil(-advice.leaveIn)} min adicionales.`}</p>
        </div>
      </div>
      <div className="agent-routes" aria-label="Comparación de alternativas simuladas">
        {ranking.map((plan) => (
          <div key={plan.id} className={`agent-route ${plan.id === activeId ? "agent-route-active" : ""} ${plan.blocked ? "agent-route-blocked" : ""}`}>
            <div><strong>{plan.label}</strong><small>{plan.details}</small></div>
            <span>{plan.blocked ? "Cerrada" : `${plan.totalMinutes} min`}</span>
            {plan.id === activeId && <b>ACTIVA</b>}
            {plan.id === pendingPlanId && plan.id !== activeId && <b>PRÓXIMA</b>}
          </div>
        ))}
      </div>
      <div className="agent-controls">
        <div className="agent-control-heading">
          <strong><Icon name="alert" size={16} /> Simular incidencia</strong>
          <label className="agent-auto-label"><input type="checkbox" checked={autoAgent} onChange={(e) => onAutoAgentChange(e.target.checked)} /> Incidencia automática {tracking ? "(a los 4 min)" : "al iniciar"}</label>
        </div>
        <div className="agent-buttons">
          <button type="button" onClick={() => onIncident("delay")}><Icon name="clock" size={15} /> Unidad +18 min</button>
          <button type="button" onClick={() => onIncident("traffic")}><Icon name="alert" size={15} /> Tráfico intenso</button>
          <button type="button" onClick={() => onIncident("closure")}><Icon name="close" size={15} /> Cierre vial</button>
          <button type="button" className="agent-reset" onClick={onReset} disabled={!canReset}>Reiniciar</button>
        </div>
      </div>
      <div className="agent-feed" aria-live="polite" aria-relevant="additions text">
        <strong><Icon name="bell" size={15} /> Alertas del agente</strong>
        {messages.length ? messages.slice(0, 3).map((message) => (
          <p key={message.id} className={message.type === "incident" ? "agent-feed-warning" : ""}>
            <small>{message.time} · SIMULADO</small> {message.text}
          </p>
        )) : <p>Sin incidencias. El agente supervisará esta ruta durante la simulación.</p>}
      </div>
      <p className="agent-disclaimer">Todas las alternativas, incidencias, esperas y recomendaciones son ficticias. No representan trayectos oficiales ni avisos reales de RTP.</p>
    </section>
  );
}
