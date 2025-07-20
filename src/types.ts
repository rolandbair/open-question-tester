export type EvaluationResult = 'correct' | 'partially' | 'incorrect';

export interface ApiResponse {
    type?: 'openQuestionFeedback';
    factors?: string[];
    gaps?: string[];
    percentage?: number;
    evaluation?: string;
    result?: EvaluationResult;
    feedback?: string;
    emoji?: '👍' | '👉' | '👎';
    responseTime?: number; // Response time in milliseconds
}

export interface AggregatedApiResponse extends ApiResponse {
    individualResults?: ApiResponse[];
}

export interface PromptEntry {
    id: string;
    question: string;
    guidance?: string;
    answer: string;
    expectedResult?: EvaluationResult;
    systemPrompt: string;
    status: 'pending' | 'completed' | 'error';
    feedback?: ApiResponse;
    criteriaChecks?: { name: string; passed: boolean | null; explanation?: string }[];
}

export interface CsvRow {
    question: string;
    answer: string;
    guidance: string;
    expectedResult: EvaluationResult;
}

export interface ProcessedResult extends CsvRow {
    actualResult: EvaluationResult;
    feedback: string;
    emoji?: '👍' | '👉' | '👎';
    matches: boolean;
    criteriaChecks?: { name: string; passed: boolean | null }[];
    promptUsed?: string; // Added for multi-prompt support
    promptNumber?: string | number; // Added for prompt number support
}
