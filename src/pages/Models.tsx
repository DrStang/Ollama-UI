import { useState, useEffect } from 'react';
import { ollamaService } from '../services/ollama';
import type { OllamaModel, PullProgress } from '../types';
import { modelCatalog, categories, searchModels } from '../data/modelCatalog';
import type { ModelCatalogEntry } from '../data/modelCatalog';
import { OllamaLibrary } from '../components/OllamaLibrary';
import './Models.css';

export function Models() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullModelName, setPullModelName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLibrary, setShowLibrary] = useState(true);

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

  const handlePullModel = async (e: React.FormEvent, modelName?: string) => {
    e.preventDefault();
    const nameToUse = modelName || pullModelName;
    if (!nameToUse.trim() || isPulling) return;

    setIsPulling(true);
    setPullProgress(null);
    setError(null);

    try {
      await ollamaService.pullModel(nameToUse, (progress) => {
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

  const handlePullFromCatalog = async (modelName: string) => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handlePullModel(fakeEvent, modelName);
  };

  const getFilteredModels = (): ModelCatalogEntry[] => {
    let filtered = modelCatalog;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(model => model.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = searchModels(searchQuery);
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(model => model.category === selectedCategory);
      }
    }

    return filtered;
  };

  const isModelInstalled = (modelName: string): boolean => {
    return models.some(m => m.name.toLowerCase().includes(modelName.toLowerCase()));
  };

  const getInstalledModelNames = (): string[] => {
    return models.map(m => m.name);
  };

  const handlePullFromLibrary = async (modelName: string): Promise<void> => {
    if (isPulling) return;

    setIsPulling(true);
    setPullProgress(null);
    setError(null);

    try {
      await ollamaService.pullModel(modelName, (progress) => {
        setPullProgress(progress);
      });
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
          <div className="error-content">
            <pre className="error-message">{error}</pre>
          </div>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Pull Progress (shown globally) */}
      {isPulling && pullProgress && (
        <div className="pull-progress-global">
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
        </div>
      )}

      {/* Ollama Model Library (from external JSON) */}
      <OllamaLibrary
        onPullModel={handlePullFromLibrary}
        isPulling={isPulling}
        installedModels={getInstalledModelNames()}
      />

      {/* Curated Model Library Section */}
      <div className="library-section">
        <div className="section-header">
          <h2>Curated Models</h2>
          <button
            className="toggle-library-button"
            onClick={() => setShowLibrary(!showLibrary)}
          >
            {showLibrary ? '▼ Hide' : '▶ Show'}
          </button>
        </div>

        {showLibrary && (
          <>
            {/* Search and Filter */}
            <div className="library-controls">
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="category-filters">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`category-button ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span className="category-icon">{cat.icon}</span>
                    <span className="category-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Catalog Grid */}
            <div className="catalog-grid">
              {getFilteredModels().map((catalogModel) => (
                <div key={catalogModel.name} className="catalog-card">
                  <div className="catalog-card-header">
                    <div className="catalog-title-section">
                      <h3>{catalogModel.displayName}</h3>
                      <div className="catalog-tags">
                        {catalogModel.tags.map(tag => (
                          <span key={tag} className={`tag tag-${tag}`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePullFromCatalog(catalogModel.name)}
                      disabled={isPulling || isModelInstalled(catalogModel.name)}
                      className={`catalog-pull-button ${isModelInstalled(catalogModel.name) ? 'installed' : ''}`}
                      title={isModelInstalled(catalogModel.name) ? 'Already installed' : 'Pull this model'}
                    >
                      {isModelInstalled(catalogModel.name) ? '✓ Installed' : '↓ Pull'}
                    </button>
                  </div>
                  <p className="catalog-description">{catalogModel.description}</p>
                  <div className="catalog-details">
                    <div className="catalog-detail">
                      <span className="detail-label">Parameters:</span>
                      <span className="detail-value">{catalogModel.parameterSize}</span>
                    </div>
                    <div className="catalog-detail">
                      <span className="detail-label">Size:</span>
                      <span className="detail-value">{catalogModel.size}</span>
                    </div>
                    <div className="catalog-detail">
                      <span className="detail-label">Family:</span>
                      <span className="detail-value">{catalogModel.family}</span>
                    </div>
                  </div>
                  <div className="catalog-capabilities">
                    {catalogModel.capabilities.slice(0, 3).map(cap => (
                      <span key={cap} className="capability-badge">{cap}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {getFilteredModels().length === 0 && (
              <div className="empty-state">
                <p>No models found matching your criteria</p>
                <p className="hint">Try adjusting your search or filters</p>
              </div>
            )}
          </>
        )}
      </div>

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
