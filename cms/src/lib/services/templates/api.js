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
