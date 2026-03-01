export const DIRECTORY_CONFIG = {
  niche: 'porta_potty',
  siteName: 'WA Porta Potty Directory',
  domain: 'wa-portapotty.com',
  primaryColor: '#1a6b3c',
  secondaryColor: '#10b981',
  heroHeadline: 'Find Verified Porta-Potty & Luxury Restroom Trailer Rentals in Washington',
  description: 'Connect with verified porta-potty and luxury restroom trailer vendors across Washington State. Get instant quotes from 3 vendors in under 2 hours.',
  leadValueCents: 2500,
  cities: [
    'Seattle', 'Tacoma', 'Spokane', 'Bellevue', 'Everett',
    'Kent', 'Renton', 'Yakima', 'Bellingham', 'Olympia',
    'Kirkland', 'Redmond', 'Marysville', 'Federal Way', 'Kennewick',
  ],
  pocketbaseUrl: process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090',
} as const;

export type DirectoryConfig = typeof DIRECTORY_CONFIG;
