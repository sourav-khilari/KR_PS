# TODO - UI Fixes (Imported Data Center)

- [x] Fix sticky-column scrolling/hidden-right issues by removing hardcoded `left` offsets
- [x] Update `frontend/client/src/styles.css` to use `left: var(--sticky-left, 0px)` for sticky columns
- [x] Update `frontend/client/src/components/ImportedDataCenter.jsx` to compute sticky left offsets dynamically based on visible columns
- [ ] Manually verify: Imported Data Center tab, horizontal scroll, column toggling, sticky header + sticky columns alignment
