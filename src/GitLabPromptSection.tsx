import { useEffect, useState } from 'react';
import { useGitLabPrompt } from './hooks/useGitLabPrompt';
import { useApi } from './ApiContext';
import type { GitLabPromptConfig } from './services/gitlabService';

interface GitLabPromptSectionProps {
  config?: GitLabPromptConfig;
  onPromptFetched: (prompt: string) => void;
  disabled?: boolean;
}

export default function GitLabPromptSection({
  config,
  onPromptFetched,
  disabled = false
}: GitLabPromptSectionProps) {
  const { gitlabToken } = useApi();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const {
    isLoading,
    error,
    branches,
    selectedBranch,
    setSelectedBranch,
    fetchBranches,
    fetchPrompt,
    validateConfig,
    clearError
  } = useGitLabPrompt();

  // Check authentication status when gitlabToken changes
  useEffect(() => {
    const wasAuthenticated = isAuthenticated;
    setIsAuthenticated(!!gitlabToken);
    
    // Fetch branches when token is set or changed (but not when removed)
    if (!!gitlabToken && !wasAuthenticated && config && !disabled) {
      fetchBranches();
    }
  }, [gitlabToken, isAuthenticated, config, disabled, fetchBranches]);

  // Fetch branches when flow (config) changes and we're authenticated
  useEffect(() => {
    if (config && !disabled && isAuthenticated) {
      fetchBranches();
    }
  }, [config, disabled, isAuthenticated, fetchBranches]);

  // Set default branch when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      const defaultBranch = branches.find(b => b.default) || branches[0];
      setSelectedBranch(defaultBranch.name);
    }
  }, [branches, selectedBranch, setSelectedBranch]);

  const handleFetchPrompt = async () => {
    if (!config) return;

    const validation = validateConfig(config);
    if (!validation.valid) {
      console.error('Invalid GitLab config:', validation.errors);
      return;
    }

    clearError();
    const prompt = await fetchPrompt(config, selectedBranch);
    if (prompt) {
      onPromptFetched(prompt);
    }
  };

  const handleRefreshBranches = () => {
    if (config && !disabled) {
      fetchBranches();
    }
  };

  if (!config || !isAuthenticated) {
    return null;
  }

  return (
    <div className="gitlab-prompt-section" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <label style={{ minWidth: '60px', fontSize: '14px' }}>Fetch Prompt from GitLab Branch:</label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          disabled={disabled || isLoading || branches.length === 0}
          style={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            minWidth: '120px'
          }}
        >
          {branches.length === 0 ? (
            <option value="">Loading branches...</option>
          ) : (
            branches.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name} {branch.default ? '(default)' : ''}
              </option>
            ))
          )}
        </select>
        
        <button
          type="button"
          onClick={handleRefreshBranches}
          disabled={disabled || isLoading}
          style={{
            padding: '4px 8px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: disabled || isLoading ? 'not-allowed' : 'pointer'
          }}
          title="Refresh branches"
        >
          🔄
        </button>
        <button
          type="button"
          onClick={handleFetchPrompt}
          disabled={disabled || isLoading || !selectedBranch}
          style={{
            padding: '8px 16px',
            backgroundColor: disabled || isLoading || !selectedBranch ? '#f0f0f0' : '#007cba',
            color: disabled || isLoading || !selectedBranch ? '#666' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: disabled || isLoading || !selectedBranch ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Fetching...' : 'Fetch Prompt'}
        </button>
        
        {isLoading && (
          <span style={{ fontSize: '14px', color: '#666' }}>
            Loading...
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            fontSize: '14px',
            wordWrap: 'break-word'
          }}
        >
          <strong>GitLab Error:</strong> {error}
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            <details>
              <summary style={{ cursor: 'pointer', color: '#495057' }}>Troubleshooting</summary>
              <ul style={{ marginTop: '4px', marginBottom: '0', paddingLeft: '20px' }}>
                <li>Verify your GitLab token is set in the navigation bar</li>
                <li>Ensure the token has "read_repository" scope</li>
                <li>Check that the repository exists and is accessible</li>
                <li>Try refreshing the page and setting the token again</li>
              </ul>
            </details>
          </div>
          <button
            type="button"
            onClick={clearError}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
