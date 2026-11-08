import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Already-translated texts, passed by the parent so this boundary has no context dependency. */
  title: string;
  retryLabel: string;
}

/** Error boundaries must be class components in React; this is the only one in the app. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for developers only; never show stack traces to users.
    console.error('UI error:', error.message, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <p className="text-base font-bold text-emerald-950">{this.props.title}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-12 px-6 rounded-xl bg-emerald-700 text-white text-sm font-bold"
        >
          {this.props.retryLabel}
        </button>
      </div>
    );
  }
}
