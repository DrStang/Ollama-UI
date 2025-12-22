import { useState, useEffect, useRef } from 'react';
import { ollamaService } from '../services/ollama';
import type { OllamaModel } from '../types';
import './Playground.css';

interface ComparisonResult {
  model: string;
  response: string;
  isLoading: boolean;
  error: string | null;
  startTime: number | null;
  endTime: number | null;
}

export function Playground() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [model1, setModel1] = useState<string>('');
  const [model2, setModel2] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [result1, setResult1] = useState<ComparisonResult>({
    model: '',
    response: '',
    isLoading: false,
    error: null,
    startTime: null,
    endTime: null,
  });
  const [result2, setResult2] = useState<ComparisonResult>({
    model: '',
    response: '',
    isLoading: false,
    error: null,
    startTime: null,
    endTime: null,
  });
  const [hasCompared, setHasCompared] = useState(false);

  const response1Ref = useRef<HTMLDivElement>(null);
  const response2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    // Auto-scroll response containers
    if (response1Ref.current) {
      response1Ref.current.scrollTop = response1Ref.current.scrollHeight;
    }
    if (response2Ref.current) {
      response2Ref.current.scrollTop = response2Ref.current.scrollHeight;
    }
  }, [result1.response, result2.response]);

  const loadModels = async () => {
    try {
      const modelList = await ollamaService.listModels();
      setModels(modelList);
      if (modelList.length > 0) {
        setModel1(modelList[0].name);
        if (modelList.length > 1) {
          setModel2(modelList[1].name);
        } else {
          setModel2(modelList[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const runComparison = async () => {
    if (!prompt.trim() || !model1 || !model2) return;

    setHasCompared(true);

    // Reset results
    setResult1({
      model: model1,
      response: '',
      isLoading: true,
      error: null,
      startTime: Date.now(),
      endTime: null,
    });
    setResult2({
      model: model2,
      response: '',
      isLoading: true,
      error: null,
      startTime: Date.now(),
      endTime: null,
    });

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }
    messages.push({ role: 'user', content: prompt.trim() });

    // Run both models in parallel
    const runModel = async (
      model: string,
      setResult: React.Dispatch<React.SetStateAction<ComparisonResult>>
    ) => {
      try {
        await ollamaService.chat(
          { model, messages },
          (partialResponse) => {
            setResult((prev) => ({
              ...prev,
              response: partialResponse,
            }));
          }
        );
        setResult((prev) => ({
          ...prev,
          isLoading: false,
          endTime: Date.now(),
        }));
      } catch (err) {
        setResult((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'An error occurred',
          endTime: Date.now(),
        }));
      }
    };

    // Start both requests in parallel
    runModel(model1, setResult1);
    runModel(model2, setResult2);
  };

  const clearResults = () => {
    setResult1({
      model: '',
      response: '',
      isLoading: false,
      error: null,
      startTime: null,
      endTime: null,
    });
    setResult2({
      model: '',
      response: '',
      isLoading: false,
      error: null,
      startTime: null,
      endTime: null,
    });
    setHasCompared(false);
    setPrompt('');
  };

  const formatDuration = (startTime: number | null, endTime: number | null) => {
    if (!startTime || !endTime) return null;
    const duration = (endTime - startTime) / 1000;
    return `${duration.toFixed(2)}s`;
  };

  const isLoading = result1.isLoading || result2.isLoading;

  const getModelInfo = (modelName: string) => {
    const model = models.find((m) => m.name === modelName);
    if (!model) return null;
    return {
      size: (model.size / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
      family: model.details?.family || 'Unknown',
      params: model.details?.parameter_size || 'Unknown',
    };
  };

  return (
    <div className="playground-page">
      <div className="playground-header">
        <div className="header-content">
          <h1>Model Comparison Playground</h1>
          <p>Compare responses from two different models side by side</p>
        </div>
        {hasCompared && (
          <button onClick={clearResults} className="clear-button" disabled={isLoading}>
            Clear & Start Over
          </button>
        )}
      </div>

      <div className="model-selection">
        <div className="model-select-panel">
          <label htmlFor="model1">Model A</label>
          <select
            id="model1"
            value={model1}
            onChange={(e) => setModel1(e.target.value)}
            disabled={isLoading}
          >
            {models.length === 0 ? (
              <option>No models available</option>
            ) : (
              models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))
            )}
          </select>
          {model1 && getModelInfo(model1) && (
            <div className="model-info">
              <span>{getModelInfo(model1)?.params}</span>
              <span>{getModelInfo(model1)?.size}</span>
            </div>
          )}
        </div>

        <div className="vs-divider">VS</div>

        <div className="model-select-panel">
          <label htmlFor="model2">Model B</label>
          <select
            id="model2"
            value={model2}
            onChange={(e) => setModel2(e.target.value)}
            disabled={isLoading}
          >
            {models.length === 0 ? (
              <option>No models available</option>
            ) : (
              models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))
            )}
          </select>
          {model2 && getModelInfo(model2) && (
            <div className="model-info">
              <span>{getModelInfo(model2)?.params}</span>
              <span>{getModelInfo(model2)?.size}</span>
            </div>
          )}
        </div>
      </div>

      <div className="comparison-area">
        <div className="response-panel">
          <div className="panel-header">
            <h3>{model1 || 'Model A'}</h3>
            {result1.isLoading && <span className="loading-indicator">Generating...</span>}
            {result1.endTime && result1.startTime && (
              <span className="duration">{formatDuration(result1.startTime, result1.endTime)}</span>
            )}
          </div>
          <div className="response-content" ref={response1Ref}>
            {!hasCompared ? (
              <div className="empty-response">
                <p>Response will appear here</p>
              </div>
            ) : result1.error ? (
              <div className="error-response">
                <p>Error: {result1.error}</p>
              </div>
            ) : (
              <div className={`response-text ${result1.isLoading ? 'streaming' : ''}`}>
                {result1.response || (result1.isLoading ? '' : 'No response')}
              </div>
            )}
          </div>
        </div>

        <div className="response-panel">
          <div className="panel-header">
            <h3>{model2 || 'Model B'}</h3>
            {result2.isLoading && <span className="loading-indicator">Generating...</span>}
            {result2.endTime && result2.startTime && (
              <span className="duration">{formatDuration(result2.startTime, result2.endTime)}</span>
            )}
          </div>
          <div className="response-content" ref={response2Ref}>
            {!hasCompared ? (
              <div className="empty-response">
                <p>Response will appear here</p>
              </div>
            ) : result2.error ? (
              <div className="error-response">
                <p>Error: {result2.error}</p>
              </div>
            ) : (
              <div className={`response-text ${result2.isLoading ? 'streaming' : ''}`}>
                {result2.response || (result2.isLoading ? '' : 'No response')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="prompt-section">
        <div className="prompt-header">
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className={`system-prompt-toggle ${systemPrompt.trim() ? 'active' : ''}`}
            disabled={isLoading}
          >
            {systemPrompt.trim() ? 'System Prompt Set' : 'Add System Prompt'}
          </button>
        </div>

        {showSystemPrompt && (
          <div className="system-prompt-editor">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter a system prompt that will be used for both models..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="prompt-input">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                runComparison();
              }
            }}
            placeholder="Enter your prompt here... (Enter to send, Shift+Enter for new line)"
            disabled={isLoading || models.length === 0}
            rows={4}
          />
          <button
            onClick={runComparison}
            disabled={isLoading || !prompt.trim() || !model1 || !model2 || models.length === 0}
            className="compare-button"
          >
            {isLoading ? 'Comparing...' : 'Compare Models'}
          </button>
        </div>
      </div>
    </div>
  );
}
