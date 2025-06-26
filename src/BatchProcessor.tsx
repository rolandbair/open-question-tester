import React, { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import Papa from 'papaparse';
import { evaluateAnswer, checkFeedbackCriterion } from './api';
import type { CsvRow, ProcessedResult, EvaluationResult, ApiResponse } from './types';
import { CheckCircle, XCircle, MinusCircle } from 'react-feather';

// Using the CsvRow interface from types.ts

const ResultIcon = ({ result, matches }: { result: EvaluationResult, matches: boolean }) => {
  const style = { color: matches ? '#22c55e' : '#ef4444' };
  
  switch (result) {
    case 'correct':
      return <CheckCircle style={style} />;
    case 'incorrect':
      return <XCircle style={style} />;
    case 'partially':
      return <MinusCircle style={style} />;
  }
};

const defaultSystemPrompt = `{Language}: Infer the language and texting style from the question.
You are an educational evaluator designed to provide engaging feedback.
Guide the student towards the correct understanding without directly giving away any part of the sample solution or evaluation criteria.
Evaluate the answer **only** against the guidance and not the truth.
Use the Teacher's Sample Answer(s) as a quality example, but NEVER as a rigid template for structure, wording, or order, nor to infer unstated requirements.
Positively evaluate insufficient enumerations.

Return ONLY a JSON response with this structure:
{
"type": {
    "type": "string",
    "enum": ["openQuestionFeedback"]
},
"feedback": {
    "type": "string",
    "description": "The feedback and evaluation of the provided answer"
},              
"result": {
    "type": "string",
    "enum": ["correct", "partially", "incorrect"]
},
"emoji": {
    "type": "string",
    "description": "An emoji visualizing the result",
    "enum": ["👍", "👉", "👎"]
} 
}
`;

// Move FEEDBACK_CRITERIA to state for user editing
// const [criteria, setCriteria] = useState([
//   { name: 'Encouraging', description: 'The feedback should be encouraging and supportive.' },
//   { name: 'No Solution Given Away', description: 'The feedback should not directly give away the correct solution.' }
// ]);

export function CriteriaSettingsPanel({ criteria, setCriteria }: { criteria: any[], setCriteria: (c: any[]) => void }) {
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(criteria, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonValue(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      if (Array.isArray(parsed)) {
        setCriteria(parsed);
        setError(null);
      } else {
        setError('JSON must be an array of criteria objects.');
      }
    } catch (err) {
      setError('Invalid JSON');
    }
  };

  return (
    <div className="input-group flex-1">
      <label htmlFor="criteriaBox" className="criteria-label">Feedback Criteria (JSON):</label>
      <textarea
        id="criteriaBox"
        rows={8}
        className="system-prompt-input"
        value={jsonValue}
        onChange={handleChange}
        placeholder='[{"name":"Encouraging","description":"The feedback should be encouraging."}]'
      />
      {error && <div className="criteria-error">{error}</div>}
      <div className="criteria-example">
        Example: <code>{`[{"name":"Encouraging","description":"The feedback should be encouraging."}]`}</code>
      </div>
    </div>
  );
}

export default function BatchProcessor() {
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [systemPrompt, setSystemPrompt] = useState(() => {
    const saved = localStorage.getItem('batch_system_prompt');
    return saved || defaultSystemPrompt;
  });
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [criteria, setCriteria] = useState([
    { name: 'No Solution is Revealed', description: 'No part of the expected solution may be explicitly or implicitly disclosed – not even to explain what is missing. This rule overrides all other criteria.' },
    { name: 'No Suggestions that Lead to Solutions', description: 'Avoid hints, examples, or rephrasings that could lead the student to the correct answer.' },
    { name: 'Correct Elements are Acknowledged', description: "Correct parts of the student's response should be explicitly acknowledged and confirmed as correct." },
    { name: 'Incorrect or Missing Elements are Clearly Stated as Incorrect', description: "Any part of the student's response that does not match the guidance must be clearly stated as wrong or incomplete. Do not name or suggest the correct answer." },
    { name: 'Feedback is Growth-Oriented and Constructive', description: 'The feedback encourages improvement by validating effort, supporting reflection, and promoting a growth mindset.' },
    { name: 'Tone is Neutral and Respectful', description: 'The feedback maintains a professional, non-judgmental tone. Excessive praise or harsh criticism is avoided.' },
    { name: 'Feedback is Limited to the Scope of the Guidance', description: 'Only aspects explicitly included in the task or guidance are addressed.' }
  ]);
  const [criteriaEnabled, setCriteriaEnabled] = useState(false);

  useEffect(() => {
    // Initialize OpenAI or any other setup if needed
  }, []);

  const processFile = async (file: File) => {
    setResults([]); // Clear results before processing
    setIsProcessing(true);
    setLastFile(file);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        console.log('Parsed CSV data:', results.data);
        // Filter out any empty rows and ignore id/subject columns
        const rows = (results.data as CsvRow[]).filter(row => 
          row.question && row.answer && row.expectedResult && row.guidance
        ).map(row => {
          // Only keep relevant fields
          const { question, answer, expectedResult, guidance } = row;
          return { question, answer, expectedResult, guidance };
        });
        
        if (rows.length === 0) {
          console.error('No valid rows found in CSV');
          setIsProcessing(false);
          alert('No valid data found in CSV. Please check the file format.');
          return;
        }

        // Run all evaluations in parallel
        const promises = rows.map(async (row) => {
          try {
            const response = await evaluateAnswer(
              row.question,
              row.guidance,
              '',
              row.answer,
              systemPrompt,
              1 // always single result for batch
            ) as ApiResponse;

            // LLM-based criteria checks (only if criteria present)
            let criteriaChecks = undefined;
            if (criteriaEnabled && criteria && Array.isArray(criteria) && criteria.length > 0) {
              criteriaChecks = await Promise.all(criteria.map(async (c: any) => {
                try {
                  const check = await checkFeedbackCriterion(
                    row.question,
                    row.answer,
                    response.feedback || response.evaluation || '',
                    c
                  );
                  return { name: c.name, passed: check.passed, explanation: check.explanation };
                } catch (e) {
                  return { name: c.name, passed: null, explanation: 'Error' };
                }
              }));
            }
            return {
              ...row,
              actualResult: response.result || 'incorrect',
              feedback: (response.emoji ? response.emoji + ' ' : '') + (response.feedback || response.evaluation || 'No feedback provided'),
              emoji: response.emoji,
              matches: (response.result || 'incorrect') === row.expectedResult
              // Only add criteriaChecks if defined
              , ...(criteriaChecks !== undefined ? { criteriaChecks } : {})
            };
          } catch (error) {
            console.error('Error processing row:', error);
            return {
              ...row,
              actualResult: 'incorrect' as EvaluationResult,
              feedback: 'Error processing row',
              matches: false
            };
          }
        });
        const allResults = await Promise.all(promises);
        setResults(allResults);
        setIsProcessing(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setIsProcessing(false);
        alert('Error parsing CSV file. Please check the format.');
      }
    });
  };

  const handleReprocess = () => {
    if (lastFile) {
      setResults([]);
      processFile(lastFile);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
      }
      setResults([]); // Clear results before new upload
      processFile(file);
    }
  };

  const handleSystemPromptChange = (prompt: string) => {
    setSystemPrompt(prompt);
    if (prompt) {
      localStorage.setItem('batch_system_prompt', prompt);
    }
  };

  const handleClearResults = () => {
    setResults([]);
  };

  return (
    <div className="container">
      <div className="api-key-section">
        <div className="horizontal-group">
          <div className="input-group flex-1">
            <label htmlFor="systemPrompt">
              System Prompt for Batch Evaluation:
              <span className="prompt-hint">(This prompt will be used for evaluating all entries in the CSV file)</span>
            </label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              placeholder="Enter the system prompt for evaluation..."
              rows={18}
              className="system-prompt-input"
            />
          </div>
          <div className="input-group flex-1" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label htmlFor="batch-criteria-enabled" className="criteria-label">Feedback Criteria (JSON):</label>
              <input
                id="batch-criteria-enabled"
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
              value={JSON.stringify(criteria, null, 2)}
              onChange={e => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  if (Array.isArray(parsed)) setCriteria(parsed);
                } catch {}
              }}
              disabled={!criteriaEnabled}
            />
            <div className="criteria-example">
              Example: <code>{`[{"name":"Encouraging","description":"The feedback should be encouraging."}]`}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="input-section">
        <div className="file-upload compact-upload file-upload-horizontal">
          <p>Upload a CSV file with columns: id, subject, question, answer, expectedResult (correct/partially/incorrect), guidance (evaluation criteria and sample answer)</p>
          <a href="/open-question-tester/sample.csv" className="sample-link">Download Sample CSV</a>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            disabled={isProcessing}
          />
        </div>
      </div>
      
      <div className="results-section">
        <h2>Batch Evaluation Results</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isProcessing && <p className="processing">Processing CSV entries...</p>}
        </div>
        {!isProcessing && results.length > 0 && (
          <div className="results-summary-row">
            <div className="results-summary">
              <div className="summary-item matches">
                <span className="summary-label">Matches:</span>
                <span className="summary-value">
                  {results.filter(r => r.matches).length}
                </span>
              </div>
              <div className="summary-item non-matches">
                <span className="summary-label">Non-matches:</span>
                <span className="summary-value">
                  {results.filter(r => !r.matches).length}
                </span>
              </div>
              <div className="summary-item total">
                <span className="summary-label">Total:</span>
                <span className="summary-value">{results.length}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleClearResults}
                className="clear-results-button"
              >
                Clear Results
              </button>
              {lastFile && (
                <button 
                  onClick={() => { handleClearResults(); handleReprocess(); }}
                  className="clear-results-button"
                  disabled={isProcessing}
                >
                  Clear and Reprocess
                </button>
              )}
            </div>
          </div>
        )}
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
                  <td>
                    <ResultIcon 
                      result={result.actualResult}
                      matches={result.matches}
                    />
                  </td>
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
      </div>
    </div>
  );
}
