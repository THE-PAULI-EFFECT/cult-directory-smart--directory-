import type { Metadata } from 'next';
import './globals.css';
import { DIRECTORY_CONFIG } from '@/lib/directory-config';

export const metadata: Metadata = {
  title: {
    default: DIRECTORY_CONFIG.siteName,
    template: `%s | ${DIRECTORY_CONFIG.siteName}`,
  },
  description: DIRECTORY_CONFIG.description,
  metadataBase: new URL(`https://${DIRECTORY_CONFIG.domain}`),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-extrabold text-xl text-green-800">
              🚽 {DIRECTORY_CONFIG.siteName}
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
              <a href="/#cities" className="hover:text-green-700">Browse Cities</a>
              <a href="/for-vendors" className="hover:text-green-700">For Vendors</a>
              <a
                href="#get-quotes"
                className="bg-green-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
              >
                Get Free Quotes
              </a>
            </nav>
          </div>
        </header>

        {children}

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="text-white font-bold text-lg mb-3">
                  🚽 {DIRECTORY_CONFIG.siteName}
                </div>
                <p className="text-sm leading-relaxed">
                  Washington State&rsquo;s most complete directory for porta-potty and luxury restroom
                  trailer rentals.
                </p>
              </div>
              <div>
                <div className="text-white font-semibold mb-3">Browse Cities</div>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {DIRECTORY_CONFIG.cities.slice(0, 8).map((city) => (
                    <a
                      key={city}
                      href={`/${city.toLowerCase().replace(/\s+/g, '-')}`}
                      className="hover:text-white transition-colors"
                    >
                      {city}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3">For Vendors</div>
                <div className="space-y-2 text-sm">
                  <a href="/for-vendors" className="block hover:text-white">List Your Business</a>
                  <a href="/dashboard" className="block hover:text-white">Vendor Login</a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-6 text-sm text-center">
              © {new Date().getFullYear()} {DIRECTORY_CONFIG.siteName}. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
