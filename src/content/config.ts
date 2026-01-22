import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.string().optional(),
        tags: z.array(z.string()).default([]),
    }),
});

const tools = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        version: z.string().optional(),
        icon: z.string().optional(), // Could be an icon name or path
        url: z.string().url(), // External link to the tool
        pubDate: z.coerce.date(),
    }),
});

export const collections = { blog, tools };
