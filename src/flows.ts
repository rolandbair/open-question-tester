import { SystemPrompt_OpenQuestionsGuidance, PromptPart_OpenQuestionsFeedbackCriteria, SystemPrompt_OpenQuestionsFeedback, PromptPart_OpenQuestionsGuidance, Prompt_OpenQuestionsFeedbackCriteria, Prompt_OpenQuestionsGuidanceCriteria, PromptPart_OpenQuestionsStudentSummary, Prompt_OpenQuestionsStudentSummaryCriteria, SystemPrompt_OpenQuestionsStudentSummary } from './prompts';

export type FlowColumn = {
  key: string;
  label: string;
  required?: boolean;
};

export type FlowConfig = {
  id: string;
  name: string;
  testDataColumns: FlowColumn[];
  // Add more flow-specific config as needed
  evaluate: (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[]) => Promise<any>;
  systemPrompt?: string;
  feedbackCriteria?: any[];
  checkFeedbackCriterionPrompt?: string;
  feedbackField?: string; // Add this line
};

export const flows: FlowConfig[] = [
  {
    id: 'open-question-feedback',
    name: 'Open Question Feedback',
    testDataColumns: [
      { key: 'task', label: 'Task', required: true },
      { key: 'answer', label: 'Answer', required: true },
      { key: 'guidance', label: 'Guidance' },
      { key: 'expectedResult', label: 'Expected Result', required: true }
    ],
    evaluate: async (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[]) => {
      const api = await import('./api');
      return api.evaluateGeneric(
        row,
        testDataColumns,
        systemPrompt || prompt
      );
    },
    systemPrompt: SystemPrompt_OpenQuestionsFeedback,
    feedbackCriteria: PromptPart_OpenQuestionsFeedbackCriteria,
    checkFeedbackCriterionPrompt: Prompt_OpenQuestionsFeedbackCriteria,
    feedbackField: 'feedback'
  },
  {
    id: 'open-question-guidance',
    name: 'Open Question Guidance',
    testDataColumns: [
      { key: 'task', label: 'Task', required: true },
      { key: 'context', label: 'Context' },
    ],
    evaluate: async (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[]) => {
      const api = await import('./api');
      return api.evaluateGeneric(
        row,
        testDataColumns,
        systemPrompt || prompt
      );
    },
    systemPrompt: SystemPrompt_OpenQuestionsGuidance,
    feedbackCriteria: PromptPart_OpenQuestionsGuidance,
    checkFeedbackCriterionPrompt: Prompt_OpenQuestionsGuidanceCriteria,
    feedbackField: 'guidance'
  },
  {
    id: 'open-question-student-summary',
    name: 'Open Question Student Summary',
    testDataColumns: [
      { key: 'studentName', label: 'StudentName', required: true },
      { key: 'materialTitle', label: 'MaterialTitle' },
      { key: 'tasks', label: 'Tasks', required: true },
    ],
    evaluate: async (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[]) => {
      const api = await import('./api');
      return api.evaluateGeneric(
        row,
        testDataColumns,
        systemPrompt || prompt
      );
    },
    systemPrompt: SystemPrompt_OpenQuestionsStudentSummary,
    feedbackCriteria: PromptPart_OpenQuestionsStudentSummary,
    checkFeedbackCriterionPrompt: Prompt_OpenQuestionsStudentSummaryCriteria,
    feedbackField: 'guidance'
  }
];
