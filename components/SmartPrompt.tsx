'use client';
import { useState, useRef, useCallback } from 'react';
import Amount from './Amount';
import EditModal, { type EditResult } from './EditModal';
import { catInfo, friendlyDate } from '@/lib/reference';
import type { Txn } from '@/lib/repo';

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';

const SUGGESTIONS = [
  'How much did I spend on travel?',
  'Show my food expenses',
  'Transactions above ₹10,000',
  'ICICI transactions last month',
  'Shopping on HDFC card',
];

interface SearchResult {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  account: string;
  category: string | null;
}

export default function SmartPrompt() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [editing, setEditing] = useState<Txn | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSummary(''); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setSummary(data.summary || '');
    } catch { setResults([]); setSummary('Something went wrong.'); }
    setLoading(false);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    search(query);
  }

  function handleSuggestion(s: string) {
    setQuery(s);
    search(s);
    inputRef.current?.focus();
  }

  async function openTxn(id: string) {
    const res = await fetch(`/api/transactions?status=all`);
    const data = await res.json();
    const t = data.txns.find((x: any) => x.id === id);
    if (t) setEditing(t);
  }

  async function handleEditSubmit(result: EditResult) {
    if (!editing) return;
    await fetch(`/api/transactions/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
    setEditing(null);
    search(query);
  }

  function handleClose() {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSummary('');
    setSearched(false);
  }

  return (
    <>
      {/* Prompt trigger */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-credsurface border border-credline/60 shadow-subtle hover:shadow-card transition-shadow"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <span className="text-small text-credmuted">Ask about your finances...</span>
        <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-credbg text-[10px] text-credmuted font-semibold uppercase tracking-wider">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Smart
        </span>
      </button>

      {/* Full-screen search overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[200] bg-credbg/95 backdrop-blur-xl flex flex-col"
          style={{ animation: `fadeIn 200ms ${SPRING}` }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] pb-2">
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full border border-credline bg-credsurface flex items-center justify-center text-credink flex-none"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-credink">Smart Search</h2>
          </div>

          {/* Search input */}
          <form onSubmit={handleSubmit} className="px-4 pt-2 pb-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-credsurface border border-credline/60 focus-within:border-accent/40 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted flex-none">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="e.g. travel expenses last month"
                className="flex-1 bg-transparent text-small text-credink placeholder:text-credmuted/50 outline-none"
                autoComplete="off"
                autoCorrect="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults([]); setSummary(''); setSearched(false); inputRef.current?.focus(); }}
                  className="text-credmuted"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </form>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            {/* Suggestions (before search) */}
            {!searched && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-credmuted mb-3">Try asking</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="px-3 py-2 rounded-xl bg-credsurface border border-credline/60 text-caption text-credink font-medium hover:border-accent/30 hover:bg-accent/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 py-6 justify-center">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <span className="text-small text-credmuted">Searching...</span>
              </div>
            )}

            {/* Summary */}
            {!loading && summary && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-accent/5 border border-accent/15">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-none mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </span>
                  <p className="text-small font-semibold text-credink leading-relaxed">{summary}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div className="space-y-1.5">
                {results.map((r) => {
                  const ci = r.category ? catInfo(r.category) : null;
                  return (
                    <button
                      key={r.id}
                      onClick={() => openTxn(r.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-credsurface border border-credline/40 text-left hover:border-accent/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-small font-semibold truncate">{r.merchant}</div>
                        <div className="text-caption text-credmuted mt-0.5 truncate">
                          {friendlyDate(r.date, true)} · {r.account}
                          {ci && <> · <span style={{ color: ci.color }}>{ci.label}</span></>}
                        </div>
                      </div>
                      <span className="flex-none"><Amount value={r.amount} size="sm" /></span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {!loading && searched && results.length === 0 && !summary.includes('No transactions') && (
              <div className="text-center py-10">
                <div className="text-credmuted text-small">No results found</div>
              </div>
            )}
          </div>

          {editing && (
            <EditModal
              txn={editing}
              onClose={() => setEditing(null)}
              onSubmit={handleEditSubmit}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
