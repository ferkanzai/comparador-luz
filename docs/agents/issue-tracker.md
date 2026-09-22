# Issue tracker: Local Markdown

Issues and specs live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- Specs: `.scratch/<feature-slug>/spec.md`.
- Implementation tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`,
  numbered from `01`, with one file per ticket.
- Triage state: a `Status:` line near the top of each ticket.
  Use the role strings in `triage-labels.md`.
- Append conversation history under `## Comments`.

## Publishing and fetching

When a skill says "publish to the issue tracker", create the appropriate
spec or ticket file using the paths above. Create directories as needed.

When a skill says "fetch the relevant ticket", read the referenced file.
Resolve a bare issue number within the relevant feature directory.

## Wayfinding operations

Used by `/wayfinder`.

- Map: `.scratch/<effort>/map.md`, containing Notes, Decisions-so-far,
  and Fog.
- Child ticket: `.scratch/<effort>/issues/<NN>-<slug>.md`, numbered
  from `01`, with the question in the body.
- Type: a `Type:` line containing `research`, `prototype`, `grilling`,
  or `task`.
- Lifecycle: wayfinding tickets use `Status: open`, `Status: claimed`,
  or `Status: resolved`.
- Blocking: a `Blocked by: NN, NN` line lists dependencies within the
  same effort. A ticket is unblocked when every dependency is resolved.
- Frontier: select the first open, unblocked, unclaimed ticket by number.
- Claim: save `Status: claimed` before beginning work.
- Resolve: append the answer under `## Answer`, set `Status: resolved`,
  and append a gist and link to the map's Decisions-so-far.
