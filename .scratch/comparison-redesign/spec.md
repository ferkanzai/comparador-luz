# Comparison workspace redesign

Status: ready-for-agent

## Problem Statement

Comparing more than three or four electricity tariffs requires too much scrolling and remembering values between distant parts of the page. Full tariff cards occupy the main column while a separate sidebar repeats tariffs as a cost ranking; on smaller screens the ranking follows the entire tariff list. The estimated total is easy to find in isolation, but understanding why one tariff costs more than another requires opening separate breakdowns and finding unit prices elsewhere.

The household also wants to explore changes in consumption without manually editing each energy period. All tariffs already use one comparison profile, but repeating its fields inside tariff editors makes that shared relationship unclear. Price-confirmation labels suggest that the application checks prices even though the action only records the user's own review date.

The user likes the existing visual identity and wants to compare an improved flow against the existing design through a separate branch preview before deciding what to release.

## Solution

Make the comparison tab a compact financial worksheet: a full-width tariff table with estimated period costs, savings, cost breakdown and underlying unit prices visible together. Replace the full cards and duplicate results sidebar. Preserve the green/cream identity, reduce introductory space once tariffs exist, and keep shared comparison inputs close to the results.

Start with all tariffs. Offer an optional detailed comparison of up to three finalists, preselecting the current tariff when present while allowing it to be removed from that view. On narrow screens, scroll the table horizontally with tariff names pinned and estimated total/savings first.

Add temporary consumption simulations: change total kWh while preserving the distribution across energy periods, or redistribute consumption while keeping total kWh fixed. Recalculate every tariff on the same basis, label the simulation clearly, and offer “Restablecer” and “Usar este consumo.” Adoption updates the comparison profile through existing saving behavior.

Move manual price confirmation into tariff details and use language that explicitly identifies the user as the reviewer. The broader “my prices” model is a separate follow-up.

## User Stories

1. As a household comparing electricity tariffs, I want to scan all my tariffs in one table, so that I can compare several offers without moving between full cards and a separate ranking.
2. As a household comparing eight tariffs, I want compact, aligned rows, so that I can see meaningful differences without remembering figures from distant parts of the page.
3. As a returning household, I want a compact introduction once I have tariffs, so that I reach the comparison quickly.
4. As a household comparing tariffs, I want eligible tariffs ordered by estimated period cost, so that I can identify the least expensive options for my comparison profile.
5. As a household comparing tariffs, I want the duration and tax assumptions stated near results, so that I understand what each estimated total represents.
6. As a household with a current tariff, I want it clearly identified, so that I can distinguish my contract from candidate offers.
7. As a household with a current tariff, I want each candidate's cost difference against that tariff, so that I can see both possible savings and additional cost.
8. As a household without a current tariff, I want estimated costs without invented savings, so that comparison remains useful before I choose a baseline.
9. As a household comparing tariffs, I want energy cost and its flat or period unit prices visible together, so that I can understand the consumption-related difference immediately.
10. As a household comparing tariffs, I want actual power cost alongside power-price information, so that I can distinguish the household charge from a normalized price reference.
11. As a household comparing tariffs, I want other charges and taxes grouped visibly, so that the main cost groups explain the estimated total.
12. As a household inspecting finalists, I want the individual remaining charges and taxes aligned, so that I can understand what is included in each estimate.
13. As a household comparing differently quoted power prices, I want the shared day/month/year selector retained, so that equivalent quotes are comparable in my preferred unit.
14. As a household inspecting power prices, I want original quote units and charging structures preserved, so that a shared per-period price cannot be mistaken for one combined charge.
15. As a household with unequal contracted powers, I want the normalized power reference distinguished from my actual charge, so that I do not infer an incorrect bill amount.
16. As a household using estimated charges, I want their estimated origin visible, so that I can distinguish assumptions from entered contract prices.
17. As a household with an expired candidate, I want to see why it is excluded and still edit it, so that it does not silently disappear or appear competitive.
18. As a household with incomplete inputs, I want missing information explained, so that an unknown cost cannot appear as a zero-cost winner.
19. As a household comparing tariffs, I want to add, edit, duplicate and remove tariffs from the new workspace, so that comparison does not reduce existing tariff-management capabilities.
20. As a household changing its current tariff, I want the existing dated contract-change flow retained, so that tariff history remains accurate.
21. As a household using a phone, I want horizontal scrolling confined to the table, so that the rest of the page stays readable and stable.
22. As a household scrolling a wide table, I want tariff names to remain visible, so that I know which tariff each value belongs to.
23. As a keyboard or assistive-technology user, I want labeled table headers, usable scrolling and accessible actions, so that I can compare tariffs without a pointer.
24. As a household entering consumption, I want one clearly shared comparison profile, so that I understand every tariff uses the same inputs.
25. As a household with exact consumption figures, I want direct entry of punta, llano and valle kWh retained, so that I can reproduce the inputs from my bill.
26. As a household comparing tariffs, I want power, billing days and tax assumptions accessible with their units, so that I can inspect the full basis of the comparison.
27. As a household exploring consumption, I want to change total kWh while preserving its distribution, so that I can test higher or lower usage without editing all three periods.
28. As a household exploring time-of-use changes, I want to redistribute consumption while retaining total kWh, so that I can isolate the effect of moving usage between periods.
29. As a household simulating consumption, I want resulting kWh by period shown explicitly, so that I can understand the scenario being calculated.
30. As a household simulating consumption, I want all totals, savings and finalist results to update together, so that every displayed comparison uses the same scenario.
31. As a household simulating consumption, I want an unmistakable simulation indicator, so that hypothetical figures cannot be confused with my comparison profile.
32. As a household experimenting freely, I want “Restablecer” to restore my underlying profile, so that trying an idea is easy to undo.
33. As a household choosing a new consumption assumption, I want “Usar este consumo” to adopt it explicitly, so that I control when an experiment becomes my comparison profile.
34. As a household whose workspace autosaves, I want unadopted simulations excluded from persisted workspace data, so that exploring consumption does not overwrite my usual figures.
35. As a household editing tariffs during a simulation, I want tariff changes saved independently of the simulated consumption, so that an unrelated edit does not adopt an experiment.
36. As a household with zero or missing consumption, I want those states treated distinctly, so that the app does not invent a distribution or silently convert unknown values to zero.
37. As a household narrowing its options, I want to choose up to three finalists, so that I can inspect a manageable set of tariffs in detail.
38. As a household with a current tariff, I want it initially selected for detailed comparison but removable, so that I can compare either my contract against offers or offers against one another.
39. As a household selecting finalists, I want selection kept separate from current-contract designation, so that inspecting an offer never changes my recorded contract.
40. As a household comparing finalists, I want their available rates, cost components and offer information aligned, so that meaningful differences can be read side by side.
41. As a household using a phone, I want to inspect two finalists together using the same legible scrolling approach, so that the detailed view remains useful on a small screen.
42. As a household reviewing an offer, I want any price-confirmation action to state that I reviewed the prices, so that I do not assume the app fetched or verified them.
43. As a household scanning results, I want repetitive unchecked-price warnings removed from the main comparison, so that they do not obscure costs and rates.
44. As a household with recorded review dates, I want them retained in tariff details, so that the UI redesign preserves existing information.
45. As a household consulting historical PVPC, I want it kept separate from ranked offers, so that a historical reference cannot be mistaken for an available contract.
46. As a household creating a bill from a comparison, I want unadopted simulations kept out of bill creation and actual amounts still reviewed, so that hypothetical consumption is not silently recorded as billed consumption.
47. As a guest or signed-in household, I want existing saving, recovery and export behavior preserved for my adopted profile and tariffs, so that the new interface does not lose my workspace.
48. As a product owner evaluating the redesign, I want a separate branch preview with representative comparison scenarios, so that I can compare both designs and flows before a production release.

## Implementation Decisions

- **Presentation boundary:** Restructure the comparison workspace and its supporting comparison components. Separate the overview table, shared-input/simulation controls and optional finalist detail view by their responsibilities. Reuse the existing calculator, domain formatting, tariff editor, bill-draft conversion and workspace synchronization contracts; avoid introducing another billing engine.
- **Table structure:** Group information into tariff, estimated period total/savings, energy, power, and other charges/taxes. Show energy and power costs alongside labeled unit rates without requiring row expansion. Keep totals and differences visually primary while still exposing rates immediately. Individual remaining charges can be inspected in the finalist/detail view; the grouped amount must reconcile with the total.
- **Price meaning:** Source unit prices remain pre-tax. Clearly identify the tax assumptions applied to estimated totals and distinguish costs in euros from prices per kWh or per kW. Preserve existing rounding conventions and calculate from unrounded source rates.
- **Power comparison continuity:** Retain the existing shared day/month/year selector, remembered device preference, current-tariff-unit fallback and daily fallback when no current tariff exists. Preserve the 30-day month and 365-day year conversion convention, original entered quote precision, the reference of 1 kW in each power period, and the distinction between separate, shared-per-period and combined prices. This display control must not alter source prices, actual charges or ranking.
- **Ranking and baseline:** Rank eligible calculable tariffs by estimated period cost. The designated current tariff remains the savings baseline regardless of finalist selection. An expired candidate stays outside ranking; an expired current tariff remains the baseline when calculable. Show excluded/incomplete tariffs with their reason and editing actions. Where no calculable current tariff exists, show savings as unavailable. Make higher cost distinguishable from savings, and avoid inventing a winner among unavailable estimates.
- **Responsive layout:** Use one full-width overview instead of card and sidebar duplication. Keep tariff names pinned, put total/savings first, preserve legible widths and confine horizontal overflow to the comparison region. Use stable headers, aligned numeric values, keyboard-accessible scrolling, visible focus, accessible row/column labels and readable action names. Do not depend solely on color to indicate current tariff, cheapest tariff, exclusion or simulation.
- **Visual scope:** Retain green/cream colors and the established identity, using a compact financial-worksheet direction. Compress introductory content once tariffs exist. Preserve a useful empty state and initial tariff/profile setup. The comparison tab is the redesign scope; shared-shell adjustments should support it without redesigning unrelated tabs.
- **Shared inputs:** Present consumption as one comparison profile, retaining precise P1/P2/P3 entry and the existing power, duration and tax controls. If profile fields remain reachable from tariff creation or editing, explicitly identify them as shared and keep unadopted simulated values out of that editor's saved profile.
- **Simulation ownership:** Hold consumption simulations separately from the persistent workspace. Derive one effective comparison profile for the overview and finalist calculations. Changing simulated total or distribution changes consumption only; contracted power, billing duration and tax assumptions retain their current profile values. One explicit adoption updates consumption in the comparison profile through existing synchronization.
- **Simulation invariants:** Total adjustment preserves a known distribution; distribution adjustment preserves total kWh. Show resulting period quantities. Handle decimal-comma entry, zero, missing and invalid inputs without negative consumption, invalid totals, silently fabricated shares or stale results presented as current. If all consumption is zero or its distribution is unknown, require an explicit distribution before scaling to a positive total rather than dividing by zero or guessing equal shares.
- **Simulation lifecycle:** “Restablecer” returns to the underlying comparison profile, and “Usar este consumo” explicitly adopts valid simulated consumption. Reset/adoption must not overwrite unrelated profile edits made during the experiment. Unadopted values must stay out of browser workspace drafts, account autosaves, ordinary exports, tariff edits and bill creation. Reload must recover the underlying workspace without silently adopting the simulation. Clear transient simulation/selection state when replacing the workspace owner or loading a replacement workspace.
- **Persistence facts:** Current workspace behavior includes local browser persistence and automatic signed-in synchronization with version/conflict handling. Preserve these behaviors; do not reintroduce a manual whole-workspace save requirement. Simulation activity must not claim its hypothetical consumption has been saved as the household profile. Adoption uses normal success, retry, failure and conflict reporting.
- **Finalist selection:** Support up to three selected tariffs on desktop and keep the detail view usable with horizontal scrolling on narrow screens. Default to the current tariff when present without making it mandatory. Explicit removal remains respected rather than repeatedly reselecting it. Selection uses tariff identity, not row position; recalculation and sorting must not select a different offer. Removing a tariff removes any corresponding finalist selection. Selecting finalists never calls the current-contract change flow.
- **Finalist content:** Align available cost components, unit rates and offer details; use the same effective comparison profile and accounting as the overview. Show missing information honestly. The current tariff remains the savings baseline even when omitted from the finalist view.
- **Manual price confirmation:** Move the existing personal-review record into tariff details with wording such as “Última revisión por ti” and “He revisado estos precios.” Remove repeated unchecked-price warnings and the bulk confirmation action from the main comparison. Preserve stored dates and the existing manual, calculation-neutral semantics. Rewording must not imply fetching, third-party verification, confirmed estimated charges or a newly designed review lifecycle.
- **Existing flows:** Preserve tariff creation, editing, duplication, removal, dated current-contract/history updates, estimated-charge notices and the separate historical PVPC comparison. Keep comparison estimates distinct from recorded bills. During an unadopted simulation, make resetting or adopting the consumption explicit before initiating bill creation from a comparison; retain the existing requirement to check actual invoice figures.
- **Data and API scope:** No new persisted scenario collection, database migration, workspace schema expansion or API endpoint is required. Existing saved tariffs, profiles, dates, history and bill snapshots must remain compatible. Finalist selection and temporary simulations are presentation state, not current-contract or history records.
- **Delivery:** Implement on `codex/comparison-redesign`. Validate and provide a separate working preview URL alongside the existing design URL. Use isolated preview data and the established preview deployment setup. The requested deliverable does not include merging to main or deploying the redesign to production.

## Testing Decisions

- **Primary seam:** Test through the comparison workspace's user-facing interaction boundary. Drive labeled controls and tariff actions, then assert displayed estimates, selected tariffs and externally observable saving/reload outcomes. Prefer one coherent workflow-level suite over tests of every presentational component, internal hook or helper.
- **Proposed new coverage:** There is no checked-in browser workflow suite in the inspected repository. Add focused automated comparison-workspace scenarios at the browser boundary, using the real calculator and the existing workspace boundary. Choose the browser harness during implementation; the specification does not mandate a new component-testing framework or changes to production interfaces solely for tests.
- **Existing seams and prior art:** Existing Node test-runner suites exercise calculator outputs, normalized power-price equivalence, domain validation, bill snapshots, browser-draft recovery and workspace synchronization. The synchronization tests already model persistence and transport callbacks, timer-driven autosave, failures and version conflicts. Reuse these patterns for targeted regression coverage instead of reimplementing their assertions inside UI tests. Account and relational-storage integration tests use explicitly configured disposable local databases; report skips honestly when those environments are unavailable.
- **Good tests:** Assert behavior the household can observe and domain outcomes that protect its data. Use concrete expected values independently calculated from known synthetic inputs. Avoid assertions about CSS class names, component structure, hook counts or private state. Do not derive expected prices by calling the same calculation path under test, and do not add snapshot-only tests for reversible styling changes.
- **Representative comparison:** Exercise eight synthetic tariffs spanning flat and period energy prices, different power units and charging structures, optional/estimated charges, an expired candidate and an incomplete candidate. Freeze relevant dates so eligibility is deterministic. Verify ranking, current-tariff identification, unavailable results, displayed source prices, tax labels and grouped-charge reconciliation. Also cover empty and single-tariff states, no current tariff, an incomplete current tariff and a current tariff that is not cheapest.
- **Simulation behavior:** With a known split of 100/150/250 kWh, increasing total from 500 to 600 kWh must produce 120/180/300 kWh. Redistributing to 20/20/60 percent at 600 kWh must produce 120/120/360 kWh. Verify overview, savings and finalists all reflect the same scenario, reset restores the base profile, and adoption changes only intended consumption values. Include a price fixture where redistribution changes the cheapest offer, rather than merely updating identical rows.
- **Input edges:** Exercise explicit zero versus unknown consumption, an all-zero total, incomplete periods, decimal commas, invalid or negative entries and rounding-sensitive distributions. Assert no invented distribution, negative quantities, inconsistent period sums or false zero-cost winner. Verify combined power quotes remain unavailable for unequal contracted powers.
- **Persistence isolation:** Demonstrate that simulation alone produces no changed persisted comparison profile. Test an unrelated tariff edit and an autosave while a simulation is active, then reload and confirm the saved profile still matches the base. After adoption, reload must show adopted consumption through normal guest/account saving behavior. Exercise a failed or conflicting adoption using the existing synchronization boundary, checking that the UI reports the actual outcome and does not lose unrelated edits.
- **Finalist behavior:** Cover current-tariff default, explicit removal of that default, adding/removing/replacing selections at the three-tariff limit, no-current operation, reordering after simulation, and deletion of a selected tariff. Assert selection never changes current-contract identity or creates history. Match overview and detail amounts for each selected tariff.
- **Retained behavior:** Check the shared power unit changes every applicable display and survives reload without modifying source quotes or costs. Check original quote structures, unequal-power clarification, estimated-charge notices, expired-current baseline, tariff editing/duplication, historical PVPC separation and the safe entry to bill creation during simulation. Review-date wording/placement must preserve dates and must not affect cost or eligibility.
- **Visual and accessibility verification:** Inspect desktop and phone layouts with the same representative data. Verify scrolling stays within the table, pinned names do not obscure adjacent content, totals and rates remain legible, and two finalists can be inspected on a phone. Exercise keyboard scrolling, selection, row actions and dialog focus. Compare both designs using the same synthetic profile and tariffs; screenshots supplement behavior checks rather than substitute for them.
- **Completion checks:** Run applicable repository lint, type, test and production-build checks after implementation. Verify the deployed preview loads, the key guest comparison workflow works and any claimed account-preview behavior has actually been exercised. Record limitations and skipped environment-dependent checks with delivery.
- **Testing-boundary agreement:** The user confirmed “Yes, test the user-visible workflow,” approving the comparison-workspace interaction boundary with existing calculator and persistence tests underneath.

## Out of Scope

- Redesigning the broader “my prices” concept, deciding whether review metadata should exist, changing its lifecycle, or rebuilding the relationship between manually entered offers and current contracts. The user explicitly deferred this review despite accepting the limited wording/placement change.
- Automatically fetching, checking or updating supplier prices; scraping offers; supplier switching; or expanding market coverage.
- A new visual identity, a redesign of tariff history or recorded-bill analytics, or unrelated authentication/account changes.
- Changes to billing formulas, taxation rules, power conversion conventions, offer eligibility or historical PVPC methodology.
- Saved or named scenario libraries, scenario history, shared simulations, or new scenario persistence/API contracts.
- Automatically converting simulations into bills, changing existing bill snapshots, or treating estimated consumption and charges as actual invoice data.
- Adding production sample tariffs or claiming synthetic validation prices are current real-world offers.
- Merging the branch or replacing the production design as part of preview delivery.

## Further Notes

The user explicitly chose table-first comparison with an optional finalist view; both cost breakdown and unit prices visible immediately; both total-consumption and distribution controls; horizontal scrolling; temporary simulations with explicit adoption; a removable current-tariff default in finalist selection; and retention of the visual identity while restructuring the workspace.

The table and simulation workflow are the implementation priority. The finalist view remains in the agreed scope, although the design discussion acknowledged that a good overview may reduce how often it is needed. Keep it optional and judge it against the same readability goal.

The inspiration was the aligned price table at https://ahijoneshoy.es/comparador-tarifas-luz and the idea of selected-column product comparisons. Reuse the interaction principles rather than copying either site's design or importing its tariff data.

The domain glossary now defines consumption simulation separately from the comparison profile and recorded consumption. No relevant ADR exists. This reversible presentation redesign does not by itself justify a new ADR; retain the domain and accounting boundaries already established.

Implementation details that do not alter this behavior, such as exact column dimensions, component names, control styling and browser-test harness choice, remain engineering/design choices rather than additional product interview questions.

## Comments

- Initial request: reduce scrolling, enable meaningful tariff comparison and easier consumption changes, clarify price-check language, consider a price table and selected-column comparison, use frontend-design and grill-with-docs, and deliver a separate branch preview.
- Interview round 1: user selected table first with optional finalist comparison, both cost breakdown and unit prices visible immediately, and controls for both total kWh and time distribution.
- Design challenge: user asked whether redesign was justified. Inspection found duplicated tariff presentation and distant consumption controls. The resulting direction retains the visual identity and prioritizes a conventional comparison table and shared consumption workflow.
- Interview round 2: user selected horizontal scrolling, accepted temporary simulations and removable current-tariff selection, accepted limited price-review wording/placement while explicitly deferring the broader “my prices” review, and accepted retaining the visual identity while restructuring the workspace.
- Final shared-understanding check: user replied “ok, let's lock this $to-spec,” authorizing publication of the agreed design as a ready-for-agent specification.
- Specification synthesis: existing code confirmed local persistence and automatic account synchronization, plus a remembered power-comparison unit selector. This specification preserves both and isolates temporary simulations from autosave.
- Testing-boundary confirmation: user approved testing the user-visible workflow, including table results, simulations, reset/adopt, finalist selection and saved-data behavior, while reusing existing calculator and persistence tests.
