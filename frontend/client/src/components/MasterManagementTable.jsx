import React, { useState, useEffect } from 'react';
import '../styles.css';

export default function MasterManagementTable({ 
  title, 
  columns, 
  data = [], 
  loading = false,
  onEdit,
  onDelete,
  onCreate,
  searchPlaceholder = "Search..."
}) {
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    let result = data;

    // Apply search
    if (searchText) {
      result = result.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }

    // Apply sort
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        const comparison = aVal > bVal ? 1 : -1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredData(result);
  }, [data, searchText, sortBy, sortOrder]);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  return (
    <div className="master-management-container">
      <div className="master-header">
        <h1>{title}</h1>
        <button className="btn btn-primary" onClick={onCreate}>
          + New {title.split(' ')[0]}
        </button>
      </div>

      <div className="master-controls">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-wrapper">
          <table className="master-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{ cursor: col.sortable !== false ? 'pointer' : 'default' }}
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span className="sort-indicator">
                        {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="no-data">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item._id}>
                    {columns.map(col => (
                      <td key={`${item._id}-${col.key}`}>
                        {col.render ? col.render(item[col.key], item) : item[col.key]}
                      </td>
                    ))}
                    <td className="actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onDelete(item._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
