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
  currentPrompt?: string;
  currentCriteria?: string;
  testFileName?: string;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  showResults,
  setShowResults,
  isProcessing,
  results,
  setResults,
  testDataColumns = [],
  showCriteriaChecks = false,
  currentPrompt = '',
  currentCriteria = '',
  testFileName = '',
}) => {
  const [downloadText, setDownloadText] = React.useState('');

  const downloadResults = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runDateTime = new Date().toLocaleString();
    
    // Create CSV content
    let csvContent = '';
    
    // Add metadata header
    csvContent += `Test Run Report\n`;
    csvContent += `Generated: ${runDateTime}\n`;
    csvContent += `Test File: ${testFileName}\n`;
    csvContent += `Custom Notes: ${downloadText}\n`;
    csvContent += `\n`;
    
    // Add prompt information
    if (currentPrompt) {
      csvContent += `Prompt:\n`;
      csvContent += `"${currentPrompt.replace(/"/g, '""')}"\n`;
      csvContent += `\n`;
    }
    
    // Add criteria information if enabled
    if (showCriteriaChecks && currentCriteria) {
      csvContent += `Criteria:\n`;
      csvContent += `"${currentCriteria.replace(/"/g, '""')}"\n`;
      csvContent += `\n`;
    }
    
    // Add summary table
    csvContent += `Summary by Prompt\n`;
    csvContent += `Prompt #,Total,Result Incorrect,Result Correct,Criteria Incorrect,Criteria Correct\n`;
    
    Array.from(new Set(results.map(r => r.promptNumber))).forEach((num) => {
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
      
      csvContent += `${num},${total},${hasExpectedResults ? resultIncorrect : '-'},${hasExpectedResults ? resultCorrect : '-'},${showCriteriaChecks ? criteriaIncorrect : '-'},${showCriteriaChecks ? criteriaCorrect : '-'}\n`;
    });
    
    csvContent += `\n`;
    
    // Add detailed results table
    csvContent += `Detailed Results\n`;
    
    // Build column headers
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
      // Add correctness column if expectedResult exists
      if (results.some(r => typeof (r as any).expectedResult !== 'undefined')) {
        orderedColumns.push('correct');
      }
    }
    
    // Add remaining columns (except already included and excluded)
    const remainingKeys = allKeys.filter(key => 
      !orderedColumns.includes(key) && 
      !exclude.has(key) && 
      key !== 'criteriaChecks' &&
      key !== 'responseTime'
    );
    orderedColumns.push(...remainingKeys);
    
    // Add responseTime column at the end (before criteriaChecks)
    if (allKeys.includes('responseTime')) {
      orderedColumns.push('responseTime');
    }
    
    // Add criteriaChecks at the very end if requested
    if (showCriteriaChecks && allKeys.includes('criteriaChecks')) {
      orderedColumns.push('criteriaChecks');
    }
    
    // Write headers
    csvContent += orderedColumns.map(col => col.charAt(0).toUpperCase() + col.slice(1)).join(',') + '\n';
    
    // Write data rows
    results.forEach((result) => {
      const row: string[] = [];
      orderedColumns.forEach(key => {
        if (key === 'correct') {
          // This is the correctness column we added after 'result'
          const hasExpected = typeof (result as any).expectedResult !== 'undefined';
          const hasResult = typeof (result as any).result !== 'undefined';
          if (hasExpected && hasResult) {
            const match = (result as any).result === (result as any).expectedResult;
            row.push(match ? 'TRUE' : 'FALSE');
          } else {
            row.push('');
          }
        } else {
          let val = (result as any)[key];
          if (key === 'criteriaChecks' && Array.isArray(val)) {
            const str = val.map((c: any) => `${c.passed === true ? 'PASS' : c.passed === false ? 'FAIL' : 'PENDING'}: ${c.name}`).join('; ');
            row.push(`"${str.replace(/"/g, '""')}"`);
          } else if (typeof val === 'object' && val !== null) {
            row.push(`"${JSON.stringify(val).replace(/"/g, '""')}"`);
          } else if (typeof val === 'string' && val.includes(',')) {
            row.push(`"${val.replace(/"/g, '""')}"`);
          } else {
            row.push(val !== undefined ? String(val) : '');
          }
        }
      });
      csvContent += row.join(',') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `test-results-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
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
            <div className="flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Custom notes for export..."
                value={downloadText}
                onChange={(e) => setDownloadText(e.target.value)}
                style={{ minWidth: '200px' }}
              />
              <button type="button" onClick={downloadResults}>
                Download Results
              </button>
            </div>
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
                    key !== 'criteriaChecks' &&
                    key !== 'responseTime'
                  );
                  orderedColumns.push(...remainingKeys);
                  
                  // Add responseTime column at the end (before criteriaChecks)
                  if (allKeys.includes('responseTime')) {
                    orderedColumns.push('responseTime');
                  }
                  
                  // Add criteriaChecks at the very end if requested
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
                      key !== 'criteriaChecks' &&
                      key !== 'responseTime'
                    );
                    orderedColumns.push(...remainingKeys);
                    
                    // Add responseTime column at the end (before criteriaChecks)
                    if (allKeys.includes('responseTime')) {
                      orderedColumns.push('responseTime');
                    }
                    
                    // Add criteriaChecks at the very end if requested
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
                      if (key === 'responseTime' && typeof val === 'number') {
                        const timeStr = val < 1000 ? `${val}ms` : `${(val / 1000).toFixed(1)}s`;
                        return <td key={key} title={`${val}ms`}>{timeStr}</td>;
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
};

export default ResultsSection;
