/** Pure sizing/orientation helpers for the client Mermaid renderer (FR-4.3). Unit-tested. */

/** Below this container width, left-right flowcharts are re-oriented top-down so labels stay legible. */
export const NARROW_WIDTH = 560;
/** A diagram is never shrunk below this fraction of its natural size; past that it scrolls sideways. */
export const MIN_SCALE = 0.7;

const DIRECTIVE = /^\s*(%%|$)/;
const LR_HEADER = /^(\s*(?:flowchart|graph)\s+)(LR|RL)\b/;

/** Rewrites `flowchart LR`/`graph RL` to TD on narrow screens. Other diagram types are left alone. */
export function orientForWidth(code: string, containerWidth: number): string {
  if (containerWidth >= NARROW_WIDTH) return code;
  const lines = code.split('\n');
  const i = lines.findIndex((l) => !DIRECTIVE.test(l));
  if (i < 0 || !LR_HEADER.test(lines[i]!)) return code;
  lines[i] = lines[i]!.replace(LR_HEADER, '$1TD');
  return lines.join('\n');
}

/** Natural size from an SVG viewBox ("minX minY width height"); null when missing or degenerate. */
export function viewBoxSize(svg: string): { width: number; height: number } | null {
  const m = svg.match(/viewBox="\s*[-\d.e]+[\s,]+[-\d.e]+[\s,]+([\d.e]+)[\s,]+([\d.e]+)\s*"/i);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  return Number.isFinite(width) && Number.isFinite(height) && width > 1 && height > 1 ? { width, height } : null;
}

/**
 * Display width for a diagram of `natural` px in a `container` px box: natural size when it fits,
 * scaled down to fit when that keeps at least MIN_SCALE, otherwise MIN_SCALE with sideways scroll.
 */
export function fitDiagram(natural: number, container: number): { width: number; scroll: boolean } {
  if (container <= 0 || natural <= container) return { width: Math.round(natural), scroll: false };
  const scale = container / natural;
  if (scale >= MIN_SCALE) return { width: Math.round(container), scroll: false };
  return { width: Math.round(natural * MIN_SCALE), scroll: true };
}
