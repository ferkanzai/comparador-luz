# 05 — Centralize regulated rates

**What to build:** Move every regulated rate and reference price into one module, and format the UI copy from those constants instead of repeating the numbers in text.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S–M

## Why

When a rate changes in the BOE, the maths and the explanatory text can drift apart. Today the same values appear in several places:

- 21 % IVA and 5.11269632 % IEE: `profile-fields.tsx:112-115` and `dashboard.tsx:653`.
- Social-bonus financing, 9,011295 €/año: `charge-estimates.ts:10`, and again as text in `tariff-form.tsx:372` and `pvpc-comparison.tsx:211`.
- Meter rental, 0,81 and 1,36 €/mes: `charge-estimates.ts:6-7`, and again as text in `pvpc-comparison.tsx:155-156`.
- Services IVA 21 %: hard-coded as `0.21` in `calculator.ts:103`.
- Minimum IEE, 0.001 €/kWh: `calculator.ts:93`, and again as text in the method modal (`dashboard.tsx:629`).
- The "Revisión: 22/09/2026" date in the method modal.

## Checklist

- [ ] Create `src/lib/regulated-rates.ts` containing each value, its source URL and its review date. Extend `charge-estimates.ts` rather than duplicating it if that reads better.
- [ ] The calculator, estimates, PVPC and all copy read from it. Format numbers with the shared formatters (ticket 01 if it has landed).
- [ ] Grep for the literal values afterwards. None should remain outside the module and the tests.
- [ ] Calculation tests produce identical results.
