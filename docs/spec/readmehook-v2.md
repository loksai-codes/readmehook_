# ReadmeHook v2 spec (text extracted from readmehook-v2.pdf)

> Full vision. Build order and Phase 1 scope come from PRD.md.

```text
ReadmeHook — What Makes a Developer
Actually Clone a GitHub Repo?
Toggle Wars: The Flagsmith Experimentation Hackathon (Nov 26–30, 2026) | Meta-Hackathon
Developer Tooling



1. Executive Summary & Problem Statement

The 5-Second Repo Evaluation Problem
During hackathons and product launches, developers decide whether to star, clone, or abandon a
repository within 5 seconds of landing on a GitHub page. Most hackathon READMEs fail this critical
window due to wall-of-text introductions, buried value propositions, broken status badges, and
non-functional quickstart instructions. While builders spend hours writing code, their repositories
lose massive developer conversion simply because the above-the-fold layout fails to hook the
visitor's immediate intent.


Dual Value Proposition
    ● For Builders: Paste any public GitHub repository URL (github.com/owner/repo) to
        generate an instant, shareable, interactive landing preview card equipped with dynamic
        Open Graph unfurling tailored for Discord and social sharing. Creators receive an instant
        README audit, 1-click exportable optimized Markdown, and live data-driven
        recommendations on which above-the-fold layout converts best for their repository.
    ● For Experimentation / Flagsmith: ReadmeHook executes a live multivariate A/B/C
        experiment (repo_hero_layout) powered by Flagsmith to measure which above-the-fold
        visual layout converts developer visitors into copying git clone commands or clicking
        through to Star the repository.


Competitive Novelty
Unlike static social image generators (e.g., GitHubCard, github-readme-stats) that only mirror
passive repository stats, or Markdown writers (e.g., readme.so) that assist only in writing,
ReadmeHook dynamically parses raw repository content, renders live interactive hero layout
variants, and actively captures conversion vs. bounce telemetry to determine optimal developer
engagement structures.
   2. Technical Architecture & GitHub Extraction Pipeline

   System Flow
   The platform operates through an automated edge-ready pipeline designed to ingest, parse,
   evaluate, and track engagement without compute bottlenecks:


       1. Visitor / Creator Interaction: User accesses a ReadmeHook link (readmehook.dev/r/
          owner/repo).
       2. Next.js App Router (SSR): Intercepts request and checks the caching layer.
       3. Upstash Redis Cache: Resolves cached raw repository structures (15-minute TTL) to
          preserve API limits.
       4. GitHub REST API Ingestion: Fetches repository structure using authenticated Personal
          Access Tokens (5,000 req/hr ceiling).
       5. Deterministic README Parser: Extracts structured assets (Mermaid diagrams, bash
          commands, media links).
       6. Flagsmith Evaluation Engine: Evaluates context traits and assigns the sticky
          repo_hero_layout variant to the visitor.
       7. Telemetry Event Store: Emits real-time interaction metrics (copy rates, outbound clicks,
          dwell times) to Upstash Redis & analytics.


   GitHub REST API Ingestion Endpoints
       ● GET /repos/{owner}/{repo}: Extracts high-level metadata including description,
          stargazers_count, language, topics, default_branch, and homepage.
       ● GET /repos/{owner}/{repo}/readme: Retrieves raw README content and decodes
          Base64 Markdown to parse native Mermaid code blocks, bash installation snippets, media
          embeds, and primary value propositions.
       ● GET /repos/{owner}/{repo}/contents/: Inspects top-level manifest files
          (Dockerfile, package.json, requirements.txt, go.mod, Cargo.toml) to
          deterministically synthesize accurate quickstart commands when raw README text is
          missing or sparse.


   Heuristic Parsing & Fallback Matrix

Variant Name                        Primary Extraction Rule              Intelligent Fallback

architecture_first                  Extracts existing ```mermaid code    Auto-generates a 3-node
                                    blocks or sections titled ##         Mermaid flowchart (Input /
                                    Architecture / `## How it            Client -> Repo Core
                                    works`.                              [Primary Language] ->
Variant Name                        Primary Extraction Rule               Intelligent Fallback

                                                                          Output / API) from topics and
                                                                          top-level manifests.

quickstart_first                    Extracts the first shell/bash block   Synthesizes a standard 2-line
                                    containing commands like npx,         command (git clone
                                    docker, npm, pip, cargo, or git       https://github.com/owner/
                                    clone.                                repo.git && cd repo) plus
                                                                          language-matched install
                                                                          command.

demo_gif_first                      Extracts the                          Renders a stylized interactive
                                    first .gif, .mp4, .webm, or raw       browser/terminal preview
                                    GitHub asset media URL                displaying the live homepage URL
                                    embedded in the document.             or an animated CLI output
                                                                          mockup.



   3. Flagsmith Experimentation & Feature Flag Architecture

   Multivariate Flag Configuration
       ● Flag Key: repo_hero_layout
       ● Control & Traffic Allocation:
              ○ Variant A (architecture_first): 34%
              ○ Variant B (quickstart_first): 33%
              ○ Variant C (demo_gif_first): 33%


   Two-Actor Identity Model
       ● Repo Creator: Enters a URL to generate the shareable link (readmehook.dev/r/owner/
          repo) with zero registration or OAuth friction.
       ● Repo Visitor: Assigned a persistent anonymous visitor_id stored in localStorage /
          HTTP-only cookie. Evaluated via flagsmith.identify(visitorId, traits) to ensure
          sticky variant consistency across repeat visits and page refreshes.


   Context Traits Passed at Evaluation
       ● repo_language (String: e.g., TypeScript, Python, Rust, Go) — Enables ecosystem-level
          conversion segmentation.
   ● has_demo_video (Boolean) — Set to true when real video or GIF media is extracted
       directly from the repository.
   ● has_mermaid_diagram (Boolean) — Set to true when native diagram syntax is parsed.
   ● referrer_source (String: discord, direct, twitter) — Captured via the HTTP referrer
       header or ?ref= query parameter.


Segment Override & Live Routing Demo
   ● Defined Segment: visual_heavy_repos (Condition: has_demo_video == true).
   ● Live Admin Override: Located within the /insights admin drawer. Demonstrates
       Flagsmith's capability to override default percentage split rules and dynamically route all
       visual-heavy repositories exclusively to demo_gif_first once real-time statistical
       significance is confirmed.



4. Telemetry, Conversion Metrics & Guardrails

Primary Conversion Metrics
   ● clone_command_copied: Fired immediately when a visitor clicks the clipboard copy button
       on the displayed git clone or quickstart command block.
   ● github_outbound_click: Fired when a visitor selects the primary "View on GitHub / Star
       Repo" CTA.
   ● Composite KPI — Developer Intent Rate: Calculated strictly as:

Developer Intent Rate = (Unique Visitors with clone_command_copied OR github_outbound_click) /
Total Unique Card Views


Guardrail Metric
   ● bounce_under_5s: Tracks the duration from component mount (performance.now()) to
       visibilitychange or beforeunload events. Logs a bounce if the visitor leaves in under
       5,000ms without triggering a primary conversion action. This guardrail prevents false
       positive conversion ratios caused by heavy media stalling initial client rendering.


Dual-Write Event Tracking Architecture (Flagsmith Analytics + Upstash Redis)
The trackExperimentEvent(eventName, visitorId, repoSlug, variant) pipeline writes
conversion events (clone_command_copied, github_outbound_click) and guardrail events
(bounce_under_5s) to two destinations simultaneously:
   ● Flagsmith Native Analytics / Events API: Ensures judges and maintainers see live
       conversion metrics directly inside the Flagsmith UI tied to repo_hero_layout.
   ● Upstash Redis Atomic Counters (HINCRBY): Tracks granular per-repository, per-variant
       counts (repo:{owner}/{repo}:variant:{v}:clones, :views, :bounces) to power
       individual creator stats pages without hitting aggregation limits.



5. Automated Creator Advice Engine (/r/owner/repo/stats)
The Creator Advice Engine closes the feedback loop—turning ReadmeHook from a passive
preview card into an actionable README optimizer that maximizes Potential Impact score.


Two-Stage Advice Model
   ● Stage 1: Instant Static README Audit (Unlocks immediately at n = 0 views upon URL
       submission):
           ○ Missing Quickstart Check: Flags when no copyable npx / docker / pip / cargo
               block is found in the top 30 lines and offers the auto-synthesized quickstart
               snippet.
           ○ Missing Visual Architecture Check: Flags when no Mermaid diagram is detected
               and provides the auto-generated 3-node Mermaid flowchart snippet.
           ○ Missing Demo Media Check: Flags when no .gif or .mp4 is embedded and
               suggests adding a 10-second screen recording.
           ○ 1-Click "Copy Optimized README Hero" Export: Generates copy-pasteable
               Markdown combining the winning/recommended hero block so builders can update
               their GitHub README immediately.
   ● Stage 2: Live Experiment Verdict (Unlocks once n >= 10 visitor views):
         ○ Winning Hook Recommendation: Compares Developer Intent Rate across variants
               (e.g., "quickstart_first converts at 28% vs. 11% on architecture_first—
               move your CLI install snippet above the fold").
           ○ Guardrail Diagnostics: Flags high bounce_under_5s rates on specific variants
               (e.g., warning if a large README GIF is stalling initial load and causing premature
               exits).



6. 48-Hour Distribution & Viral Loop Strategy (WeMakeDevs
Discord)
Generates dynamic server-side preview images tailored for Discord embeds. Each OG image
visually highlights repository stars, primary language badges, target architecture snippets, and a
peer-feedback callout to maximize click-through rates inside Discord developer channels.


One-Click Discord Feedback Copy Prompt
Provides repository creators with a pre-formatted, one-click share prompt after link
generation:"Hey @everyone! Built a tool for Toggle Wars. Not sure if my README makes sense in 5
    seconds—test my ReadmeHook link and tell me if you'd clone it: https://readmehook.dev/r/
    owner/repo"


    Live Public Experiment Dashboard (/insights)
    A real-time public telemetry dashboard displaying aggregate and per-repo conversion figures:


       ● Conversion performance across all 3 hero variants (architecture_first,
           quickstart_first, demo_gif_first).
       ● Conversion breakdown filtered by repo_language.
       ● Live sample size counters ($n$).
       ● Real-time bounce_under_5s guardrail threshold status indicators.


    7. Recommended Tech Stack & Scope Guardrails
       ● Frontend & API: Next.js (App Router), TypeScript, Tailwind CSS, @vercel/og.
       ● Experimentation Engine: @flagsmith/flagsmith (client-side sticky bucketing) and
           flagsmith-nodejs (server-side evaluation).
       ● Visualization Engine: mermaid (wrapped inside React error boundaries with structured
           fallback rendering) and shiki for code block syntax highlighting.
       ● Persistence & Caching: Upstash Redis (15-minute GitHub API cache + atomic telemetry
           counters).
       ● Strict Scope Guardrails (What to Cut):
              ○ No GitHub OAuth / Login: Zero user creation or login requirements for creators or
                     visitors.
                  ○ No Blocking LLM Calls: All Markdown parsing is strictly deterministic to guarantee
                     sub-second hero card generation.



    8. Execution Timeline (Nov 26–30, 2026)
Milestone / Day                        Technical Deliverables &            Core Focus Areas
                                       Objectives

Day 1: Foundation & Variants           Setup Next.js App Router, GitHub    Core Extraction & Layout Engines
                                       REST ingestion pipeline, and
                                       Upstash Redis caching.
                                       Implement deterministic README
                                       parser and construct the 3 hero
                                       variants (architecture_first,
                                       quickstart_first,
Milestone / Day                   Technical Deliverables &               Core Focus Areas
                                  Objectives

                                  demo_gif_first). Integrate
                                  Flagsmith SDK for multivariate
                                  repo_hero_layout evaluation.

Day 2: Og Generation &            Build dynamic @vercel/og               Social Hooks & Analytics Engine
Telemetry                         visual generator for Discord
                                  unfurling. Implement client-side
                                  event tracking for
                                  clone_command_copied,
                                  github_outbound_click, and
                                  the bounce_under_5s guardrail
                                  with the Flagsmith dual-write
                                  event tracker. Build the /r/
                                  owner/repo/stats Creator
                                  Advice panel (Instant Audit + 1-
                                  click Markdown export + Live
                                  Verdict) and develop the /
                                  insights public telemetry
                                  dashboard.

Day 3: Discord Launch & Traffic   Deploy production build to             Live Deployment & Viral
                                  Vercel. Seed ReadmeHook                Distribution
                                  across WeMakeDevs Discord
                                  hackathon channels. Prompt
                                  participants to generate preview
                                  cards for their hackathon entries
                                  to drive organic visitor traffic and
                                  collect multivariate telemetry
                                  data.

Day 4: Analytics & Submission     Analyze real-time visitor              Data Evaluation & Final Video
                                  conversion metrics on /                Demo
                                  insights. Record submission
                                  video demonstrating Flagsmith
                                  segment overrides
                                  (visual_heavy_repos), trait-
                                  based targeting, and multivariate
                                  findings on developer conversion
Milestone / Day   Technical Deliverables &          Core Focus Areas
                  Objectives

                  behavior. Submit project before
                  deadline.
```
