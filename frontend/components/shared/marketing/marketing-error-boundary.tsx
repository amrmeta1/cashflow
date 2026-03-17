"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MarketingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.sectionName || "Marketing Section"}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <section className="py-20 bg-landing-darker">
          <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 mb-6">
              <AlertTriangle className="h-8 w-8 text-rose-500" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-zinc-600 mb-6">
              We&apos;re sorry, but something went wrong. Please try refreshing the page. or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-neon text-landing-darker font-semibold hover:bg-neon/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            >
              Refresh Page
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
