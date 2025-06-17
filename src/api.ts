import OpenAI from 'openai';
import type { ApiResponse } from './types';

let openaiInstance: OpenAI | null = null;

export function initializeOpenAI(apiKey: string) {
    openaiInstance = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
    });
}

export async function evaluateAnswer(
    question: string, 
    evaluationCriteria: string, 
    sampleSolution: string, 
    answer: string,
    systemPrompt: string
): Promise<ApiResponse> {
    if (!openaiInstance) {
        throw new Error('OpenAI not initialized. Please enter your API key.');
    }
    
    try {
        const completion = await openaiInstance.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: `Question: "${question}"\nEvaluation Criteria: "${evaluationCriteria}"\nSample Solution: "${sampleSolution}"\nStudent's Answer: "${answer}"`
                }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const response = completion.choices[0].message.content;
        if (!response) {
            throw new Error('No response received from API');
        }

        return JSON.parse(response) as ApiResponse;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}
