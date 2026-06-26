/**
 * Read the active template's current state as context for AI append/modify operations.
 *
 * Provides the AI with a snapshot of:
 *   - Current template.yml structure
 *   - Current collections.yml structure
 *   - Existing page files
 *
 * This allows the AI to generate targeted additions/modifications
 * rather than full templates from scratch.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface TemplateContext {
  /** Active template name */
  name: string;
  /** Chain from root to active */
  chain: string[];
  /** Current template.yml contents */
  templateYAML: string;
  /** Current collections.yml contents */
  collectionsYAML: string;
  /** List of page files with their paths relative to src/pages/ */
  pages: string[];
  /** List of layout files */
  layouts: string[];
  /** List of collection directories */
  collections: string[];
  /** Active customizable groups */
  customizableGroups: string[];
}

/**
 * Read the active template context from the filesystem.
 * Follows the template chain to find the right files.
 */
export function getTemplateContext(): TemplateContext {
  const cwd = process.cwd();

  // Read active template marker
  const activePath = path.join(cwd, '.xtcms', 'active-template.json');
  let chain: string[] = ['blog'];
  let activeName = 'blog';

  if (fs.existsSync(activePath)) {
    const marker = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    chain = marker.chain || ['blog'];
    activeName = marker.name || 'blog';
  }

  // Read registry to find template paths
  const regPath = path.join(cwd, 'templates', '.registry.json');
  let registry: Record<string, { path: string }> = {};
  if (fs.existsSync(regPath)) {
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    registry = reg.installed || {};
  }

  // Find the active template directory
  let activeTemplateDir = '';
  if (registry[activeName]) {
    activeTemplateDir = path.join(cwd, registry[activeName].path);
  } else if (activeName === 'blog') {
    activeTemplateDir = path.join(cwd, 'templates', 'blog');
  }

  // Read template.yml
  let templateYAML = '';
  const templatePath = path.join(activeTemplateDir, 'template.yml');
  if (fs.existsSync(templatePath)) {
    templateYAML = fs.readFileSync(templatePath, 'utf8');
  }

  // Read collections.yml
  let collectionsYAML = '';
  const collPath = path.join(activeTemplateDir, 'collections.yml');
  if (fs.existsSync(collPath)) {
    collectionsYAML = fs.readFileSync(collPath, 'utf8');
  }

  // Collect pages from template chain (child → parent priority)
  const pages: string[] = [];
  const layouts: string[] = [];
  const seenPages = new Set<string>();
  const seenLayouts = new Set<string>();

  for (let i = chain.length - 1; i >= 0; i--) {
    const tplName = chain[i];
    let tplDir = '';
    if (tplName === 'blog') {
      tplDir = path.join(cwd, 'templates', 'blog');
    } else if (registry[tplName]) {
      tplDir = path.join(cwd, registry[tplName].path);
    }
    if (!tplDir || !fs.existsSync(tplDir)) continue;

    // Pages
    const pagesDir = path.join(tplDir, 'src', 'pages');
    if (fs.existsSync(pagesDir)) {
      walkDir(pagesDir, '', seenPages, pages);
    }

    // Layouts
    const layoutsDir = path.join(tplDir, 'src', 'layouts');
    if (fs.existsSync(layoutsDir)) {
      walkDir(layoutsDir, '', seenLayouts, layouts);
    }
  }

  // Also check user overrides
  const overridesPages = path.join(cwd, '.xtcms', 'overrides', 'src', 'pages');
  if (fs.existsSync(overridesPages)) {
    walkDir(overridesPages, '', seenPages, pages);
  }

  // Collect collection names from YAML (simple regex extraction)
  const collectionNames: string[] = [];
  if (collectionsYAML) {
    const nameRegex = /^\s+-\s+name:\s*(.+)$/gm;
    let m;
    while ((m = nameRegex.exec(collectionsYAML)) !== null) {
      collectionNames.push(m[1].trim().replace(/["']/g, ''));
    }
  }

  // Extract customizable groups
  const groups: string[] = [];
  if (templateYAML) {
    const groupRegex = /^(\w+):$/gm;
    let inCustomizable = false;
    for (const line of templateYAML.split('\n')) {
      if (line.trim() === 'customizable:') {
        inCustomizable = true;
        continue;
      }
      if (inCustomizable) {
        const m = line.match(/^(\w[\w-]*):$/);
        if (m && !line.startsWith(' ') && line.length > 0 && line[0] !== ' ') {
          // Top-level key outside customizable — we're done
          if (m[1] !== 'colors' && m[1] !== 'typography' && m[1] !== 'layout' && m[1] !== 'customizable') {
            inCustomizable = false;
            continue;
          }
        }
        if (m && (line.startsWith('  ') || line.startsWith('\t'))) {
          groups.push(m[1]);
        }
      }
    }
  }

  return {
    name: activeName,
    chain,
    templateYAML,
    collectionsYAML,
    pages: pages.sort(),
    layouts: layouts.sort(),
    collections: collectionNames,
    customizableGroups: groups.length > 0 ? groups : ['colors', 'typography', 'layout'],
  };
}

function walkDir(
  dir: string,
  relativePrefix: string,
  seen: Set<string>,
  result: string[],
): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walkDir(path.join(dir, entry.name), relPath, seen, result);
    } else if (entry.isFile()) {
      if (!seen.has(relPath)) {
        seen.add(relPath);
        result.push(relPath);
      }
    }
  }
}

/**
 * Build a human-readable summary of the active template for AI context.
 */
export function buildTemplateContextSummary(ctx: TemplateContext): string {
  const lines: string[] = [
    `## Current Template: ${ctx.name}`,
    `Chain: ${ctx.chain.join(' → ')}`,
    '',
    `### Existing Collections:`,
    ...(ctx.collections.length > 0
      ? ctx.collections.map((c) => `  - ${c}`)
      : ['  (none defined in this template)']),
    '',
    `### Existing Pages (from template chain):`,
    ...(ctx.pages.length > 0
      ? ctx.pages.map((p) => `  - ${p}`)
      : ['  (none)']),
    '',
    `### Existing Layouts:`,
    ...(ctx.layouts.length > 0
      ? ctx.layouts.map((l) => `  - ${l}`)
      : ['  (none)']),
    '',
    `### Customizable Groups:`,
    ...ctx.customizableGroups.map((g) => `  - ${g}`),
    '',
    `### Current template.yml:`,
    '```yaml',
    ctx.templateYAML || '# (empty — inherits from parent)',
    '```',
    '',
    `### Current collections.yml:`,
    '```yaml',
    ctx.collectionsYAML || '# (empty — inherits from parent)',
    '```',
  ];

  return lines.join('\n');
}
