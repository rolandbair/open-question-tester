import React, { useState } from 'react';
import Papa from 'papaparse';
import { evaluateAnswer, checkFeedbackCriterion } from './api';
import type { CsvRow, ProcessedResult, EvaluationResult, ApiResponse } from './types';
import { v4 as uuidv4 } from 'uuid';
import { defaultSystemPrompt, initialFeedbackCriteria } from './prompts';
import PromptCriteriaSection from './PromptCriteriaSection';
import TestDataSection from './TestDataSection';
import ResultsSection from './ResultsSection';

// Table row type for editable table
interface EditableRow extends CsvRow {
  id: string;
}

export default function UnifiedEvaluator() {
  // --- State: Prompts ---
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [promptFileError, setPromptFileError] = useState<string | null>(null);
  type PromptFileType = null | string[] | { number: string; prompt: string }[];
  const [promptFilePrompts, setPromptFilePrompts] = useState<PromptFileType>(null);
  const [promptFileName, setPromptFileName] = useState<string | null>(null);

  // --- State: Criteria ---
  const [criteriaEnabled, setCriteriaEnabled] = useState(false);
  const [criteria, setCriteria] = useState(JSON.stringify(initialFeedbackCriteria));
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  // --- State: Table Data ---
  const [rows, setRows] = useState<EditableRow[]>([{
    id: uuidv4(),
    question: '',
    answer: '',
    guidance: '',
    expectedResult: 'correct',
  }]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // --- State: Evaluation ---
  const [requestCount, setRequestCount] = useState(1);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- State: UI Collapsible Sections ---
  const [showPrompts, setShowPrompts] = useState(true);
  const [showData, setShowData] = useState(true);
  const [showResults, setShowResults] = useState(true);

  // --- Handlers: Prompt File Upload ---
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

  // --- Handlers: CSV Upload for Table ---
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

  // --- Handlers: Editable Table ---
  const updateRow = (id: string, field: keyof CsvRow, value: string) => {
    setRows(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };
  const addRow = () => setRows([...rows, { id: uuidv4(), question: '', answer: '', guidance: '', expectedResult: 'correct' }]);
  const removeRow = (id: string) => setRows(rows => rows.filter(row => row.id !== id));

  // --- Handlers: Criteria JSON ---
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

  // --- Handlers: Evaluation ---
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

  // --- Render ---
  return (
    <div className="container flex flex-col gap">
      {/* Test Prompts Section */}
      <PromptCriteriaSection
        showPrompts={showPrompts}
        setShowPrompts={setShowPrompts}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        promptFilePrompts={promptFilePrompts}
        setPromptFilePrompts={setPromptFilePrompts}
        promptFileName={promptFileName}
        setPromptFileName={setPromptFileName}
        promptFileError={promptFileError}
        handlePromptUpload={handlePromptUpload}
        criteriaEnabled={criteriaEnabled}
        setCriteriaEnabled={setCriteriaEnabled}
        criteria={criteria}
        criteriaError={criteriaError}
        handleCriteriaChange={handleCriteriaChange}
      />

      {/* Test Data Section */}
      <TestDataSection
        showData={showData}
        setShowData={setShowData}
        rows={rows}
        setRows={setRows}
        csvError={csvError}
        handleCsvUpload={handleCsvUpload}
        updateRow={updateRow}
        addRow={addRow}
        removeRow={removeRow}
      />

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
      <ResultsSection
        showResults={showResults}
        setShowResults={setShowResults}
        isProcessing={isProcessing}
        results={results}
        setResults={setResults}
      />
    </div>
  );
}
