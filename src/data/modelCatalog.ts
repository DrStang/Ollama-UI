export interface ModelCatalogEntry {
  name: string;
  displayName: string;
  description: string;
  parameterSize: string;
  size: string;
  tags: string[];
  category: 'general' | 'code' | 'vision' | 'embedding' | 'specialized';
  family: string;
  capabilities: string[];
}

export const modelCatalog: ModelCatalogEntry[] = [
  // General Purpose Models
  {
    name: 'llama3.3',
    displayName: 'Llama 3.3',
    description: 'Meta\'s latest Llama model with excellent general performance',
    parameterSize: '70B',
    size: '43 GB',
    tags: ['latest', 'popular', 'general'],
    category: 'general',
    family: 'llama',
    capabilities: ['chat', 'reasoning', 'multilingual']
  },
  {
    name: 'llama3.2',
    displayName: 'Llama 3.2',
    description: 'Lightweight Llama model, great for general tasks',
    parameterSize: '3B',
    size: '2.0 GB',
    tags: ['popular', 'lightweight'],
    category: 'general',
    family: 'llama',
    capabilities: ['chat', 'reasoning']
  },
  {
    name: 'llama3.1',
    displayName: 'Llama 3.1',
    description: 'Previous generation Llama model, still very capable',
    parameterSize: '8B',
    size: '4.7 GB',
    tags: ['popular'],
    category: 'general',
    family: 'llama',
    capabilities: ['chat', 'reasoning', 'multilingual']
  },
  {
    name: 'gemma2',
    displayName: 'Gemma 2',
    description: 'Google\'s efficient and capable model family',
    parameterSize: '9B',
    size: '5.5 GB',
    tags: ['popular', 'efficient'],
    category: 'general',
    family: 'gemma',
    capabilities: ['chat', 'reasoning']
  },
  {
    name: 'mistral',
    displayName: 'Mistral',
    description: 'High-quality model from Mistral AI',
    parameterSize: '7B',
    size: '4.1 GB',
    tags: ['popular'],
    category: 'general',
    family: 'mistral',
    capabilities: ['chat', 'reasoning', 'multilingual']
  },
  {
    name: 'phi4',
    displayName: 'Phi 4',
    description: 'Microsoft\'s latest small language model with impressive performance',
    parameterSize: '14B',
    size: '9.1 GB',
    tags: ['latest', 'efficient'],
    category: 'general',
    family: 'phi',
    capabilities: ['chat', 'reasoning', 'math']
  },
  {
    name: 'qwen2.5',
    displayName: 'Qwen 2.5',
    description: 'Alibaba\'s powerful multilingual model',
    parameterSize: '7B',
    size: '4.7 GB',
    tags: ['multilingual'],
    category: 'general',
    family: 'qwen',
    capabilities: ['chat', 'reasoning', 'multilingual', 'coding']
  },

  // Code Models
  {
    name: 'codellama',
    displayName: 'Code Llama',
    description: 'Meta\'s specialized model for code generation and analysis',
    parameterSize: '7B',
    size: '3.8 GB',
    tags: ['code', 'popular'],
    category: 'code',
    family: 'llama',
    capabilities: ['code-generation', 'code-completion', 'debugging']
  },
  {
    name: 'deepseek-coder-v2',
    displayName: 'DeepSeek Coder V2',
    description: 'Advanced coding model with strong performance',
    parameterSize: '16B',
    size: '8.9 GB',
    tags: ['code', 'latest'],
    category: 'code',
    family: 'deepseek',
    capabilities: ['code-generation', 'code-completion', 'debugging', 'refactoring']
  },
  {
    name: 'starcoder2',
    displayName: 'StarCoder 2',
    description: 'Open-source code generation model',
    parameterSize: '15B',
    size: '9.0 GB',
    tags: ['code'],
    category: 'code',
    family: 'starcoder',
    capabilities: ['code-generation', 'code-completion']
  },

  // Vision Models
  {
    name: 'llava',
    displayName: 'LLaVA',
    description: 'Vision-language model for image understanding',
    parameterSize: '7B',
    size: '4.5 GB',
    tags: ['vision', 'popular'],
    category: 'vision',
    family: 'llava',
    capabilities: ['image-understanding', 'visual-qa', 'chat']
  },
  {
    name: 'llava-llama3',
    displayName: 'LLaVA Llama 3',
    description: 'Vision model based on Llama 3',
    parameterSize: '8B',
    size: '5.5 GB',
    tags: ['vision', 'latest'],
    category: 'vision',
    family: 'llava',
    capabilities: ['image-understanding', 'visual-qa', 'chat']
  },
  {
    name: 'bakllava',
    displayName: 'BakLLaVA',
    description: 'Enhanced vision-language model',
    parameterSize: '7B',
    size: '4.5 GB',
    tags: ['vision'],
    category: 'vision',
    family: 'llava',
    capabilities: ['image-understanding', 'visual-qa']
  },
  {
    name: 'moondream',
    displayName: 'Moondream',
    description: 'Compact vision model for image analysis',
    parameterSize: '1.6B',
    size: '1.7 GB',
    tags: ['vision', 'lightweight'],
    category: 'vision',
    family: 'moondream',
    capabilities: ['image-understanding', 'visual-qa']
  },

  // Embedding Models
  {
    name: 'nomic-embed-text',
    displayName: 'Nomic Embed Text',
    description: 'High-quality text embedding model',
    parameterSize: '137M',
    size: '274 MB',
    tags: ['embedding', 'popular'],
    category: 'embedding',
    family: 'nomic',
    capabilities: ['text-embedding', 'semantic-search']
  },
  {
    name: 'mxbai-embed-large',
    displayName: 'MixedBread Embed Large',
    description: 'State-of-the-art embedding model',
    parameterSize: '335M',
    size: '669 MB',
    tags: ['embedding', 'latest'],
    category: 'embedding',
    family: 'mixedbread',
    capabilities: ['text-embedding', 'semantic-search']
  },
  {
    name: 'all-minilm',
    displayName: 'All-MiniLM',
    description: 'Lightweight embedding model for semantic search',
    parameterSize: '22.7M',
    size: '45 MB',
    tags: ['embedding', 'lightweight'],
    category: 'embedding',
    family: 'sentence-transformers',
    capabilities: ['text-embedding', 'semantic-search']
  },

  // Specialized Models
  {
    name: 'deepseek-r1',
    displayName: 'DeepSeek R1',
    description: 'Reasoning-focused model with chain-of-thought capabilities',
    parameterSize: '70B',
    size: '37 GB',
    tags: ['reasoning', 'specialized'],
    category: 'specialized',
    family: 'deepseek',
    capabilities: ['reasoning', 'chain-of-thought', 'problem-solving']
  },
  {
    name: 'qwq',
    displayName: 'QwQ',
    description: 'Specialized reasoning model from Alibaba',
    parameterSize: '32B',
    size: '19 GB',
    tags: ['reasoning', 'specialized'],
    category: 'specialized',
    family: 'qwen',
    capabilities: ['reasoning', 'chain-of-thought', 'math']
  },
  {
    name: 'neural-chat',
    displayName: 'Neural Chat',
    description: 'Optimized for conversational AI',
    parameterSize: '7B',
    size: '4.1 GB',
    tags: ['chat', 'specialized'],
    category: 'specialized',
    family: 'neural-chat',
    capabilities: ['chat', 'dialogue', 'instruction-following']
  },
  {
    name: 'orca-mini',
    displayName: 'Orca Mini',
    description: 'Small but capable model for quick tasks',
    parameterSize: '3B',
    size: '1.9 GB',
    tags: ['lightweight', 'specialized'],
    category: 'specialized',
    family: 'orca',
    capabilities: ['chat', 'reasoning', 'instruction-following']
  },
];

export const getModelsByCategory = (category: string) => {
  return modelCatalog.filter(model => model.category === category);
};

export const searchModels = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return modelCatalog.filter(model =>
    model.name.toLowerCase().includes(lowerQuery) ||
    model.displayName.toLowerCase().includes(lowerQuery) ||
    model.description.toLowerCase().includes(lowerQuery) ||
    model.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const categories = [
  { id: 'all', label: 'All Models', icon: '🌐' },
  { id: 'general', label: 'General', icon: '💬' },
  { id: 'code', label: 'Code', icon: '💻' },
  { id: 'vision', label: 'Vision', icon: '👁️' },
  { id: 'embedding', label: 'Embedding', icon: '🔍' },
  { id: 'specialized', label: 'Specialized', icon: '⚡' },
];
