import { describe, expect, it } from 'vitest';
import { fitDiagram, orientForWidth, viewBoxSize } from '@/lib/mermaid/layout';

describe('orientForWidth', () => {
  it('turns LR/RL flowcharts top-down on narrow screens only', () => {
    expect(orientForWidth('flowchart LR\n  A --> B', 390)).toBe('flowchart TD\n  A --> B');
    expect(orientForWidth('graph RL\nA-->B', 390)).toBe('graph TD\nA-->B');
    expect(orientForWidth('flowchart LR\n  A --> B', 800)).toBe('flowchart LR\n  A --> B');
  });
  it('skips init directives and blank lines before the header', () => {
    const code = '%%{init: {"theme":"dark"}}%%\n\nflowchart LR\nA-->B';
    expect(orientForWidth(code, 390)).toBe('%%{init: {"theme":"dark"}}%%\n\nflowchart TD\nA-->B');
  });
  it('leaves other diagrams and TD flowcharts alone', () => {
    expect(orientForWidth('sequenceDiagram\nA->>B: hi', 390)).toBe('sequenceDiagram\nA->>B: hi');
    expect(orientForWidth('flowchart TD\nA-->B', 390)).toBe('flowchart TD\nA-->B');
    expect(orientForWidth('flowchart LRX\nA-->B', 390)).toBe('flowchart LRX\nA-->B');
  });
});

describe('viewBoxSize', () => {
  it('reads the natural size and rejects empty diagrams', () => {
    expect(viewBoxSize('<svg viewBox="-8 -8 1120.5 184" width="100%">')).toEqual({ width: 1120.5, height: 184 });
    expect(viewBoxSize('<svg viewBox="0 0 0 0">')).toBeNull();
    expect(viewBoxSize('<svg viewBox="0 0 -16 -16">')).toBeNull();
    expect(viewBoxSize('<svg width="10">')).toBeNull();
  });
});

describe('fitDiagram', () => {
  it('keeps natural size when it fits', () => {
    expect(fitDiagram(552, 800)).toEqual({ width: 552, scroll: false });
  });
  it('scales down to fit while legible', () => {
    expect(fitDiagram(1000, 800)).toEqual({ width: 800, scroll: false });
  });
  it('scrolls instead of shrinking below 70%', () => {
    expect(fitDiagram(1800, 800)).toEqual({ width: 1260, scroll: true });
  });
});
