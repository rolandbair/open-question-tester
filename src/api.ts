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
    guidance: string, 
    _unused: string, 
    answer: string,
    _systemPrompt: string
): Promise<ApiResponse> {
    if (!openaiInstance) {
        throw new Error('OpenAI not initialized. Please enter your API key.');
    }
      try {
        const completion = await openaiInstance.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant helping to evaluate student answers.
Analyze the provided answer against the question, evaluation criteria, and sample solution.
Your task is to:
1. Determine if the answer is 'correct', 'partially' correct, or 'incorrect'
2. Provide brief, constructive feedback

Return ONLY a JSON response with this structure:
{
    "result": "correct" | "partially" | "incorrect",
    "feedback": "brief explanation of evaluation"
}`
                },
                {
                    role: "user",                    content: `Question: "${question}"
${guidance ? `Evaluation and Sample Answer Guide:\n${guidance}` : ''}
Student's Answer: "${answer}"`
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
