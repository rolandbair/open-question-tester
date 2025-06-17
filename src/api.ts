import OpenAI from 'openai';
import type { ApiResponse } from './types';

let openaiInstance: OpenAI | null = null;

export function initializeOpenAI(apiKey: string) {
    openaiInstance = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
    });
}

export async function evaluateAnswer(question: string, evaluationCriteria: string, sampleSolution: string, answer: string): Promise<ApiResponse> {
    if (!openaiInstance) {
        throw new Error('OpenAI not initialized. Please enter your API key.');
    }
    
    try {
        const completion = await openaiInstance.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",                    content: `You are an educational evaluator. Your task is to:
1. Use the evaluation criteria as the primary basis for assessment
2. Reference the sample solution for specific terminology and phrasing used in class
3. Compare the student's answer against both the criteria and sample solution
4. Find the two biggest gaps as improvement areas
5. Calculate a score based on criteria fulfillment and proper terminology use

Return ONLY a JSON response with this structure, evaluation result in German language, Du-Form:
{
    "factors": ["list", "of", "key", "criteria", "and", "terms"],
    "gaps": ["first major gap", "second major gap"],
    "percentage": number,
    "evaluation": "overall feedback focusing on both criteria and terminology"
}`
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
