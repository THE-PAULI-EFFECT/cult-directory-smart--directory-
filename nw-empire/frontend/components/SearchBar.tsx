'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DIRECTORY_CONFIG } from '@/lib/directory-config';

export function SearchBar({ placeholder }: { placeholder?: string }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${query.trim().toLowerCase().replace(/\s+/g, '-')}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-lg">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? DIRECTORY_CONFIG.cities[0] + ', WA'}
        list="wa-cities"
        className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-green-500 focus:outline-none text-gray-800"
      />
      <datalist id="wa-cities">
        {DIRECTORY_CONFIG.cities.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <button
        type="submit"
        className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-xl transition-colors"
      >
        Search
      </button>
    </form>
  );
}
