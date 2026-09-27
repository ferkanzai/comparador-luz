# 25 — Guest first-run screen

**What to build:** Simplify what a new visitor sees before entering any data.

**Blocked by:** none

**Status:** completed

**Effort:** S

## Why (browser pass, empty workspace)

- Two buttons do the same thing next to each other: "Añadir tarifa" in the heading and "Añadir mi primera tarifa" in the empty state.
- The profile strip shows "— kWh" and "— días" with "Editar perfil" and "Simular consumo". Simulating an empty profile isn't meaningful yet.
- "Exportar" is offered for an empty workspace.
- The status says "Guardado en este dispositivo" before anything has been entered.
- The PVPC panel and the account banner compete with the empty state for attention.

Signed-in pass:

- A new account with no tariffs also shows a disabled "Guardar este período como factura" button under the empty state.
- Notices stack above the workspace: the save strip, the email-verification banner and, during a conflict, the conflict notice. On a phone that's most of the first screen before any content.

## Checklist

- [x] With no tariffs: one primary call to action. Hide or disable "Simular consumo" and "Exportar", and move the status message until there's data.
- [x] Consider leading with the comparison profile ("Ten tu factura a mano") as the first step, if that matches the intended flow.
- [x] Hide "Guardar este período como factura" until there's a current tariff with a cost.
- [x] Merge the save strip and status into one compact line, and make the verification banner dismissible for the session.
- [x] Check desktop and phone, as a guest and signed in.

## Done (2026-09-24, on the design-system branch)

- With no tariffs, the empty state's "Añadir mi primera tarifa" is the only call to action: the heading's "Añadir tarifa", "Simular consumo" and the PVPC panel appear with the first tariff. The CNMC link stays, since it helps find offers.
- The save status and Exportar share one line under the tabs, shown on phones too, and hidden while the workspace is empty. The separate "Tus datos se guardan automáticamente…" sentence is gone.
- "Guardar este período como factura" appears once the current tariff has a cost; it is still disabled during a simulation.
- The email-verification banner can be hidden for the browser session.
- Leading with the comparison profile: not done. The empty state already asks for the last bill, and reordering the flow is a larger change than this ticket.
- The conflict notice no longer exists since ADR-0003 (last save wins).

Follow-ups from the preview review (2026-09-24):

- The empty state's button reads "Añadir mi tarifa actual": the first tariff opens marked as current, with its start date required.
- With no tariffs, the CNMC link sits in the empty state, under that button, instead of alone above the account banner.

Approved by the user on the preview.
