import PocketBase from 'pocketbase';
import { DIRECTORY_CONFIG } from './directory-config';

// Singleton for client-side
let _pb: PocketBase | null = null;

export function getPocketBase(): PocketBase {
  if (!_pb) {
    _pb = new PocketBase(DIRECTORY_CONFIG.pocketbaseUrl);
  }
  return _pb;
}

// Named export for convenience
export const pb = getPocketBase();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  business_name: string;
  slug: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  email?: string;
  google_rating?: number;
  google_review_count?: number;
  is_featured: boolean;
  is_luxury: boolean;
  is_verified: boolean;
  unit_types?: UnitType[];
  amenities?: string[];
  service_areas?: string[];
  service_radius_miles?: number;
  description?: string;
  images?: ListingImage[];
  niche: string;
  status: 'active' | 'pending' | 'inactive';
  created: string;
  updated: string;
}

export interface UnitType {
  type: string;
  capacity?: number;
  features?: string[];
}

export interface ListingImage {
  url: string;
  alt?: string;
}

export interface Lead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  event_date: string;
  event_location: string;
  unit_quantity: number;
  unit_type?: string;
  duration_days?: number;
  message?: string;
  listing_id?: string;
  niche: string;
  source_url?: string;
  routed_to_vendor?: boolean;
}

// ── Helper functions ──────────────────────────────────────────────────────────

export async function getListingsByCity(city: string, niche = 'porta_potty'): Promise<Listing[]> {
  try {
    const records = await getPocketBase().collection('listings').getFullList<Listing>({
      filter: `city = "${city}" && niche = "${niche}" && status = "active"`,
      sort: '-is_featured,google_rating',
    });
    return records;
  } catch {
    return [];
  }
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  try {
    const record = await getPocketBase().collection('listings').getFirstListItem<Listing>(
      `slug = "${slug}"`
    );
    return record;
  } catch {
    return null;
  }
}

export async function createLead(leadData: Omit<Lead, 'id'>): Promise<Lead> {
  return getPocketBase().collection('leads').create<Lead>(leadData);
}
