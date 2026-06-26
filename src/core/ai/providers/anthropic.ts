/**
 * Anthropic AI provider — Messages API.
 *
 * Endpoint: https://api.anthropic.com/v1/messages
 * Docs: https://docs.anthropic.com/en/api/messages
 */

import type { AICompletionOptions, AIProvider, AIConfig } from '../index';

export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(config: AIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async complete(options: AICompletionOptions): Promise<string> {
    const { systemPrompt, userMessage, temperature = 0.3, maxTokens = 8000 } = options;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: userMessage }],
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = errBody?.error?.message || JSON.stringify(errBody);
      } catch {
        detail = await response.text().catch(() => '');
      }
      throw new Error(`Anthropic API error: ${response.status}${detail ? ` — ${detail}` : ''}`);
    }

    const data = await response.json();

    // Anthropic returns content as an array of blocks: [{type: "text", text: "..."}]
    const textBlocks = data?.content?.filter((b: { type: string }) => b.type === 'text');
    if (!textBlocks?.length) {
      throw new Error('Anthropic API returned an empty response — no text content found');
    }

    return textBlocks.map((b: { text: string }) => b.text).join('').trim();
  }
}
