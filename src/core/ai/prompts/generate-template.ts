/**
 * System prompt builder for AI template generation.
 *
 * Provides the complete xtcms template specification, few-shot examples,
 * and output format constraints to the LLM.
 */

import { detectIndustries } from './industries';

// ── Few-shot examples ──────────────────────────────────────────────

interface FewShotExample {
  label: string;
  userPrompt: string;
  templateYAML: string;
  collectionsYAML: string;
}

const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    label: '律师事务所',
    userPrompt: '一个律师事务所网站，需要有律师团队介绍、业务领域展示、成功案例，还要能在线咨询',
    templateYAML: `name: law-firm
version: 1.0.0
type: enterprise
label: 律师事务所模板
description: 专业律师事务所网站模板，支持律师团队展示、业务领域分类、案例展示和在线咨询。
author: xtcms
license: MIT

extends: blog

supports:
  - posts
  - pages
  - attorneys
  - practice-areas
  - cases
  - messages

layouts:
  homepage: hero-grid
  post: single-column
  list: with-sidebar

features:
  - responsive
  - search
  - dark-mode

customizable:
  colors:
    - { name: primary, label: 主色调, type: color, default: "#1a365d" }
    - { name: bg, label: 背景色, type: color, default: "#ffffff" }
    - { name: accent, label: 强调色, type: color, default: "#c5a572" }
    - { name: text, label: 文字色, type: color, default: "#333333" }
    - { name: muted, label: 辅助文字色, type: color, default: "#718096" }

  typography:
    - { name: heading_font, label: 标题字体, type: select, options: ["Noto Serif SC", "PingFang SC", "Microsoft YaHei", "思源宋体"], default: "Noto Serif SC" }
    - { name: body_font, label: 正文字体, type: select, options: ["PingFang SC", "Noto Sans SC", "Microsoft YaHei", "System UI"], default: "PingFang SC" }
    - { name: body_size, label: 正文字号(px), type: number, default: 16, min: 14, max: 20 }

  layout:
    - { name: container_width, label: 内容区宽度, type: select, options: ["800px", "960px", "1140px", "100%"], default: "1140px" }
    - { name: show_sidebar, label: 显示侧边栏, type: boolean, default: false }

requires:
  xtcms: ">=1.0.0"`,

    collectionsYAML: `collections:
  - name: attorneys
    label: 律师团队
    label_singular: 律师
    folder: src/content/attorneys
    create: true
    identifier_field: name
    slug: "{{fields._slug}}"
    summary: "{{name}} — {{title}}"
    sortable_fields:
      fields: [name, order]
      default: { field: order, direction: Ascending }
    editor:
      preview: false
    fields:
      - { label: 姓名, name: name, widget: string }
      - { label: 职位, name: title, widget: string, hint: "例如：高级合伙人、执业律师" }
      - { label: 照片, name: photo, widget: image, required: false }
      - { label: 简介, name: bio, widget: text, hint: "个人简介摘要，详细内容写在正文" }
      - { label: 专长领域, name: specialties, widget: list, default: [], hint: "例如：公司法、知识产权、刑事辩护" }
      - { label: 邮箱, name: email, widget: string, required: false }
      - { label: 电话, name: phone, widget: string, required: false }
      - { label: 资格证号, name: bar_number, widget: string, required: false }
      - { label: 教育背景, name: education, widget: text, required: false }
      - { label: 语言能力, name: languages, widget: list, default: [], required: false }
      - { label: 排序, name: order, widget: number, value_type: int, default: 0 }
      - { label: 正文, name: body, widget: markdown, required: false }

  - name: practice-areas
    label: 业务领域
    label_singular: 业务领域
    folder: src/content/practice-areas
    create: true
    identifier_field: title
    slug: "{{fields._slug}}"
    summary: "{{title}}"
    sortable_fields:
      fields: [title, order]
      default: { field: order, direction: Ascending }
    editor:
      preview: false
    fields:
      - { label: 名称, name: title, widget: string }
      - { label: 图标, name: icon, widget: image, required: false }
      - { label: 简介, name: description, widget: text }
      - { label: 排序, name: order, widget: number, value_type: int, default: 0 }
      - { label: 正文, name: body, widget: markdown, required: false }

  - name: cases
    label: 成功案例
    label_singular: 案例
    folder: src/content/cases
    create: true
    identifier_field: title
    slug: "{{fields._slug}}"
    summary: "{{title}} — {{date | date('YYYY-MM-DD')}}"
    sortable_fields:
      fields: [title, date]
      default: { field: date, direction: Descending }
    editor:
      preview: false
    fields:
      - { label: 标题, name: title, widget: string }
      - { label: 客户, name: client, widget: string, required: false }
      - { label: 案件概述, name: summary, widget: text }
      - { label: 结果, name: outcome, widget: string, required: false }
      - { label: 日期, name: date, widget: datetime, format: YYYY-MM-DD, time_format: false }
      - { label: 所属领域, name: practice_area, widget: string, required: false }
      - { label: 正文, name: body, widget: markdown, required: false }

settings:
  - name: general
    label: 基本设置
    file: src/content/settings/general.yml
    fields:
      - { label: 律所名称, name: site_title, widget: string, default: "律师事务所" }
      - { label: 网站描述, name: site_description, widget: text, default: "专业法律服务", required: false }
      - { label: 联系邮箱, name: email, widget: string, required: false }
      - { label: 联系电话, name: phone, widget: string, required: false }
      - { label: 地址, name: address, widget: text, required: false }
      - { label: ICP 备案号, name: icp, widget: string, required: false }`,
  },
  {
    label: '餐厅',
    userPrompt: '一个餐厅网站，有菜品展示、门店信息、在线预约',
    templateYAML: `name: restaurant
version: 1.0.0
type: enterprise
label: 餐厅模板
description: 适合餐厅/餐饮连锁的网站模板，支持菜品展示、门店管理和在线预约。
author: xtcms
license: MIT

extends: blog

supports:
  - posts
  - pages
  - menu-items
  - locations
  - reservations

layouts:
  homepage: hero-grid
  post: single-column
  list: card-grid

features:
  - responsive
  - search
  - dark-mode

customizable:
  colors:
    - { name: primary, label: 主色调, type: color, default: "#c0392b" }
    - { name: bg, label: 背景色, type: color, default: "#faf8f5" }
    - { name: accent, label: 强调色, type: color, default: "#e67e22" }
    - { name: text, label: 文字色, type: color, default: "#333333" }
    - { name: muted, label: 辅助文字色, type: color, default: "#7f8c8d" }

  typography:
    - { name: heading_font, label: 标题字体, type: select, options: ["PingFang SC", "Noto Serif SC", "Microsoft YaHei"], default: "PingFang SC" }
    - { name: body_font, label: 正文字体, type: select, options: ["PingFang SC", "Noto Sans SC", "Microsoft YaHei"], default: "PingFang SC" }
    - { name: body_size, label: 正文字号(px), type: number, default: 16, min: 14, max: 20 }

  layout:
    - { name: container_width, label: 内容区宽度, type: select, options: ["800px", "960px", "1140px", "100%"], default: "1140px" }
    - { name: show_sidebar, label: 显示侧边栏, type: boolean, default: false }

requires:
  xtcms: ">=1.0.0"`,

    collectionsYAML: `collections:
  - name: menu-items
    label: 菜品管理
    label_singular: 菜品
    folder: src/content/menu-items
    create: true
    identifier_field: name
    slug: "{{fields._slug}}"
    summary: "{{name}} — ¥{{price}}"
    sortable_fields:
      fields: [name, price, order]
      default: { field: order, direction: Ascending }
    view_groups:
      - { label: 推荐, field: recommended, pattern: "true" }
      - { label: 全部, field: recommended, pattern: "false" }
    editor:
      preview: false
    fields:
      - { label: 菜品名称, name: name, widget: string }
      - { label: 描述, name: description, widget: text, required: false }
      - { label: 价格, name: price, widget: number, value_type: int }
      - { label: 分类, name: category, widget: select, options: [招牌菜, 前菜, 主菜, 汤品, 甜品, 饮品, 酒水] }
      - { label: 图片, name: image, widget: image, required: false }
      - { label: 推荐, name: recommended, widget: boolean, default: false }
      - { label: 标签, name: tags, widget: list, default: [], hint: "例如：辣、素食、无麸质" }
      - { label: 排序, name: order, widget: number, value_type: int, default: 0 }
      - { label: 详细介绍, name: body, widget: markdown, required: false }

  - name: locations
    label: 门店管理
    label_singular: 门店
    folder: src/content/locations
    create: true
    identifier_field: name
    slug: "{{fields._slug}}"
    summary: "{{name}} — {{address}}"
    sortable_fields:
      fields: [name, order]
      default: { field: order, direction: Ascending }
    editor:
      preview: false
    fields:
      - { label: 门店名称, name: name, widget: string }
      - { label: 地址, name: address, widget: text }
      - { label: 电话, name: phone, widget: string }
      - { label: 营业时间, name: hours, widget: string, hint: "例如：11:00-22:00" }
      - { label: 地图链接, name: map_link, widget: string, required: false, hint: "百度地图/高德地图嵌入链接" }
      - { label: 图片, name: image, widget: image, required: false }
      - { label: 排序, name: order, widget: number, value_type: int, default: 0 }
      - { label: 正文, name: body, widget: markdown, required: false }

  - name: reservations
    label: 在线预约
    label_singular: 预约
    folder: src/content/reservations
    create: false
    identifier_field: name
    slug: "{{fields._slug}}"
    summary: "{{name}} — {{date | date('YYYY-MM-DD')}} {{time}} — {{status}}"
    sortable_fields:
      fields: [date, status]
      default: { field: date, direction: Descending }
    view_groups:
      - { label: 待确认, field: status, pattern: "pending" }
      - { label: 已确认, field: status, pattern: "confirmed" }
      - { label: 已取消, field: status, pattern: "cancelled" }
    editor:
      preview: false
    fields:
      - { label: 姓名, name: name, widget: string }
      - { label: 电话, name: phone, widget: string }
      - { label: 邮箱, name: email, widget: string, required: false }
      - { label: 日期, name: date, widget: datetime, format: YYYY-MM-DD, time_format: false }
      - { label: 时间, name: time, widget: select, options: ["11:00", "11:30", "12:00", "12:30", "13:00", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"] }
      - { label: 人数, name: party_size, widget: number, value_type: int, default: 2 }
      - { label: 备注, name: notes, widget: text, required: false }
      - { label: 状态, name: status, widget: select, options: [pending, confirmed, cancelled], default: pending }

settings:
  - name: general
    label: 基本设置
    file: src/content/settings/general.yml
    fields:
      - { label: 餐厅名称, name: site_title, widget: string, default: "餐厅名称" }
      - { label: 网站描述, name: site_description, widget: text, default: "美味从这里开始", required: false }
      - { label: 联系邮箱, name: email, widget: string, required: false }
      - { label: 联系电话, name: phone, widget: string, required: false }

  - name: social
    label: 社交媒体
    file: src/content/settings/social.yml
    fields:
      - { label: 微信号, name: wechat, widget: string, required: false }
      - { label: 小红书, name: xiaohongshu, widget: string, required: false }
      - { label: 抖音号, name: douyin, widget: string, required: false }
      - { label: 大众点评链接, name: dianping, widget: string, required: false }`,
  },
];

// ── System prompt builder ─────────────────────────────────────────

const TEMPLATE_SPEC = `## template.yml Specification

Every template MUST have a template.yml file at its root.

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| name | string | Unique template identifier in kebab-case, e.g. "law-firm", "restaurant-site" |
| version | string | Semantic version, e.g. "1.0.0" |
| type | string | Template category: blog, portfolio, docs, enterprise, ecommerce, custom |
| label | string | Human-readable display name in the user's language |
| supports | array | Collection names this template provides (must match collections.yml names) |

### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| description | string | One-line description of the template |
| author | string | Author attribution, default "xtcms" |
| license | string | License identifier, default "MIT" |
| extends | string | Parent template name. Use "blog" for most templates. Only use null for root templates. |
| layouts | object | Layout hints per content type: { homepage: "card-grid", post: "single-column", list: "with-sidebar" } |
| features | array | Feature flags: "responsive", "search", "dark-mode", "rss", "sidebar-tree" |
| requires | object | Environment requirements: { xtcms: ">=1.0.0", astro: ">=6.0.0", node: ">=22.0.0" } |

### customizable (Theme Customization)
A map of group names to arrays of fields. Each field:
- name: CSS-safe identifier (becomes --xt-<name> CSS variable)
- label: Display name in CMS settings
- type: "color" | "select" | "number" | "boolean"
- default: Appropriate value for the type
- options: Required for "select" type — array of strings
- min / max: Optional for "number" type

Common groups: colors, typography, layout

### Example customizable:
customizable:
  colors:
    - { name: primary, label: 主色调, type: color, default: "#1a365d" }
    - { name: bg, label: 背景色, type: color, default: "#ffffff" }
  typography:
    - { name: heading_font, label: 标题字体, type: select, options: ["PingFang SC", "Noto Serif SC"], default: "PingFang SC" }
  layout:
    - { name: container_width, label: 内容区宽度, type: select, options: ["800px", "960px", "1140px", "100%"], default: "1140px" }`;

const COLLECTIONS_SPEC = `## collections.yml Specification

Every template MUST have a collections.yml file. Root keys: "collections" (array) and "settings" (array).

### Collection Entry (each item in "collections" array)
| Field | Required | Type | Description |
|-------|----------|------|-------------|
| name | Yes | string | Unique collection identifier, snake_case, e.g. "menu-items" |
| label | Yes | string | Plural display name, e.g. "菜品管理" |
| label_singular | Yes | string | Singular display name, e.g. "菜品" |
| folder | Yes | string | Content file path, e.g. "src/content/menu-items" |
| create | Yes | boolean | Whether users can create new entries in CMS |
| identifier_field | No | string | Field used as entry identifier, default "title" |
| slug | No | string | Slug template, e.g. "{{fields._slug}}" or "{{slug}}" |
| summary | No | string | List view summary template, e.g. "{{title}} — {{date | date('YYYY-MM-DD')}}" |
| view_type | No | string | "grid" for card layout, omit for list |
| editor | No | object | { preview: true/false } — show preview pane |
| sortable_fields | No | object | { fields: [...], default: { field, direction: Ascending|Descending } } |
| view_groups | No | array | Filter tabs: [{ label, field, pattern }] |
| fields | Yes | array | Field definitions (see below) |

### Field Object
Each field in the "fields" array:
- label (string, required): Display name in CMS editor
- name (string, required): Field key stored in frontmatter, snake_case, unique within collection
- widget (string, required): One of the 10 valid widgets below
- required (boolean, default true): Whether the field is mandatory
- default: Default value appropriate to the widget type
- hint (string): Optional help text shown below the field

### Valid Widget Types (EXACTLY these 10, no others)

1. "string" — Single-line text input. Stores as string.
2. "text" — Multi-line textarea. Stores as string.
3. "markdown" — Rich text / Markdown editor. Stores as string (typically the main body). Name it "body".
4. "number" — Numeric input. Stores as number. Optional: value_type: "int", default, min, max.
5. "boolean" — Toggle/checkbox. Stores as true/false. Optional: default (true or false).
6. "datetime" — Date/time picker. Stores as string. Optional: format: "YYYY-MM-DD", date_format, time_format: false.
7. "list" — Array of strings. Stores as array. Optional: default: [].
8. "image" — Image upload. Stores as string (file path). Usually required: false.
9. "select" — Dropdown select. REQUIRES "options" array. Stores as string. Optional: default (must be one of options).
10. "relation" — Reference to another collection entry. REQUIRES: collection (target collection name), value_field (usually "{{slug}}"), search_fields (array of field names to search), display_fields (array of field names to show).

### WIDGET RULES (critical):
- "select" MUST have "options" — a non-empty array of strings
- "relation" MUST have "collection", "value_field", "search_fields", "display_fields"
- "number" with value_type: "int" — for integer-only values like price, order, count
- ALWAYS include a "body" field with widget: "markdown" in content collections (can be required: false)
- NEVER invent new widget types — only the 10 listed above

### Settings
Array of settings groups under the "settings" key:
- name: Unique group identifier
- label: Display name in CMS
- file: Path to YAML file, e.g. "src/content/settings/general.yml"
- fields: Same field definitions as collections

Common settings groups:
- general: site_title, site_description, email, phone, address, icp
- footer: copyright, icp, police
- social: wechat, weibo, github, etc.`;

export function buildSystemPrompt(extraContext?: string): string {
  // Build few-shot examples section
  const fewShotSection = FEW_SHOT_EXAMPLES.map((ex, i) => {
    return `### Example ${i + 1}: ${ex.label}
User request: "${ex.userPrompt}"

**template.yml:**
\`\`\`yaml
${ex.templateYAML}
\`\`\`

**collections.yml:**
\`\`\`yaml
${ex.collectionsYAML}
\`\`\``;
  }).join('\n\n');

  let prompt = `You are an xtcms AI template generator. Your job is to generate template.yml and collections.yml files for the xtcms website engine based on the user's natural language description.

The xtcms engine powers websites with:
- Astro 6 SSR rendering
- Sveltia CMS for content management
- File-based content (Markdown + YAML frontmatter)
- Template inheritance system (child templates extend parent templates)

${TEMPLATE_SPEC}

${COLLECTIONS_SPEC}

## Template Inheritance
- The "extends" field points to a parent template. "blog" is the default root template that provides basic posts/pages collections.
- Child templates ADD new collections and OVERRIDE customizable defaults.
- Most templates should set "extends: blog" unless the user explicitly wants a standalone site.
- Collections defined in a child template are automatically available alongside inherited collections.

## Output Format
You MUST output exactly TWO fenced code blocks in this order:

\`\`\`template.yml
...complete YAML content...
\`\`\`

\`\`\`collections.yml
...complete YAML content...
\`\`\`

## Critical Rules
1. ONLY use the 10 valid widget types listed above. Never invent new widgets.
2. EVERY content collection MUST include a "body" field with widget: "markdown" (can be required: false).
3. ALL collections MUST have: name, label, label_singular, folder, create, fields.
4. "select" widgets MUST have an "options" array.
5. "relation" widgets MUST have "collection", "value_field", "search_fields", "display_fields".
6. Field names must be unique within each collection. Use snake_case.
7. Match the user's language for all labels and descriptions.
8. Include a sensible "customizable" section with colors, typography (unless the user says otherwise).
9. Do NOT include collection entries for "posts" or "pages" — they are inherited from "blog".
10. The output must be valid YAML that can be parsed by a standard YAML parser.

## Few-Shot Examples

${fewShotSection}`;

  // Inject industry context if detected
  if (extraContext) {
    prompt += `\n\n## Industry-Specific Guidance\n\n${extraContext}`;
  }

  return prompt;
}

/**
 * Build the user message that wraps the user's prompt with format guidance.
 */
export function buildUserMessage(userPrompt: string): string {
  return `Generate a complete xtcms template for the following website:

${userPrompt}

Remember:
- Output exactly two fenced code blocks: template.yml then collections.yml
- Use the user's language for all labels
- Follow all widget rules strictly
- Include at least one settings group (general, footer, or social)`;
}

/**
 * Parse AI response to extract template.yml and collections.yml content.
 * Returns null for a file if it couldn't be extracted.
 */
export function parseAIResponse(
  response: string,
): { templateYAML: string | null; collectionsYAML: string | null; rawResponse: string } {
  const templateMatch = response.match(/```(?:template\.yml|yaml)?\s*\n([\s\S]*?)```/);
  // Find the second code block (collections.yml)
  // Match all code blocks first
  const allBlocks = [...response.matchAll(/```[\s\S]*?\n([\s\S]*?)```/g)];

  let templateYAML: string | null = null;
  let collectionsYAML: string | null = null;

  if (templateMatch) {
    templateYAML = templateMatch[1].trim();
  }

  // Try to identify by header, or just take the second block
  const collectionsMatch = response.match(/```(?:collections\.yml|yaml)?\s*\n([\s\S]*?)```/);
  if (collectionsMatch && collectionsMatch.index !== templateMatch?.index) {
    collectionsYAML = collectionsMatch[1].trim();
  } else if (allBlocks.length >= 2) {
    // Fallback: first block is template, second is collections
    const secondBlock = allBlocks[1];
    if (secondBlock) {
      collectionsYAML = secondBlock[1].trim();
    }
  }

  // If we still don't have collections, the second block might be right after template
  if (!collectionsYAML && allBlocks.length >= 2) {
    collectionsYAML = allBlocks[1][1].trim();
  }

  return { templateYAML, collectionsYAML, rawResponse: response };
}

// ── Append mode ───────────────────────────────────────────────────

/**
 * Build the system prompt for appending new collections/pages to an existing template.
 */
export function buildAppendSystemPrompt(currentContext: string): string {
  return `You are an xtcms AI template assistant. Your job is to ADD new content collections and pages to an EXISTING website template. Do NOT regenerate the entire template — only output the NEW additions.

${COLLECTIONS_SPEC}

## Current Template State
Below is the current state of the active template. You must:
1. NOT duplicate any existing collections (by name)
2. ADD new collections for content types the user wants
3. UPDATE template.yml to add the new collection names to "supports"
4. Optionally suggest new Astro page files for the new content

${currentContext}

## Output Format
You MUST output exactly ONE fenced code block for collections:

\`\`\`collections.yml
...ONLY the NEW collections and settings to add...
\`\`\`

If the user's request also needs template.yml changes (e.g., adding to "supports"), output a second block:

\`\`\`template.yml
...UPDATED template.yml with new collection names added to supports...
\`\`\`

If the user wants specific page layouts, you may also output suggested .astro page files:

\`\`\`src/pages/new-page.astro
...page content...
\`\`\`

## Critical Rules
1. ONLY output NEW content — do not repeat existing collections
2. Collection names must not conflict with existing ones
3. Use the 10 valid widgets only
4. Every collection must have a "body" field (widget: markdown)
5. Match the user's language for labels
6. Add to "supports" in template.yml so the collections are registered`;
}

/**
 * Build the user message for append mode.
 */
export function buildAppendUserMessage(userPrompt: string): string {
  return `Add the following to my current website:

${userPrompt}

Output only the NEW collections and any template.yml updates needed.`;
}

// ── Modify mode ───────────────────────────────────────────────────

/**
 * Build the system prompt for modifying existing template files.
 */
export function buildModifySystemPrompt(
  currentFile: string,
  filePath: string,
  templateContext: string,
): string {
  return `You are an xtcms AI template assistant. Your job is to MODIFY an existing template file according to the user's request.

## The file to modify: ${filePath}

Current content:
\`\`\`
${currentFile}
\`\`\`

## Template Context
${templateContext}

## Output Format
Output the ENTIRE modified file in a single fenced code block with the file path:

\`\`\`${filePath}
...complete modified file content...
\`\`\`

## Rules
1. Output the COMPLETE file, not just the changed parts
2. Preserve all existing structure unless explicitly asked to change it
3. Follow xtcms conventions for Astro components, YAML structure, etc.
4. Match the user's language
5. For colors: use hex values
6. For layout changes: use Tailwind v4 classes`;
}

/**
 * Build the user message for modify mode.
 */
export function buildModifyUserMessage(userPrompt: string): string {
  return `Modify this template file according to the following request:

${userPrompt}`;
}

// ── Extended response parser ──────────────────────────────────────

/**
 * Parse AI response for append mode — extracts collections.yml block
 * and optional template.yml + page files.
 */
export function parseAppendResponse(response: string): {
  collectionsYAML: string | null;
  templateYAML: string | null;
  pages: Record<string, string>;
  rawResponse: string;
} {
  const pages: Record<string, string> = {};

  // Extract all code blocks with their file headers
  const allBlocks = [...response.matchAll(/```(?:(\S+))?\s*\n([\s\S]*?)```/g)];

  let collectionsYAML: string | null = null;
  let templateYAML: string | null = null;

  for (const block of allBlocks) {
    const header = (block[1] || '').trim();
    const content = block[2].trim();

    if (header === 'collections.yml' || header === 'yaml') {
      if (!collectionsYAML) collectionsYAML = content;
    } else if (header === 'template.yml') {
      templateYAML = content;
    } else if (header.startsWith('src/')) {
      pages[header] = content;
    }
  }

  // Fallback: if no header match, use first yaml-like block for collections
  if (!collectionsYAML && allBlocks.length > 0) {
    const firstBlock = allBlocks[0];
    if (!(firstBlock[1] || '').startsWith('src/')) {
      collectionsYAML = firstBlock[2].trim();
    }
  }

  return { collectionsYAML, templateYAML, pages, rawResponse: response };
}

/**
 * Parse AI response for modify mode — extracts the single modified file.
 */
export function parseModifyResponse(response: string): {
  filePath: string | null;
  content: string | null;
  rawResponse: string;
} {
  const match = response.match(/```(\S+)\s*\n([\s\S]*?)```/);
  if (match) {
    return { filePath: match[1].trim(), content: match[2].trim(), rawResponse: response };
  }

  // Fallback: try any code block
  const anyBlock = response.match(/```\s*\n([\s\S]*?)```/);
  if (anyBlock) {
    return { filePath: null, content: anyBlock[1].trim(), rawResponse: response };
  }

  return { filePath: null, content: null, rawResponse: response };
}

// ── Auto mode — AI decides intent ─────────────────────────────────

/**
 * Build system prompt for auto-detect mode. The AI receives full template context
 * and decides whether to generate new, append, or modify.
 */
export function buildAutoSystemPrompt(templateContext: string): string {
  return `You are an xtcms AI template assistant embedded in the CMS admin panel.

You receive the user's natural language request AND the current state of their website template.
You must intelligently decide what action to take and output the appropriate response.

${TEMPLATE_SPEC}

${COLLECTIONS_SPEC}

## Current Website State
${templateContext}

## Decision Logic
Analyze the user's request against the current state:

1. **If the user is describing a completely new/different type of website** (e.g., current is a blog, they want a restaurant site) → treat as GENERATE: output a complete new template.yml + collections.yml.

2. **If the user wants to ADD new content types or pages** to the current site (e.g., "add a FAQ page", "add a team section") → treat as APPEND: output ONLY the new collections and any template.yml updates. Do NOT repeat existing collections.

3. **If the user wants to MODIFY an existing page, style, or layout** (e.g., "change the homepage hero", "make primary color blue", "reorder sections on index") → treat as MODIFY: output the complete modified file(s).

## Output Format

Your response MUST start with an action line, then the relevant code blocks:

---ACTION: generate
(use this when creating a completely new template)

Then output:
\`\`\`template.yml
...complete template.yml...
\`\`\`
\`\`\`collections.yml
...complete collections.yml...
\`\`\`

---ACTION: append
(use this when adding new collections/pages to the current template)

Then output:
\`\`\`collections.yml
...ONLY the NEW collections (not existing ones)...
\`\`\`
And optionally:
\`\`\`template.yml
...UPDATED template.yml with new names added to "supports"...
\`\`\`
\`\`\`src/pages/new-page.astro
...new page layout...
\`\`\`

---ACTION: modify
(use this when changing existing files)

Then output:
\`\`\`<file-path>
...complete modified file content...
\`\`\`

## Critical Rules
1. ONLY use the 10 valid widget types: string, text, markdown, number, boolean, datetime, list, image, select, relation
2. Match the user's language for all labels
3. Do NOT duplicate existing collection names (for append)
4. Every collection must have a "body" field (widget: markdown)
5. "select" widgets MUST have "options" array
6. "relation" widgets MUST have "collection", "value_field", "search_fields"
7. Be concise — the user is in their CMS admin panel`;
}

export function buildAutoUserMessage(userPrompt: string): string {
  return userPrompt;
}

/**
 * Parse auto-mode AI response — detects the action and extracts relevant content.
 */
export function parseAutoResponse(response: string): {
  action: 'generate' | 'append' | 'modify';
  // generate / append
  templateYAML?: string;
  collectionsYAML?: string;
  // append
  pages?: Record<string, string>;
  // modify
  filePath?: string;
  modifiedContent?: string;
  // all
  rawResponse: string;
} {
  // Detect action from header
  let action: 'generate' | 'append' | 'modify' = 'append';
  if (response.includes('---ACTION: generate')) {
    action = 'generate';
  } else if (response.includes('---ACTION: modify')) {
    action = 'modify';
  }

  // Extract all code blocks
  const blocks = [...response.matchAll(/```(\S+)\s*\n([\s\S]*?)```/g)];
  const files: Record<string, string> = {};
  for (const b of blocks) {
    files[b[1].trim()] = b[2].trim();
  }

  if (action === 'generate') {
    return {
      action: 'generate',
      templateYAML: files['template.yml'] || Object.values(files)[0],
      collectionsYAML: files['collections.yml'] || Object.values(files)[1],
      rawResponse: response,
    };
  }

  if (action === 'modify') {
    const filePath = Object.keys(files).find(k => !['collections.yml', 'template.yml', 'yaml'].includes(k));
    return {
      action: 'modify',
      filePath: filePath || 'src/pages/index.astro',
      modifiedContent: filePath ? files[filePath] : Object.values(files)[0],
      rawResponse: response,
    };
  }

  // append (default)
  const pages: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) {
    if (k.startsWith('src/')) pages[k] = v;
  }
  return {
    action: 'append',
    collectionsYAML: files['collections.yml'] || Object.values(files)[0] || '',
    templateYAML: files['template.yml'],
    pages: Object.keys(pages).length > 0 ? pages : undefined,
    rawResponse: response,
  };
}
