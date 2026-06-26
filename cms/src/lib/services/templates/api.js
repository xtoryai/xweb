/**
 * Template management API service for xtcms.
 * Communicates with the /api/cms/templates endpoints.
 * Token is read from the user account store automatically.
 */

import { user } from '$lib/services/user/account.svelte';

/**
 * Get auth headers with JWT token from user account.
 */
function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = user.account?.token || user.account?.login;
  if (token && typeof token === 'string' && token.length > 10) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch installed templates list.
 */
export async function fetchTemplates() {
  const resp = await fetch('/api/cms/templates', { headers: authHeaders() });
  if (!resp.ok) throw new Error(`Failed to fetch templates: ${resp.status}`);
  return resp.json();
}

/**
 * Activate a template.
 */
export async function activateTemplate(name) {
  const resp = await fetch('/api/cms/templates', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'activate', template: name, rebuild: true }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to activate template: ${resp.status}`);
  }
  return resp.json();
}

/**
 * Uninstall a template.
 */
export async function uninstallTemplate(name) {
  const resp = await fetch('/api/cms/templates', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'uninstall', template: name }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to uninstall template: ${resp.status}`);
  }
  return resp.json();
}

/**
 * Call the AI template API.
 * @param {'generate'|'append'|'modify'} action - What to do
 * @param {string} prompt - Natural language description
 * @param {Object} [opts] - Extra options
 * @param {string} [opts.provider] - AI provider override
 * @param {string} [opts.filePath] - Target file path (for modify action)
 * @returns {Promise<Object>}
 */
export async function aiAction(action, prompt, opts = {}) {
  const body = { action, prompt };
  if (opts.provider) body.provider = opts.provider;
  if (opts.filePath) body.filePath = opts.filePath;

  const resp = await fetch('/api/ai/generate-template', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(data.error || `AI action failed: ${resp.status}`);
  }

  return data;
}

/**
 * Generate a template using AI. (convenience wrapper)
 * @deprecated Use aiAction('generate', prompt, opts) instead
 */
export async function generateTemplate(prompt, provider) {
  return aiAction('generate', prompt, { provider });
}

/**
 * Install a template from generated YAML files.
 * @param {string} name - Template name
 * @param {Object} files - { 'template.yml': string, 'collections.yml': string }
 */
export async function installGeneratedTemplate(name, files) {
  // First write the template files via the files API, then register
  const templateDir = `templates/${name}`;

  // Write template.yml
  const resp1 = await fetch('/api/cms/files', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      path: `${templateDir}/template.yml`,
      content: files['template.yml'],
    }),
  });

  // Write collections.yml
  const resp2 = await fetch('/api/cms/files', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      path: `${templateDir}/collections.yml`,
      content: files['collections.yml'],
    }),
  });

  // Commit
  await fetch('/api/cms/commit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      message: `Install AI-generated template: ${name}`,
    }),
  });

  if (!resp1.ok || !resp2.ok) {
    const err1 = await resp1.json().catch(() => ({}));
    const err2 = await resp2.json().catch(() => ({}));
    throw new Error(err1.error || err2.error || 'Failed to write template files');
  }

  return { success: true, name };
}

/**
 * Apply AI append results — merge new collections into the active template.
 * @param {Object} additions - { templateYAML?, collectionsYAML, pages }
 * @param {string} activeTemplateName - Name of the active template
 */
export async function applyAppend(additions, activeTemplateName) {
  const tplDir = `templates/${activeTemplateName}`;

  const writes = [];

  // Write updated collections.yml (or create if not exists)
  if (additions.collectionsYAML) {
    writes.push({
      path: `${tplDir}/collections.yml`,
      content: additions.collectionsYAML,
    });
  }

  // Write updated template.yml if provided
  if (additions.templateYAML) {
    writes.push({
      path: `${tplDir}/template.yml`,
      content: additions.templateYAML,
    });
  }

  // Write new page files
  if (additions.pages && typeof additions.pages === 'object') {
    for (const [filePath, content] of Object.entries(additions.pages)) {
      writes.push({
        path: `${tplDir}/${filePath}`,
        content,
      });
    }
  }

  // Execute writes
  const results = [];
  for (const w of writes) {
    const resp = await fetch('/api/cms/files', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(w),
    });
    results.push({ path: w.path, ok: resp.ok });
  }

  // Commit
  await fetch('/api/cms/commit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      message: `AI append: ${additions.collectionsYAML ? 'new collections' : ''}${additions.pages ? ' + pages' : ''}`,
    }),
  });

  const failures = results.filter(r => !r.ok);
  if (failures.length > 0) {
    throw new Error(`Failed to write: ${failures.map(r => r.path).join(', ')}`);
  }

  return { success: true, files: results };
}

/**
 * Apply AI modify results — write the modified file back.
 * @param {string} filePath - Path within template, e.g. "src/pages/index.astro"
 * @param {string} content - New file content
 * @param {string} activeTemplateName - Name of the active template
 */
export async function applyModify(filePath, content, activeTemplateName) {
  // Write to .xtcms/overrides/ so it takes priority without modifying the original template
  const targetPath = `.xtcms/overrides/${filePath}`;

  const resp = await fetch('/api/cms/files', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ path: targetPath, content }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to write file: ${resp.status}`);
  }

  await fetch('/api/cms/commit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      message: `AI modify: ${filePath}`,
    }),
  });

  return { success: true, path: targetPath };
}
