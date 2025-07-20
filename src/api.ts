import OpenAI from 'openai';
import type { ApiResponse } from './types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { EvaluationParams } from './types/modelTypes';

let openaiInstance: OpenAI | null = null;

export function initializeOpenAI(apiKey: string) {
    openaiInstance = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
    });
}


export async function evaluateGeneric(
    row: Record<string, any>,
    columns: { key: string; label: string }[],
    systemPrompt: string = "FALLBACK PROMPT",
    evaluationParams?: EvaluationParams
): Promise<ApiResponse | ApiResponse[]> {
    if (!openaiInstance) {
        const storedKey = localStorage.getItem('openai_api_key');
        if (storedKey) {
            initializeOpenAI(storedKey);
        }
    }
    if (!openaiInstance) {
        throw new Error('OpenAI not initialized. Please enter your API key.');
    }
    try {
        // Filter out expectedResult column from columns used for evaluation
        const filteredColumns = columns.filter(col => col.key !== 'expectedResult');
        
        // Build content string from filtered columns and row
        const content = filteredColumns
            .filter(col => row[col.key] !== undefined && row[col.key] !== '')
            .map(col => `${col.label}: ${row[col.key]}`)
            .join('\n');
        const messages: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: content
            }
        ];
        const requestPayload = {
            model: evaluationParams?.model || 'o3-2025-04-16',
            messages,
            response_format: { type: 'json_object' as const },
            ...(evaluationParams?.temperature !== undefined && { temperature: evaluationParams.temperature }),
            ...(evaluationParams?.top_p !== undefined && { top_p: evaluationParams.top_p })
        };
        
        // Track response time
        const startTime = performance.now();
        const completion = await openaiInstance!.chat.completions.create(requestPayload);
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        const response = completion.choices[0].message.content;
        if (!response) {
            throw new Error('No response received from API');
        }
        const result = JSON.parse(response) as ApiResponse;
        
        // Add response time to result
        result.responseTime = responseTime;
        
        console.log('[Generic Evaluation] Result:', result);
        return result;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}

export async function checkFeedbackCriterion(
  contextValues: string[],
  criterion: { name: string; description: string },
  systemPrompt = "FALLBACK CRITERION PROMPT",
  evaluationParams?: EvaluationParams
): Promise<{ passed: boolean, explanation: string, responseTime?: number }> {
  // Ensure the system prompt contains the word 'json' for OpenAI API compliance
  let safeSystemPrompt = systemPrompt;
  if (!/json/i.test(systemPrompt)) {
    safeSystemPrompt =
      (systemPrompt ? systemPrompt + '\n' : '') +
      'Respond ONLY with a JSON object: { "passed": true | false, "explanation": string }';
  }
  if (!openaiInstance) {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      initializeOpenAI(storedKey);
    }
  }
  if (!openaiInstance) {
    throw new Error('OpenAI not initialized. Please enter your API key.');
  }
  // Build a context string from the values
  const contextString = contextValues.map((val, idx) => `Field${idx + 1}: ${val}`).join('\n');
  const userMessage = `Criterion: ${criterion.name}\nDescription: ${criterion.description}\n\n${contextString}`;
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: safeSystemPrompt },
    { role: 'user', content: userMessage }
  ];
  const requestPayload = {
    model: evaluationParams?.model || 'o3-2025-04-16',
    messages,
    response_format: { type: 'json_object' as const },
    ...(evaluationParams?.temperature !== undefined && { temperature: evaluationParams.temperature }),
    ...(evaluationParams?.top_p !== undefined && { top_p: evaluationParams.top_p })
  };
  // Only log request and response
  console.log('[Criteria Evaluation] Payload:', JSON.stringify(requestPayload, null, 2));
  
  // Track response time
  const startTime = performance.now();
  const completion = await openaiInstance!.chat.completions.create(requestPayload);
  const endTime = performance.now();
  const responseTime = Math.round(endTime - startTime);
  
  const response = completion.choices[0].message.content;
  console.log('[Criteria Evaluation] Raw response:', response);
  if (!response) throw new Error('No response from LLM');
  
  const result = JSON.parse(response);
  result.responseTime = responseTime;
  return result;
}
