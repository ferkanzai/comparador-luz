# 04 — Update the comparison profile from the invoice

**What to build:** The review screen offers "update comparison profile", ticked by default. It shows the profile's current values next to the invoice's (days, kWh per period, contracted power, taxes); saving replaces the comparison profile. The recorded bill also carries this invoice's profile snapshot.

**Blocked by:** 01 — Import an invoice image and record its bill.

**Status:** ready-for-agent

- [ ] Profile from the invoice: days `finF − iniF`, consumption `cfP1..3`, power `pP1`, `pP2`, taxes on with the IVA and IEE rates in force.
- [ ] Before → after values shown when the profile already has values.
- [ ] Unticked, the comparison profile is unchanged.
- [ ] The bill's profile snapshot is this invoice's profile, regardless of the checkbox.
