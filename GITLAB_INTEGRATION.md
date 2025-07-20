# GitLab Prompt Integration

This feature allows users to fetch prompts directly from the GitLab repository `https://gitlab.com/imparano/engineering/teachino-ai`.

## Authentication

GitLab requires authentication for API access. Users need to provide a GitLab Personal Access Token:

### Creating a GitLab Personal Access Token

1. Go to GitLab.com and sign in
2. Navigate to **Settings** → **Access Tokens**
3. Create a new token with the following settings:
   - **Name**: Give it a descriptive name (e.g., "Open Question Tester")
   - **Expiration date**: Set an appropriate expiration date
   - **Scopes**: Select **read_repository** (minimum required scope)
4. Click **Create personal access token**
5. Copy the token immediately (it won't be shown again)

### Using the Token

1. In the application, look for the navigation bar at the top
2. You'll see "GitLab Token:" next to the OpenAI API key
3. Click the edit button (pencil icon) next to "Not set"
4. Paste your token in the password field
5. Press Enter or click outside the field to save
6. The system will validate the token automatically

## Configuration

Flows can be configured with GitLab prompt settings by adding a `gitlabPrompt` property to the flow configuration:

```typescript
{
  id: 'open-question-guidance',
  name: 'Open Question Guidance',
  // ... other config
  gitlabPrompt: {
    repository: 'https://gitlab.com/imparano/engineering/teachino-ai',
    filePath: 'teachino_ai/ai/data/messages/defaults/system_message_agents_material_knowledge.py',
    variableName: 'instructions_open_question_guidance',
    defaultBranch: 'main'
  }
}
```

## Features

- **Branch Selection**: Users can select from available branches in the repository
- **Real-time Fetching**: Prompts are fetched directly from the live repository
- **Python Variable Extraction**: Automatically extracts Python variables from files
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Integration**: Seamlessly integrates with existing prompt workflow

## Usage

1. **Authentication**: First, add your GitLab Personal Access Token in the navigation bar (see Authentication section above)
2. Select a flow that has GitLab prompt configuration
3. In the "Test Prompts" section, you'll see a "Fetch Prompt from GitLab" section
4. Select the desired branch from the dropdown
5. Click "Fetch Prompt" to load the prompt from GitLab
6. The fetched prompt will replace the current system prompt

## Security

- **Token Storage**: Tokens are stored securely in the browser's localStorage
- **Scope Limitation**: Only `read_repository` scope is required and recommended
- **Token Management**: Users can update or remove tokens at any time through the navigation bar
- **Validation**: Tokens are validated automatically when set
- **Error Handling**: Authentication errors are clearly displayed to users

## Supported File Types

The system can extract variables from Python files with the following patterns:
- Multi-line strings with triple quotes (`"""` or `'''`)
- Single-line strings with quotes (`"` or `'`)
- F-strings with any of the above patterns

## Error Handling

- Network errors (repository unavailable, file not found)
- Variable extraction errors (variable not found in file)
- Branch selection errors (branch doesn't exist)
- File format errors (unsupported file types)

## Configuration Options

The GitLab integration can be configured in `src/constants/evaluatorConfig.ts`:

```typescript
GITLAB: {
  BASE_URL: 'https://gitlab.com/api/v4',
  PROJECT_ID: 'imparano%2Fengineering%2Fteachino-ai',
  DEFAULT_BRANCH: 'main'
}
```
