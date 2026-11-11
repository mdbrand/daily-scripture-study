import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/o/', '/r/'] }],
    sitemap: 'https://morninglamp.study/sitemap.xml',
    host: 'https://morninglamp.study',
  };
}
