import React, { useState, useEffect } from 'react';
import { checkFeedbackCriterion } from './api';
import type { EvaluationResult } from './types';
import type { EvaluationParams } from './types/modelTypes';
import { SUPPORTED_MODELS } from './types/modelTypes';
import { v4 as uuidv4 } from 'uuid';
import PromptCriteriaSection from './PromptCriteriaSection';
import TestDataSection from './TestDataSection';
import ResultsSection from './ResultsSection';
import ModelSelection from './components/ModelSelection';
import { parsePromptFile, parseTableCsv } from './utils/csvUtils';
import { flows } from './flows';
import type { FlowConfig } from './flows';
// import { log } from 'console';

// Table row type for editable table
interface EditableRow {
  id: string;
  [key: string]: any;
}

export default function UnifiedEvaluator() {
  // --- State: Flow Selection ---
  const [selectedFlowId, setSelectedFlowId] = useState(flows[0].id);
  const selectedFlow: FlowConfig = flows.find(f => f.id === selectedFlowId)!;

  // --- State: Model Selection ---
  const [evaluationParams, setEvaluationParams] = useState<EvaluationParams>({
    model: SUPPORTED_MODELS[0].id
  });

  // --- State: Prompts ---
  const [systemPrompt, setSystemPrompt] = useState(selectedFlow.systemPrompt || '');
  const [promptFileError, setPromptFileError] = useState<string | null>(null);
  type PromptFileType = null | string[] | { number: string; prompt: string }[];
  const [promptFilePrompts, setPromptFilePrompts] = useState<PromptFileType>(null);
  const [promptFileName, setPromptFileName] = useState<string | null>(null);

  // --- State: Criteria ---
  const [criteriaEnabled, setCriteriaEnabled] = useState(false);
  const [criteria, setCriteria] = useState(JSON.stringify(selectedFlow.feedbackCriteria || []));
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  // --- State: Table Data ---
  const [rows, setRows] = useState<EditableRow[]>([{
    id: uuidv4(),
    ...Object.fromEntries(selectedFlow.testDataColumns.map(col => [col.key, '']))
  }]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // --- State: Evaluation ---
  const [requestCount, setRequestCount] = useState(1);
  const [results, setResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- State: UI Collapsible Sections ---
  const [showPrompts, setShowPrompts] = useState(true);
  const [showData, setShowData] = useState(true);
  const [showResults, setShowResults] = useState(true);

  // --- Handlers: Flow Change ---
  const handleFlowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const flowId = e.target.value;
    setSelectedFlowId(flowId);
    const flow = flows.find(f => f.id === flowId)!;
    setRows([{ id: uuidv4(), ...Object.fromEntries(flow.testDataColumns.map(col => [col.key, ''])) }]);
    setResults([]);
    setCsvError(null);
    setSystemPrompt(flow.systemPrompt || '');
    setCriteria(JSON.stringify(flow.feedbackCriteria || []));
    setPromptFilePrompts(null);
    setPromptFileName(null);
    setPromptFileError(null);
  };

  // Keep systemPrompt and criteria in sync with selectedFlow if flow changes externally
  useEffect(() => {
    setSystemPrompt(selectedFlow.systemPrompt || '');
    setCriteria(JSON.stringify(selectedFlow.feedbackCriteria || []));
  }, [selectedFlow]);

  // --- Handlers: Prompt File Upload ---
  const handlePromptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPromptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      if (file.name.endsWith('.csv')) {
        const prompts = parsePromptFile(text);
        if (prompts) {
          setPromptFilePrompts(prompts);
          setPromptFileError(null);
        } else {
          setPromptFilePrompts(null);
          setPromptFileError('Invalid CSV format for prompts. Each row should have a prompt number and prompt text.');
        }
      } else {
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
    const requiredKeys = selectedFlow.testDataColumns.filter(col => col.required).map(col => col.key);
    parseTableCsv(
      file,
      requiredKeys,
      (validRows: any[]) => {
        // Logging for debugging (already handled in csvUtils)
        setRows(validRows.map(row => ({ id: uuidv4(), ...row })));
        setCsvError(null);
      },
      (msg) => setCsvError(msg)
    );
  };

  // --- Handlers: Editable Table ---
  const updateRow = (id: string, field: string, value: string) => {
    setRows(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };
  const addRow = () => setRows([...rows, { id: uuidv4(), ...Object.fromEntries(selectedFlow.testDataColumns.map(col => [col.key, ''])) }]);
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
    const allPromises: Promise<any>[] = [];
    rows.forEach(row => {
      prompts.forEach(({ number, prompt }) => {
        for (let i = 0; i < requestCount; i++) {
          allPromises.push((async () => {
            let feedbackVal = '';
            try {
              const response = await selectedFlow.evaluate(
                row,
                prompt,
                systemPrompt,
                selectedFlow.testDataColumns,
                evaluationParams
              );
              // Use the feedback field as defined by the flow, fallback to response.feedback or response.evaluation
              const feedbackField = selectedFlow.feedbackField || 'ERROR';
              feedbackVal = response[feedbackField];
              const criteriaPrompt = selectedFlow.checkFeedbackCriterionPrompt;
              let criteriaChecks = undefined;
              if (criteriaEnabled && parsedCriteria.length > 0) {
                // If any criterion has a 'result' field, filter by result; otherwise, check all criteria
                let relevantCriteria: any[];
                if (parsedCriteria.some((c: any) => 'result' in c)) {
                  const resultVal = response.result ?? response.status ?? undefined;
                  relevantCriteria = parsedCriteria.filter((c: any) => c.result ? c.result === resultVal : true);
                } else {
                  relevantCriteria = parsedCriteria;
                }
                // Use the first two required columns for criteria checking if available
                const requiredCols = selectedFlow.testDataColumns.filter(col => col.required);
                const requiredColValues = requiredCols.map(col => row[col.key] || '');
                criteriaChecks = await Promise.all(relevantCriteria.map(async (c: any) => {
                  try {
                    const check = await checkFeedbackCriterion(
                      [...requiredColValues, feedbackVal],
                      c,
                      criteriaPrompt,
                      evaluationParams
                    );
                    return { name: c.name, passed: check.passed, explanation: check.explanation };
                  } catch (err) {
                    console.error('[Criteria Evaluation] Error in checkFeedbackCriterion:', err);
                    return { name: c.name, passed: null, explanation: 'Error' };
                  }
                }));
              }
              // Build result object: merge all response fields, add matches if expected, add promptUsed and promptNumber
              // Filter out 'type' property from response before merging
              const { type, ...responseWithoutType } = response;
              const resultObj: any = {
                ...row,
                ...responseWithoutType,
                promptNumber: number,
                ...(criteriaChecks !== undefined ? { criteriaChecks } : {}),
              };
              // If the response contains a 'matches' field, perform correctness logic
              if (typeof response.result !== 'undefined' && typeof response.expected !== 'undefined') {
                resultObj.matches = response.result === response.expected;
              }
              return resultObj;
            } catch {
              return {
                ...row,
                actualResult: 'incorrect' as EvaluationResult,
                feedback: 'Error processing row',
                matches: false,
                promptNumber: number,
              };
            }
          })());
        }
      });
    });
    const allResults = await Promise.all(allPromises);
    setResults(allResults);
    setIsProcessing(false);
  };

  // --- Render ---
  return (
    <div className="container flex flex-col gap">
      {/* Flow Selection and Model Selection */}
      <div className="rounded shadow text" style={{ marginBottom: 16, padding: 8 }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="flow-select">Flow:</label>
            <select id="flow-select" value={selectedFlowId} onChange={handleFlowChange} style={{ marginLeft: 8 }}>
              {flows.map(flow => (
                <option key={flow.id} value={flow.id}>{flow.name}</option>
              ))}
            </select>
          </div>
          <ModelSelection 
            evaluationParams={evaluationParams}
            onParamsChange={setEvaluationParams}
          />
        </div>
      </div>

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
        gitlabPromptConfig={selectedFlow.gitlabPrompt}
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
        columns={selectedFlow.testDataColumns}
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
        testDataColumns={selectedFlow?.testDataColumns || []}
        showCriteriaChecks={criteriaEnabled}
        currentPrompt={systemPrompt}
        currentCriteria={criteria}
        testFileName={promptFileName || 'manual-input'}
      />
    </div>
  );
}
