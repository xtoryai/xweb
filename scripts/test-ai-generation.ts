/**
 * CLI test script for AI template generation.
 *
 * Tests the AI provider + prompt + validator pipeline directly,
 * without needing the dev server running.
 *
 * Usage:
 *   # Set AI_API_KEY in .env first
 *   npx tsx scripts/test-ai-generation.ts "我想做一个律师事务所网站"
 *   npx tsx scripts/test-ai-generation.ts "a restaurant site with menu and reservations" --provider anthropic
 *   npx tsx scripts/test-ai-generation.ts "一个在线教育平台" --save
 *
 * Options:
 *   --provider <deepseek|anthropic>   Override AI_PROVIDER from .env
 *   --model <model>                   Override AI_MODEL from .env
 *   --save                            Write generated files to templates/<name>/
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Parse CLI args ──

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: npx tsx scripts/test-ai-generation.ts <prompt> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --provider <deepseek|anthropic>  AI provider (default: from .env)');
  console.log('  --model <model>                  Model name (default: from .env)');
  console.log('  --save                           Save generated template to templates/');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/test-ai-generation.ts "一个律师事务所网站"');
  console.log('  npx tsx scripts/test-ai-generation.ts "a restaurant site" --provider anthropic');
  process.exit(0);
}

let prompt = '';
let providerOverride: string | undefined;
let modelOverride: string | undefined;
let shouldSave = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--provider' && args[i + 1]) {
    providerOverride = args[++i];
  } else if (arg === '--model' && args[i + 1]) {
    modelOverride = args[++i];
  } else if (arg === '--save') {
    shouldSave = true;
  } else if (!arg.startsWith('--')) {
    prompt += (prompt ? ' ' : '') + arg;
  }
}

if (!prompt.trim()) {
  console.error('Error: No prompt provided.');
  process.exit(1);
}

// ── Load env vars (Node 22 built-in, no dotenv needed) ──

// process.env already loaded if using --env-file flag
// For convenience, try to read .env manually if vars are missing
function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadDotEnv();

// Apply overrides
if (providerOverride) process.env.AI_PROVIDER = providerOverride;
if (modelOverride) process.env.AI_MODEL = modelOverride;

// ── Imports (dynamic because they depend on env being loaded) ──

async function main() {
  const { getAIConfig, getAIProvider } = await import('../src/core/ai/index');
  const { buildSystemPrompt, buildUserMessage, parseAIResponse } = await import(
    '../src/core/ai/prompts/generate-template'
  );
  const { detectIndustries } = await import('../src/core/ai/prompts/industries');
  const { validateAIGenerated } = await import('../src/core/ai/validator');
  const { load } = await import('js-yaml');

  // ── Load config ──
  let config;
  try {
    config = getAIConfig();
  } catch (e: any) {
    console.error(`Config error: ${e.message}`);
    process.exit(1);
  }

  console.log(`Provider: ${config.provider}`);
  console.log(`Model:    ${config.model}`);
  console.log(`Prompt:   ${prompt.trim()}`);
  console.log('');

  // ── Build prompts ──
  const industryContext = detectIndustries(prompt.trim());
  if (industryContext) {
    console.log(`Industries detected: ${industryContext.slice(0, 100).replace(/\n/g, ' ')}...`);
  }

  const systemPrompt = buildSystemPrompt(industryContext || undefined);
  const userMessage = buildUserMessage(prompt.trim());

  console.log(`System prompt: ${systemPrompt.length} chars`);
  console.log(`User message:  ${userMessage.length} chars`);
  console.log('');

  // ── Call AI ──
  console.log('Calling AI...');
  const startTime = Date.now();

  let aiResponse: string;
  try {
    const aiProvider = await getAIProvider(config);
    aiResponse = await aiProvider.complete({
      systemPrompt,
      userMessage,
      temperature: 0.3,
      maxTokens: 8000,
    });
  } catch (e: any) {
    console.error(`AI call failed: ${e.message}`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`AI responded in ${elapsed}s, ${aiResponse.length} chars`);
  console.log('');

  // ── Parse ──
  const { templateYAML, collectionsYAML, rawResponse } = parseAIResponse(aiResponse);

  if (!templateYAML || !collectionsYAML) {
    console.error('Failed to parse AI response. Raw output:');
    console.error(rawResponse.slice(0, 3000));
    process.exit(1);
  }

  // ── Validate ──
  const validation = validateAIGenerated(templateYAML, collectionsYAML);

  // ── Print results ──
  console.log('═'.repeat(60));
  console.log('  template.yml');
  console.log('═'.repeat(60));
  console.log(templateYAML);
  console.log('');
  console.log('═'.repeat(60));
  console.log('  collections.yml');
  console.log('═'.repeat(60));
  console.log(collectionsYAML);
  console.log('');
  console.log('═'.repeat(60));
  console.log('  Validation');
  console.log('═'.repeat(60));

  if (validation.valid) {
    console.log('✅ All checks passed!');
  } else {
    console.log(`❌ ${validation.errors.length} error(s):`);
    for (const err of validation.errors) {
      console.log(`   - ${err}`);
    }
  }

  // ── Extract metadata ──
  try {
    const parsed = load(templateYAML) as Record<string, unknown>;
    if (parsed && parsed.name) {
      console.log('');
      console.log(`Template name: ${parsed.name}`);
      console.log(`Label:        ${parsed.label}`);
      console.log(`Type:         ${parsed.type}`);
      console.log(`Extends:      ${parsed.extends || 'blog'}`);
    }
  } catch {
    // Ignore
  }

  // ── Save if requested ──
  if (shouldSave) {
    try {
      const parsed = load(templateYAML) as Record<string, unknown>;
      const tplName = (parsed?.name as string) || 'ai-generated';
      const targetDir = path.join(process.cwd(), 'templates', tplName);

      if (fs.existsSync(targetDir)) {
        console.error(`Template "${tplName}" already exists at ${targetDir}`);
        console.error('Remove it first or use a different template name.');
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'template.yml'), templateYAML, 'utf8');
        fs.writeFileSync(path.join(targetDir, 'collections.yml'), collectionsYAML, 'utf8');

        // Register in .registry.json
        const regPath = path.join(process.cwd(), 'templates', '.registry.json');
        if (fs.existsSync(regPath)) {
          const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
          reg.installed[tplName] = {
            name: tplName,
            label: (parsed?.label as string) || tplName,
            version: (parsed?.version as string) || '0.1.0',
            source: 'ai-generated',
            extends: (parsed?.extends as string) || 'blog',
            installedAt: new Date().toISOString(),
            path: `templates/${tplName}`,
          };
          fs.writeFileSync(regPath, JSON.stringify(reg, null, 2));
          console.log(`Registered "${tplName}" in .registry.json`);
        }

        console.log(`Saved to templates/${tplName}/`);
      }
    } catch (e: any) {
      console.error(`Save failed: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
