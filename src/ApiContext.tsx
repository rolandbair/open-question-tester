import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { initializeOpenAI } from './api';

interface ApiContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState(() => {
    const saved = localStorage.getItem('openai_api_key');
    return saved || '';
  });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      initializeOpenAI(apiKey);
    }
  }, [apiKey]);

  return (
    <ApiContext.Provider value={{ apiKey, setApiKey }}>
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
