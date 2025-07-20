import { EVALUATOR_CONFIG } from '../constants/evaluatorConfig';

export interface GitLabPromptConfig {
  repository: string;
  filePath: string;
  variableName: string;
  defaultBranch?: string;
}

export class GitLabService {
  private static readonly BASE_URL = EVALUATOR_CONFIG.GITLAB.BASE_URL;
  private static readonly PROJECT_ID = EVALUATOR_CONFIG.GITLAB.PROJECT_ID;

  /**
   * Gets the stored GitLab access token from localStorage
   */
  private static getAccessToken(): string | null {
    return localStorage.getItem('gitlab_access_token');
  }

  /**
   * Sets the GitLab access token in localStorage
   */
  static setAccessToken(token: string): void {
    if (token.trim()) {
      localStorage.setItem('gitlab_access_token', token.trim());
    }
  }

  /**
   * Removes the GitLab access token from localStorage
   */
  static clearAccessToken(): void {
    localStorage.removeItem('gitlab_access_token');
  }

  /**
   * Creates headers for GitLab API requests
   */
  private static getHeaders(): HeadersInit {
    const token = this.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Fetches available branches from the GitLab repository
   */
  static async getBranches(): Promise<{ name: string; default: boolean }[]> {
    console.log('[GitLab] Attempting to fetch branches...');
    
    try {
      const headers = this.getHeaders();
      const hasAuth = this.getAccessToken() ? 'Present' : 'Missing';
      console.log('[GitLab] Request headers - Authorization token:', hasAuth);
      
      const url = `${this.BASE_URL}/projects/${this.PROJECT_ID}/repository/branches`;
      console.log('[GitLab] Request URL:', url);
      
      const response = await fetch(url, { headers });
      
      console.log('[GitLab] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('[GitLab] Error response body:', responseText);
        
        if (response.status === 401) {
          throw new Error('GitLab authentication required or invalid. Please check your access token.');
        }
        if (response.status === 404) {
          throw new Error('Repository not found or access denied. Please verify the repository exists and your token has access.');
        }
        if (response.status === 403) {
          throw new Error('Access forbidden. Please ensure your token has the required permissions.');
        }
        throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}. ${responseText}`);
      }
      
      const branches = await response.json();
      console.log('[GitLab] Successfully fetched branches:', branches.length, 'branches');
      
      return branches.map((branch: any) => ({
        name: branch.name,
        default: branch.default
      }));
    } catch (error) {
      console.error('[GitLab] Error fetching branches:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to GitLab. Please check your internet connection.');
      }
      throw error;
    }
  }

  /**
   * Fetches a specific file from the GitLab repository
   */
  static async getFile(filePath: string, branch: string = 'main'): Promise<string> {
    try {
      const encodedFilePath = encodeURIComponent(filePath);
      const response = await fetch(
        `${this.BASE_URL}/projects/${this.PROJECT_ID}/repository/files/${encodedFilePath}/raw?ref=${branch}`,
        {
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('GitLab authentication required. Please set your access token.');
        }
        if (response.status === 404) {
          throw new Error(`File not found: ${filePath} in branch ${branch}`);
        }
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error fetching GitLab file:', error);
      throw error;
    }
  }

  /**
   * Extracts a Python variable from file content
   */
  static extractPythonVariable(fileContent: string, variableName: string): string | null {
    try {
      // Look for variable assignment patterns
      const patterns = [
        // Multi-line string with triple quotes
        new RegExp(`${variableName}\\s*=\\s*"""([\\s\\S]*?)"""`, 'g'),
        new RegExp(`${variableName}\\s*=\\s*'''([\\s\\S]*?)'''`, 'g'),
        // Single line string
        new RegExp(`${variableName}\\s*=\\s*"([^"]*)"`, 'g'),
        new RegExp(`${variableName}\\s*=\\s*'([^']*)'`, 'g'),
        // f-strings
        new RegExp(`${variableName}\\s*=\\s*f"""([\\s\\S]*?)"""`, 'g'),
        new RegExp(`${variableName}\\s*=\\s*f'''([\\s\\S]*?)'''`, 'g'),
        new RegExp(`${variableName}\\s*=\\s*f"([^"]*)"`, 'g'),
        new RegExp(`${variableName}\\s*=\\s*f'([^']*)'`, 'g'),
      ];

      for (const pattern of patterns) {
        const match = pattern.exec(fileContent);
        if (match && match[1]) {
          return match[1].trim();
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting Python variable:', error);
      return null;
    }
  }

  /**
   * Fetches a prompt from the GitLab repository
   */
  static async getPrompt(config: GitLabPromptConfig, branch?: string): Promise<string> {
    try {
      const targetBranch = branch || config.defaultBranch || EVALUATOR_CONFIG.GITLAB.DEFAULT_BRANCH;
      const fileContent = await this.getFile(config.filePath, targetBranch);
      
      const promptValue = this.extractPythonVariable(fileContent, config.variableName);
      
      if (!promptValue) {
        throw new Error(
          `Variable '${config.variableName}' not found in file '${config.filePath}'`
        );
      }
      
      return promptValue;
    } catch (error) {
      console.error('Error fetching prompt from GitLab:', error);
      throw error;
    }
  }

  /**
   * Validates a GitLab prompt configuration
   */
  static validateConfig(config: GitLabPromptConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.repository?.trim()) {
      errors.push('Repository URL is required');
    }
    
    if (!config.filePath?.trim()) {
      errors.push('File path is required');
    }
    
    if (!config.variableName?.trim()) {
      errors.push('Variable name is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
