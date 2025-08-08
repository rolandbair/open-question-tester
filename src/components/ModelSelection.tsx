import type { EvaluationParams } from '../types/modelTypes';
import { SUPPORTED_MODELS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_REASONING_EFFORT } from '../types/modelTypes';

interface ModelSelectionProps {
  evaluationParams: EvaluationParams;
  onParamsChange: (params: EvaluationParams) => void;
}

export default function ModelSelection({ evaluationParams, onParamsChange }: ModelSelectionProps) {
  const selectedModel = SUPPORTED_MODELS.find(m => m.id === evaluationParams.model) || SUPPORTED_MODELS[0];

  const handleModelChange = (modelId: string) => {
    const model = SUPPORTED_MODELS.find(m => m.id === modelId);
    if (model) {
      const newParams: EvaluationParams = {
        model: modelId,
        ...(model.supportsTemperature && { temperature: evaluationParams.temperature ?? DEFAULT_TEMPERATURE }),
        ...(model.supportsTopP && { top_p: evaluationParams.top_p ?? DEFAULT_TOP_P }),
        ...(model.supportsReasoningEffort && { reasoning_effort: evaluationParams.reasoning_effort ?? DEFAULT_REASONING_EFFORT }),
        ...(model.supportsServiceTier && evaluationParams.service_tier && { service_tier: evaluationParams.service_tier })
      };
      onParamsChange(newParams);
    }
  };

  const handleTemperatureChange = (temperature: number) => {
    onParamsChange({
      ...evaluationParams,
      temperature
    });
  };

  const handleTopPChange = (top_p: number) => {
    onParamsChange({
      ...evaluationParams,
      top_p
    });
  };

  const handleReasoningEffortChange = (reasoning_effort: 'high' | 'medium' | 'low' | 'minimal') => {
    onParamsChange({
      ...evaluationParams,
      reasoning_effort
    });
  };

  const handleServiceTierChange = (enabled: boolean) => {
    const newParams = { ...evaluationParams };
    if (enabled) {
      newParams.service_tier = 'priority';
    } else {
      delete newParams.service_tier;
    }
    onParamsChange(newParams);
  };

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div>
        <label htmlFor="model-select" style={{ marginRight: '8px' }}>Model:</label>
        <select 
          id="model-select" 
          value={evaluationParams.model} 
          onChange={(e) => handleModelChange(e.target.value)}
          style={{ minWidth: '200px' }}
        >
          {SUPPORTED_MODELS.map(model => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>
      </div>

      {selectedModel.supportsTemperature && (
        <div>
          <label htmlFor="temperature-input" style={{ marginRight: '8px' }}>Temperature:</label>
          <input
            id="temperature-input"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={evaluationParams.temperature ?? DEFAULT_TEMPERATURE}
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
            style={{ width: '80px' }}
          />
        </div>
      )}

      {selectedModel.supportsTopP && (
        <div>
          <label htmlFor="top-p-input" style={{ marginRight: '8px' }}>Top P:</label>
          <input
            id="top-p-input"
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={evaluationParams.top_p ?? DEFAULT_TOP_P}
            onChange={(e) => handleTopPChange(parseFloat(e.target.value))}
            style={{ width: '80px' }}
          />
        </div>
      )}

      {selectedModel.supportsReasoningEffort && (
        <div>
          <label htmlFor="reasoning-effort-select" style={{ marginRight: '8px' }}>Reasoning Effort:</label>
          <select
            id="reasoning-effort-select"
            value={evaluationParams.reasoning_effort ?? DEFAULT_REASONING_EFFORT}
            onChange={(e) => handleReasoningEffortChange(e.target.value as 'high' | 'medium' | 'low' | 'minimal')}
            style={{ minWidth: '100px' }}
          >
            <option value="minimal">Minimal</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      )}

      {selectedModel.supportsServiceTier && (
        <div>
          <label htmlFor="service-tier-checkbox" style={{ marginRight: '8px' }}>Priority Service:</label>
          <input
            id="service-tier-checkbox"
            type="checkbox"
            checked={evaluationParams.service_tier === 'priority'}
            onChange={(e) => handleServiceTierChange(e.target.checked)}
          />
        </div>
      )}
    </div>
  );
}
