import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import Papa from 'papaparse';
import { evaluateAnswer } from './api';
import type { PromptEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

interface CSVRow {
  question: string;
  evaluationCriteria?: string;
  sampleSolution?: string;
  answer: string;
}

export default function BatchProcessor() {
  const [entries, setEntries] = useState<PromptEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [systemPrompt, setSystemPrompt] = useState(() => {
    const saved = localStorage.getItem('system_prompt');
    return saved || '';
  });

  const processCSV = async (file: File) => {
    setIsProcessing(true);
    
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const rows = results.data as CSVRow[];
        const newEntries: PromptEntry[] = rows.map(row => ({
          id: uuidv4(),
          question: row.question,
          evaluationCriteria: row.evaluationCriteria,
          sampleSolution: row.sampleSolution,
          answer: row.answer,
          systemPrompt,
          status: 'pending'
        }));

        setEntries(prev => [...newEntries, ...prev]);

        // Process each entry
        for (const entry of newEntries) {
          try {
            const result = await evaluateAnswer(
              entry.question,
              entry.evaluationCriteria || '',
              entry.sampleSolution || '',
              entry.answer,
              entry.systemPrompt
            );

            setEntries(prev => prev.map(e =>
              e.id === entry.id
                ? { ...e, status: 'completed', feedback: result }
                : e
            ));
          } catch (error) {
            setEntries(prev => prev.map(e =>
              e.id === entry.id
                ? { ...e, status: 'error' }
                : e
            ));
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
      processCSV(file);
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
          <p>Upload a CSV file with columns: question, evaluationCriteria (optional), sampleSolution (optional), answer</p>
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
        {isProcessing && <p className="processing">Processing CSV entries...</p>}
        <table>
          <thead>
            <tr>
              <th>Question & Answer</th>
              <th>Evaluation</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td>
                  <strong>System Prompt:</strong>
                  <p className="monospace">{entry.systemPrompt}</p>
                  <strong>Question:</strong>
                  <p>{entry.question}</p>
                  <strong>Evaluation Criteria:</strong>
                  <p>{entry.evaluationCriteria}</p>
                  <strong>Sample Solution:</strong>
                  <p>{entry.sampleSolution}</p>
                  <strong>Student's Answer:</strong>
                  <p>{entry.answer}</p>
                </td>
                <td>
                  {entry.status === 'pending' && <span className="pending">Evaluating...</span>}
                  {entry.status === 'error' && <span className="error">Error processing request</span>}
                  {entry.status === 'completed' && entry.feedback && (
                    <div className="feedback-container">
                      <div className={`score ${entry.feedback.percentage >= 80 ? 'high' : 'low'}`}>
                        Score: {entry.feedback.percentage}%
                      </div>
                      <div className="evaluation">
                        <h4>Main Improvement Areas:</h4>
                        <ul className="gaps-list">
                          {entry.feedback.gaps.map((gap, index) => (
                            <li key={index}>{gap}</li>
                          ))}
                        </ul>
                        <h4>Overall Feedback:</h4>
                        <p>{entry.feedback.evaluation}</p>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
