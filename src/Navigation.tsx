import { useState } from 'react';
import { useApi } from './ApiContext';
import { Edit2 } from 'react-feather';

export default function Navigation() {
  const { apiKey, setApiKey } = useApi();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);

  const handleSave = () => {
    setApiKey(inputValue);
    setEditing(false);
  };

  return (
    <div className="nav-container nav-flex nav-compact">
      <div className="nav-title">Open Question Tester</div>
      <div className="nav-api-key-text">
        <span className="api-key-label">API Key:</span>
        {editing ? (
          <>
            <input
              type="password"
              className="api-key-input nav-api-key-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
              placeholder="Enter API key"
            />
          </>
        ) : (
          <>
            <span className="api-key-value">{apiKey ? '••••••••••••••••••••' : <span style={{color:'#dc3545'}}>Not set</span>}</span>
            <button className="api-key-edit-btn" title="Edit API Key" onClick={() => { setInputValue(apiKey); setEditing(true); }}>
              <Edit2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
