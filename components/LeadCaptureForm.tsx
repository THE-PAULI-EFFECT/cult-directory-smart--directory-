'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';

interface LeadFormProps {
  listingId?: string;
  listingName?: string;
  niche: string;
  city?: string;
}

export function LeadCaptureForm({
  listingId,
  listingName,
  niche,
  city,
}: LeadFormProps) {
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>(
    'form'
  );
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep('submitting');

    const formData = new FormData(e.currentTarget);

    try {
      const leadData = {
        listing_id: listingId || null,
        niche,
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        event_type: formData.get('event_type') as string,
        event_date: formData.get('event_date')
          ? new Date(formData.get('event_date') as string).toISOString()
          : null,
        event_location: formData.get('event_location') || city,
        unit_quantity: parseInt(
          (formData.get('unit_quantity') as string) || '1'
        ),
        unit_type: formData.get('unit_type') as string,
        duration_days: parseInt(
          (formData.get('duration_days') as string) || '1'
        ),
        message: formData.get('message') as string,
        source_url: typeof window !== 'undefined' ? window.location.href : '',
      };

      const { data, error } = await supabase.from('leads').insert([leadData]);

      if (error) throw error;

      // Track event
      trackEvent('lead_submitted', {
        listing_id: listingId,
        niche,
        city,
      });

      // Trigger vendor notification if listing exists
      if (listingId) {
        await fetch('/api/notify-vendor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_id: listingId }),
        }).catch((err) => console.error('Notification failed:', err));
      }

      setStep('success');
    } catch (err) {
      console.error('Lead submission error:', err);
      trackEvent('lead_submission_failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setStep('error');
    }
  }

  if (step === 'success') {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-green-900 mb-2">
          Request Sent!
        </h3>
        <p className="text-green-700 text-lg">
          {listingName
            ? `${listingName} will`
            : 'Local vendors will'}{' '}
          contact you within 2 hours.
        </p>
        <p className="text-green-600 text-sm mt-4">
          Check your email and phone for quotes.
        </p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h3 className="text-xl font-bold text-red-900 mb-2">
          Something went wrong
        </h3>
        <p className="text-red-700 mb-4">
          Please try again or call us directly at (206) 555-0100
        </p>
        <button
          onClick={() => setStep('form')}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-2 border-green-600 rounded-xl p-6 shadow-lg space-y-4"
    >
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <h3 className="text-xl font-bold text-green-900 mb-1">
          🎯 Get Free Quotes in 2 Hours
        </h3>
        <p className="text-green-700 text-sm">
          No obligation. Vendors compete for your business.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          name="name"
          type="text"
          placeholder="Your Name *"
          required
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Phone Number *"
          required
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
        />
      </div>

      <input
        name="email"
        type="email"
        placeholder="Email Address *"
        required
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
      />

      <input
        name="event_location"
        type="text"
        placeholder="Event City/Address *"
        defaultValue={city}
        required
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <select
          name="event_type"
          required
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white"
        >
          <option value="">Event Type *</option>
          <option value="wedding">Wedding</option>
          <option value="construction">Construction Site</option>
          <option value="festival">Festival/Concert</option>
          <option value="film_shoot">Film Shoot</option>
          <option value="corporate">Corporate Event</option>
          <option value="party">Private Party</option>
          <option value="other">Other</option>
        </select>

        <input
          name="event_date"
          type="date"
          min={new Date().toISOString().split('T')[0]}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          name="unit_quantity"
          type="number"
          min="1"
          max="100"
          placeholder="# of Units"
          defaultValue="1"
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
        />

        <select
          name="unit_type"
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white"
        >
          <option value="">Unit Type</option>
          <option value="standard">Standard Porta-Potty</option>
          <option value="deluxe">Deluxe (with sink)</option>
          <option value="luxury_2stall">Luxury 2-Stall Trailer</option>
          <option value="luxury_4stall">Luxury 4-Stall Trailer</option>
          <option value="ada">ADA Accessible</option>
        </select>
      </div>

      <input
        name="duration_days"
        type="number"
        min="1"
        placeholder="Rental Duration (days)"
        defaultValue="1"
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
      />

      <textarea
        name="message"
        rows={3}
        placeholder="Any special requirements? (optional)"
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none resize-none"
      />

      <button
        type="submit"
        disabled={step === 'submitting'}
        className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-lg"
      >
        {step === 'submitting' ? '⏳ Sending...' : '🚽 Get Free Quotes Now'}
      </button>

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        Free service • No spam • Vendors contact you directly • Typically 2-4
        quotes within 2 hours
      </p>
    </form>
  );
}
