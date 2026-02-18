/**
 * Sitemap Generator for Programmatic SEO
 * Auto-generates sitemap.xml with all city and listing pages
 * File: app/sitemap.ts
 */

import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_SITE_DOMAIN}`
    : 'https://wa-portapotty.com';

  const niche = process.env.NEXT_PUBLIC_NICHE || 'porta_potty';

  // Get all active listings
  const { data: listings } = await supabase
    .from('listings')
    .select('city, slug, updated_at')
    .eq('niche', niche)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (!listings) {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
    ];
  }

  // Get unique cities for city landing pages
  const cities = [...new Set(listings.map((l) => l.city))];

  const urls: MetadataRoute.Sitemap = [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },

    // City pages
    ...cities.map((city) => ({
      url: `${baseUrl}/${city.toLowerCase().replace(/\s+/g, '-')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),

    // Listing pages
    ...listings.map((listing) => ({
      url: `${baseUrl}/${listing.city.toLowerCase().replace(/\s+/g, '-')}/${listing.slug}`,
      lastModified: new Date(listing.updated_at || new Date()),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),

    // Static pages
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/for-vendors`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  return urls;
}
