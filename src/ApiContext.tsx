import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { initializeOpenAI } from './api';
import { GitLabService } from './services/gitlabService';

interface ApiContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  gitlabToken: string;
  setGitlabToken: (token: string) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState(() => {
    const saved = localStorage.getItem('openai_api_key');
    return saved || '';
  });

  const [gitlabToken, setGitlabToken] = useState(() => {
    const saved = localStorage.getItem('gitlab_access_token');
    return saved || '';
  });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      initializeOpenAI(apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    if (gitlabToken) {
      localStorage.setItem('gitlab_access_token', gitlabToken);
      GitLabService.setAccessToken(gitlabToken);
    } else {
      GitLabService.clearAccessToken();
    }
  }, [gitlabToken]);

  return (
    <ApiContext.Provider value={{ apiKey, setApiKey, gitlabToken, setGitlabToken }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
