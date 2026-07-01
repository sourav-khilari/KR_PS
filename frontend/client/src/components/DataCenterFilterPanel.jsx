export function DataCenterFilterPanel({
  filters,
  onFilterChange,
  onApply,
  onReset,
  transportCompanies,
  clientCompanies,
  plants,
  owners,
  filteredPlants,
  onClientCompanyChange
}) {
  return (
    <div className="panel-surface inner-panel">
      <div className="section-header compact">
        <div>
          <h4>Filters</h4>
          <p className="muted-copy">Search and narrow the imported rows without changing backend behavior.</p>
        </div>
        <div className="action-row">
          <button type="button" onClick={onApply}>Apply</button>
          <button type="button" className="secondary" onClick={onReset}>Reset</button>
        </div>
      </div>

      <div className="filter-grid">
        <label className="field-shell">
          <span>Transport Company</span>
          <select name="transportCompanyId" value={filters.transportCompanyId} onChange={onFilterChange}>
            <option value="">All</option>
            {transportCompanies.map((item) => (
              <option key={item._id} value={item._id}>{item.companyName}</option>
            ))}
          </select>
        </label>
        <label className="field-shell">
          <span>Client Company</span>
          <select name="clientCompanyId" value={filters.clientCompanyId} onChange={onClientCompanyChange}>
            <option value="">All</option>
            {clientCompanies.map((item) => (
              <option key={item._id} value={item._id}>{item.companyName}</option>
            ))}
          </select>
        </label>
        <label className="field-shell">
          <span>Plant</span>
          <select name="plantId" value={filters.plantId} onChange={onFilterChange}>
            <option value="">All</option>
            {filteredPlants.map((item) => (
              <option key={item._id} value={item._id}>{item.plantName}</option>
            ))}
          </select>
        </label>
        <label className="field-shell">
          <span>Invoice Number</span>
          <input name="invoiceNumber" value={filters.invoiceNumber} onChange={onFilterChange} />
        </label>
        <label className="field-shell">
          <span>Truck Number</span>
          <input name="truckNumber" value={filters.truckNumber} onChange={onFilterChange} />
        </label>
        <label className="field-shell">
          <span>Owner</span>
          <select name="owner" value={filters.owner} onChange={onFilterChange}>
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner._id} value={owner.ownerName}>{owner.ownerName}</option>
            ))}
          </select>
        </label>
        <label className="field-shell">
          <span>Destination</span>
          <input name="destination" value={filters.destination} onChange={onFilterChange} />
        </label>
        <label className="field-shell">
          <span>Status</span>
          <select name="status" value={filters.status} onChange={onFilterChange}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="field-shell">
          <span>From Date</span>
          <input type="date" name="startDate" value={filters.startDate} onChange={onFilterChange} />
        </label>
        <label className="field-shell">
          <span>To Date</span>
          <input type="date" name="endDate" value={filters.endDate} onChange={onFilterChange} />
        </label>
      </div>
    </div>
  );
}
