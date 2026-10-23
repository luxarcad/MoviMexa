import './loader.css'

/** Loading feedback adapted from the supplied monochrome ring component. */
export default function Loader({
  title = 'Preparando tu viaje',
  subtitle = 'Un momento, estamos dejando todo listo.',
  size = 'md',
  className = '',
  ...props
}) {
  const safeSize = ['sm', 'md', 'lg'].includes(size) ? size : 'md'

  return (
    <div
      {...props}
      className={`mm-loader mm-loader--${safeSize} ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mm-loader__rings" aria-hidden="true">
        <span className="mm-loader__ring mm-loader__ring--one" />
        <span className="mm-loader__ring mm-loader__ring--two" />
        <span className="mm-loader__ring mm-loader__ring--three" />
        <span className="mm-loader__ring mm-loader__ring--four" />
        <span className="mm-loader__center" />
      </div>
      <div className="mm-loader__copy">
        <p className="mm-loader__title">{title}</p>
        {subtitle && <p className="mm-loader__subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}
