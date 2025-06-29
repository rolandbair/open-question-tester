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
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Prompt #</th>
                <th style={{ width: 220, minWidth: 120, maxWidth: 320 }}>Question</th>
                <th style={{ width: 120, minWidth: 80, maxWidth: 200 }}>Answer</th>
                <th style={{ width: 320, minWidth: 120, maxWidth: 480 }}>Guidance</th>
                <th style={{ width: 60, minWidth: 40, maxWidth: 80 }}>Expected</th>
                <th style={{ width: 60, minWidth: 40, maxWidth: 80 }}>Result</th>
                <th style={{ width: 36, minWidth: 24, maxWidth: 48 }}>Status</th>
                <th style={{ width: 260, minWidth: 120, maxWidth: 400 }}>Feedback</th>
                <th style={{ width: 180, minWidth: 80, maxWidth: 220 }}>Criteria</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="result-row">
                  <td title={String(result.promptNumber)}>
                    {String(result.promptNumber).length > 12 ? String(result.promptNumber).slice(0, 12) + '…' : result.promptNumber}
                  </td>
                  <td title={result.question}>
                    {result.question.length > 180 ? result.question.slice(0, 180) + '…' : result.question}
                  </td>
                  <td title={result.answer}>
                    {result.answer.length > 100 ? result.answer.slice(0, 100) + '…' : result.answer}
                  </td>
                  <td title={result.guidance}>
                    {result.guidance.length > 400 ? result.guidance.slice(0, 400) + '…' : result.guidance}
                  </td>
                  <td title={result.expectedResult}>
                    {String(result.expectedResult).length > 20 ? String(result.expectedResult).slice(0, 20) + '…' : result.expectedResult}
                  </td>
                  <td title={result.actualResult}>
                    {String(result.actualResult).length > 20 ? String(result.actualResult).slice(0, 20) + '…' : result.actualResult}
                  </td>
                  <td title={result.matches ? '✔️' : '❌'}>
                    {result.matches ? '✔️' : '❌'}
                  </td>
                  <td title={result.feedback}>
                    {result.feedback.length > 300 ? result.feedback.slice(0, 300) + '…' : result.feedback}
                  </td>
                  <td title={result.criteriaChecks ? result.criteriaChecks.map((c) => `${c.passed === true ? '✔️' : c.passed === false ? '❌' : '⏳'} ${c.name}`).join(', ') : ''}>
                    {result.criteriaChecks && (
                      <span>
                        {(() => {
                          const str = result.criteriaChecks.map((c) => `${c.passed === true ? '✔️' : c.passed === false ? '❌' : '⏳'} ${c.name}`).join(', ');
                          return str.length > 60 ? str.slice(0, 60) + '…' : str;
                        })()}
                      </span>
                    )}
                  </td>
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
