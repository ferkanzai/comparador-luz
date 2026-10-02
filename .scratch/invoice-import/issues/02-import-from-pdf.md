# 02 — Import from a PDF

**What to build:** The import dialog also accepts the invoice PDF. Every page is rendered and searched for the QR, and the flow continues exactly as for an image.

**Blocked by:** 01 — Import an invoice image and record its bill.

**Status:** ready-for-agent

- [ ] pdf.js renders each page at a resolution high enough to decode a 3×3 cm QR; the first page with a CNMC invoice QR is used.
- [ ] pdf.js loads only when the dialog opens.
- [ ] A PDF without a QR shows the "no QR found" message.
- [ ] The PDF never leaves the browser.
