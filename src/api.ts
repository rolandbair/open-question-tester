import OpenAI from 'openai';
import type { ApiResponse } from './types';

let openaiInstance: OpenAI | null = null;

export function initializeOpenAI(apiKey: string) {
    openaiInstance = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
    });
}

export async function evaluateAnswer(question: string, sampleSolution: string, answer: string): Promise<ApiResponse> {
    if (!openaiInstance) {
        throw new Error('OpenAI not initialized. Please enter your API key.');
    }
    
    try {
        const completion = await openaiInstance.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an educational evaluator. Your task is to:
1. Identify key factors in the sample solution
2. Compare these with the student's answer
3. Find the two biggest gaps towards the sample solution as improvement areas
4. Calculate a score based on factor coverage

Return ONLY a JSON response with this structure, evaluation result in German language, Du-Form:
{
    "factors": ["list", "of", "key", "factors"],
    "gaps": ["first major gap", "second major gap"],
    "percentage": number,
    "evaluation": "overall feedback"
}`
                },
                {
                    role: "user",
                    content: `Question: "${question}"\nSample Solution: "${sampleSolution}"\nStudent's Answer: "${answer}"`
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
