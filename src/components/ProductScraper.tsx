import React, { useState } from 'react';
import { Search, Loader2, Link as LinkIcon } from 'lucide-react';
import { scrapeProductUrl } from '../services/gemini';
import { ProductDetails } from '../types';

interface ProductScraperProps {
  onScraped: (details: ProductDetails) => void;
}

export function ProductScraper({ onScraped }: ProductScraperProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError('');
    try {
      const details = await scrapeProductUrl(url);
      onScraped(details);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to extract product details. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
          <LinkIcon size={16} />
          Product URL
        </label>
        <form onSubmit={handleScrape} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="Paste Myntra, Amazon, Zara URL..."
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-zinc-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Analyze
          </button>
        </form>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}
