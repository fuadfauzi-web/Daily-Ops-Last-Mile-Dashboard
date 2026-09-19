import { Component } from "react";

// Without this, any render-time error anywhere in the tree unmounts the
// whole app and leaves a blank white page with no way back except a hard
// reload. Catches that instead and offers a reload button, with the actual
// error message visible so a stuck screen is diagnosable, not just blank.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
    this.setState({ componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-lg rounded-xl bg-white p-6 text-center ring-1 ring-slate-200">
            <h1 className="font-display text-lg font-semibold text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Reload
            </button>
            {/* Which component crashed and the actual exception's own call
                stack -- an internal ops tool, so showing this to whoever hits
                it (usually the person reporting the bug) beats asking them to
                open devtools every time. */}
            {this.state.error.stack && (
              <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-left font-mono text-[11px] text-slate-500">
                {this.state.error.stack.trim()}
              </pre>
            )}
            {this.state.componentStack && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-left font-mono text-[11px] text-slate-500">
                {this.state.componentStack.trim()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
