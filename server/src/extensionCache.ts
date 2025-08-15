import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
// Import types from the main index file to match the CatalogItem definition
type ItemType = "instruction" | "prompt" | "chatmode";
interface CatalogItem {
  id: string;
  type: ItemType;
  title: string;
  path: string;
  rawUrl: string;
  lastModified?: string;
  description: string;
  sha: string;
}

interface CachedCatalog {
  items: CatalogItem[];
  updatedAt: string;
}

interface VSCodeStorage {
  [key: string]: any;
}

/**
 * Service to read cache from the awesome-copilot-toolkit VS Code extension
 */
export class ExtensionCacheService {
  private static readonly CACHE_KEY = 'catalog:data';
  private static readonly UPDATED_AT_KEY = 'catalog:updatedAt';
  
  /**
   * Get VS Code storage path for the extension
   */
  private async getStoragePath(): Promise<string> {
    const platform = process.platform;
    let configDir: string;
    
    switch (platform) {
      case 'win32':
        configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage');
        break;
      case 'darwin':
        configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage');
        break;
      default: // linux
        configDir = path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage');
        break;
    }
    
    return path.join(configDir, 'awesome-copilot-toolkit');
  }
  
  /**
   * Read extension cache if available and valid
   */
  async getCachedCatalog(cacheTtlHours: number = 24): Promise<CatalogItem[] | null> {
    try {
      const storagePath = await this.getStoragePath();
      const storageFile = path.join(storagePath, 'storage.json');
      
      // Check if storage file exists
      try {
        await fs.access(storageFile);
      } catch {
        return null; // File doesn't exist
      }
      
      const storageData = await fs.readFile(storageFile, 'utf8');
      const storage: VSCodeStorage = JSON.parse(storageData);
      
      const items = storage[ExtensionCacheService.CACHE_KEY] as CatalogItem[];
      const updatedAt = storage[ExtensionCacheService.UPDATED_AT_KEY] as string;
      
      if (!items || !updatedAt) {
        return null;
      }
      
      // Check if cache is still valid
      const cacheTime = new Date(updatedAt);
      const now = new Date();
      const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
      
      if (diffHours >= cacheTtlHours) {
        return null; // Cache expired
      }
      
      console.log(`Using extension cache with ${items.length} items (${diffHours.toFixed(1)}h old)`);
      return items;
      
    } catch (error) {
      console.warn('Failed to read extension cache:', error);
      return null;
    }
  }
  
  /**
   * Check if extension is likely installed by looking for its storage directory
   */
  async isExtensionInstalled(): Promise<boolean> {
    try {
      const storagePath = await this.getStoragePath();
      await fs.access(storagePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get cache info for diagnostics
   */
  async getCacheInfo(): Promise<{ installed: boolean; cacheAge?: number; itemCount?: number }> {
    const installed = await this.isExtensionInstalled();
    if (!installed) {
      return { installed: false };
    }
    
    const cached = await this.getCachedCatalog(999999); // Get cache regardless of TTL
    if (!cached) {
      return { installed: true };
    }
    
    try {
      const storagePath = await this.getStoragePath();
      const storageFile = path.join(storagePath, 'storage.json');
      const storageData = await fs.readFile(storageFile, 'utf8');
      const storage: VSCodeStorage = JSON.parse(storageData);
      const updatedAt = storage[ExtensionCacheService.UPDATED_AT_KEY] as string;
      
      if (updatedAt) {
        const cacheTime = new Date(updatedAt);
        const now = new Date();
        const cacheAge = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
        
        return {
          installed: true,
          cacheAge,
          itemCount: cached.length
        };
      }
    } catch {
      // Fallback
    }
    
    return {
      installed: true,
      itemCount: cached.length
    };
  }
}
