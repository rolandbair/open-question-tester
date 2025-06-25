import OpenAI from 'openai';
import type { ApiResponse, AggregatedApiResponse, EvaluationResult } from './types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

let openaiInstance: OpenAI | null = null;

export function initializeOpenAI(apiKey: string) {
    openaiInstance = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
    });
}

export async function evaluateAnswer(
    question: string, 
    guidance: string, 
    _unused: string, 
    answer: string,
    systemPrompt: string,
    count: number = 1 // Number of parallel evaluations to run
): Promise<ApiResponse | ApiResponse[]> {
    if (!openaiInstance) {
        // Try to initialize from localStorage if possible
        const storedKey = localStorage.getItem('openai_api_key');
        if (storedKey) {
            initializeOpenAI(storedKey);
        }
    }
    if (!openaiInstance) {
        throw new Error('OpenAI not initialized. Please enter your API key.');
    }
    try {
        const messages: ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: `Question: "${question}"
${guidance ? `Evaluation and Sample Answer Guide:\n${guidance}` : ''}
Student's Answer: "${answer}"`
            }
        ];
        const requestPayload = {
            model: "o3-2025-04-16",
            messages,
            response_format: { type: "json_object" as const }
        };

        // Create array of promises for parallel execution
        const promises = Array(count).fill(null).map(async () => {
            console.log('[OpenAI API] Request:', JSON.stringify(requestPayload, null, 2));
            const completion = await openaiInstance!.chat.completions.create(requestPayload);
            const response = completion.choices[0].message.content;
            console.log('[OpenAI API] Response:', response);
            if (!response) {
                throw new Error('No response received from API');
            }
            return JSON.parse(response) as ApiResponse;
        });

        // Wait for all requests to complete
        const results = await Promise.all(promises);
        return count === 1 ? results[0] : results;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}
