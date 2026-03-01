'use client';

import { useState } from 'react';
import { createLead } from '@/lib/pocketbase';
import { DIRECTORY_CONFIG } from '@/lib/directory-config';

interface LeadCaptureFormProps {
  listingId?: string;
  listingName?: string;
  city?: string;
}

export function LeadCaptureForm({ listingId, listingName, city }: LeadCaptureFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    event_type: 'construction',
    event_date: '',
    event_location: city || '',
    unit_quantity: 1,
    unit_type: 'standard',
    duration_days: 1,
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string | number) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createLead({
        ...formData,
        listing_id: listingId,
        niche: DIRECTORY_CONFIG.niche,
        source_url: typeof window !== 'undefined' ? window.location.href : '',
        routed_to_vendor: false,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Lead submission error:', err);
      setError('Something went wrong. Please try again or call us directly.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h3 className="text-2xl font-bold text-green-900 mb-2">Request Sent!</h3>
        <p className="text-green-700 text-lg">
          {listingName ? `${listingName} will` : 'Local vendors will'} contact you within 2 hours.
        </p>
        <p className="text-green-600 text-sm mt-3">Check your email and phone for quotes.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-2 border-green-600 rounded-xl p-6 shadow-lg space-y-4"
    >
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-xl font-bold text-green-900">🎯 Get Free Quotes in 2 Hours</h3>
        <p className="text-green-700 text-sm mt-1">No obligation. Vendors compete for your business.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          name="name" type="text" placeholder="Your Name *" required
          value={formData.name} onChange={(e) => update('name', e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none"
        />
        <input
          name="phone" type="tel" placeholder="Phone Number *" required
          value={formData.phone} onChange={(e) => update('phone', e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none"
        />
      </div>

      <input
        name="email" type="email" placeholder="Email Address *" required
        value={formData.email} onChange={(e) => update('email', e.target.value)}
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none"
      />

      <input
        name="event_location" type="text" placeholder="Event City/Address *" required
        value={formData.event_location} onChange={(e) => update('event_location', e.target.value)}
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <select
          name="event_type" required
          value={formData.event_type} onChange={(e) => update('event_type', e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none bg-white"
        >
          <option value="">Event Type *</option>
          <option value="construction">Construction Site</option>
          <option value="wedding">Wedding</option>
          <option value="festival">Festival/Concert</option>
          <option value="film_shoot">Film Shoot</option>
          <option value="corporate">Corporate Event</option>
          <option value="party">Private Party</option>
          <option value="emergency">Emergency</option>
          <option value="other">Other</option>
        </select>

        <input
          name="event_date" type="date" required
          min={new Date().toISOString().split('T')[0]}
          value={formData.event_date} onChange={(e) => update('event_date', e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          name="unit_quantity" type="number" min="1" max="100"
          placeholder="# of Units" value={formData.unit_quantity}
          onChange={(e) => update('unit_quantity', parseInt(e.target.value))}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none"
        />
        <select
          name="unit_type"
          value={formData.unit_type} onChange={(e) => update('unit_type', e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none bg-white"
        >
          <option value="standard">Standard Porta-Potty</option>
          <option value="deluxe">Deluxe (with sink)</option>
          <option value="luxury_2stall">Luxury 2-Stall Trailer</option>
          <option value="luxury_4stall">Luxury 4-Stall Trailer</option>
          <option value="ada">ADA Accessible</option>
        </select>
      </div>

      <input
        name="duration_days" type="number" min="1" placeholder="Rental Duration (days)"
        value={formData.duration_days} onChange={(e) => update('duration_days', parseInt(e.target.value))}
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none"
      />

      <textarea
        name="message" rows={3} placeholder="Special requirements? (optional)"
        value={formData.message} onChange={(e) => update('message', e.target.value)}
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 outline-none resize-none"
      />

      <button
        type="submit" disabled={loading}
        className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-lg"
      >
        {loading ? '⏳ Sending...' : '🚽 Get Free Quotes Now'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Free service · No spam · Vendors contact you directly · Typically 2–4 quotes in 2 hours
      </p>
    </form>
  );
}
