# Separate comparison candidates, contract periods, and bill snapshots

Comparison candidates are editable experiments, while recorded contract periods describe the household's actual terms during dated intervals; copying a recorded tariff back into comparison must create an independent candidate. Correcting a contract record repairs that period, whereas a real price change starts a new period, and neither operation rewrites tariff snapshots already attached to bills. We accept explicit copying and separate corrections rather than propagating edits through shared tariff identity, because otherwise experimentation or fixing one record can silently change contract history and recorded invoices.

## Where the current contract is stored

The open current contract period is stored in `workspace.tariffs`, marked by `currentId`, rather than in its own field, because it is also the comparison's baseline row: every candidate's difference is measured against it, and it has to be rankable and selectable as a finalist like any offer. Only its start date (`currentSince`) lives outside the tariff; `tariffPeriods` rebuilds it as the open period ahead of `history`.

The separation is therefore a rule of the operations, not of the storage. Editing the current contract is a correction, never an experiment:

- `workspace-actions.ts` is the entry point: `saveTariff` refuses the current contract's id, and only records a first current contract; `removeTariff` sends the current contract to `removePeriod`.
- `tariff-periods.ts` owns every change to the current period: `recordCurrent` (a real change, which gives the new contract a fresh id and archives a copy of the previous one), `correctPeriod` and `removePeriod`.
- The dashboard routes editing the current tariff to the correction form, and the comparison table offers no "delete offer" action for it.
- `carryFinalists` (`finalist-selection.ts`) moves a finalist selection of the promoted offer or the former contract onto the new current contract, so the fresh id isn't visible as a lost selection.

Revisit this if another writer needs to reason about the current contract without these operations, for example the per-record sync protocol considered in ticket 28, where merging concurrent edits to one tariff record must know whether it is an offer or a contract period.
