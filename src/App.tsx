import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import type { PromptEntry, ApiResponse } from './types';
import { evaluateAnswer, checkFeedbackCriterion } from './api';
import { v4 as uuidv4 } from 'uuid';
import Navigation from './Navigation';
import BatchProcessor, { CriteriaSettingsPanel } from './BatchProcessor';
import { ApiProvider } from './ApiContext';

function SingleEntry() {
  const defaultSystemPrompt = `You are an educational evaluator. Your task is to:
1. If evaluation criteria are provided, use them as the primary basis for assessment
2. If a sample solution is provided, reference it for specific terminology and phrasing
3. Evaluate the student's answer based on available context
4. Find the two biggest gaps as improvement areas
5. Calculate a score based on answer quality and contextual alignment

Return ONLY a JSON response with this structure, evaluation result in German language, Du-Form:
{
    "factors": ["list", "of", "key", "criteria", "and", "terms"],
    "gaps": ["first major gap", "second major gap"],
    "percentage": number,
    "evaluation": "overall feedback focusing on both criteria and terminology"
}`;

  const [systemPrompt, setSystemPrompt] = useState(() => {
    const saved = localStorage.getItem('system_prompt');
    return saved || defaultSystemPrompt;
  });
  
  const [question, setQuestion] = useState('')
  const [guidance, setGuidance] = useState('')
  const [answer, setAnswer] = useState('')
  const [requestCount, setRequestCount] = useState(1)
  const [entries, setEntries] = useState<PromptEntry[]>([])
  // Criteria state for single mode (same as batch)
  const [criteria, setCriteria] = useState([
    { name: 'Encouraging', description: 'The feedback should be encouraging and supportive.' },
    { name: 'No Solution Given Away', description: 'The feedback should not directly give away the correct solution.' }
  ]);

  const handleSystemPromptChange = (prompt: string) => {
    setSystemPrompt(prompt);
    if (prompt) {
      localStorage.setItem('system_prompt', prompt);
    }
  };

  const handleSubmit = async () => {
    if (!question || !answer) {
      alert('Please provide both a question and an answer');
      return;
    }

    if (requestCount === 1) {
      const newEntry: PromptEntry = {
        id: uuidv4(),
        question,
        guidance,
        answer,
        systemPrompt,
        status: 'pending'
      };
      setEntries(prev => [newEntry, ...prev]);
      try {
        console.log('[Single Mode] Request:', {
          question,
          guidance,
          answer,
          systemPrompt,
          requestCount
        });
        const result = await evaluateAnswer(question, guidance, '', answer, systemPrompt, 1) as ApiResponse;
        // LLM-based criteria checks for single mode (only if criteria present)
        let criteriaChecks = undefined;
        if (criteria && Array.isArray(criteria) && criteria.length > 0) {
          criteriaChecks = await Promise.all(criteria.map(async (c: any) => {
            try {
              const check = await checkFeedbackCriterion(
                question,
                answer,
                result.feedback || result.evaluation || '',
                c
              );
              return { name: c.name, passed: check.passed, explanation: check.explanation };
            } catch (e) {
              return { name: c.name, passed: null, explanation: 'Error' };
            }
          }));
        }
        setEntries(prev => prev.map(entry =>
          entry.id === newEntry.id
            ? { ...entry, status: 'completed', feedback: result, criteriaChecks }
            : entry
        ));
      } catch (error) {
        console.error('Single mode evaluation error:', error);
        setEntries(prev => prev.map(entry =>
          entry.id === newEntry.id
            ? { ...entry, status: 'error' }
            : entry
        ));
      }
    } else {
      // Add all as pending
      const ids = Array(requestCount).fill(null).map(() => uuidv4());
      setEntries(prev => [
        ...ids.map(id => ({
          id,
          question,
          guidance,
          answer,
          systemPrompt,
          status: 'pending' as const
        })),
        ...prev
      ]);
      try {
        console.log('[Single Mode] Request:', {
          question,
          guidance,
          answer,
          systemPrompt,
          requestCount
        });
        const results = await evaluateAnswer(question, guidance, '', answer, systemPrompt, requestCount) as ApiResponse[];
        console.log('[Single Mode] Response:', results);
        // LLM-based criteria checks for each result (only if criteria present)
        let allCriteriaChecks: any[] = [];
        if (criteria && Array.isArray(criteria) && criteria.length > 0) {
          allCriteriaChecks = await Promise.all(results.map(async (result) => {
            return Promise.all(criteria.map(async (c: any) => {
              try {
                const check = await checkFeedbackCriterion(
                  question,
                  answer,
                  result.feedback || result.evaluation || '',
                  c
                );
                return { name: c.name, passed: check.passed, explanation: check.explanation };
              } catch (e) {
                return { name: c.name, passed: null, explanation: 'Error' };
              }
            }));
          }));
        }
        setEntries(prev => prev.map(entry => {
          const idx = ids.indexOf(entry.id);
          if (idx !== -1) {
            return { ...entry, status: 'completed', feedback: results[idx], criteriaChecks: allCriteriaChecks[idx] };
          }
          return entry;
        }));
      } catch (error) {
        console.error('Single mode evaluation error:', error);
        setEntries(prev => prev.map(entry =>
          ids.includes(entry.id)
            ? { ...entry, status: 'error' as const }
            : entry
        ));
      }
    }
  }
  return (
    <div className="container">
      
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
        <CriteriaSettingsPanel criteria={criteria} setCriteria={setCriteria} />
      </div>

      <div className="input-section">
        <div className="input-group">
          <label htmlFor="question">Teacher's Question:</label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter the question here..."
            rows={3}
          />
        </div>

        <div className="input-group">
          <label htmlFor="guidance">Guidance (Evaluation Criteria and/or Sample Solution):</label>
          <textarea
            id="guidance"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            placeholder="Enter evaluation criteria, sample solution, or both..."
            rows={5}
          />
        </div>

        <div className="input-group">
          <label htmlFor="answer">Student's Answer:</label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter the student's answer here..."
            rows={3}
          />
        </div>

        <div className="input-group input-group-inline">
          <label htmlFor="requestCount">Number of Evaluations:</label>
          <input
            type="number"
            id="requestCount"
            value={requestCount}
            onChange={(e) => setRequestCount(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            max="5"
            className="number-input"
          />
          <span className="input-hint">(1-5 parallel requests for more consistent results)</span>
        </div>

        <button onClick={handleSubmit} disabled={!question || !answer}>
          Evaluate Answer
        </button>
      </div>

      <div className="results-section">
        <h2>Evaluation Results</h2>
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
                  <strong>Guidance:</strong>
                  <p>{entry.guidance}</p>
                  <strong>Student's Answer:</strong>
                  <p>{entry.answer}</p>
                </td>
                <td>
                  {entry.status === 'pending' && <span className="pending">Evaluating...</span>}
                  {entry.status === 'error' && <span className="error">Error processing request</span>}
                  {entry.status === 'completed' && entry.feedback && (
                    <div className="feedback-container">
                      <div className={`result-pill ${entry.feedback.result}`}>{entry.feedback.result}</div>
                      <div className="feedback-text">{entry.feedback.feedback}</div>
                      {entry.criteriaChecks && (
                        <div className="criteria-checks">
                          {entry.criteriaChecks.map((c, i) => (
                            <span key={i} style={{ marginRight: 8 }}>
                              {c.passed === true && '✔️'}
                              {c.passed === false && '❌'}
                              {c.passed === null && '⏳'}
                              {' '}{c.name}
                            </span>
                          ))}
                        </div>
                      )}
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

function App() {
  const basename = process.env.NODE_ENV === 'production' ? '/open-question-tester' : '';
  return (
    <BrowserRouter basename={basename}>
      <ApiProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<SingleEntry />} />
          <Route path="/batch" element={<BatchProcessor />} />
        </Routes>
      </ApiProvider>
    </BrowserRouter>
  );
}

export default App;
