# 11 — Split the Dashboard component

**What to build:** Break `src/components/dashboard.tsx` (710 lines) into focused components, so the dashboard only orchestrates the workspace and the tabs.

**Blocked by:** 04 (the status label moves into `WorkspaceStatus`)

**Status:** ready-for-agent

**Effort:** M

## Why

One component currently holds the header with sign-out, the hero, tab navigation, sync status, notices, the email-verification banner, five modal flows, the static "Método y fuentes" text (lines 595–702) and the footer. Every change to any of them touches the same file, and the static parts can't become server components (ticket 12) while they live inside it.

## Checklist

- [ ] Extract `SiteHeader` (brand, sign-in and sign-out), `Hero`, `WorkspaceTabs`, `WorkspaceStatus`, `VerificationBanner`, `MethodModal` and `SiteFooter`, each in its own kebab-case file.
- [ ] `MethodModal` content has no client state. Keep it renderable as a server component, passed in as children or a prop.
- [ ] The tariff deletion dialog uses ticket 08's `ConfirmDialog` if that has landed.
- [ ] No behaviour or visual change. Browser suite passes.
