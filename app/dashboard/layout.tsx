import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getConfig } from '@/lib/directory-config';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const config = getConfig();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard nav */}
      <nav
        style={{ backgroundColor: config.primaryColor }}
        className="text-white px-6 py-4"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg">
              {config.heroEmoji} {config.siteName}
            </Link>
            <div className="hidden md:flex items-center gap-4 text-sm text-white/80">
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/leads" className="hover:text-white transition-colors">
                Leads
              </Link>
              <Link href="/dashboard/listing" className="hover:text-white transition-colors">
                My Listing
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/70">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
