# 01 — Import an invoice image and record its bill

**What to build:** The household opens "Importar factura" from the Bills tab, uploads a photo or screenshot of their invoice QR, and sees a review screen with the bill prefilled from it. Saving records the bill. Everything happens in the browser; the dialog says the invoice is neither stored nor sent to the server. This is the tracer bullet for the whole feature (see `../spec.md`).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Parser turns a CNMC invoice QR URL into typed invoice data; accepts `&` and `&amp;` separators, any key order and any key case. Tested against the worked example in the spec.
- [ ] QR decoded from an image with the native `BarcodeDetector` when available, falling back to `zxing-wasm`; both load only when the dialog opens.
- [ ] Review screen prefills the bill: reporting month from `finF`, billing period `iniF` → `finF`, net amount paid `imp`, credit 0, recorded consumption `cfP1..3` with its P1/P2/P3 split, supplier. All fields are editable; saving records the bill through the existing save-bill action, for guests and accounts.
- [ ] Supplier name comes from a bundled map generated from `../cnmc-suppliers.csv` (code → name in title case without legal form, including deregistered suppliers). `R2-760` → "Octopus Energy España". Unknown codes leave the name empty for the user.
- [ ] Rejected with an explanation: Canary Islands postal codes (35xxx, 38xxx) and any `tf` other than N.
- [ ] Warnings shown: PVPC (`tc` A*), self-consumption (`exc` > 0), and an existing bill with the same billing period and supplier (warn, still allow saving).
- [ ] No QR found: the message suggests a sharper photo or a screenshot of the code.
- [ ] CUPS, postal code, `pmax*`, `verde`, `rev`, `caP*` and `iniA` are never saved.
