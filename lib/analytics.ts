/**
 * Analytics Event Tracking
 * Sends events to Google Analytics and internal Supabase analytics table
 */

export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }

  // Log to Supabase for internal analytics
  if (typeof window !== 'undefined') {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        properties,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail — don't block user experience
    });
  }
};

/**
 * Track these key events:
 * - 'search_performed' — city searched
 * - 'listing_viewed' — listing page viewed
 * - 'lead_submitted' — lead form submitted
 * - 'phone_clicked' — call button clicked
 * - 'website_clicked' — website link clicked
 * - 'featured_ad_clicked' — featured listing ad clicked
 */
