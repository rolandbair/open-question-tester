export const EVALUATOR_CONFIG = {
  REQUEST_COUNT: {
    MIN: 1,
    MAX: 5,
    DEFAULT: 1
  },
  UPLOAD: {
    SUPPORTED_FORMATS: ['.csv', '.txt'],
    MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
  },
  API: {
    MODEL: 'o3-2025-04-16',
    RESPONSE_FORMAT: { type: 'json_object' as const }
  },
  GITLAB: {
    BASE_URL: 'https://gitlab.com/api/v4',
    PROJECT_ID: 'imparano%2Fengineering%2Fteachino-ai',
    DEFAULT_BRANCH: 'main'
  },
  UI: {
    SECTIONS: {
      DEFAULT_EXPANDED: true
    },
    STYLES: {
      MARGIN_BOTTOM: 16,
      PADDING: 8
    }
  },
  ERRORS: {
    INVALID_JSON: 'Invalid JSON',
    FILE_READ_ERROR: 'Failed to read file',
    INVALID_CSV_PROMPTS: 'Invalid CSV format for prompts. Each row should have a prompt number and prompt text.',
    PROCESSING_ERROR: 'Error processing row'
  }
};

export const DEFAULT_UI_STATE = {
  showPrompts: true,
  showData: true,
  showResults: true
};
