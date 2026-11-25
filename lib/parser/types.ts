export type AssetSource = 'extracted' | 'synthesized';

export interface ArchitectureAsset {
  /** Mermaid code for the diagram: the README's first ```mermaid block, or a synthesized flowchart. */
  diagram: { code: string; source: AssetSource };
  /** Text of a `## Architecture` / `## How it works` section, when present (FR-3.1 fallback). */
  section: { heading: string; text: string } | null;
}

export interface QuickstartAsset {
  command: string;
  source: AssetSource;
  /** Fence language ('' if untagged); null when synthesized. */
  lang: string | null;
  /** 1-based line of the opening fence; null when synthesized. */
  startLine: number | null;
}

export type MediaKind = 'gif' | 'video' | 'attachment';

export interface MediaAsset {
  url: string;
  kind: MediaKind;
  source: 'extracted';
}

export interface ParsedReadme {
  architecture: ArchitectureAsset;
  quickstart: QuickstartAsset;
  /** null → no demo media; hero falls back to a homepage frame / terminal mockup. */
  media: MediaAsset | null;
  /** `git clone …` shown in the shared shell's copy box. */
  cloneCommand: string;
  /** README contains a ```mermaid block. */
  hasMermaid: boolean;
  hasDemoMedia: boolean;
  /** README contains a runnable quickstart block (not synthesized). */
  hasQuickstart: boolean;
  /** That block starts within the first 30 lines (audit, FR-8.1). */
  quickstartInTop30: boolean;
}
