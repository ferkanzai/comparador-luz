# 03 — The current palette as shadcn tokens

**What to build:** Map the app's colours to shadcn's semantic tokens, and make the old CSS use only those tokens.

**Blocked by:** 02

**Status:** ready-for-agent

**Effort:** M

## Checklist

- [ ] Group the 166 raw hex colours by use and by near-identity (for example `#a3342b` and `#a02d28`). Map them to shadcn tokens (`--background` from the paper tone, `--primary` from the green, `--destructive`, `--muted-foreground`, `--border`, `--ring`…), the cost categories to `--chart-1…4`, and anything shadcn has no slot for (lime highlight, success, warning) to a few extra tokens exposed through `@theme inline`.
- [ ] Replace every raw colour in the old CSS with a token.
- [ ] Before/after screenshots of each changed screen for approval, then update the baselines.
