import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import type { PromptEntry } from './types';
import { evaluateAnswer } from './api';
import { v4 as uuidv4 } from 'uuid';
import Navigation from './Navigation';
import BatchProcessor from './BatchProcessor';
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
  const [entries, setEntries] = useState<PromptEntry[]>([])

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

    const newEntry: PromptEntry = {
      id: uuidv4(),
      question,
      guidance,
      answer,
      systemPrompt,
      status: 'pending'
    }

    setEntries(prev => [newEntry, ...prev])

    try {
      console.log('[Single Mode] Request:', {
        question,
        guidance,
        answer,
        systemPrompt
      });
      const result = await evaluateAnswer(question, guidance, '', answer, systemPrompt)
      console.log('[Single Mode] Response:', result);
      setEntries(prev => prev.map(entry =>
        entry.id === newEntry.id
          ? { ...entry, status: 'completed', feedback: result }
          : entry
      ))
    } catch {
      setEntries(prev => prev.map(entry =>
        entry.id === newEntry.id
          ? { ...entry, status: 'error' }
          : entry
      ))
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
                    <div className="feedback-container">                      <div className={`score ${entry.feedback?.percentage && entry.feedback.percentage >= 80 ? 'high' : 'low'}`}>
                        Score: {entry.feedback?.percentage ?? 0}%
                      </div>
                      <div className="evaluation">
                        <h4>Main Improvement Areas:</h4>
                        <ul className="gaps-list">
                          {entry.feedback?.gaps?.map((gap, index) => (
                            <li key={index}>{gap}</li>
                          ))}
                        </ul>
                        <h4>Overall Feedback:</h4>
                        <p>{entry.feedback?.evaluation}</p>
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
