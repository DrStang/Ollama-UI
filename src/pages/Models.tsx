import { useState, useEffect } from 'react';
import { ollamaService } from '../services/ollama';
import type { OllamaModel, PullProgress } from '../types';
import './Models.css';

export function Models() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullModelName, setPullModelName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const modelList = await ollamaService.listModels();
      setModels(modelList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handlePullModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullModelName.trim() || isPulling) return;

    setIsPulling(true);
    setPullProgress(null);
    setError(null);

    try {
      await ollamaService.pullModel(pullModelName, (progress) => {
        setPullProgress(progress);
      });
      setPullModelName('');
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull model');
    } finally {
      setIsPulling(false);
      setPullProgress(null);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (deleteConfirm !== modelName) {
      setDeleteConfirm(modelName);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      setError(null);
      await ollamaService.deleteModel(modelName);
      await loadModels();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  const formatSize = (bytes: number): string => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProgressPercentage = (): number => {
    if (!pullProgress?.total || !pullProgress?.completed) return 0;
    return Math.round((pullProgress.completed / pullProgress.total) * 100);
  };

  return (
    <div className="models-page">
      <div className="page-header">
        <h1>Model Management</h1>
        <p>Manage your Ollama models</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="pull-section">
        <form onSubmit={handlePullModel} className="pull-form">
          <input
            type="text"
            placeholder="Enter model name (e.g., llama2, mistral, codellama)"
            value={pullModelName}
            onChange={(e) => setPullModelName(e.target.value)}
            disabled={isPulling}
            className="model-input"
          />
          <button type="submit" disabled={isPulling || !pullModelName.trim()} className="pull-button">
            {isPulling ? 'Pulling...' : 'Pull Model'}
          </button>
        </form>

        {isPulling && pullProgress && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <div className="progress-info">
              <span>{pullProgress.status}</span>
              {pullProgress.total && pullProgress.completed && (
                <span>{getProgressPercentage()}%</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="models-section">
        <h2>Installed Models ({models.length})</h2>

        {loading ? (
          <div className="loading">Loading models...</div>
        ) : models.length === 0 ? (
          <div className="empty-state">
            <p>No models installed yet</p>
            <p className="hint">Pull a model using the form above</p>
          </div>
        ) : (
          <div className="models-grid">
            {models.map((model) => (
              <div key={model.digest} className="model-card">
                <div className="model-header">
                  <h3>{model.name}</h3>
                  <button
                    onClick={() => handleDeleteModel(model.name)}
                    className={`delete-button ${deleteConfirm === model.name ? 'confirm' : ''}`}
                    title="Delete model"
                  >
                    {deleteConfirm === model.name ? 'Confirm?' : '🗑️'}
                  </button>
                </div>
                <div className="model-details">
                  <div className="detail-row">
                    <span className="label">Size:</span>
                    <span className="value">{formatSize(model.size)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Modified:</span>
                    <span className="value">{formatDate(model.modified_at)}</span>
                  </div>
                  {model.details && (
                    <>
                      <div className="detail-row">
                        <span className="label">Family:</span>
                        <span className="value">{model.details.family}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Format:</span>
                        <span className="value">{model.details.format}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Parameters:</span>
                        <span className="value">{model.details.parameter_size}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
