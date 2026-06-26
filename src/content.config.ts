import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.string(),
    tags: z.array(z.string()).optional().default([]),
    image: z.string().optional(),
    pinned: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
    link: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.string().optional(),
    image: z.string().optional(),
    pinned: z.boolean().optional().default(false),
    video: z.string().optional(),
  }),
});

const keywords = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/keywords' }),
  schema: z.object({
    keyword: z.string(),
    link: z.string(),
    date: z.coerce.string().optional(),
  }),
});

const messages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/messages' }),
  schema: z.object({
    name: z.string(),
    company: z.string().optional(),
    phone: z.string(),
    email: z.string().optional(),
    date: z.coerce.string(),
    read: z.boolean().optional().default(false),
  }),
});

const links = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/links' }),
  schema: z.object({
    title: z.string(),
    url: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
  }),
});

const equipment = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/equipment' }),
  schema: z.object({
    name: z.string(),
    model: z.string(),
    image: z.string().optional(),
    video_url: z.string().optional(),
    summary: z.string(),
    scenarios: z.array(z.string()).optional().default([]),
    specifications: z.string(),
    order: z.number().optional(),
  }),
});

const applications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/applications' }),
  schema: z.object({
    title: z.string(),
    industry: z.string(),
    description: z.string(),
    related_equipment: z.string().optional(),
    order: z.number().optional(),
  }),
});

const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    client: z.string(),
    industry: z.string(),
    pain_points: z.string(),
    solution: z.string(),
    data_comparison: z.string(),
    date: z.coerce.string(),
  }),
});

const knowledge-base = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/knowledge-base' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    video_url: z.string().optional(),
    summary: z.string().optional(),
    date: z.coerce.string(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    icon: z.string().optional(),
    description: z.string(),
    order: z.number().optional(),
  }),
});

const inquiries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/inquiries' }),
  schema: z.object({
    name: z.string(),
    company: z.string().optional(),
    phone: z.string(),
    email: z.string().optional(),
    message: z.string(),
    date: z.coerce.string(),
    status: z.string().optional(),
  }),
});

export const collections = { posts, pages, keywords, messages, links, equipment, applications, cases, knowledge-base, services, inquiries };