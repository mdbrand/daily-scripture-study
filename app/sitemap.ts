import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://morninglamp.study/', changeFrequency: 'weekly', priority: 1 }];
}
