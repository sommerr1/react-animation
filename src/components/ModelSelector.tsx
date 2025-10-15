import React from 'react';
import './ModelSelector.css';
import { ModelInfo } from '../store/modelSlice';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

export default function ModelSelector({ models, selectedModel, onModelSelect }: ModelSelectorProps) {
  return (
    <div className="model-selector">
      <h3 className="selector-title">Выберите модель</h3>
      <div className="models-grid">
        {models.map((model) => (
          <div
            key={model.id}
            className={`model-card ${selectedModel === model.id ? 'selected' : ''}`}
            onClick={() => onModelSelect(model.id)}
          >
            <div className="model-thumbnail">
              {model.thumbnail ? (
                <img src={model.thumbnail} alt={model.name} />
              ) : (
                <div className="placeholder-thumbnail">
                  <span>3D</span>
                </div>
              )}
            </div>
            <div className="model-info">
              <h4 className="model-name">{model.name}</h4>
              <div className="model-type">
                <span className={`type-badge ${model.type}`}>
                  {model.type.toUpperCase()}
                </span>
                {model.type === 'obj' && (
                  <span className="texture-indicator">🎨</span>
                )}
              </div>
              {model.description && (
                <p className="model-description">{model.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 