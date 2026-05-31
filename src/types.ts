export interface SystemSpecs {
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
  };
  ram: {
    total: number;
    free: number;
    used: number;
  };
  gpu: Array<{
    name: string;
    vram: number | null;
    vendor: string;
  }>;
  os: {
    platform: string;
    distro: string;
    release: string;
  };
}

export interface SystemResources {
  cpu: {
    currentLoad: number;
  };
  ram: {
    used: number;
    total: number;
  };
  vram: {
    used: number;
    total: number;
  } | null;
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

export interface ModelRecommendation {
  name: string;
  taskFit: number;
  description: string;
  vramRequired: number;
  ramRequired: number;
}