import { Component, type ReactNode } from "react";

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[TootMaster3000] Unhandled error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-5 text-center px-6"
        style={{ background: "radial-gradient(ellipse at 30% 20%, #1f0b3a 0%, #0d1117 55%, #071428 100%)" }}
      >
        <div style={{ fontSize: 64 }}>💨</div>
        <div>
          <h1 className="text-2xl font-black text-white">Something went wrong.</h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Even the Toot Master has bad days.
          </p>
        </div>
        <button
          onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          className="px-6 py-3 rounded-xl font-black text-sm text-white"
          style={{ background: "#E8445A", boxShadow: "0 4px 20px #E8445A44" }}
        >
          Try Again
        </button>
      </div>
    );
  }
}
