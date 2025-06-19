export type EvaluationResult = 'correct' | 'partially' | 'incorrect';

export interface ApiResponse {
    factors?: string[];
    gaps?: string[];
    percentage?: number;
    evaluation?: string;
    result?: EvaluationResult;
    feedback?: string;
}

export interface PromptEntry {
    id: string;
    question: string;
    evaluationCriteria?: string;
    sampleSolution?: string;
    answer: string;
    expectedResult?: EvaluationResult;
    systemPrompt: string;
    status: 'pending' | 'completed' | 'error';
    feedback?: ApiResponse;
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
    matches: boolean;
}
