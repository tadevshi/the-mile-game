import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI. If not provided, a default recovery screen is shown. */
  fallback?: ReactNode;
  /** If true, shows a minimal inline fallback instead of a full-screen one */
  inline?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    // BASE_URL respeta el base path de Vite/reverse proxy (default: '/')
    window.location.href = import.meta.env.BASE_URL || '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Inline minimal fallback (for wrapping individual components like 3D canvas)
      if (this.props.inline) {
        return (
          <div className="flex items-center justify-center w-full h-full p-4 text-center">
            <div className="space-y-2">
              <p className="text-2xl">😅</p>
              <p className="text-sm text-slate-500 font-serif">
                Algo salió mal
              </p>
              <button
                onClick={this.handleReset}
                className="text-xs text-primary underline hover:text-accent transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        );
      }

      // Full-screen fallback (global wrapper)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white dark:from-slate-900 dark:to-slate-800 px-6">
          <div className="text-center space-y-6 max-w-sm">
            <div className="space-y-2">
              <p className="text-5xl">🦋</p>
              <h1 className="font-display text-3xl text-accent">
                ¡Oops!
              </h1>
              <p className="font-serif text-slate-600 dark:text-slate-300 text-lg">
                Algo no salió como esperábamos
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-6 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium shadow-lg shadow-pink-200 hover:shadow-xl transition-all active:scale-95"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full py-3 px-6 border-2 border-primary/30 text-primary rounded-full font-medium hover:bg-primary/5 transition-all active:scale-95"
              >
                Volver al inicio
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
                <summary className="text-red-600 dark:text-red-400 cursor-pointer font-medium">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-red-500 dark:text-red-300 whitespace-pre-wrap break-all">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
