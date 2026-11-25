/**
 * FR-10.5 admin drawer: explains the `visual_heavy_repos` segment override. Overrides are made in the
 * Flagsmith dashboard, never through our API. A native <details> keeps it keyboard-accessible with no JS.
 */
export function SegmentDrawer({ segmentsUrl }: { segmentsUrl: string }) {
  return (
    <details className="group rounded-xl border border-zinc-800 bg-zinc-900/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none">
        <span>Admin: route visual-heavy repos to the demo layout</span>
        <span aria-hidden="true" className="font-mono text-xs text-zinc-500 transition-transform group-open:rotate-90">
          &gt;
        </span>
      </summary>
      <div className="space-y-4 border-t border-zinc-800 px-5 py-5 text-sm leading-relaxed text-zinc-300">
        <p>
          Repos whose README has a demo GIF or video probably sell themselves best with that media above the fold. A
          Flagsmith segment override sends those visitors straight to <code className="font-mono text-zinc-100">demo_gif_first</code>,
          whatever the experiment would have picked.
        </p>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 font-mono text-xs">
          <dt className="text-zinc-500">Segment</dt>
          <dd className="text-zinc-100">visual_heavy_repos</dd>
          <dt className="text-zinc-500">Rule</dt>
          <dd className="text-zinc-100">trait has_demo_video equals true</dd>
          <dt className="text-zinc-500">Override</dt>
          <dd className="text-zinc-100">repo_hero_layout → demo_gif_first</dd>
        </dl>
        <p>
          The trait is already sent on every card view: <code className="font-mono text-zinc-100">has_demo_video</code> is
          true when the parser found a GIF, video or GitHub attachment in the README.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Flagsmith → Segments → create <code className="font-mono">visual_heavy_repos</code> with the rule above</li>
          <li>Features → repo_hero_layout → Segment overrides → add the segment, value <code className="font-mono">demo_gif_first</code></li>
          <li>Open a card for a repo with a demo GIF in a fresh browser and check the hero</li>
        </ol>
        <p className="text-zinc-400">
          Do this in Development, or in Production only after the experiment has ended. While the experiment runs the
          flag is locked, and an override would pull visitors out of the test and bias the results.
        </p>
        <a
          href={segmentsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-sm text-zinc-100 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          Open Flagsmith segments
        </a>
      </div>
    </details>
  );
}
