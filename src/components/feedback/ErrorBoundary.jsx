import { Component } from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { buttonClasses } from '@/components/ui/Button'
import { ErrorState } from './States'

function BoundaryFallback({ onReset }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <ErrorState
        error={new AppError(ERROR_CODES.UNKNOWN)}
        onRetry={onReset}
        secondaryAction={
          <Link to="/" onClick={onReset} className={buttonClasses({ variant: 'ghost' })}>
            <Home size={16} aria-hidden="true" />
            {t('nav.home')}
          </Link>
        }
      />
    </div>
  )
}

/**
 * Catches render errors in a subtree so one broken tool never blanks the app.
 * Pass `resetKey` (e.g. the pathname) to recover automatically on navigation.
 */
export class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReset = () => this.setState({ error: null })

  render() {
    if (this.state.error) return this.props.fallback ?? <BoundaryFallback onReset={this.handleReset} />
    return this.props.children
  }
}
