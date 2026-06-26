/**
 * Validator for AI-generated template.yml and collections.yml.
 */

import { load } from 'js-yaml';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_WIDGETS = new Set([
  'string', 'text', 'markdown', 'number', 'boolean',
  'datetime', 'list', 'image', 'select', 'relation',
]);

const VALID_CUSTOM_TYPES = new Set(['color', 'select', 'number', 'boolean']);

// ── Full template validation (generate mode) ─────────────────────

export function validateAIGenerated(
  templateYAML: string,
  collectionsYAML: string,
): ValidationResult {
  const errors: string[] = [];

  try {
    const tmpl = load(templateYAML) as Record<string, unknown>;
    if (!tmpl || typeof tmpl !== 'object') {
      errors.push('template.yml: parsed to non-object');
    } else {
      validateTemplate(tmpl, errors);
    }
  } catch (e: any) {
    errors.push(`template.yml: YAML parse error — ${e.message}`);
  }

  try {
    const coll = load(collectionsYAML) as Record<string, unknown>;
    if (!coll || typeof coll !== 'object') {
      errors.push('collections.yml: parsed to non-object');
    } else {
      validateCollections(coll, errors);
    }
  } catch (e: any) {
    errors.push(`collections.yml: YAML parse error — ${e.message}`);
  }

  return { valid: errors.length === 0, errors };
}

// ── Collections-only validation (append mode) ─────────────────────

export function validateCollectionsOnly(collectionsYAML: string): ValidationResult {
  const errors: string[] = [];

  try {
    const coll = load(collectionsYAML) as Record<string, unknown>;
    if (!coll || typeof coll !== 'object') {
      errors.push('collections.yml: parsed to non-object');
    } else {
      const collections = coll.collections;
      if (collections !== undefined) {
        if (!Array.isArray(collections)) {
          errors.push("collections.yml: 'collections' must be an array");
        } else {
          for (let ci = 0; ci < collections.length; ci++) {
            const col = collections[ci] as Record<string, unknown>;
            if (!col || typeof col !== 'object') continue;
            validateCollectionQuick(col, ci, errors);
          }
        }
      }
      const settings = coll.settings;
      if (settings !== undefined && Array.isArray(settings)) {
        validateSettingsQuick(settings, errors);
      }
    }
  } catch (e: any) {
    errors.push(`collections.yml: YAML parse error — ${e.message}`);
  }

  return { valid: errors.length === 0, errors };
}

// ── template.yml validation ──────────────────────────────────────

function validateTemplate(tmpl: Record<string, unknown>, errors: string[]): void {
  for (const field of ['name', 'version', 'label']) {
    const val = tmpl[field];
    if (!val || typeof val !== 'string' || !(val as string).trim()) {
      errors.push(`template.yml: missing or empty required field '${field}'`);
    }
  }
  if (!tmpl.type || typeof tmpl.type !== 'string') {
    errors.push("template.yml: missing 'type'");
  }
  const supports = tmpl.supports;
  if (!Array.isArray(supports) || supports.length === 0) {
    errors.push("template.yml: 'supports' must be a non-empty array");
  }
  if ('extends' in tmpl && tmpl.extends !== null && tmpl.extends !== undefined && typeof tmpl.extends !== 'string') {
    errors.push("template.yml: 'extends' must be a string or null");
  }
  if (tmpl.customizable) {
    validateCustomizable(tmpl.customizable, errors);
  }
}

function validateCustomizable(customizable: unknown, errors: string[]): void {
  if (typeof customizable !== 'object' || customizable === null) {
    errors.push("template.yml: 'customizable' must be an object");
    return;
  }
  for (const [group, fields] of Object.entries(customizable as Record<string, unknown>)) {
    if (!Array.isArray(fields)) continue;
    const seen = new Set<string>();
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i] as Record<string, unknown>;
      if (!f || typeof f !== 'object') continue;
      if (!f.name || typeof f.name !== 'string') {
        errors.push(`template.yml: customizable.${group}[${i}] missing 'name'`);
      } else if (seen.has(f.name)) {
        errors.push(`template.yml: customizable.${group} duplicate '${f.name}'`);
      } else {
        seen.add(f.name as string);
      }
      if (!f.label) errors.push(`template.yml: customizable.${group}[${i}] missing 'label'`);
      if (!f.type || !VALID_CUSTOM_TYPES.has(f.type as string)) {
        errors.push(`template.yml: customizable.${group}[${i}] invalid type '${f.type}'`);
      }
      if (f.type === 'select' && (!Array.isArray(f.options) || (f.options as unknown[]).length === 0)) {
        errors.push(`template.yml: customizable.${group}[${i}] ('${f.name}') select missing 'options'`);
      }
    }
  }
}

// ── collections.yml validation ───────────────────────────────────

function validateCollections(coll: Record<string, unknown>, errors: string[]): void {
  const collections = coll.collections;
  if (collections !== undefined && !Array.isArray(collections)) {
    errors.push("collections.yml: 'collections' must be an array");
  }
  if (Array.isArray(collections)) {
    const names = new Set<string>();
    for (let ci = 0; ci < collections.length; ci++) {
      const col = collections[ci] as Record<string, unknown>;
      if (!col || typeof col !== 'object') continue;
      validateCollectionFull(col, ci, names, errors);
    }
  }
  const settings = coll.settings;
  if (settings !== undefined && Array.isArray(settings)) {
    for (let si = 0; si < settings.length; si++) {
      const s = settings[si] as Record<string, unknown>;
      if (!s || typeof s !== 'object') continue;
      validateSetting(s, si, errors);
    }
  }
}

function validateCollectionFull(
  col: Record<string, unknown>,
  index: number,
  names: Set<string>,
  errors: string[],
): void {
  const prefix = `collections.yml: collections[${index}]`;
  if (!col.name || typeof col.name !== 'string') {
    errors.push(`${prefix}: missing 'name'`);
    return;
  }
  if (names.has(col.name)) errors.push(`${prefix}: duplicate name '${col.name}'`);
  names.add(col.name as string);
  if (!col.label) errors.push(`${prefix}: missing 'label'`);
  if (!col.label_singular) errors.push(`${prefix}: missing 'label_singular'`);
  if (!col.folder) errors.push(`${prefix}: missing 'folder'`);
  else if (!(col.folder as string).startsWith('src/content/')) errors.push(`${prefix}: folder should start with src/content/`);
  if (typeof col.create !== 'boolean') errors.push(`${prefix}: 'create' must be boolean`);

  const fields = col.fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    errors.push(`${prefix}: 'fields' must be non-empty array`);
  } else {
    validateFields(fields, prefix, errors);
  }
}

// ── Quick collection validation (append mode, less strict) ───────

function validateCollectionQuick(
  col: Record<string, unknown>,
  index: number,
  errors: string[],
): void {
  const prefix = `collections.yml: collection '${col.name || `[${index}]`}'`;
  if (!col.name) errors.push(`${prefix}: missing 'name'`);
  if (!col.label) errors.push(`${prefix}: missing 'label'`);
  if (!col.label_singular) errors.push(`${prefix}: missing 'label_singular'`);
  if (!col.folder) errors.push(`${prefix}: missing 'folder'`);

  const fields = col.fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    errors.push(`${prefix}: 'fields' must be non-empty array`);
  } else {
    validateFields(fields, prefix, errors);
  }
}

// ── Field & settings validation ───────────────────────────────────

function validateFields(fields: unknown[], prefix: string, errors: string[]): void {
  const fieldNames = new Set<string>();
  let hasBody = false;

  for (let fi = 0; fi < fields.length; fi++) {
    const f = fields[fi] as Record<string, unknown>;
    if (!f || typeof f !== 'object') continue;
    const fp = `${prefix}: field '${f.name || `[${fi}]`}'`;

    if (!f.label) errors.push(`${fp}: missing 'label'`);
    if (!f.name) { errors.push(`${fp}: missing 'name'`); continue; }
    if (fieldNames.has(f.name as string)) { errors.push(`${fp}: duplicate name`); }
    fieldNames.add(f.name as string);

    const widget = f.widget;
    if (!widget || !VALID_WIDGETS.has(widget as string)) {
      errors.push(`${fp}: invalid widget '${widget}'`);
    } else {
      if (widget === 'select' && (!Array.isArray(f.options) || (f.options as unknown[]).length === 0)) {
        errors.push(`${fp}: select widget missing 'options'`);
      }
      if (widget === 'relation') {
        if (!f.collection) errors.push(`${fp}: relation widget missing 'collection'`);
        if (!f.value_field) errors.push(`${fp}: relation widget missing 'value_field'`);
      }
      if (widget === 'markdown') hasBody = true;
      if (widget === 'boolean' && f.default !== undefined && typeof f.default !== 'boolean') {
        errors.push(`${fp}: boolean default must be true/false`);
      }
    }
  }
  if (!hasBody) errors.push(`${prefix}: consider adding a 'body' field with widget: markdown`);
}

function validateSetting(setting: Record<string, unknown>, index: number, errors: string[]): void {
  const prefix = `collections.yml: settings[${index}]`;
  if (!setting.name) errors.push(`${prefix}: missing 'name'`);
  if (!setting.label) errors.push(`${prefix}: missing 'label'`);
  if (!setting.file) errors.push(`${prefix}: missing 'file'`);
}

function validateSettingsQuick(settings: unknown[], errors: string[]): void {
  for (let si = 0; si < settings.length; si++) {
    const s = settings[si] as Record<string, unknown>;
    if (!s || typeof s !== 'object') continue;
    validateSetting(s, si, errors);
  }
}
