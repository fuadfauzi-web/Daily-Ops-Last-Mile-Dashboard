import { Component } from "react";

// Without this, any render-time error anywhere in the tree unmounts the
// whole app and leaves a blank white page with no way back except a hard
// reload. Catches that instead and offers a reload button, with the actual
// error message visible so a stuck screen is diagnosable, not just blank.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md rounded-xl bg-white p-6 text-center ring-1 ring-slate-200">
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
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
