/**
 * AI provider abstraction for xweb template generation.
 *
 * Reads configuration from environment variables:
 *   AI_PROVIDER  — 'deepseek' (default) | 'anthropic'
 *   AI_API_KEY   — API key (required)
 *   AI_MODEL     — model name (defaults: deepseek-chat / claude-sonnet-4-6)
 *   AI_BASE_URL  — override base URL for proxies or compatible APIs
 *
 * No external dependencies — uses native fetch().
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AICompletionOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  /** Returns the completion text from the AI. Throws on error. */
  complete(options: AICompletionOptions): Promise<string>;
}

export interface AIConfig {
  provider: 'deepseek' | 'anthropic';
  apiKey: string;
  baseURL?: string;
  model: string;
}

/**
 * Read AI configuration from environment variables.
 * Priority: process.env > .env file (Astro SSR doesn't auto-load .env into process.env)
 */
export function getAIConfig(): AIConfig {
  // Merge .env file into a plain object so we can read it regardless of runtime
  const dotEnv = readDotEnv();

  const get = (key: string): string => {
    // 1. process.env (Node standalone with --env-file, or production)
    if (typeof process !== 'undefined' && process.env[key]) {
      return process.env[key] as string;
    }
    // 2. .env file fallback (Astro SSR dev mode)
    return dotEnv[key] || '';
  };

  const provider = (get('AI_PROVIDER') || 'deepseek') as 'deepseek' | 'anthropic';
  const apiKey = get('AI_API_KEY');
  let model = get('AI_MODEL');
  const baseURL = get('AI_BASE_URL') || undefined;

  if (!model) {
    model = provider === 'anthropic' ? 'claude-sonnet-4-6' : 'deepseek-chat';
  }

  return { provider, apiKey, model, baseURL };
}

/** Read .env file from project root into a plain key-value object. */
function readDotEnv(): Record<string, string> {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return {};
    const result: Record<string, string> = {};
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      let key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Factory: return the correct AIProvider based on the given (or default) config.
 */
export async function getAIProvider(cfg?: AIConfig): Promise<AIProvider> {
  const config = cfg || getAIConfig();

  if (!config.apiKey) {
    throw new Error(
      'AI_API_KEY is not configured. Set it in your .env file.\n' +
      'DeepSeek: https://platform.deepseek.com/api_keys\n' +
      'Anthropic: https://console.anthropic.com/settings/keys',
    );
  }

  if (config.provider === 'anthropic') {
    const { AnthropicProvider } = await import('./providers/anthropic');
    return new AnthropicProvider(config);
  }

  // Default: DeepSeek (OpenAI-compatible)
  const { DeepSeekProvider } = await import('./providers/deepseek');
  return new DeepSeekProvider(config);
}
