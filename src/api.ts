import OpenAI from 'openai';
import type { ApiResponse } from './types';
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
    systemPrompt: string // <-- use this instead of _systemPrompt
): Promise<ApiResponse> {
    if (!openaiInstance) {
        throw new Error('OpenAI not initialized. Please enter your API key.');
    }
      try {
        const messages: ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: systemPrompt // <-- use the provided prompt
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
        console.log('[OpenAI API] Request:', JSON.stringify(requestPayload, null, 2));
        const completion = await openaiInstance.chat.completions.create(requestPayload);
        const response = completion.choices[0].message.content;
        console.log('[OpenAI API] Response:', response);
        if (!response) {
            throw new Error('No response received from API');
        }

        return JSON.parse(response) as ApiResponse;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}
