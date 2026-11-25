# ReadmeHook

> What makes a developer actually clone a GitHub repo? Paste a repo URL, get a shareable landing card, and let a live **Flagsmith Experimentation** A/B test find out which above-the-fold hero converts.

Built for **Toggle Wars — the Flagsmith Experimentation Hackathon** (WeMakeDevs), Track 01 "Test Something Real".

## Starter kit contents

| File | What it's for |
|---|---|
| `PRD.md` | Product + experiment definition, Phase 1 vs full vision |
| `requirements.md` | Numbered functional/non-functional requirements, env vars, acceptance checklist |
| `CLAUDE.md` | Rules Claude Code follows in this repo |
| `prompt.md` | Kickoff prompt + milestone prompts to paste into Claude Code |
| `docs/flagsmith-setup.md` | Flag, metrics, experiment, segment setup values |
| `docs/experiment-plan.md` | Hypothesis, sample size, decision rule, results template |
| `docs/architecture.md` | Flow, Redis keys |
| `docs/demo-script.md` | Submission video outline |
| `docs/spec/` | Original v2 spec (PDF + text) |

## Quick start

1. Copy this folder somewhere, `cd` in, `git init`.
2. Do steps 0–1 of `docs/flagsmith-setup.md` (account, project, environments).
3. Get a GitHub fine-grained PAT (public repos, read-only) and an Upstash Redis database.
4. `cp .env.example .env.local` and fill it in.
5. Open Claude Code here and paste **Prompt 1** from `prompt.md`.

## Experiment (Phase 1)

- Flag `repo_hero_layout`: `architecture_first` (control) vs `quickstart_first`, 50/50
- Primary metric: `developer_intent` · Guardrail: `bounce_under_5s`
- Results: _see `docs/results.md` once the experiment has run_
