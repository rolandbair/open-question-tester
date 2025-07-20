import { SystemPrompt_OpenQuestionsGuidance, PromptPart_OpenQuestionsFeedbackCriteria, SystemPrompt_OpenQuestionsFeedback, PromptPart_OpenQuestionsGuidance, Prompt_OpenQuestionsFeedbackCriteria, Prompt_OpenQuestionsGuidanceCriteria, PromptPart_OpenQuestionsStudentSummary, Prompt_OpenQuestionsStudentSummaryCriteria, SystemPrompt_OpenQuestionsStudentSummary } from './prompts';
import type { GitLabPromptConfig } from './services/gitlabService';
import type { EvaluationParams } from './types/modelTypes';

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
  evaluate: (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[], evaluationParams?: EvaluationParams) => Promise<any>;
  systemPrompt?: string;
  feedbackCriteria?: any[];
  checkFeedbackCriterionPrompt?: string;
  feedbackField?: string; // Add this line
  gitlabPrompt?: GitLabPromptConfig; // Add GitLab prompt configuration
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
    evaluate: async (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[], evaluationParams?: EvaluationParams) => {
      const api = await import('./api');
      return api.evaluateGeneric(
        row,
        testDataColumns,
        systemPrompt || prompt,
        evaluationParams
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
    evaluate: async (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[], evaluationParams?: EvaluationParams) => {
      const api = await import('./api');
      return api.evaluateGeneric(
        row,
        testDataColumns,
        systemPrompt || prompt,
        evaluationParams
      );
    },
    systemPrompt: SystemPrompt_OpenQuestionsGuidance,
    feedbackCriteria: PromptPart_OpenQuestionsGuidance,
    checkFeedbackCriterionPrompt: Prompt_OpenQuestionsGuidanceCriteria,
    feedbackField: 'guidance',
    gitlabPrompt: {
      repository: 'https://gitlab.com/imparano/engineering/teachino-ai',
      filePath: 'teachino_ai/ai/data/messages/defaults/system_message_agents_material_knowledge.py',
      variableName: 'instructions_open_question_guidance',
      defaultBranch: 'main'
    }
  },
  {
    id: 'open-question-student-summary',
    name: 'Open Question Student Summary',
    testDataColumns: [
      { key: 'studentName', label: 'StudentName', required: true },
      { key: 'tasks', label: 'Tasks', required: true },
    ],
    evaluate: async (row: any, prompt: string, systemPrompt: string, testDataColumns: FlowColumn[], evaluationParams?: EvaluationParams) => {
      const api = await import('./api');
      return api.evaluateGeneric(
        row,
        testDataColumns,
        systemPrompt || prompt,
        evaluationParams
      );
    },
    systemPrompt: SystemPrompt_OpenQuestionsStudentSummary,
    feedbackCriteria: PromptPart_OpenQuestionsStudentSummary,
    checkFeedbackCriterionPrompt: Prompt_OpenQuestionsStudentSummaryCriteria,
    feedbackField: 'summary',
    gitlabPrompt: {
      repository: 'https://gitlab.com/imparano/engineering/teachino-ai',
      filePath: 'teachino_ai/ai/data/messages/defaults/system_message_agents_material_knowledge.py',
      variableName: 'instructions_open_question_material_summary',
      defaultBranch: 'feature/te-691-exp-student-effort'
    }
  }
];
