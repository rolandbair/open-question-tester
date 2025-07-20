export interface ModelConfig {
  id: string;
  name: string;
  supportsTemperature: boolean;
  supportsTopP: boolean;
}

export interface EvaluationParams {
  model: string;
  temperature?: number;
  top_p?: number;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  {
    id: 'o3-2025-04-16',
    name: 'o3-2025-04-16',
    supportsTemperature: false,
    supportsTopP: false,
  },
  {
    id: 'o3-mini-2025-01-31',
    name: 'o3-mini-2025-01-31',
    supportsTemperature: false,
    supportsTopP: false,
  },
  {
    id: 'o4-mini-2025-04-16',
    name: 'o4-mini-2025-04-16',
    supportsTemperature: false,
    supportsTopP: false,
  },
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'gpt-4.1-2025-04-14',
    supportsTemperature: true,
    supportsTopP: true,
  },
  {
    id: 'gpt-4.1-mini-2025-04-14',
    name: 'gpt-4.1-mini-2025-04-14',
    supportsTemperature: true,
    supportsTopP: true,
  },
  {
    id: 'gpt-4o-mini-2024-07-18',
    name: 'gpt-4o-mini-2024-07-18',
    supportsTemperature: true,
    supportsTopP: true,
  },
];

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TOP_P = 1.0;
