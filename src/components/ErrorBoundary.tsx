"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center p-4 font-terminal text-xs text-arena-muted border border-arena-border rounded-lg">
          Component error — check console
        </div>
      );
    }
    return this.props.children;
  }
}
