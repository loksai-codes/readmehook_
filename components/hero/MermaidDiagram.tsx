'use client';

import { Component, useEffect, useId, useState, type ReactNode } from 'react';

/**
 * FR-4.3: Mermaid renders client-side only, inside an error boundary. Any parse/render failure
 * (or a crash in the renderer) shows `fallback`, a server-highlighted code block.
 * securityLevel "strict" makes Mermaid sanitize labels and disable click handlers (NFR-3).
 */
export function MermaidDiagram({ code, fallback }: { code: string; fallback: ReactNode }) {
  return (
    <MermaidErrorBoundary fallback={fallback}>
      <MermaidRenderer code={code} fallback={fallback} />
    </MermaidErrorBoundary>
  );
}

type RenderState = { code: string; status: 'ok'; svg: string } | { code: string; status: 'error' };

function MermaidRenderer({ code, fallback }: { code: string; fallback: ReactNode }) {
  const domId = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [result, setResult] = useState<RenderState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: 'base',
          themeVariables: {
            darkMode: true,
            background: '#09090b',
            primaryColor: '#18181b',
            primaryTextColor: '#e4e4e7',
            primaryBorderColor: '#52525b',
            secondaryColor: '#1c1c1f',
            secondaryBorderColor: '#71717a',
            tertiaryColor: '#111113',
            lineColor: '#71717a',
            textColor: '#d4d4d8',
            edgeLabelBackground: '#09090b',
            clusterBkg: '#111113',
            clusterBorder: '#3f3f46',
            fontSize: '14px',
          },
          fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
          flowchart: { useMaxWidth: true },
        });
        const { svg } = await mermaid.render(domId, code);
        if (!cancelled) setResult({ code, status: 'ok', svg });
      } catch (err) {
        console.warn('[mermaid] render failed, showing source', err);
        // Mermaid can leave its temporary render container behind on failure.
        document.getElementById(`d${domId}`)?.remove();
        if (!cancelled) setResult({ code, status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, domId]);

  const current = result?.code === code ? result : null;
  if (current?.status === 'error') return <>{fallback}</>;
  if (current?.status === 'ok') {
    return (
      <div
        role="img"
        aria-label="Architecture diagram"
        className="flex h-full w-full items-center justify-center [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: current.svg }}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center" aria-busy="true">
      <span className="font-mono text-xs text-zinc-500">rendering diagram…</span>
    </div>
  );
}

class MermaidErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[mermaid] error boundary caught', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
