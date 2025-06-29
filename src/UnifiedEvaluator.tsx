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
  // Use a union type for promptFilePrompts: null | string[] | {number: string, prompt: string}[]
  type PromptFileType = null | string[] | { number: string; prompt: string }[];
  const [promptFilePrompts, setPromptFilePrompts] = useState<PromptFileType>(null); // null = not using file
  const [promptFileName, setPromptFileName] = useState<string | null>(null);

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

  // Collapsible section state
  const [showPrompts, setShowPrompts] = useState(true);
  const [showData, setShowData] = useState(true);
  const [showResults, setShowResults] = useState(true);

  // Handle prompt file upload
  const handlePromptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPromptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      if (file.name.endsWith('.csv')) {
        // Parse CSV for prompts with number
        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              // Each row: [number, prompt]
              const prompts = (results.data as string[][])
                .filter(row => row[0] && row[1])
                .map(row => ({ number: row[0], prompt: row[1] }));
              if (prompts.length === 0) throw new Error();
              setPromptFilePrompts(prompts);
              setPromptFileError(null);
            } catch {
              setPromptFilePrompts(null);
              setPromptFileError('Invalid CSV format for prompts. Each row should have a prompt number and prompt text.');
            }
          },
          error: () => {
            setPromptFilePrompts(null);
            setPromptFileError('Failed to parse CSV');
          },
        });
      } else {
        // Treat as plain text prompt, assign number '1'
        setPromptFilePrompts([{ number: '1', prompt: text }]);
        setPromptFileError(null);
      }
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
    // Use prompts from file if present, else from text field
    let prompts: { number: string | number; prompt: string }[];
    if (promptFilePrompts && promptFilePrompts.length > 0 && typeof promptFilePrompts[0] === 'object') {
      prompts = promptFilePrompts as { number: string | number; prompt: string }[];
    } else if (promptFilePrompts && promptFilePrompts.length > 0) {
      prompts = (promptFilePrompts as string[]).map((p, i) => ({ number: i + 1, prompt: p as string }));
    } else {
      prompts = [{ number: 1, prompt: systemPrompt }];
    }
    const allPromises: Promise<ProcessedResult>[] = [];
    rows.forEach(row => {
      prompts.forEach(({ number, prompt }) => {
        allPromises.push((async () => {
          try {
            const response = await evaluateAnswer(row.question, row.guidance, '', row.answer, prompt, requestCount) as ApiResponse;
            let criteriaChecks = undefined;
            if (criteriaEnabled && parsedCriteria.length > 0) {
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
              promptUsed: prompt,
              promptNumber: number,
              ...(criteriaChecks !== undefined ? { criteriaChecks } : {}),
            };
          } catch {
            return {
              ...row,
              actualResult: 'incorrect' as EvaluationResult,
              feedback: 'Error processing row',
              matches: false,
              promptUsed: prompt,
              promptNumber: number,
            };
          }
        })());
      });
    });
    const allResults = await Promise.all(allPromises);
    setResults(allResults);
    setIsProcessing(false);
  };

  return (
    <div className="container flex flex-col gap">
      {/* Test Prompts Section */}
      <div className="rounded shadow" style={{ background: 'var(--bg)' }}>
        <div className="flex title section-toggle" onClick={() => setShowPrompts(v => !v)}>
          <span className="section-toggle-label">
            {showPrompts ? '▼' : '►'} Test Prompts
          </span>
        </div>
        {showPrompts && (
          <div className="horizontal-group flex gap section-content prompt-criteria-row">
            <div className="input-group flex-1 prompt-group">
              <div className="prompt-label-row">
                <label htmlFor="systemPrompt">System Prompt:</label>
                {promptFilePrompts && (
                  <span className="prompt-file-indicator">
                    {Array.isArray(promptFilePrompts) && typeof promptFilePrompts[0] === 'object'
                      ? `(${promptFilePrompts.length} from file${promptFileName ? `: ${promptFileName}` : ''})`
                      : `(${promptFilePrompts.length} from file${promptFileName ? `: ${promptFileName}` : ''})`}
                  </span>
                )}
                {!promptFilePrompts && (
                  <div className="info prompt-info">Using prompt from text field.</div>
                )}
                {promptFileError && <div className="error">{promptFileError}</div>}
              </div>
              <textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={e => { setSystemPrompt(e.target.value); setPromptFilePrompts(null); setPromptFileName(null); }}
                rows={8}
                className="system-prompt-input full-width-textarea"
                disabled={!!promptFilePrompts}
              />
              <input className="prompt-file-upload" type="file" accept=".txt,.md,.csv" onChange={handlePromptUpload} />
            </div>
            <div className="input-group flex-1 criteria-group">
              <div className="criteria-label-row">
                <label htmlFor="criteria-enabled" className="criteria-label">Feedback Criteria (JSON):</label>
                <input
                  id="criteria-enabled"
                  type="checkbox"
                  checked={criteriaEnabled}
                  onChange={e => setCriteriaEnabled(e.target.checked)}
                  className="criteria-checkbox"
                />
                <span className="criteria-enable-label">Enable</span>
              </div>
              <textarea
                rows={8}
                className="system-prompt-input full-width-textarea"
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
        )}
      </div>

      {/* Test Data Section */}
      <div className="rounded shadow" style={{ background: 'var(--bg)' }}>
        <div className="flex title section-toggle" onClick={() => setShowData(v => !v)}>
          <span className="section-toggle-label">
            {showData ? '▼' : '►'} Test Data
          </span>
        </div>
        {showData && (
          <div className="section-content text">
            {/* Table input or CSV upload */}
            <div className="input-section flex flex-col gap-sm rounded shadow" style={{ background: 'var(--bg-alt)' }}>
              <div className="table-toolbar">
                <button type="button" onClick={addRow} title="Add row">➕ <span className="table-toolbar-label">Add row</span></button>
                <label htmlFor="csv-upload" className="table-toolbar-label">
                  <input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                  <button type="button" onClick={() => document.getElementById('csv-upload')?.click()}>📂</button>
                </label>
                <span className="table-toolbar-label table-toolbar-csv">Add rows from CSV</span>
                <button type="button" onClick={() => setRows([{ id: uuidv4(), question: '', answer: '', guidance: '', expectedResult: 'correct' }])} title="Clear table">🗑️ <span className="table-toolbar-label">Clear table</span></button>
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

      {/* Number of evaluations and Evaluate button (not collapsible) */}
      <div className="rounded shadow text eval-toolbar">
        <label htmlFor="requestCount" className="eval-label">Number of Evaluations:</label>
        <input
          type="number"
          id="requestCount"
          value={requestCount}
          onChange={e => setRequestCount(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
          max="5"
          className="number-input"
        />
        <span className="input-hint eval-hint">(1-5 parallel requests for more consistent results)</span>
        <button onClick={handleEvaluate} disabled={isProcessing || rows.length === 0}>Evaluate</button>
      </div>

      {/* Test Result Section (collapsible) */}
      <div className="rounded shadow text" style={{ background: 'var(--bg)' }}>
        <div className="flex title section-toggle" onClick={() => setShowResults(v => !v)}>
          <span className="section-toggle-label">
            {showResults ? '▼' : '►'} Test Result
          </span>
        </div>
        {showResults && (
          <div className="section-content text">
            {/* Only one clear results button, not red, in summary row */}
            {!isProcessing && results.length > 0 && (
              <div className="flex results-clear-row">
                <div style={{ flex: 1 }} />
                <button type="button" onClick={() => setResults([])}>
                  Clear Results
                </button>
              </div>
            )}
            {/* Summary row */}
            {!isProcessing && results.length > 0 && (
              <div className="results-summary-row flex flex-col gap-sm">
                <table className="results-summary-table">
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
              </div>
            )}
            {results.length > 0 && (
              <div className="results-table-container rounded shadow full-width-table">
                <table className="table results-table" style={{ tableLayout: 'fixed' }}>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
