import React from 'react';
import type { ProcessedResult } from './types';

interface ResultsSectionProps {
  showResults: boolean;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessing: boolean;
  results: ProcessedResult[];
  setResults: React.Dispatch<React.SetStateAction<ProcessedResult[]>>;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  showResults,
  setShowResults,
  isProcessing,
  results,
  setResults,
}) => (
  <div className="rounded shadow text" style={{ background: 'var(--bg)' }}>
    <div className="flex title section-toggle" onClick={() => setShowResults(v => !v)}>
      <span className="section-toggle-label">
        {showResults ? '▼' : '►'} Test Result
      </span>
    </div>
    {showResults && (
      <div className="section-content text">
        {!isProcessing && results.length > 0 && (
          <div className="flex results-clear-row">
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setResults([])}>
              Clear Results
            </button>
          </div>
        )}
        {!isProcessing && results.length > 0 && (
          <table className="results-summary-table" style={{ marginBottom: '1em' }}>
            <thead>
              <tr>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Prompt #</th>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Matches</th>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Non-matches</th>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Total</th>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Correct</th>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Incorrect</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(results.map(r => r.promptNumber))).map((num) => {
                const group = results.filter(r => r.promptNumber === num);
                const correctCount = group.filter(r => r.actualResult === 'correct').length;
                const incorrectCount = group.filter(r => r.actualResult === 'incorrect').length;
                return (
                  <tr key={num} className="results-summary">
                    <td className="results-summary-title">{num}</td>
                    <td className="summary-item matches">{group.filter(r => r.matches).length}</td>
                    <td className="summary-item non-matches">{group.filter(r => !r.matches).length}</td>
                    <td className="summary-item total">{group.length}</td>
                    <td className="summary-item correct">{correctCount}</td>
                    <td className="summary-item incorrect">{incorrectCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {results.length > 0 && (
          <table className="table results-table results-table-container rounded shadow full-width-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {(() => {
                  // Dynamically determine columns: always show promptNumber, then all unique keys in results except id, criteriaChecks
                  const exclude = new Set(['id', 'subject']);
                  const allKeys = Array.from(new Set(results.flatMap(r => Object.keys(r))));
                  const columns = ['promptNumber', ...allKeys.filter(k => k !== 'promptNumber' && !exclude.has(k))];
                  let headerCells: React.ReactNode[] = [];
                  columns.forEach(key => {
                    headerCells.push(<th key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</th>);
                    // If key is 'result', add a correctness header cell after it if expectedResult exists in any row
                    if (key === 'result' && results.some(r => typeof (r as any).expectedResult !== 'undefined')) {
                      headerCells.push(<th key={key + '-correctness'}>Correct</th>);
                    }
                  });
                  return headerCells;
                })()}
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="result-row">
                  {(() => {
                    const exclude = new Set(['id', 'subject']);
                    const allKeys = Array.from(new Set(results.flatMap(r => Object.keys(r))));
                    const columns = ['promptNumber', ...allKeys.filter(k => k !== 'promptNumber' && !exclude.has(k))];
                    return columns.map(key => {
                      // Use type assertion to allow dynamic key access
                      let val = (result as any)[key];
                      // If key is 'result', show the value, and after it, add a correctness cell if expectedResult exists
                      if (key === 'result') {
                        const cells = [];
                        cells.push(<td key={key} title={String(val)}>{val !== undefined ? String(val) : ''}</td>);
                        // Add correctness cell right after 'result' if expectedResult exists
                        if (typeof val !== 'undefined' && typeof (result as any).expectedResult !== 'undefined') {
                          const match = val === (result as any).expectedResult;
                          cells.push(<td key={key + '-correctness'}>{match ? '✔️' : '❌'}</td>);
                        } else {
                          cells.push(<td key={key + '-correctness'}></td>);
                        }
                        return cells;
                      }
                      if (key === 'criteriaChecks' && Array.isArray(val)) {
                        const str = val.map((c: any) => `${c.passed === true ? '✔️' : c.passed === false ? '❌' : '⏳'} ${c.name}`).join(', ');
                        return <td key={key} title={str}>{str.length > 60 ? str.slice(0, 60) + '…' : str}</td>;
                      }
                      if (typeof val === 'string' && val.length > 300) {
                        return <td key={key} title={val}>{val.slice(0, 300) + '…'}</td>;
                      }
                      if (typeof val === 'boolean') {
                        return <td key={key}>{val ? '✔️' : '❌'}</td>;
                      }
                      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                        // Render objects as JSON (truncated if long)
                        const json = JSON.stringify(val);
                        return <td key={key} title={json}>{json.length > 300 ? json.slice(0, 300) + '…' : json}</td>;
                      }
                      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
                        // Render arrays of objects as a summary (count) and JSON in tooltip
                        const json = JSON.stringify(val);
                        return <td key={key} title={json}>[{val.length} items]</td>;
                      }
                      return <td key={key} title={String(val)}>{val !== undefined ? String(val) : ''}</td>;
                    });
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )}
  </div>
);

export default ResultsSection;
