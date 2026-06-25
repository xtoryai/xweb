import { _ } from '@sveltia/i18n';

import { replaceQuotes } from '$lib/services/contents/fields/rich-text/components/utils';
import {
  IMAGE_OR_LINKED_IMAGE_REGEX,
  IMAGE_REGEX,
} from '$lib/services/contents/fields/rich-text/constants';
import { escapeAttr } from '$lib/services/utils/string';

/**
 * @import { EditorComponentDefinition } from '$lib/types/public';
 */

/**
 * Custom components registered using `CMS.registerEditorComponent`.
 * @type {Map<string, EditorComponentDefinition>}
 */
export const customComponentRegistry = new Map();

/**
 * Built-in image component definition. The labels are localized in `getComponentDef()`.
 * @type {EditorComponentDefinition}
 * @see https://decapcms.org/docs/widgets/#Markdown
 * @see https://sveltiacms.app/en/docs/fields/richtext
 */
export const IMAGE_COMPONENT = {
  /* eslint-disable jsdoc/require-jsdoc */
  id: 'image',
  label: 'Image',
  fields: [
    { name: 'src', label: 'Source', widget: 'image' },
    { name: 'alt', label: 'Alt Text', required: false },
    { name: 'title', label: 'Title', required: false },
  ],
  pattern: IMAGE_REGEX,
  toBlock: (props) => {
    const { src = '', alt = '', title = '' } = props;

    return src ? `![${alt}](${src}${title ? ` "${replaceQuotes(title)}"` : ''})` : '';
  },
  toPreview: (props) => {
    const { src = '', alt = '', title = '' } = props;

    // Return `<img>` even if `src` is empty to make sure the `tagName` below works
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" title="${escapeAttr(title)}">`;
  },
  /* eslint-enable jsdoc/require-jsdoc */
};

/**
 * Built-in video component definition. The labels are localized in `getComponentDef()`.
 * @type {EditorComponentDefinition}
 */
export const VIDEO_COMPONENT = {
  id: 'video',
  icon: 'smart_display',
  label: 'Video',
  fields: [
    { name: 'url', label: 'Video URL', widget: 'string' },
  ],
  pattern: /^<video.*?src="(.*?)".*?>.*?<\/video>\s*$/,
  fromBlock: (match) => {
    const groups = (match && match.groups) || {};
    return { url: (groups.url || match?.[1] || '').trim() };
  },
  toBlock: (props) => {
    const url = (props && props.url || '').trim();
    if (!url) return '';
    if (/<iframe/i.test(url)) return url;
    return `<video src="${url}" controls style="width:100%"></video>`;
  },
  toPreview: (props) => {
    const url = (props && props.url || '').trim();
    return url ? `<div style="padding:12px;background:#f0f0f0;border-radius:4px;text-align:center">🎬 ${url.slice(0, 60)}</div>` : '';
  },
};

/**
 * Built-in linked image component definition. The labels are localized in `getComponentDef()`.
 * @type {EditorComponentDefinition}
 */
export const LINKED_IMAGE_COMPONENT = {
  /* eslint-disable jsdoc/require-jsdoc */
  id: 'linked-image',
  label: 'Image',
  fields: [...IMAGE_COMPONENT.fields, { name: 'link', label: 'Link', required: false }],
  pattern: IMAGE_OR_LINKED_IMAGE_REGEX,
  fromBlock: (match) => {
    const { src, alt, title, src2, alt2, title2, link } = match.groups ?? {};

    return {
      src: (src || src2 || '').trim(),
      alt: (alt || alt2 || '').trim(),
      title: (title || title2 || '').trim(),
      link: (link || '').trim(),
    };
  },
  toBlock: (props) => {
    const { src = '', alt = '', title = '', link = '' } = props;
    const img = src ? `![${alt}](${src}${title ? ` "${replaceQuotes(title)}"` : ''})` : '';

    return img && link ? `[${img}](${link})` : img;
  },
  toPreview: (props) => {
    const { src = '', alt = '', title = '', link = '' } = props;
    // eslint-disable-next-line @stylistic/max-len
    const img = `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" title="${escapeAttr(title)}">`;

    // Return `<img>` even if `src` is empty to make sure the `tagName` below works
    return link ? `<a href="${escapeAttr(link)}">${img}</a>` : img;
  },
  /* eslint-enable jsdoc/require-jsdoc */
};

/**
 * Get all built-in component definitions with localized labels.
 * @returns {EditorComponentDefinition[]} Array of built-in component definitions.
 */
export const getBuiltInComponentDefs = () => {
  // Common props with localized labels
  const commonImageProps = {
    icon: 'image',
    label: _('editor_components.image'),
    fields: [
      { name: 'src', label: _('editor_components.src'), widget: 'image' },
      { name: 'alt', label: _('editor_components.alt'), required: false },
      { name: 'title', label: _('editor_components.title'), required: false },
    ],
  };

  return [
    {
      ...IMAGE_COMPONENT,
      // Override with localized labels
      ...commonImageProps,
    },
    {
      ...LINKED_IMAGE_COMPONENT,
      // Override with localized labels
      ...commonImageProps,
      fields: [
        ...commonImageProps.fields,
        { name: 'link', label: _('editor_components.link'), required: false },
      ],
    },
  ];
};

/**
 * Get a component definition. This has to be a function due to localized labels.
 * @param {string} name Component name.
 * @returns {EditorComponentDefinition | undefined} Definition.
 */
export const getComponentDef = (name) => {
  if (customComponentRegistry.has(name)) {
    return customComponentRegistry.get(name);
  }

  // Common props with localized labels
  const commonImageProps = {
    icon: 'image',
    label: _('editor_components.image'),
    fields: [
      { name: 'src', label: _('editor_components.src'), widget: 'image' },
      { name: 'alt', label: _('editor_components.alt'), required: false },
      { name: 'title', label: _('editor_components.title'), required: false },
    ],
  };

  /** @type {Record<string, EditorComponentDefinition>} */
  const definitions = {
    image: {
      ...IMAGE_COMPONENT,
      // Override with localized labels
      ...commonImageProps,
    },
    'linked-image': {
      ...LINKED_IMAGE_COMPONENT,
      // Override with localized labels
      ...commonImageProps,
      fields: [
        ...commonImageProps.fields,
        { name: 'link', label: _('editor_components.link'), required: false },
      ],
    },
    video: {
      ...VIDEO_COMPONENT,
      icon: 'smart_display',
      label: _('editor_components.video', { default: 'Video' }),
      fields: [
        { name: 'url', label: _('editor_components.video_url', { default: 'Video URL' }), widget: 'string' },
      ],
    },
  };

  return definitions[name];
};
