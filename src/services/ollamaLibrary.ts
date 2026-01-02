import type { OllamaLibraryData, OllamaLibraryModel } from '../types';

const LIBRARY_URL = 'https://raw.githubusercontent.com/chrizzo84/OllamaScraper/refs/heads/main/out/ollama_models.json';
const CACHE_KEY = 'ollama_library_cache';
const CACHE_DURATION = 60 * 360 * 1000; // 1 hour in milliseconds

interface CachedLibrary {
  data: OllamaLibraryData;
  timestamp: number;
}

export class OllamaLibraryService {
  private cache: CachedLibrary | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading library cache:', error);
    }
  }

  private saveToLocalStorage(data: OllamaLibraryData): void {
    try {
      const cacheEntry: CachedLibrary = {
        data,
        timestamp: Date.now(),
      };
      this.cache = cacheEntry;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error saving library cache:', error);
    }
  }

  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.timestamp < CACHE_DURATION;
  }

  async fetchLibrary(forceRefresh: boolean = false): Promise<OllamaLibraryData> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid() && this.cache) {
      return this.cache.data;
    }

    try {
      const response = await fetch(LIBRARY_URL, {
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch library: ${response.statusText}`);
      }

      const data: OllamaLibraryData = await response.json();
      this.saveToLocalStorage(data);
      return data;
    } catch (error) {
      // If fetch fails but we have cached data, return it
      if (this.cache) {
        console.warn('Fetch failed, using cached data:', error);
        return this.cache.data;
      }
      throw error;
    }
  }

  searchModels(models: OllamaLibraryModel[], query: string): OllamaLibraryModel[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return models;

    return models.filter(model =>
      model.name.toLowerCase().includes(lowerQuery) ||
      model.slug.toLowerCase().includes(lowerQuery) ||
      model.blurb.toLowerCase().includes(lowerQuery) ||
      model.description.toLowerCase().includes(lowerQuery) ||
      model.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery))
    );
  }

  filterByCapability(models: OllamaLibraryModel[], capability: string): OllamaLibraryModel[] {
    if (capability === 'all') return models;
    return models.filter(model =>
      model.capabilities.some(cap => cap.toLowerCase() === capability.toLowerCase())
    );
  }

  sortModels(models: OllamaLibraryModel[], sortBy: 'pulls' | 'name' | 'variants'): OllamaLibraryModel[] {
    return [...models].sort((a, b) => {
      switch (sortBy) {
        case 'pulls':
          return b.pulls - a.pulls;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'variants':
          return b.variants.length - a.variants.length;
        default:
          return 0;
      }
    });
  }

  formatPulls(pulls: number): string {
    if (pulls >= 1000000) {
      return `${(pulls / 1000000).toFixed(1)}M`;
    }
    if (pulls >= 1000) {
      return `${(pulls / 1000).toFixed(1)}K`;
    }
    return pulls.toString();
  }

  getUniqueCapabilities(models: OllamaLibraryModel[]): string[] {
    const capabilities = new Set<string>();
    models.forEach(model => {
      model.capabilities.forEach(cap => capabilities.add(cap));
    });
    return Array.from(capabilities).sort();
  }

  getCacheInfo(): { lastUpdated: string | null; isStale: boolean } {
    if (!this.cache) {
      return { lastUpdated: null, isStale: true };
    }
    return {
      lastUpdated: new Date(this.cache.timestamp).toLocaleString(),
      isStale: !this.isCacheValid(),
    };
  }
}

export const ollamaLibraryService = new OllamaLibraryService();
