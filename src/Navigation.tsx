import { Link, useLocation } from 'react-router-dom';
import { useApi } from './ApiContext';

export default function Navigation() {
  const location = useLocation();
  const { apiKey, setApiKey } = useApi();
  
  return (
    <div className="nav-container">
      <div className="api-key-section">
        <div className="input-group">
          <label htmlFor="apiKey">OpenAI API Key:</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}            onChange={(e) => {
              const key = e.target.value;
              setApiKey(key);
            }}
            placeholder="Enter your OpenAI API key"
            className="api-key-input"
          />
        </div>
      </div>
      <nav className="navigation">
        <Link 
          to="/" 
          className={location.pathname === '/' ? 'active' : ''}
        >
          Single Answer
        </Link>
        <Link 
          to="/batch" 
          className={location.pathname === '/batch' ? 'active' : ''}
        >
          Batch Process
        </Link>
      </nav>
    </div>
  );
}
