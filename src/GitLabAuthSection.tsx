import { useState, useEffect } from 'react';
import { GitLabService } from './services/gitlabService';

interface GitLabAuthSectionProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
}

export default function GitLabAuthSection({ onAuthChange }: GitLabAuthSectionProps) {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('gitlab_access_token');
    if (storedToken) {
      setIsAuthenticated(true);
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    onAuthChange?.(isAuthenticated);
  }, [isAuthenticated, onAuthChange]);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setError('Please enter a valid access token');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Save token and test it by fetching branches
      GitLabService.setAccessToken(token.trim());
      await GitLabService.getBranches();
      
      setIsAuthenticated(true);
      setShowTokenInput(false);
      setError(null);
    } catch (err) {
      // Remove the invalid token
      GitLabService.clearAccessToken();
      setIsAuthenticated(false);
      
      const errorMessage = err instanceof Error ? err.message : 'Invalid access token';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveToken = () => {
    GitLabService.clearAccessToken();
    setToken('');
    setIsAuthenticated(false);
    setShowTokenInput(false);
    setError(null);
  };

  const handleCancelEdit = () => {
    setShowTokenInput(false);
    setError(null);
    // Reset token to stored value
    const storedToken = localStorage.getItem('gitlab_access_token');
    setToken(storedToken || '');
  };

  return (
    <div className="gitlab-auth-section" style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
      <h4 style={{ marginBottom: '8px', marginTop: '0' }}>GitLab Authentication</h4>
      
      {!isAuthenticated && !showTokenInput && (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            To fetch prompts from GitLab, you need a personal access token.
          </p>
          <button
            type="button"
            onClick={() => setShowTokenInput(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Add GitLab Token
          </button>
        </div>
      )}

      {!isAuthenticated && showTokenInput && (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              GitLab Personal Access Token:
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveToken();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSaveToken}
              disabled={isValidating || !token.trim()}
              style={{
                padding: '6px 12px',
                backgroundColor: isValidating || !token.trim() ? '#6c757d' : '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isValidating || !token.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isValidating ? 'Validating...' : 'Save Token'}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isValidating}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isValidating ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            <p style={{ margin: '0' }}>
              <strong>How to create a token:</strong><br />
              1. Go to GitLab → Settings → Access Tokens<br />
              2. Create a token with "read_repository" scope<br />
              3. Copy and paste the token here
            </p>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#28a745', fontSize: '14px' }}>
            ✅ GitLab authenticated
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setShowTokenInput(true);
                setIsAuthenticated(false);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Update Token
            </button>
            <button
              type="button"
              onClick={handleRemoveToken}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove Token
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            fontSize: '14px'
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
