/**
 * DeepSeek AI provider — OpenAI-compatible chat completions API.
 *
 * Endpoint: https://api.deepseek.com/v1/chat/completions
 * Docs: https://platform.deepseek.com/api-docs
 *
 * Also works with any OpenAI-compatible proxy by setting AI_BASE_URL.
 */

import type { AICompletionOptions, AIProvider, AIConfig } from '../index';

export class DeepSeekProvider implements AIProvider {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: AIConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
    this.model = config.model;
  }

  async complete(options: AICompletionOptions): Promise<string> {
    const { systemPrompt, userMessage, temperature = 0.3, maxTokens = 8000 } = options;

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userMessage });

    const url = `${this.baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = errBody?.error?.message || JSON.stringify(errBody);
      } catch {
        detail = await response.text().catch(() => '');
      }
      throw new Error(`DeepSeek API error: ${response.status}${detail ? ` — ${detail}` : ''}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content && !data?.choices?.length) {
      throw new Error('DeepSeek API returned an empty response — no choices found');
    }

    return (content || '').trim();
  }
}
