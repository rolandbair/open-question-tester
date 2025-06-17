import { useState } from 'react'
import './App.css'
import type { PromptEntry } from './types'
import { evaluateAnswer, initializeOpenAI } from './api'
import { v4 as uuidv4 } from 'uuid'

function App() {
  const [apiKey, setApiKey] = useState(() => {
    const saved = localStorage.getItem('openai_api_key');
    if (saved) {
      initializeOpenAI(saved);
    }
    return saved || '';
  });
  const [question, setQuestion] = useState('')
  const [sampleSolution, setSampleSolution] = useState('')
  const [answer, setAnswer] = useState('')
  const [entries, setEntries] = useState<PromptEntry[]>([])

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('openai_api_key', key);
      initializeOpenAI(key);
    }
  };

  const handleSubmit = async () => {
    if (!apiKey) {
      alert('Please enter your OpenAI API key first');
      return;
    }
    if (!question || !sampleSolution || !answer) return

    const newEntry: PromptEntry = {
      id: uuidv4(),
      question,
      sampleSolution,
      answer,
      status: 'pending'
    }

    setEntries(prev => [newEntry, ...prev])

    try {
      const result = await evaluateAnswer(question, sampleSolution, answer)
      setEntries(prev => prev.map(entry =>
        entry.id === newEntry.id
          ? { ...entry, status: 'completed', feedback: result }
          : entry
      ))
    } catch (error) {
      setEntries(prev => prev.map(entry =>
        entry.id === newEntry.id
          ? { ...entry, status: 'error' }
          : entry
      ))
    }
  }

  return (
    <div className="container">
      <h1>Open Question Evaluator</h1>
      
      <div className="api-key-section">
        <div className="input-group">
          <label htmlFor="apiKey">OpenAI API Key:</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter your OpenAI API key"
            className="api-key-input"
          />
        </div>
      </div>

      <div className="input-section">
        <div className="input-group">
          <label htmlFor="apiKey">API Key:</label>
          <input
            type="text"
            id="apiKey"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter your OpenAI API key..."
          />
        </div>

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
          <label htmlFor="sampleSolution">Sample Solution:</label>
          <textarea
            id="sampleSolution"
            value={sampleSolution}
            onChange={(e) => setSampleSolution(e.target.value)}
            placeholder="Enter the sample solution that will be used to evaluate the student's answer..."
            rows={4}
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
                  <strong>Question:</strong>
                  <p>{entry.question}</p>
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
  )
}

export default App
