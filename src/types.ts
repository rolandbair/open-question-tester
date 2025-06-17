export interface ApiResponse {
    factors: string[];
    gaps: string[];
    percentage: number;
    evaluation: string;
}

export interface PromptEntry {
    id: string;
    question: string;
    sampleSolution: string;
    answer: string;
    status: 'pending' | 'completed' | 'error';
    feedback?: ApiResponse;
}
