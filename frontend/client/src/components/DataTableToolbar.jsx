export function DataTableToolbar({
  allVisibleSelected,
  onToggleSelectAll,
  selectedCount,
  onApproveSelected,
  onRejectSelected,
  onDeleteSelected,
  busy
}) {
  return (
    <div className="toolbar-row">
      <label className="checkbox-pill">
        <input type="checkbox" checked={allVisibleSelected} onChange={onToggleSelectAll} />
        <span>Select all visible</span>
      </label>
      <div className="action-row">
        <button type="button" disabled={busy || !selectedCount} onClick={onApproveSelected}>Approve Selected</button>
        <button type="button" className="secondary" disabled={busy || !selectedCount} onClick={onRejectSelected}>Reject Selected</button>
        <button type="button" className="secondary danger" disabled={busy || !selectedCount} onClick={onDeleteSelected}>Delete Selected</button>
      </div>
    </div>
  );
}
