import { useState } from 'react';
import { useApi } from './ApiContext';
import { Edit2 } from 'react-feather';

export default function Navigation() {
  const { apiKey, setApiKey, gitlabToken, setGitlabToken } = useApi();
  const [editingOpenAI, setEditingOpenAI] = useState(false);
  const [editingGitLab, setEditingGitLab] = useState(false);
  const [openAIValue, setOpenAIValue] = useState(apiKey);
  const [gitlabValue, setGitlabValue] = useState(gitlabToken);

  const handleSaveOpenAI = () => {
    setApiKey(openAIValue);
    setEditingOpenAI(false);
  };

  const handleSaveGitLab = () => {
    setGitlabToken(gitlabValue);
    setEditingGitLab(false);
  };

  return (
    <nav className="nav-bar">
      <div className="nav-title">Open Question Tester</div>
      
      {/* OpenAI API Key */}
      <div className="nav-api-key-text">
        <span className="api-key-label">OpenAI API Key:</span>
        {editingOpenAI ? (
          <>
            <input
              type="password"
              className="api-key-input nav-api-key-input"
              value={openAIValue}
              onChange={e => setOpenAIValue(e.target.value)}
              onBlur={handleSaveOpenAI}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveOpenAI(); }}
              autoFocus
              placeholder="Enter OpenAI API key"
            />
          </>
        ) : (
          <>
            <span className="api-key-value">{apiKey ? '••••••••••••••••••••' : <span className="api-key-notset">Not set</span>}</span>
            <button className="api-key-edit-btn" title="Edit OpenAI API Key" onClick={() => { setOpenAIValue(apiKey); setEditingOpenAI(true); }}>
              <Edit2 size={16} />
            </button>
          </>
        )}
      </div>

      {/* GitLab Token */}
      <div className="nav-api-key-text">
        <span className="api-key-label">GitLab Token:</span>
        {editingGitLab ? (
          <>
            <input
              type="password"
              className="api-key-input nav-api-key-input"
              value={gitlabValue}
              onChange={e => setGitlabValue(e.target.value)}
              onBlur={handleSaveGitLab}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveGitLab(); }}
              autoFocus
              placeholder="Enter GitLab token (glpat-...)"
            />
          </>
        ) : (
          <>
            <span className="api-key-value">{gitlabToken ? '••••••••••••••••••••' : <span className="api-key-notset">Not set</span>}</span>
            <button className="api-key-edit-btn" title="Edit GitLab Token" onClick={() => { setGitlabValue(gitlabToken); setEditingGitLab(true); }}>
              <Edit2 size={16} />
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
