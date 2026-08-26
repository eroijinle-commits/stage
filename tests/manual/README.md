# Manual Test Checklists

> Run these checklists before each release. Automated tests cover unit/integration logic; manual tests verify real API connectivity and UX flows.

---

## a) API Connectivity

- [ ] Token valid, balance fetched
- [ ] SportIndex returns fixtures
- [ ] FixturePage returns markets
- [ ] Bet placement works (₦1 test)
- [ ] Rate limiting handled gracefully (retry)
- [ ] Network error shows user-friendly message

---

## b) Discovery Flow

- [ ] Search soccer matches
- [ ] Filter by date (Today, Tomorrow, Weekend, Next 7, Next 30)
- [ ] Filter by league/tournament
- [ ] Select multiple matches
- [ ] Apply same market to all selected matches
- [ ] Add to slip
- [ ] Fixture details load when clicking a match
- [ ] Live fixtures show score and status
- [ ] Pagination works correctly

---

## c) Slip Flow

- [ ] Add/remove selections
- [ ] Toggle singles/parlay mode
- [ ] Enter stakes (per leg for singles, single stake for parlay)
- [ ] Verify potential return calculations match expected values
- [ ] Verify total stake is correct
- [ ] Place bets
- [ ] Check results (success/failure messages)
- [ ] Balance updates after successful bet
- [ ] Duplicate selections are prevented
- [ ] Suspended/inactive selections flagged

---

## d) History Flow

- [ ] View bet history
- [ ] Filter by status (pending, won, lost, settled)
- [ ] Expand bet details
- [ ] Verify stats match history data
- [ ] Date range filter works

---

## e) Analytics Flow

- [ ] View analytics dashboard
- [ ] Change date range
- [ ] KPI cards show correct values
- [ ] Charts render correctly
- [ ] Export data works (CSV)

---

## f) Settings Flow

- [ ] Change API token
- [ ] Test connection button works
- [ ] Create staking preset
- [ ] Set default preset
- [ ] Save filter preset
- [ ] Change odds format (decimal, fractional, american)
- [ ] Change currency
- [ ] Clear history
- [ ] Theme toggle (dark/light)

---

## g) Error Scenarios

- [ ] Invalid API token shows session expired message
- [ ] Insufficient balance shows top-up message
- [ ] Odds changed notification appears
- [ ] Market suspended notification appears
- [ ] Network disconnection handled gracefully
- [ ] Rate limit (429) shows retry message
- [ ] Empty states render correctly (no bets, no fixtures)

---

## Notes

- Test with a **test account** using small stakes (₦1-₦100)
- Document any bugs found with steps to reproduce
- Check browser console for unexpected errors
- Verify responsive layout on different screen sizes
