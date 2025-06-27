import React, { useState } from 'react';
import Papa from 'papaparse';
import { evaluateAnswer, checkFeedbackCriterion } from './api';
import type { CsvRow, ProcessedResult, EvaluationResult, ApiResponse } from './types';
import { v4 as uuidv4 } from 'uuid';
import { defaultSystemPrompt, initialFeedbackCriteria } from './prompts';

// Table row type for editable table
interface EditableRow extends CsvRow {
  id: string;
}

export default function UnifiedEvaluator() {
  // Prompt
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [promptFileError, setPromptFileError] = useState<string | null>(null);

  // Criteria
  const [criteriaEnabled, setCriteriaEnabled] = useState(false);
  const [criteria, setCriteria] = useState(JSON.stringify(initialFeedbackCriteria));
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  // Table data
  const [rows, setRows] = useState<EditableRow[]>([{
    id: uuidv4(),
    question: '',
    answer: '',
    guidance: '',
    expectedResult: 'correct',
  }]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Number of evaluations
  const [requestCount, setRequestCount] = useState(1);

  // Results
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle prompt file upload
  const handlePromptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSystemPrompt(event.target?.result as string || '');
    };
    reader.onerror = () => setPromptFileError('Failed to read file');
    reader.readAsText(file);
  };

  // Handle CSV upload for table
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const parsed = (results.data as CsvRow[]).filter(row => row.question && row.answer);
          setRows(parsed.map(row => ({ ...row, id: uuidv4() })));
          setCsvError(null);
        } catch {
          setCsvError('Invalid CSV format');
        }
      },
      error: () => setCsvError('Failed to parse CSV'),
    });
  };

  // Editable table handlers
  const updateRow = (id: string, field: keyof CsvRow, value: string) => {
    setRows(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };
  const addRow = () => setRows([...rows, { id: uuidv4(), question: '', answer: '', guidance: '', expectedResult: 'correct' }]);
  const removeRow = (id: string) => setRows(rows => rows.filter(row => row.id !== id));

  // Handle criteria JSON
  const handleCriteriaChange = (val: string) => {
    setCriteria(val);
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) throw new Error();
      setCriteriaError(null);
    } catch {
      setCriteriaError('Invalid JSON');
    }
  };

  // Evaluation
  const handleEvaluate = async () => {
    setIsProcessing(true);
    setResults([]);
    let parsedCriteria: any[] = [];
    if (criteriaEnabled) {
      try {
        parsedCriteria = JSON.parse(criteria);
      } catch {
        setCriteriaError('Invalid JSON');
        setIsProcessing(false);
        return;
      }
    }
    const promises = rows.map(async (row) => {
      try {
        const response = await evaluateAnswer(row.question, row.guidance, '', row.answer, systemPrompt, requestCount) as ApiResponse;
        let criteriaChecks = undefined;
        if (criteriaEnabled && parsedCriteria.length > 0) {
          // Only evaluate criteria matching the feedback result
          const relevantCriteria = parsedCriteria.filter((c: any) => c.result === (response.result || 'incorrect'));
          criteriaChecks = await Promise.all(relevantCriteria.map(async (c: any) => {
            try {
              const check = await checkFeedbackCriterion(row.question, row.answer, response.feedback || response.evaluation || '', c);
              return { name: c.name, passed: check.passed, explanation: check.explanation };
            } catch {
              return { name: c.name, passed: null, explanation: 'Error' };
            }
          }));
        }
        return {
          ...row,
          actualResult: response.result || 'incorrect',
          feedback: (response.emoji ? response.emoji + ' ' : '') + (response.feedback || response.evaluation || 'No feedback provided'),
          emoji: response.emoji,
          matches: (response.result || 'incorrect') === row.expectedResult,
          ...(criteriaChecks !== undefined ? { criteriaChecks } : {}),
        };
      } catch {
        return {
          ...row,
          actualResult: 'incorrect' as EvaluationResult,
          feedback: 'Error processing row',
          matches: false,
        };
      }
    });
    const allResults = await Promise.all(promises);
    setResults(allResults);
    setIsProcessing(false);
  };

  return (
    <div className="container">
      {/* Prompt input */}
      <div className="horizontal-group">
        <div className="input-group flex-1">
          <label htmlFor="systemPrompt">System Prompt:</label>
          <textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={8}
            className="system-prompt-input"
          />
          <input type="file" accept=".txt,.md" onChange={handlePromptUpload} />
          {promptFileError && <div className="error">{promptFileError}</div>}
        </div>
        <div className="input-group flex-1" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label htmlFor="criteria-enabled" className="criteria-label">Feedback Criteria (JSON):</label>
            <input
              id="criteria-enabled"
              type="checkbox"
              checked={criteriaEnabled}
              onChange={e => setCriteriaEnabled(e.target.checked)}
              style={{ marginLeft: 4 }}
            />
            <span style={{ fontSize: '0.95em', color: '#666' }}>Enable</span>
          </div>
          <textarea
            rows={8}
            className="system-prompt-input"
            value={criteria}
            onChange={e => handleCriteriaChange(e.target.value)}
            disabled={!criteriaEnabled}
          />
          {criteriaError && <div className="criteria-error">{criteriaError}</div>}
          <div className="criteria-example">
            Example: <code>{`[{"name":"Encouraging","description":"The feedback should be encouraging."}]`}</code>
          </div>
        </div>
      </div>

      {/* Table input or CSV upload */}
      <div className="input-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 8, fontSize: '10px' }}>
          <button type="button" onClick={addRow} title="Add row" style={{ fontSize: '1.2em', padding: '0.2em 0.5em' }}>➕ <span style={{fontSize:'10px',marginLeft:2}}>Add row</span></button>
          <label htmlFor="csv-upload" style={{ display: 'inline', margin: 0 }}>
            <input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
            <button type="button" style={{ fontSize: '1.2em', padding: '0.2em 0.5em' }} onClick={() => document.getElementById('csv-upload')?.click()}>📂</button>
          </label>
          <span style={{ color: '#666' }}>
            Add rows from CSV
          </span>
          <button type="button" onClick={() => setRows([{ id: uuidv4(), question: '', answer: '', guidance: '', expectedResult: 'correct' }])} title="Clear table" style={{ fontSize: '1.2em', padding: '0.2em 0.5em', marginLeft: 8 }}>🗑️ <span style={{fontSize:'10px',marginLeft:2}}>Clear table</span></button>
          {csvError && <div className="error">{csvError}</div>}
        </div>
        <div style={{ maxHeight: 180, overflowY: 'auto', fontSize: '10px' }}>
          <table className="results-table" style={{ fontSize: '10px' }}>
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
                  <td><textarea value={row.question} onChange={e => updateRow(row.id, 'question', e.target.value)} rows={2} style={{ fontSize: '10px', width: '100%' }} /></td>
                  <td><textarea value={row.answer} onChange={e => updateRow(row.id, 'answer', e.target.value)} rows={2} style={{ fontSize: '10px', width: '100%' }} /></td>
                  <td><textarea value={row.guidance} onChange={e => updateRow(row.id, 'guidance', e.target.value)} rows={2} style={{ fontSize: '10px', width: '100%' }} /></td>
                  <td>
                    <select value={row.expectedResult} onChange={e => updateRow(row.id, 'expectedResult', e.target.value)} style={{ fontSize: '10px' }}>
                      <option value="correct">correct</option>
                      <option value="partially">partially</option>
                      <option value="incorrect">incorrect</option>
                    </select>
                  </td>
                  <td>
                    <button type="button" onClick={() => removeRow(row.id)} title="Remove row" style={{ fontSize: '1.2em', padding: '0.2em 0.5em' }}>➖</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Number of evaluations */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', marginTop: 16 }}>
        <label htmlFor="requestCount" style={{ marginRight: 4, whiteSpace: 'nowrap' }}>Number of Evaluations:</label>
        <input
          type="number"
          id="requestCount"
          value={requestCount}
          onChange={e => setRequestCount(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
          max="5"
          className="number-input"
          style={{ fontSize: '10px', width: 40, marginRight: 4 }}
        />
        <span className="input-hint" style={{ fontSize: '10px', marginRight: 8, whiteSpace: 'nowrap' }}>(1-5 parallel requests for more consistent results)</span>
        <button onClick={handleEvaluate} disabled={isProcessing || rows.length === 0} style={{ marginLeft: 8, fontSize: '10px', padding: '0.2em 1em' }}>
          Evaluate
        </button>
      </div>

      {/* Results */}
      <div className="results-section">
        <h2>Evaluation Results</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isProcessing && <p className="processing">Processing entries...</p>}
        </div>
        {/* Summary row */}
        {!isProcessing && results.length > 0 && (
          <div className="results-summary-row" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: 8, fontSize: '10px' }}>
            <div className="results-summary" style={{ display: 'flex', gap: '1.5rem' }}>
              <div className="summary-item matches"><span className="summary-label">Matches:</span> <span className="summary-value">{results.filter(r => r.matches).length}</span></div>
              <div className="summary-item non-matches"><span className="summary-label">Non-matches:</span> <span className="summary-value">{results.filter(r => !r.matches).length}</span></div>
              <div className="summary-item total"><span className="summary-label">Total:</span> <span className="summary-value">{results.length}</span></div>
            </div>
            <button type="button" onClick={() => setResults([])} className="clear-results-button" style={{ fontSize: '10px', padding: '0.2em 1em' }}>Clear Results</button>
          </div>
        )}
        {results.length > 0 && (
          <div className="results-table-container full-width-table">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Answer</th>
                  <th>Guidance</th>
                  <th>Expected</th>
                  <th>Result</th>
                  <th>Status</th>
                  <th>Feedback</th>
                  <th>Criteria</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td>{result.question}</td>
                    <td>{result.answer}</td>
                    <td>{result.guidance}</td>
                    <td>{result.expectedResult}</td>
                    <td>{result.actualResult}</td>
                    <td>{result.matches ? '✔️' : '❌'}</td>
                    <td>{result.feedback}</td>
                    <td>
                      {result.criteriaChecks && result.criteriaChecks.map((c, i) => (
                        <span key={i} style={{ marginRight: 8 }}>
                          {c.passed === true && '✔️'}
                          {c.passed === false && '❌'}
                          {c.passed === null && '⏳'}
                          {' '}{c.name}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
