import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: 'https://morninglamp.study/sitemap.xml',
    host: 'https://morninglamp.study',
  };
}
