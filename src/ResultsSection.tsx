import React from 'react';
import type { ProcessedResult } from './types';
import type { FlowColumn } from './flows';

interface ResultsSectionProps {
  showResults: boolean;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessing: boolean;
  results: ProcessedResult[];
  setResults: React.Dispatch<React.SetStateAction<ProcessedResult[]>>;
  testDataColumns?: FlowColumn[];
  showCriteriaChecks?: boolean;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  showResults,
  setShowResults,
  isProcessing,
  results,
  setResults,
  testDataColumns = [],
  showCriteriaChecks = false,
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
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Total</th>
                {/* Only show result correctness columns if any result has expectedResult */}
                {results.some(r => typeof (r as any).expectedResult !== 'undefined') ? (
                  <>
                    <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Result Incorrect</th>
                    <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Result Correct</th>
                  </>
                ) : (
                  <>
                    <th style={{ width: 36, minWidth: 24, maxWidth: 48, color: '#666' }}>Result Incorrect</th>
                    <th style={{ width: 36, minWidth: 24, maxWidth: 48, color: '#666' }}>Result Correct</th>
                  </>
                )}
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Criteria Incorrect</th>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Criteria Correct</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(results.map(r => r.promptNumber))).map((num) => {
                const group = results.filter(r => r.promptNumber === num);
                const total = group.length;
                
                // Check if any result in this group has expectedResult for comparison
                const hasExpectedResults = group.some(r => typeof (r as any).expectedResult !== 'undefined');
                
                // Result correctness (based on result vs expectedResult comparison)
                let resultCorrect = 0;
                let resultIncorrect = 0;
                if (hasExpectedResults) {
                  resultCorrect = group.filter(r => {
                    const hasExpected = typeof (r as any).expectedResult !== 'undefined';
                    const hasResult = typeof (r as any).result !== 'undefined';
                    return hasExpected && hasResult && (r as any).result === (r as any).expectedResult;
                  }).length;
                  resultIncorrect = group.filter(r => {
                    const hasExpected = typeof (r as any).expectedResult !== 'undefined';
                    const hasResult = typeof (r as any).result !== 'undefined';
                    return hasExpected && hasResult && (r as any).result !== (r as any).expectedResult;
                  }).length;
                }
                
                // Criteria correctness (based on criteriaChecks)
                let criteriaCorrect = 0;
                let criteriaIncorrect = 0;
                if (showCriteriaChecks) {
                  group.forEach(r => {
                    if (r.criteriaChecks && Array.isArray(r.criteriaChecks)) {
                      r.criteriaChecks.forEach(check => {
                        if (check.passed === true) criteriaCorrect++;
                        else if (check.passed === false) criteriaIncorrect++;
                      });
                    }
                  });
                }
                
                return (
                  <tr key={num} className="results-summary">
                    <td className="results-summary-title">{num}</td>
                    <td className="summary-item total">{total}</td>
                    {hasExpectedResults ? (
                      <>
                        <td className="summary-item incorrect" style={{ backgroundColor: '#fee', color: '#c53030' }}>{resultIncorrect}</td>
                        <td className="summary-item correct" style={{ backgroundColor: '#efe', color: '#38a169' }}>{resultCorrect}</td>
                      </>
                    ) : (
                      <>
                        <td className="summary-item" style={{ color: '#666' }}>-</td>
                        <td className="summary-item" style={{ color: '#666' }}>-</td>
                      </>
                    )}
                    <td className="summary-item incorrect" style={{ backgroundColor: '#fee', color: '#c53030' }}>{showCriteriaChecks ? criteriaIncorrect : '-'}</td>
                    <td className="summary-item correct" style={{ backgroundColor: '#efe', color: '#38a169' }}>{showCriteriaChecks ? criteriaCorrect : '-'}</td>
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
                  // Build column order as specified:
                  // 1. promptNumber
                  // 2. testDataColumns (except id, subject)
                  // 3. result + correctness (if exists)
                  // 4. other result entities (except type)
                  // 5. criteriaChecks (if showCriteriaChecks is true)
                  
                  const exclude = new Set(['id', 'subject', 'type']);
                  const allKeys = Array.from(new Set(results.flatMap(r => Object.keys(r))));
                  
                  // Start with promptNumber
                  const orderedColumns = ['promptNumber'];
                  
                  // Add testDataColumns (filtered)
                  const testDataKeys = testDataColumns
                    .map(col => col.key)
                    .filter(key => !exclude.has(key) && key !== 'promptNumber');
                  orderedColumns.push(...testDataKeys);
                  
                  // Add result column
                  if (allKeys.includes('result')) {
                    orderedColumns.push('result');
                  }
                  
                  // Add remaining columns (except already included and excluded)
                  const remainingKeys = allKeys.filter(key => 
                    !orderedColumns.includes(key) && 
                    !exclude.has(key) && 
                    key !== 'criteriaChecks'
                  );
                  orderedColumns.push(...remainingKeys);
                  
                  // Add criteriaChecks at the end if requested
                  if (showCriteriaChecks && allKeys.includes('criteriaChecks')) {
                    orderedColumns.push('criteriaChecks');
                  }
                  
                  let headerCells: React.ReactNode[] = [];
                  orderedColumns.forEach(key => {
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
                    // Use the same column ordering logic as in the header
                    const exclude = new Set(['id', 'subject', 'type']);
                    const allKeys = Array.from(new Set(results.flatMap(r => Object.keys(r))));
                    
                    // Start with promptNumber
                    const orderedColumns = ['promptNumber'];
                    
                    // Add testDataColumns (filtered)
                    const testDataKeys = testDataColumns
                      .map(col => col.key)
                      .filter(key => !exclude.has(key) && key !== 'promptNumber');
                    orderedColumns.push(...testDataKeys);
                    
                    // Add result column
                    if (allKeys.includes('result')) {
                      orderedColumns.push('result');
                    }
                    
                    // Add remaining columns (except already included and excluded)
                    const remainingKeys = allKeys.filter(key => 
                      !orderedColumns.includes(key) && 
                      !exclude.has(key) && 
                      key !== 'criteriaChecks'
                    );
                    orderedColumns.push(...remainingKeys);
                    
                    // Add criteriaChecks at the end if requested
                    if (showCriteriaChecks && allKeys.includes('criteriaChecks')) {
                      orderedColumns.push('criteriaChecks');
                    }
                    
                    return orderedColumns.map(key => {
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
