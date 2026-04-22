import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { IBrandColor, IBrandLogo } from '@novu/shared';
import ContextDev from 'context.dev';

export interface BrandData {
  industry?: { industry: string; subindustry: string }[];
  companyTitle?: string;
  companyDescription?: string;
  logos?: IBrandLogo[];
  colors?: IBrandColor[];
}

const LOG_CONTEXT = 'BrandRetrievalService';

const LOGO_TYPES = new Set<IBrandLogo['type']>(['icon', 'logo']);
const LOGO_MODES = new Set<IBrandLogo['mode']>(['light', 'dark', 'has_opaque_background']);

function isLogoType(value: unknown): value is IBrandLogo['type'] {
  return typeof value === 'string' && LOGO_TYPES.has(value as IBrandLogo['type']);
}

function isLogoMode(value: unknown): value is IBrandLogo['mode'] {
  return typeof value === 'string' && LOGO_MODES.has(value as IBrandLogo['mode']);
}

@Injectable()
export class BrandRetrievalService {
  private client: ContextDev | null = null;

  constructor(private readonly logger: PinoLogger) {}

  async initialize(): Promise<void> {
    const apiKey = process.env.CONTEXT_DEV_API_KEY;
    if (!apiKey) {
      this.logger.warn('CONTEXT_DEV_API_KEY not configured, brand enrichment will be unavailable', LOG_CONTEXT);

      return;
    }

    this.client = new ContextDev({ apiKey });
    this.logger.info('Brand enrichment service initialized successfully', LOG_CONTEXT);
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async retrieveBrand(domain: string): Promise<BrandData> {
    if (!this.client) {
      this.logger.warn('Brand enrichment client not initialized', LOG_CONTEXT);

      return {};
    }

    const response = await this.client.brand.retrieve({ domain });
    const brand = response?.brand;

    if (!brand) return {};

    const industry = brand.industries?.eic
      ?.filter((ind) => !!ind.industry && !!ind.subindustry)
      .map((ind) => ({ industry: ind.industry, subindustry: ind.subindustry }));

    const logos: IBrandLogo[] | undefined = brand.logos
      ?.filter(
        (l): l is { url: string; type: IBrandLogo['type']; mode: IBrandLogo['mode'] } =>
          typeof l.url === 'string' && !!l.url && isLogoType(l.type) && isLogoMode(l.mode)
      )
      .map((l) => ({ url: l.url, type: l.type, mode: l.mode }));

    const colors: IBrandColor[] | undefined = brand.colors
      ?.filter((c): c is { hex: string; name: string } => !!c.hex && !!c.name)
      .map((c) => ({ hex: c.hex, name: c.name }));

    return {
      industry,
      companyTitle: brand.title,
      companyDescription: brand.description,
      logos: logos?.length ? logos : undefined,
      colors: colors?.length ? colors : undefined,
    };
  }
}
