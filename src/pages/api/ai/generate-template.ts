/**
 * POST /api/ai/generate-template
 *
 * AI template operations — auto-detect or explicit:
 *   action: 'auto'     — AI decides: generate, append, or modify (default)
 *   action: 'generate' — generate a brand new template from scratch
 *   action: 'append'   — add new collections/pages to the active template
 *   action: 'modify'   — modify an existing template file
 *
 * Phase 2: All operations return content for review before applying.
 */

import type { APIRoute } from 'astro';
import { verifyToken } from '../cms/auth';
import { getAIConfig, getAIProvider } from '../../../core/ai/index';
import {
  buildSystemPrompt,
  buildUserMessage,
  parseAIResponse,
  buildAppendSystemPrompt,
  buildAppendUserMessage,
  parseAppendResponse,
  buildModifySystemPrompt,
  buildModifyUserMessage,
  parseModifyResponse,
  buildAutoSystemPrompt,
  buildAutoUserMessage,
  parseAutoResponse,
} from '../../../core/ai/prompts/generate-template';
import { detectIndustries } from '../../../core/ai/prompts/industries';
import { validateAIGenerated, validateCollectionsOnly } from '../../../core/ai/validator';
import { getTemplateContext, buildTemplateContextSummary } from '../../../core/ai/template-context';
import { load } from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

export const POST: APIRoute = async ({ request }) => {
  // ── Auth ──
  const user = verifyToken(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ──
  let body: {
    prompt?: string;
    action?: string;
    provider?: string;
    model?: string;
    filePath?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt, action = 'auto', provider: reqProvider, model: reqModel, filePath: reqFilePath } = body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return new Response(JSON.stringify({ error: 'Missing or empty "prompt" field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Load AI config ──
  let config;
  try {
    config = getAIConfig();
    if (reqProvider && (reqProvider === 'deepseek' || reqProvider === 'anthropic')) {
      config.provider = reqProvider;
    }
    if (reqModel) config.model = reqModel;
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Route by action ──
  switch (action) {
    case 'auto':
      return handleAuto(prompt.trim(), config);
    case 'generate':
      return handleGenerate(prompt.trim(), config);
    case 'append':
      return handleAppend(prompt.trim(), config);
    case 'modify':
      return handleModify(prompt.trim(), reqFilePath, config);
    default:
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
  }
};

// ── Auto (AI decides intent) ─────────────────────────────────────

async function handleAuto(prompt: string, config: ReturnType<typeof getAIConfig>) {
  // Read current template context
  let ctx;
  try {
    ctx = getTemplateContext();
  } catch (e: any) {
    return errorResponse(`Failed to read template context: ${e.message}`, 500, config);
  }

  const contextSummary = buildTemplateContextSummary(ctx);
  const industryContext = detectIndustries(prompt);
  const systemPrompt = buildAutoSystemPrompt(contextSummary);
  const fullSystemPrompt = industryContext
    ? `${systemPrompt}\n\n## Industry Context\n${industryContext}`
    : systemPrompt;
  const userMessage = buildAutoUserMessage(prompt);

  let aiResponse: string;
  try {
    const provider = await getAIProvider(config);
    aiResponse = await provider.complete({
      systemPrompt: fullSystemPrompt,
      userMessage,
      temperature: 0.3,
      maxTokens: 8000,
    });
  } catch (e: any) {
    return errorResponse(`AI service error: ${e.message}`, 502, config);
  }

  const parsed = parseAutoResponse(aiResponse);

  if (parsed.action === 'generate') {
    if (!parsed.templateYAML || !parsed.collectionsYAML) {
      return errorResponse('AI did not return complete template files', 422, config, aiResponse);
    }
    const validation = validateAIGenerated(parsed.templateYAML, parsed.collectionsYAML);
    const templateMeta = extractTemplateMeta(parsed.templateYAML);
    return new Response(JSON.stringify({
      action: 'generate',
      template: templateMeta,
      files: { 'template.yml': parsed.templateYAML, 'collections.yml': parsed.collectionsYAML },
      validation: { valid: validation.valid, errors: validation.errors },
      provider: config.provider,
      model: config.model,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (parsed.action === 'modify') {
    if (!parsed.modifiedContent) {
      return errorResponse('AI did not return modified content', 422, config, aiResponse);
    }
    return new Response(JSON.stringify({
      action: 'modify',
      filePath: parsed.filePath || 'unknown',
      currentContent: '(see preview)',
      modifiedContent: parsed.modifiedContent,
      provider: config.provider,
      model: config.model,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // append (default)
  if (!parsed.collectionsYAML) {
    return errorResponse('AI did not return new collections', 422, config, aiResponse);
  }
  const validation = validateCollectionsOnly(parsed.collectionsYAML);
  return new Response(JSON.stringify({
    action: 'append',
    currentTemplate: ctx.name,
    additions: {
      templateYAML: parsed.templateYAML,
      collectionsYAML: parsed.collectionsYAML,
      pages: parsed.pages,
    },
    validation: { valid: validation.valid, errors: validation.errors },
    provider: config.provider,
    model: config.model,
  }), { headers: { 'Content-Type': 'application/json' } });
}

// ── Generate (from scratch) ───────────────────────────────────────

async function handleGenerate(prompt: string, config: ReturnType<typeof getAIConfig>) {
  const industryContext = detectIndustries(prompt);
  const systemPrompt = buildSystemPrompt(industryContext || undefined);
  const userMessage = buildUserMessage(prompt);

  let aiResponse: string;
  try {
    const provider = await getAIProvider(config);
    aiResponse = await provider.complete({ systemPrompt, userMessage, temperature: 0.3, maxTokens: 8000 });
  } catch (e: any) {
    return errorResponse(`AI service error: ${e.message}`, 502, config);
  }

  const { templateYAML, collectionsYAML, rawResponse } = parseAIResponse(aiResponse);

  if (!templateYAML || !collectionsYAML) {
    return errorResponse('AI response did not contain the expected code blocks', 422, config, rawResponse);
  }

  const validation = validateAIGenerated(templateYAML, collectionsYAML);
  const templateMeta = extractTemplateMeta(templateYAML);

  return new Response(JSON.stringify({
    action: 'generate',
    template: templateMeta,
    files: { 'template.yml': templateYAML, 'collections.yml': collectionsYAML },
    validation: { valid: validation.valid, errors: validation.errors },
    provider: config.provider,
    model: config.model,
  }), { headers: { 'Content-Type': 'application/json' } });
}

// ── Append (add to existing) ──────────────────────────────────────

async function handleAppend(prompt: string, config: ReturnType<typeof getAIConfig>) {
  // Read current template context
  let ctx;
  try {
    ctx = getTemplateContext();
  } catch (e: any) {
    return errorResponse(`Failed to read template context: ${e.message}`, 500, config);
  }

  const contextSummary = buildTemplateContextSummary(ctx);
  const industryContext = detectIndustries(prompt);
  const systemPrompt = buildAppendSystemPrompt(contextSummary);
  const fullSystemPrompt = industryContext ? `${systemPrompt}\n\n## Industry Context\n${industryContext}` : systemPrompt;
  const userMessage = buildAppendUserMessage(prompt);

  let aiResponse: string;
  try {
    const provider = await getAIProvider(config);
    aiResponse = await provider.complete({
      systemPrompt: fullSystemPrompt,
      userMessage,
      temperature: 0.3,
      maxTokens: 8000,
    });
  } catch (e: any) {
    return errorResponse(`AI service error: ${e.message}`, 502, config);
  }

  const parsed = parseAppendResponse(aiResponse);

  if (!parsed.collectionsYAML) {
    return errorResponse('AI response did not contain new collections', 422, config, aiResponse);
  }

  // Validate only the new collections (not the full template)
  const validation = validateCollectionsOnly(parsed.collectionsYAML);

  return new Response(JSON.stringify({
    action: 'append',
    currentTemplate: ctx.name,
    additions: {
      templateYAML: parsed.templateYAML,
      collectionsYAML: parsed.collectionsYAML,
      pages: parsed.pages,
    },
    validation: { valid: validation.valid, errors: validation.errors },
    provider: config.provider,
    model: config.model,
  }), { headers: { 'Content-Type': 'application/json' } });
}

// ── Modify (edit existing file) ───────────────────────────────────

async function handleModify(prompt: string, filePath: string | undefined, config: ReturnType<typeof getAIConfig>) {
  if (!filePath) {
    return new Response(JSON.stringify({ error: 'Missing "filePath" for modify action. Specify which file to modify.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read current file
  const cwd = process.cwd();
  let currentContent: string;

  // Try template chain first
  try {
    const ctx = getTemplateContext();
    // Search for the file in template chain
    let found = false;
    const regPath = path.join(cwd, 'templates', '.registry.json');
    let registry: Record<string, { path: string }> = {};
    if (fs.existsSync(regPath)) {
      registry = JSON.parse(fs.readFileSync(regPath, 'utf8')).installed || {};
    }

    for (let i = ctx.chain.length - 1; i >= 0; i--) {
      const tplName = ctx.chain[i];
      let tplDir = '';
      if (tplName === 'blog') {
        tplDir = path.join(cwd, 'templates', 'blog');
      } else if (registry[tplName]) {
        tplDir = path.join(cwd, registry[tplName].path);
      }
      if (!tplDir) continue;

      const fullPath = path.join(tplDir, filePath);
      if (fs.existsSync(fullPath)) {
        currentContent = fs.readFileSync(fullPath, 'utf8');
        found = true;
        break;
      }
    }

    if (!found) {
      // Check overrides
      const overridePath = path.join(cwd, '.xtcms', 'overrides', filePath);
      if (fs.existsSync(overridePath)) {
        currentContent = fs.readFileSync(overridePath, 'utf8');
        found = true;
      }
    }

    if (!found) {
      return errorResponse(`File not found in template chain: ${filePath}`, 404, config);
    }
  } catch (e: any) {
    return errorResponse(`Failed to read file: ${e.message}`, 500, config);
  }

  // Build context
  const ctx = getTemplateContext();
  const contextSummary = buildTemplateContextSummary(ctx);
  const systemPrompt = buildModifySystemPrompt(currentContent!, filePath, contextSummary);
  const userMessage = buildModifyUserMessage(prompt);

  let aiResponse: string;
  try {
    const provider = await getAIProvider(config);
    aiResponse = await provider.complete({
      systemPrompt,
      userMessage,
      temperature: 0.2,
      maxTokens: 8000,
    });
  } catch (e: any) {
    return errorResponse(`AI service error: ${e.message}`, 502, config);
  }

  const parsed = parseModifyResponse(aiResponse);

  if (!parsed.content) {
    return errorResponse('AI response did not contain modified file content', 422, config, aiResponse);
  }

  return new Response(JSON.stringify({
    action: 'modify',
    filePath: parsed.filePath || filePath,
    currentContent: currentContent,
    modifiedContent: parsed.content,
    provider: config.provider,
    model: config.model,
  }), { headers: { 'Content-Type': 'application/json' } });
}

// ── Helpers ───────────────────────────────────────────────────────

function extractTemplateMeta(templateYAML: string): Record<string, unknown> {
  try {
    const parsed = load(templateYAML) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      return {
        name: parsed.name,
        label: parsed.label,
        type: parsed.type,
        version: parsed.version,
        description: parsed.description || '',
        extends: parsed.extends || 'blog',
        supports: parsed.supports || [],
        features: parsed.features || [],
      };
    }
  } catch { /* ignore */ }
  return {};
}

function errorResponse(
  message: string,
  status: number,
  config: ReturnType<typeof getAIConfig>,
  rawResponse?: string,
): Response {
  const body: Record<string, unknown> = {
    error: message,
    provider: config.provider,
    model: config.model,
  };
  if (rawResponse) {
    body.rawResponse = rawResponse.slice(0, 2000);
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
