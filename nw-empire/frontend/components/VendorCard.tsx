import Link from 'next/link';
import { Listing } from '@/lib/pocketbase';

interface VendorCardProps {
  listing: Listing;
  citySlug: string;
  primaryColor?: string;
}

export function VendorCard({ listing, citySlug, primaryColor = '#1a6b3c' }: VendorCardProps) {
  return (
    <Link
      href={`/${citySlug}/${listing.slug}`}
      className="block bg-white border-2 border-gray-200 hover:border-green-400 rounded-xl p-6 transition-all hover:shadow-lg group"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
            {listing.business_name}
          </h3>
          <p className="text-gray-500 text-sm">📍 {listing.city}, WA</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {listing.is_featured && (
            <span
              style={{ backgroundColor: primaryColor }}
              className="text-white text-xs font-bold px-2 py-1 rounded-full"
            >
              FEATURED
            </span>
          )}
          {listing.is_luxury && (
            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded">
              ✨ Luxury
            </span>
          )}
        </div>
      </div>

      {listing.google_rating && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-yellow-500">⭐</span>
          <span className="font-semibold">{listing.google_rating.toFixed(1)}</span>
          <span className="text-gray-400">
            ({listing.google_review_count?.toLocaleString() ?? 0} reviews)
          </span>
        </div>
      )}

      {listing.amenities && listing.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {listing.amenities.slice(0, 4).map((a) => (
            <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {a.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
