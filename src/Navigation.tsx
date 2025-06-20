import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApi } from './ApiContext';
import { Edit2 } from 'react-feather';

export default function Navigation() {
  const location = useLocation();
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
      <nav className="navigation nav-center nav-buttons">
        <Link 
          to="/" 
          className={`nav-btn${location.pathname === '/' ? ' active' : ''}`}
        >
          Single
        </Link>
        <Link 
          to="/batch" 
          className={`nav-btn${location.pathname === '/batch' ? ' active' : ''}`}
        >
          Batch
        </Link>
      </nav>
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
