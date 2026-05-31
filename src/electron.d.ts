// src/electron.d.ts
export interface SystemSpecs {
  cpu: { manufacturer: string; brand: string; cores: number };
  ram: { total: number; free: number; used: number };
  gpu: Array<{ name: string; vram: number | null; vendor: string }>;
  os: { platform: string; distro: string; release: string };
}

export interface SystemResources {
  cpu: { currentLoad: number };
  ram: { used: number; total: number };
  vram: { used: number; total: number } | null;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

declare global {
  interface Window {
    electronAPI: {
      getSystemSpecs: () => Promise<SystemSpecs>;
      getCurrentResources: () => Promise<SystemResources>;
      fetchModels: () => Promise<{ models: OllamaModel[] }>;
      pullModel: (modelName: string) => Promise<any>;
      deleteModel: (modelName: string) => Promise<Response>;
      generateChat: (model: string, messages: Array<{ role: string; content: string }>) => Promise<{ message: { content: string } }>;
      getRunningModels: () => Promise<any>;
      stopModel: (modelName: string) => Promise<Response>;
      getOllamaLogs: (numLines?: number) => Promise<{ success: boolean; lines?: string[]; error?: string }>;
      startLogWatcher: () => Promise<{ success: boolean }>;
      stopLogWatcher: () => Promise<{ success: boolean }>;
      onNewLogLine: (callback: (line: string) => void) => () => void;
    };
  }
}

export {};