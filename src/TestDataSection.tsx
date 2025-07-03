import React from 'react';
import type { FlowColumn } from './flows';

interface EditableRow {
  id: string;
  [key: string]: any;
}

interface TestDataSectionProps {
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
  rows: EditableRow[];
  addRow: () => void;
  updateRow: (id: string, field: string, value: string) => void;
  removeRow: (id: string) => void;
  handleCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setRows: React.Dispatch<React.SetStateAction<EditableRow[]>>;
  csvError: string | null;
  columns: FlowColumn[];
}

const TestDataSection: React.FC<TestDataSectionProps> = ({
  showData,
  setShowData,
  rows,
  addRow,
  updateRow,
  removeRow,
  handleCsvUpload,
  setRows,
  csvError,
  columns,
}) => (
  <div className="rounded shadow" style={{ background: 'var(--bg)' }}>
    <div className="flex title section-toggle" onClick={() => setShowData(v => !v)}>
      <span className="section-toggle-label">
        {showData ? '▼' : '►'} Test Data
      </span>
    </div>
    {showData && (
      <div className="section-content text">
        <div className="input-section flex flex-col gap-sm rounded shadow" style={{ background: 'var(--bg-alt)' }}>
          <div className="table-toolbar">
            <button type="button" onClick={addRow} title="Add row">➕ <span className="table-toolbar-label">Add row</span></button>
            <label htmlFor="csv-upload" className="table-toolbar-label">
              <input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
              <button type="button" onClick={() => document.getElementById('csv-upload')?.click()}>📂</button>
            </label>
            <span className="table-toolbar-label table-toolbar-csv">Add rows from CSV</span>
            <button type="button" onClick={() => setRows([{ id: rows[0]?.id || '', ...Object.fromEntries(columns.map(col => [col.key, ''])) }])} title="Clear table">🗑️ <span className="table-toolbar-label">Clear table</span></button>
            {csvError && <div className="error">{csvError}</div>}
          </div>
          <div className="table-scroll">
            <table className="table results-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map(col => (
                      <td key={col.key}>
                        <textarea
                          value={row[col.key] || ''}
                          onChange={e => updateRow(row.id, col.key, e.target.value)}
                          rows={2}
                          className="table-input"
                        />
                      </td>
                    ))}
                    <td>
                      <button type="button" onClick={() => removeRow(row.id)} title="Remove row" className="table-remove-btn">➖</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default TestDataSection;
