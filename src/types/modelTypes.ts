export interface ModelConfig {
  id: string;
  name: string;
  supportsTemperature: boolean;
  supportsTopP: boolean;
  supportsReasoningEffort: boolean;
  supportsServiceTier: boolean;
}

export interface EvaluationParams {
  model: string;
  temperature?: number;
  top_p?: number;
  reasoning_effort?: 'high' | 'medium' | 'low' | 'minimal';
  service_tier?: 'priority';
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'gpt-4.1-2025-04-14',
    supportsTemperature: true,
    supportsTopP: true,
    supportsReasoningEffort: false,
    supportsServiceTier: false,
  },
  {
    id: 'gpt-5',
    name: 'gpt-5',
    supportsTemperature: false,
    supportsTopP: false,
    supportsReasoningEffort: true,
    supportsServiceTier: true,
  },
  {
    id: 'o3-2025-04-16',
    name: 'o3-2025-04-16',
    supportsTemperature: false,
    supportsTopP: false,
    supportsReasoningEffort: false,
    supportsServiceTier: false,
  },
  {
    id: 'gpt-4.1-mini-2025-04-14',
    name: 'gpt-4.1-mini-2025-04-14',
    supportsTemperature: true,
    supportsTopP: true,
    supportsReasoningEffort: false,
    supportsServiceTier: false,
  },
  {
    id: 'gpt-4o-mini-2024-07-18',
    name: 'gpt-4o-mini-2024-07-18',
    supportsTemperature: true,
    supportsTopP: true,
    supportsReasoningEffort: false,
    supportsServiceTier: false,
  },
];

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TOP_P = 1.0;
export const DEFAULT_REASONING_EFFORT = 'medium';
