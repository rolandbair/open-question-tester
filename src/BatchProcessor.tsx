import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import Papa from 'papaparse';
import { evaluateAnswer } from './api';
import type { CsvRow, ProcessedResult, EvaluationResult } from './types';
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

const defaultSystemPrompt = `You are an AI assistant helping to evaluate student answers.
Analyze the provided answer against the question and sample solution.
Provide a result as either "correct", "partially", or "incorrect".
Also provide brief feedback explaining the evaluation.
Return the response in JSON format with 'result' and 'feedback' fields.`;

export default function BatchProcessor() {
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [systemPrompt, setSystemPrompt] = useState(() => {
    const saved = localStorage.getItem('system_prompt');
    return saved || defaultSystemPrompt;
  });
  const processFile = async (file: File) => {
    setIsProcessing(true);
      Papa.parse(file, {
      header: true,
      complete: async (results) => {
        console.log('Parsed CSV data:', results.data);
        
        // Filter out any empty rows
        const rows = (results.data as CsvRow[]).filter(row => 
          row.question && row.answer && row.expectedResult && row.guidance
        );
        
        if (rows.length === 0) {
          console.error('No valid rows found in CSV');
          setIsProcessing(false);
          alert('No valid data found in CSV. Please check the file format.');
          return;
        }

        for (const row of rows) {
          try {
            const response = await evaluateAnswer(
              row.question,
              row.guidance,
              '',
              row.answer,
              systemPrompt
            );

            setResults(prev => [...prev, {
              ...row,
              actualResult: response.result || 'incorrect',
              feedback: response.feedback || response.evaluation || 'No feedback provided',
              matches: (response.result || 'incorrect') === row.expectedResult
            }]);
          } catch (error) {
            console.error('Error processing row:', error);
          }
        }
        setIsProcessing(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setIsProcessing(false);
        alert('Error parsing CSV file. Please check the format.');
      }
    });
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
      }
      processFile(file);
    }
  };

  const handleSystemPromptChange = (prompt: string) => {
    setSystemPrompt(prompt);
    if (prompt) {
      localStorage.setItem('system_prompt', prompt);
    }
  };

  return (
    <div className="container">
      <h1>Batch Question Evaluator</h1>
      
      <div className="api-key-section">
        <div className="input-group">
          <label htmlFor="systemPrompt">System Prompt:</label>
          <textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            placeholder="Enter the system prompt for evaluation..."
            rows={8}
            className="system-prompt-input"
          />
        </div>
      </div>

      <div className="input-section">
        <div className="file-upload">
          <p>Upload a CSV file with columns: question, answer, expectedResult (correct/partially/incorrect), guidance (evaluation criteria and sample answer)</p>
          <a href="/open-question-tester/sample.csv" className="sample-link">Download Sample CSV</a>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            disabled={isProcessing}
          />
        </div>
      </div>      <div className="results-section">
        <h2>Batch Evaluation Results</h2>
        {isProcessing && <p className="processing">Processing CSV entries...</p>}
        {!isProcessing && results.length > 0 && (
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
        )}
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Expected</th>
                <th>Result</th>
                <th>Status</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td>{result.question}</td>
                  <td>{result.answer}</td>
                  <td>{result.expectedResult}</td>
                  <td>{result.actualResult}</td>
                  <td>
                    <ResultIcon 
                      result={result.actualResult}
                      matches={result.matches}
                    />
                  </td>
                  <td>{result.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
