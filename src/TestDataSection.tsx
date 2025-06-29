import React from 'react';
import type { CsvRow } from './types';

interface EditableRow extends CsvRow {
  id: string;
}

interface TestDataSectionProps {
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
  rows: EditableRow[];
  addRow: () => void;
  updateRow: (id: string, field: keyof CsvRow, value: string) => void;
  removeRow: (id: string) => void;
  handleCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setRows: React.Dispatch<React.SetStateAction<EditableRow[]>>;
  csvError: string | null;
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
            <button type="button" onClick={() => setRows([{ id: rows[0]?.id || '', question: '', answer: '', guidance: '', expectedResult: 'correct' }])} title="Clear table">🗑️ <span className="table-toolbar-label">Clear table</span></button>
            {csvError && <div className="error">{csvError}</div>}
          </div>
          <div className="table-scroll">
            <table className="table results-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Answer</th>
                  <th>Guidance</th>
                  <th>Expected Result</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><textarea value={row.question} onChange={e => updateRow(row.id, 'question', e.target.value)} rows={2} className="table-input" /></td>
                    <td><textarea value={row.answer} onChange={e => updateRow(row.id, 'answer', e.target.value)} rows={2} className="table-input" /></td>
                    <td><textarea value={row.guidance} onChange={e => updateRow(row.id, 'guidance', e.target.value)} rows={2} className="table-input" /></td>
                    <td>
                      <select value={row.expectedResult} onChange={e => updateRow(row.id, 'expectedResult', e.target.value)} className="table-input">
                        <option value="correct">correct</option>
                        <option value="partially">partially</option>
                        <option value="incorrect">incorrect</option>
                      </select>
                    </td>
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
