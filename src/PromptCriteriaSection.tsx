import React from 'react';

interface PromptCriteriaSectionProps {
  showPrompts: boolean;
  setShowPrompts: React.Dispatch<React.SetStateAction<boolean>>;
  systemPrompt: string;
  setSystemPrompt: (val: string) => void;
  promptFilePrompts: any;
  setPromptFilePrompts: (val: any) => void;
  promptFileName: string | null;
  setPromptFileName: (val: string | null) => void;
  promptFileError: string | null;
  setPromptFileError: (val: string | null) => void;
  handlePromptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  criteriaEnabled: boolean;
  setCriteriaEnabled: (val: boolean) => void;
  criteria: string;
  handleCriteriaChange: (val: string) => void;
  criteriaError: string | null;
}

const PromptCriteriaSection: React.FC<PromptCriteriaSectionProps> = ({
  showPrompts,
  setShowPrompts,
  systemPrompt,
  setSystemPrompt,
  promptFilePrompts,
  setPromptFilePrompts,
  promptFileName,
  setPromptFileName,
  promptFileError,
  setPromptFileError,
  handlePromptUpload,
  criteriaEnabled,
  setCriteriaEnabled,
  criteria,
  handleCriteriaChange,
  criteriaError,
}) => (
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
);

export default PromptCriteriaSection;
