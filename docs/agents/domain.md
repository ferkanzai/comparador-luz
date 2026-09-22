# Domain Docs

## Read before exploring

This repo uses a single-context layout:

- `CONTEXT.md` at the repo root: domain terms and their meanings.
- `docs/adr/`: architectural decisions. Read ADRs relevant to the work.

If these files are absent, proceed silently. The `/domain-modeling`
skill creates them lazily when terms or decisions are resolved.

## Use the glossary's vocabulary

Use terms defined in `CONTEXT.md` when naming domain concepts in issues,
proposals, hypotheses, and tests.

If a concept is missing, reconsider whether it fits the project's
language; note genuine gaps for `/domain-modeling`.

## Surface ADR conflicts

If a proposal contradicts an existing ADR, identify the ADR and explain
why reopening the decision may be warranted.
