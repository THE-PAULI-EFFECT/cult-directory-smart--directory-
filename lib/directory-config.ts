/**
 * Multi-Directory Tenant Configuration System
 * One backend, multiple frontends — controlled by environment variables
 * File: lib/directory-config.ts
 */

export type DirectoryNiche =
  | 'porta_potty'
  | 'senior_living'
  | 'ada_bathroom'
  | 'water_quality'
  | 'event_rentals';

export interface DirectoryConfig {
  niche: DirectoryNiche;
  siteName: string;
  domain: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  heroHeadline: string;
  heroSubheadline: string;
  searchPlaceholder: string;
  ctaText: string;
  leadFormTitle: string;
  leadValueCents: number; // what you charge per lead
  heroEmoji: string;
  vendorCTA: string;
  fromEmail: string; // Resend from address for this directory
}

export const DIRECTORY_CONFIGS: Record<DirectoryNiche, DirectoryConfig> = {
  porta_potty: {
    niche: 'porta_potty',
    siteName: 'WA Porta Potty Directory',
    domain: 'wa-portapotty.com',
    tagline:
      "Washington's Most Complete Porta-Potty & Luxury Restroom Trailer Directory",
    primaryColor: '#1a6b3c', // Forest green — clean, Pacific NW
    secondaryColor: '#10b981',
    heroHeadline:
      'Find Porta-Potty & Luxury Restroom Trailer Rentals in Washington State',
    heroSubheadline:
      'Compare 500+ verified vendors across Seattle, Tacoma, Spokane & every Washington county. Transparent pricing. Verified listings. Get quotes in minutes.',
    searchPlaceholder: 'Search by city, county, or zip code...',
    ctaText: '🚽 Find Vendors Near Me',
    leadFormTitle: 'Get Free Quotes from Local Vendors',
    leadValueCents: 2500, // $25/lead
    heroEmoji: '🚽',
    vendorCTA: 'Are You a Washington Porta-Potty Vendor?',
    fromEmail: 'leads@wa-portapotty.com',
  },
  senior_living: {
    niche: 'senior_living',
    siteName: 'WA Senior Living Directory',
    domain: 'wa-seniorliving.com',
    tagline: "Washington's Trusted Senior Living & Memory Care Directory",
    primaryColor: '#2563eb', // Professional blue
    secondaryColor: '#3b82f6',
    heroHeadline: 'Find the Right Senior Living Community in Washington State',
    heroSubheadline:
      'Compare assisted living, memory care, and independent living communities. Read real reviews. Get personalized recommendations.',
    searchPlaceholder: 'Search by city, care type, or condition...',
    ctaText: '🏥 Find Care Options',
    leadFormTitle: 'Connect with Senior Living Advisors',
    leadValueCents: 8500, // $85/lead — high ticket
    heroEmoji: '🏥',
    vendorCTA: 'Are You a Senior Living Community?',
    fromEmail: 'leads@wa-seniorliving.com',
  },
  ada_bathroom: {
    niche: 'ada_bathroom',
    siteName: 'WA ADA Bathrooms Directory',
    domain: 'wa-adabathrooms.com',
    tagline: 'Washington ADA Accessible Bathroom & Restroom Directory',
    primaryColor: '#7c3aed', // Purple — accessibility first
    secondaryColor: '#a78bfa',
    heroHeadline: 'Find ADA Accessible Restrooms & Bathrooms in Washington State',
    heroSubheadline:
      'Verified directory of ADA-compliant restrooms for events, venues, and public facilities. Serving all 39 Washington counties.',
    searchPlaceholder: 'Search by city, county, or facility type...',
    ctaText: '♿ Find Accessible Facilities',
    leadFormTitle: 'Request ADA Compliant Solutions',
    leadValueCents: 3500, // $35/lead
    heroEmoji: '♿',
    vendorCTA: 'Are You an ADA Bathroom Provider?',
    fromEmail: 'leads@wa-adabathrooms.com',
  },
  water_quality: {
    niche: 'water_quality',
    siteName: 'WA Water Quality Directory',
    domain: 'wa-waterquality.com',
    tagline: 'Washington Tap Water Quality & Testing Services Directory',
    primaryColor: '#0891b2', // Cyan — water-themed
    secondaryColor: '#06b6d4',
    heroHeadline: 'Check Your Tap Water Quality in Washington State',
    heroSubheadline:
      'Find water testing services, filtration companies, and quality reports for every Washington county.',
    searchPlaceholder: 'Search by city or service type...',
    ctaText: '💧 Test Your Water',
    leadFormTitle: 'Get Your Water Tested',
    leadValueCents: 1500, // $15/lead
    heroEmoji: '💧',
    vendorCTA: 'Are You a Water Testing Service?',
    fromEmail: 'leads@wa-waterquality.com',
  },
  event_rentals: {
    niche: 'event_rentals',
    siteName: 'WA Event Rentals Directory',
    domain: 'wa-eventrentals.com',
    tagline: 'Washington Event Rentals & Equipment Directory',
    primaryColor: '#d97706', // Amber — celebration
    secondaryColor: '#f59e0b',
    heroHeadline: 'Find Event Rentals & Equipment in Washington State',
    heroSubheadline:
      'Tents, tables, chairs, audio/visual, catering, and more. Compare verified vendors for weddings, corporate events, and celebrations.',
    searchPlaceholder: 'Search by equipment type or city...',
    ctaText: '🎉 Browse Rentals',
    leadFormTitle: 'Get Equipment Quotes',
    leadValueCents: 3000, // $30/lead
    heroEmoji: '🎉',
    vendorCTA: 'Are You an Event Rental Company?',
    fromEmail: 'leads@wa-eventrentals.com',
  },
};

/**
 * Get the current directory configuration
 * Reads NEXT_PUBLIC_NICHE environment variable
 * Falls back to porta_potty if not set
 */
export function getConfig(): DirectoryConfig {
  const niche = (process.env.NEXT_PUBLIC_NICHE as DirectoryNiche) || 'porta_potty';
  return DIRECTORY_CONFIGS[niche];
}

/**
 * Get a specific niche config
 */
export function getConfigByNiche(niche: DirectoryNiche): DirectoryConfig {
  return DIRECTORY_CONFIGS[niche];
}

/**
 * Validate that the environment is properly configured
 */
export function validateConfig(): void {
  const config = getConfig();
  if (!config) {
    throw new Error(
      `Invalid NEXT_PUBLIC_NICHE: ${process.env.NEXT_PUBLIC_NICHE}. Must be one of: ${Object.keys(DIRECTORY_CONFIGS).join(', ')}`
    );
  }
}
