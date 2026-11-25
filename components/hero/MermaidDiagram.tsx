'use client';

import { Component, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { fitDiagram, NARROW_WIDTH, orientForWidth, viewBoxSize } from '@/lib/mermaid/layout';

/** Give up and show the code if Mermaid hasn't produced a diagram by then. */
const RENDER_TIMEOUT_MS = 6000;

/**
 * FR-4.3: Mermaid renders client-side only, inside an error boundary. It never shows a blank box:
 * a parse/render error, a timeout, or an SVG with no size or no drawn elements all fall back to
 * `fallback` (the server-highlighted source). The diagram is sized to its natural width, scaled to
 * fit when that stays legible, and scrolls sideways otherwise. Left-right flowcharts turn top-down
 * on narrow screens. securityLevel "strict" sanitizes labels and disables click handlers (NFR-3).
 */
export function MermaidDiagram({ code, fallback }: { code: string; fallback: ReactNode }) {
  return (
    <MermaidErrorBoundary fallback={fallback}>
      <MermaidRenderer code={code} fallback={fallback} />
    </MermaidErrorBoundary>
  );
}

type RenderState =
  | { key: string; status: 'ok'; svg: string; natural: number }
  | { key: string; status: 'error' };

let mermaidReady: Promise<typeof import('mermaid').default> | null = null;

function loadMermaid() {
  mermaidReady ??= import('mermaid').then(({ default: mermaid }) => {
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
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      // We size the SVG ourselves from its viewBox.
      flowchart: { useMaxWidth: false },
      sequence: { useMaxWidth: false },
    });
    return mermaid;
  });
  return mermaidReady;
}

/** True when the SVG actually drew something (nodes, actors, text). */
function hasDrawnContent(svg: string): boolean {
  if (typeof DOMParser === 'undefined') return true;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return doc.querySelectorAll('.node, .actor, .task, text, foreignObject, path').length > 0;
}

function MermaidRenderer({ code, fallback }: { code: string; fallback: ReactNode }) {
  const baseId = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const attempt = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [result, setResult] = useState<RenderState | null>(null);

  // Track the box width: it decides orientation and the display size.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width > 0 && width < NARROW_WIDTH;
  const key = `${narrow ? 'n' : 'w'}:${code}`;

  useEffect(() => {
    if (width === 0) return;
    let cancelled = false;
    const id = `${baseId}-${++attempt.current}`;
    const source = orientForWidth(code, width);
    const fail = (why: unknown) => {
      console.warn('[mermaid] showing source instead of the diagram:', why);
      document.getElementById(`d${id}`)?.remove();
      if (!cancelled) setResult({ key, status: 'error' });
    };
    const timer = setTimeout(() => fail('render timed out'), RENDER_TIMEOUT_MS);

    (async () => {
      try {
        const mermaid = await loadMermaid();
        const { svg } = await mermaid.render(id, source);
        const size = viewBoxSize(svg);
        if (!size || !hasDrawnContent(svg)) throw new Error('rendered an empty diagram');
        clearTimeout(timer);
        if (!cancelled) setResult({ key, status: 'ok', svg, natural: size.width });
      } catch (err) {
        clearTimeout(timer);
        fail(err);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` folds in `code` and the narrow/wide switch; width changes within a mode only resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width === 0]);

  const current = result?.key === key ? result : null;
  if (current?.status === 'error') return <>{fallback}</>;

  const fit = current?.status === 'ok' ? fitDiagram(current.natural, width) : null;

  return (
    <div ref={boxRef} className="w-full">
      {current?.status === 'ok' && fit ? (
        <div>
          <div className="relative">
            <div className={fit.scroll ? 'rh-scroll-x overflow-x-auto pb-3' : ''}>
              <div
                role="img"
                aria-label="Architecture diagram"
                className="mx-auto [&_svg]:!h-auto [&_svg]:!w-full [&_svg]:!max-w-none"
                style={{ width: fit.width }}
                dangerouslySetInnerHTML={{ __html: current.svg }}
              />
            </div>
            {fit.scroll ? (
              // Edge fade so a wide diagram reads as scrollable, not cut off.
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent"
              />
            ) : null}
          </div>
          {fit.scroll ? (
            <p className="mt-2 text-right font-mono text-xs text-zinc-500">Scroll sideways for the full diagram</p>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center" aria-busy="true">
          <span className="font-mono text-xs text-zinc-500">Rendering diagram</span>
        </div>
      )}
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
