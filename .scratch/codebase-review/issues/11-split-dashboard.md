# 11 — Split the Dashboard component

**What to build:** Break `src/components/dashboard.tsx` (710 lines) into focused components, so the dashboard only orchestrates the workspace and the tabs.

**Blocked by:** 04 (the status label moves into `WorkspaceStatus`)

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete

## Why

One component currently holds the header with sign-out, the hero, tab navigation, sync status, notices, the email-verification banner, five modal flows, the static "Método y fuentes" text (lines 595–702) and the footer. Every change to any of them touches the same file, and the static parts can't become server components (ticket 12) while they live inside it.

## Checklist

- [x] Extract `SiteHeader` (brand, sign-in and sign-out), `Hero`, `WorkspaceTabs`, `WorkspaceStatus`, `VerificationBanner`, `MethodModal` and `SiteFooter`, each in its own kebab-case file.
- [x] `MethodModal` content has no client state. Keep it renderable as a server component, passed in as children or a prop.
- [x] The tariff deletion dialog uses ticket 08's `ConfirmDialog` if that has landed.
- [x] No behaviour or visual change. Browser suite passes.

## Comments

`dashboard.tsx` went from 673 to 359 lines. It now holds the workspace state, the tabs, the notices and the modal flows. The extracted pieces:

- **Static, no hooks, no `"use client"`:** `SiteHeader`, `Hero`, `SiteFooter`, `MethodText`, and `guest-prompts.tsx` (`SignupBanner` and `AccountRequired`). The guest prompts weren't on the list, but they're static and made up most of the remaining JSX.
- **Client:** `SignOutButton`, `VerificationBanner`, `MethodModal`, `WorkspaceTabs` and `WorkspaceStatus`.
- **Header layout:** `SiteHeader` takes the user name and a `signOut` slot, so the header shell can be server-rendered in ticket 12 with `SignOutButton` as the only client part.
- **Method text:** `MethodModal` only wraps `Modal` around its children. The method text lives in `MethodText`, which `src/app/page.tsx` renders on the server and passes to `Dashboard` as a `method` prop. The method copy therefore no longer ships in the client bundle.
- **Still takes a callback:** `SiteFooter` takes `onMethod` because its button opens the modal. Ticket 12 will need to decide how the server-rendered footer opens a client modal.

Validation: I captured the rendered HTML (with React-generated ids removed) and the visible text for six views, first at the previous commit and then after the split: guest empty state, guest with tariffs, guest Mis facturas, the method modal, signed-in unverified, and signed-in Mis tarifas. All twelve files are identical. Typecheck, lint and the browser suite (31) pass.
