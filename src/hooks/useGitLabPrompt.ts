import { useState, useCallback } from 'react';
import { GitLabService, type GitLabPromptConfig } from '../services/gitlabService';

export const useGitLabPrompt = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ name: string; default: boolean }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedBranches = await GitLabService.getBranches();
      setBranches(fetchedBranches);
      
      // Set default branch if available
      const defaultBranch = fetchedBranches.find(b => b.default);
      if (defaultBranch && !selectedBranch) {
        setSelectedBranch(defaultBranch.name);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch branches';
      setError(errorMessage);
      console.error('Error fetching branches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch]);

  const fetchPrompt = useCallback(async (
    config: GitLabPromptConfig,
    branch?: string
  ): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const targetBranch = branch || selectedBranch || config.defaultBranch;
      const prompt = await GitLabService.getPrompt(config, targetBranch);
      
      return prompt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prompt';
      setError(errorMessage);
      console.error('Error fetching prompt:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch]);

  const validateConfig = useCallback((config: GitLabPromptConfig) => {
    return GitLabService.validateConfig(config);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    branches,
    selectedBranch,
    setSelectedBranch,
    fetchBranches,
    fetchPrompt,
    validateConfig,
    clearError
  };
};
