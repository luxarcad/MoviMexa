import { useEffect, useId, useRef, useState } from 'react'
import './auth.css'

// Adapted from the supplied SignIn1 reference for the MoviMexa demo.
export default function AuthPanel({ onComplete, onClose, initialMode = 'register', modal = false }) {
  const [mode, setMode] = useState(initialMode === 'login' ? 'login' : 'register')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', accepted: false })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const panelRef = useRef(null)
  const prefix = useId()
  const registering = mode === 'register'

  useEffect(() => {
    const previousFocus = document.activeElement
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector('input:not([type="checkbox"])')?.focus()
    })
    return () => {
      window.cancelAnimationFrame(frame)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  function changeField(event) {
    const { name, type, value, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setErrors({})
    setForm((current) => ({ ...current, password: '', confirm: '', accepted: false }))
    setShowPassword(false)
    window.requestAnimationFrame(() => panelRef.current?.querySelector(`[name="${nextMode === 'register' ? 'name' : 'email'}"]`)?.focus())
  }

  function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (registering && form.name.trim().length < 2) nextErrors.name = 'Escribe al menos 2 caracteres para tu nombre.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Usa un correo válido, por ejemplo alex@correo.com.'
    if (form.password.length < 8 || !/\p{L}/u.test(form.password) || !/\d/.test(form.password)) {
      nextErrors.password = 'Usa al menos 8 caracteres, con una letra y un número.'
    }
    if (registering && form.confirm !== form.password) nextErrors.confirm = 'Las contraseñas no coinciden. Revisa ambas.'
    if (registering && !form.accepted) nextErrors.accepted = 'Confirma que entiendes cómo funciona esta demo.'
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0]
    if (firstError) {
      panelRef.current?.querySelector(`[name="${firstError}"]`)?.focus()
      return
    }
    const profile = {
      name: registering ? form.name.trim() : form.email.trim().split('@')[0],
      email: form.email.trim(),
    }
    setForm((current) => ({ ...current, password: '', confirm: '' }))
    onComplete(profile)
  }

  function handleKeyDown(event) {
    if (!modal) return
    if (event.key === 'Escape' && onClose) {
      event.stopPropagation()
      onClose()
    }
    if (event.key !== 'Tab') return
    const focusable = panelRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function fieldProps(name) {
    return {
      id: `${prefix}-${name}`,
      name,
      value: form[name],
      onChange: changeField,
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': errors[name] ? `${prefix}-${name}-error` : name === 'password' ? `${prefix}-password-help` : undefined,
    }
  }

  function fieldError(name) {
    return errors[name] ? <span className="auth-error" id={`${prefix}-${name}-error`} role="alert">{errors[name]}</span> : null
  }

  return (
    <section className="auth-panel" role={modal ? 'dialog' : undefined} aria-modal={modal ? true : undefined} aria-labelledby={`${prefix}-title`} ref={panelRef} onKeyDown={handleKeyDown}>
      {onClose && <button type="button" className="auth-close" onClick={onClose} aria-label="Cerrar acceso"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
      <aside className="auth-story" aria-label="Tu primer viaje en MoviMexa">
        <div className="auth-brand"><span className="auth-brand-mark" aria-hidden="true">m<span>·</span></span><span>MoviMexa</span></div>
        <div className="auth-story-content">
          <span className="auth-eyebrow">MENOS DUDAS. MÁS CAMINO.</span>
          <h2>Tu ciudad.<br />A tu ritmo.</h2>
          <p>Del primer paso a tu próxima parada. Organiza tu viaje en un solo lugar.</p>
          <div className="auth-journey" aria-hidden="true">
            <span className="auth-journey-stop" />
            <span className="auth-journey-line" />
            <span className="auth-journey-bus"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="16" rx="4" /><path d="M5 12h14M9 3v9M7 19v2m10-2v2" /><path d="M8 16h1m6 0h1" strokeLinecap="round" /></svg></span>
            <span className="auth-journey-line" />
            <span className="auth-journey-stop auth-journey-destination" />
          </div>
          <ol className="auth-steps">
            <li><span>01</span><div><strong>Crea tu perfil</strong><small>Comienza a tu manera</small></div></li>
            <li><span>02</span><div><strong>Encuentra tu ruta</strong><small>Elige tu origen y destino</small></div></li>
            <li><span>03</span><div><strong>Sigue tu transporte</strong><small>Consulta tiempos simulados</small></div></li>
          </ol>
        </div>
        <span className="auth-demo-tag"><span /> PROTOTIPO INTERACTIVO</span>
      </aside>
      <div className="auth-form-side">
        <div className="auth-mode-switch" role="group" aria-label="Tipo de acceso">
          <button type="button" aria-pressed={registering} onClick={() => switchMode('register')}>Crear cuenta</button>
          <button type="button" aria-pressed={!registering} onClick={() => switchMode('login')}>Iniciar sesión</button>
        </div>
        <span className="auth-eyebrow">TU PRÓXIMO DESTINO EMPIEZA AQUÍ</span>
        <h2 id={`${prefix}-title`}>{registering ? 'Hagamos tu primer viaje.' : 'Qué bueno verte de nuevo.'}</h2>
        <p className="auth-intro">{registering ? 'Crea tu cuenta demo en un momento.' : 'Abre una sesión demo para explorar tus rutas.'}</p>
        <form onSubmit={submit} className="auth-form" noValidate>
          {registering && <div className="auth-field"><label htmlFor={`${prefix}-name`}>¿Cómo te llamas?</label><input {...fieldProps('name')} autoComplete="nickname" maxLength="60" placeholder="Tu nombre o un nombre ficticio" />{fieldError('name')}</div>}
          <div className="auth-field"><label htmlFor={`${prefix}-email`}>Correo electrónico</label><input {...fieldProps('email')} type="email" autoComplete="email" inputMode="email" maxLength="180" placeholder="alex@correo.com" />{fieldError('email')}</div>
          <div className="auth-field"><label htmlFor={`${prefix}-password`}>Contraseña de prueba</label><div className="auth-password"><input {...fieldProps('password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength="100" placeholder="Crea una contraseña ficticia" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg></button></div><span className="auth-field-help" id={`${prefix}-password-help`}>8 caracteres o más, una letra y un número.</span>{fieldError('password')}</div>
          {registering && <div className="auth-field"><label htmlFor={`${prefix}-confirm`}>Confirma tu contraseña</label><input {...fieldProps('confirm')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength="100" placeholder="Repítela una vez más" />{fieldError('confirm')}</div>}
          {registering ? <div className="auth-consent-wrap"><label className="auth-consent" htmlFor={`${prefix}-accepted`}><input id={`${prefix}-accepted`} name="accepted" type="checkbox" checked={form.accepted} onChange={changeField} aria-invalid={Boolean(errors.accepted)} aria-describedby={errors.accepted ? `${prefix}-accepted-error` : undefined} /><span>Entiendo que esta es una demostración y usaré datos ficticios.</span></label>{fieldError('accepted')}</div> : <p className="auth-session-note">Solo validamos el formato. Esta sesión de demostración no verifica una cuenta real.</p>}
          <button className="auth-submit" type="submit">{registering ? 'Crear cuenta y planear viaje' : 'Entrar a la demo'}<span aria-hidden="true">↗</span></button>
        </form>
        <div className="auth-divider"><span />o explora primero<span /></div>
        <button type="button" className="auth-guest" onClick={() => onComplete({ name: 'Viajero', email: '' })}>Continuar como invitado <span aria-hidden="true">→</span></button>
        <p className="auth-local-note"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></svg>Tu perfil se conserva en este navegador. La contraseña no se guarda.</p>
      </div>
    </section>
  )
}
