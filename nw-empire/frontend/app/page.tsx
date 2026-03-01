import { LeadCaptureForm } from '@/components/LeadCaptureForm';
import { SearchBar } from '@/components/SearchBar';
import { DIRECTORY_CONFIG } from '@/lib/directory-config';

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        id="get-quotes"
        className="py-20"
        style={{ background: `linear-gradient(135deg, ${DIRECTORY_CONFIG.primaryColor} 0%, ${DIRECTORY_CONFIG.secondaryColor} 100%)` }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                500+ verified Washington vendors
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
                {DIRECTORY_CONFIG.heroHeadline}
              </h1>

              <p className="text-xl mb-8 opacity-90 leading-relaxed">
                {DIRECTORY_CONFIG.description}
              </p>

              <div className="flex flex-wrap gap-6 text-sm opacity-80 mb-8">
                <span>✓ 500+ Verified Vendors</span>
                <span>✓ Transparent Pricing</span>
                <span>✓ Free Quotes in 2 Hours</span>
              </div>

              <div>
                <p className="text-white/80 text-sm mb-2">Or search by city:</p>
                <SearchBar placeholder="Enter your city..." />
              </div>
            </div>

            <div>
              <LeadCaptureForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Cities Grid ───────────────────────────────────────────────────── */}
      <section id="cities" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Serving All of Washington State
            </h2>
            <p className="text-gray-500">Click your city to browse local verified vendors</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {DIRECTORY_CONFIG.cities.map((city) => (
              <a
                key={city}
                href={`/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-gray-50 hover:bg-green-50 border-2 border-gray-200 hover:border-green-400 p-4 rounded-xl transition-all text-center group"
              >
                <span className="font-semibold text-gray-800 group-hover:text-green-700 text-sm">
                  {city}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '📋', title: 'Fill Out One Form', desc: 'Tell us your event type, location, and dates. Takes 2 minutes.' },
              { icon: '⚡', title: 'Get 3 Quotes Fast', desc: 'Local verified vendors compete for your business within 2 hours.' },
              { icon: '🎯', title: 'Choose the Best', desc: 'Compare pricing, reviews, and pick your vendor. Zero obligation.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-16 h-16 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
