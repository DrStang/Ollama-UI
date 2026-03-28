import { useState, useEffect } from 'react';
import { ollamaLibraryService } from '../services/ollamaLibrary';
import type { OllamaLibraryModel, OllamaLibraryVariant } from '../types';
import './OllamaLibrary.css';

interface OllamaLibraryProps {
  onPullModel: (modelName: string) => Promise<void>;
  isPulling: boolean;
  installedModels: string[];
}

export function OllamaLibrary({ onPullModel, isPulling, installedModels }: OllamaLibraryProps) {
  const [models, setModels] = useState<OllamaLibraryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState('all');
  const [sortBy, setSortBy] = useState<'pulls' | 'name' | 'variants'>('pulls');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(true);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ollamaLibraryService.fetchLibrary(forceRefresh);
      setModels(data.models);
      setCapabilities(ollamaLibraryService.getUniqueCapabilities(data.models));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model library');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredModels = (): OllamaLibraryModel[] => {
    let filtered = models;

    // Filter by capability
    filtered = ollamaLibraryService.filterByCapability(filtered, selectedCapability);

    // Filter by search
    filtered = ollamaLibraryService.searchModels(filtered, searchQuery);

    // Sort
    filtered = ollamaLibraryService.sortModels(filtered, sortBy);

    return filtered;
  };

  const isModelInstalled = (slug: string): boolean => {
    return installedModels.some(m =>
      m.toLowerCase().includes(slug.toLowerCase()) ||
      slug.toLowerCase().includes(m.split(':')[0].toLowerCase())
    );
  };

  const isVariantInstalled = (slug: string, tag: string): boolean => {
    const fullName = tag === 'latest' ? slug : tag;
    return installedModels.some(m =>
      m.toLowerCase() === fullName.toLowerCase() ||
      m.toLowerCase() === slug.toLowerCase() && tag === 'latest'
    );
  };

  const handlePullVariant = async (slug: string, tag: string) => {
    const modelName = tag === 'latest' ? slug : tag;
    await onPullModel(modelName);
  };

  const formatContextSize = (context: number): string => {
    if (context >= 1000) {
      return `${(context / 1000).toFixed(0)}K`;
    }
    return context.toString();
  };

  const getCapabilityIcon = (capability: string): string => {
    const icons: Record<string, string> = {
      'reasoning': '🧠',
      'tools': '🔧',
      'vision': '👁️',
      'code': '💻',
      'embedding': '📊',
      'multilingual': '🌍',
    };
    return icons[capability.toLowerCase()] || '✨';
  };

  const cacheInfo = ollamaLibraryService.getCacheInfo();
  const filteredModels = getFilteredModels();

  return (
    <div className="ollama-library-section">
      <div className="library-header">
        <div className="library-title-group">
          <h2>Ollama Model Library</h2>
          <span className="model-count">{models.length} models available</span>
        </div>
        <div className="library-actions">
          {cacheInfo.lastUpdated && (
            <span className="cache-info" title={`Last updated: ${cacheInfo.lastUpdated}`}>
              {cacheInfo.isStale ? '⚠️ Stale' : '✓ Fresh'}
            </span>
          )}
          <button
            className="refresh-button"
            onClick={() => loadLibrary(true)}
            disabled={loading}
            title="Refresh library"
          >
            🔄 Refresh
          </button>
          <button
            className="toggle-library-btn"
            onClick={() => setShowLibrary(!showLibrary)}
          >
            {showLibrary ? '▼ Hide' : '▶ Show'}
          </button>
        </div>
      </div>

      {error && (
        <div className="library-error">
          <span>⚠️ {error}</span>
          <button onClick={() => loadLibrary(true)}>Retry</button>
        </div>
      )}

      {showLibrary && (
        <>
          {loading ? (
            <div className="library-loading">Loading model library...</div>
          ) : (
            <>
              {/* Controls */}
              <div className="library-controls">
                <div className="controls-row">
                  <input
                    type="text"
                    placeholder="Search models by name, description, or capability..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="library-search"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'pulls' | 'name' | 'variants')}
                    className="sort-select"
                  >
                    <option value="pulls">Most Popular</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="variants">Most Variants</option>
                  </select>
                </div>

                <div className="capability-filters">
                  <button
                    className={`capability-btn ${selectedCapability === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCapability('all')}
                  >
                    All
                  </button>
                  {capabilities.slice(0, 8).map(cap => (
                    <button
                      key={cap}
                      className={`capability-btn ${selectedCapability === cap ? 'active' : ''}`}
                      onClick={() => setSelectedCapability(cap)}
                    >
                      {getCapabilityIcon(cap)} {cap}
                    </button>
                  ))}
                </div>
              </div>

              {/* Models Grid */}
              <div className="library-grid">
                {filteredModels.map((model) => (
                  <div
                    key={model.slug}
                    className={`library-card ${expandedModel === model.slug ? 'expanded' : ''}`}
                  >
                    <div className="library-card-header">
                      <div className="library-card-title">
                        <h3>{model.name}</h3>
                        <div className="pull-stats">
                          <span className="pull-count">⬇️ {model.pulls_text}</span>
                          <span className="variant-count">📦 {model.tags_count} variants</span>
                        </div>
                      </div>
                      {isModelInstalled(model.slug) && (
                        <span className="installed-badge">✓ Installed</span>
                      )}
                    </div>

                    <p className="library-card-blurb">{model.blurb}</p>

                    <div className="library-card-capabilities">
                      {model.capabilities.map(cap => (
                        <span key={cap} className="capability-tag">
                          {getCapabilityIcon(cap)} {cap}
                        </span>
                      ))}
                    </div>

                    {/* Variant Selection */}
                    <div className="variants-section">
                      <button
                        className="show-variants-btn"
                        onClick={() => setExpandedModel(
                          expandedModel === model.slug ? null : model.slug
                        )}
                      >
                        {expandedModel === model.slug ? '▼ Hide Variants' : '▶ Show Variants'}
                      </button>

                      {expandedModel === model.slug && (
                        <div className="variants-list">
                          {model.variants.map((variant: OllamaLibraryVariant) => (
                            <div key={variant.tag} className="variant-item">
                              <div className="variant-info">
                                <span className="variant-tag">{variant.tag}</span>
                                <span className="variant-size">{variant.size_text}</span>
                                <span className="variant-context">
                                  {formatContextSize(variant.context)} ctx
                                </span>
                              </div>
                              <button
                                className={`variant-pull-btn ${isVariantInstalled(model.slug, variant.tag) ? 'installed' : ''}`}
                                onClick={() => handlePullVariant(model.slug, variant.tag)}
                                disabled={isPulling || isVariantInstalled(model.slug, variant.tag)}
                              >
                                {isVariantInstalled(model.slug, variant.tag)
                                  ? '✓ Installed'
                                  : '↓ Pull'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Pull for default variant */}
                    {expandedModel !== model.slug && (
                      <button
                        className="quick-pull-btn"
                        onClick={() => handlePullVariant(model.slug, 'latest')}
                        disabled={isPulling || isModelInstalled(model.slug)}
                      >
                        {isModelInstalled(model.slug)
                          ? '✓ Installed'
                          : `↓ Pull ${model.slug}`}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {filteredModels.length === 0 && (
                <div className="library-empty">
                  <p>No models found matching your criteria</p>
                  <button onClick={() => {
                    setSearchQuery('');
                    setSelectedCapability('all');
                  }}>
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
