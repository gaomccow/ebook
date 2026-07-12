import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen } from 'lucide-react';
import type { SectionNode } from './PathView';

export interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  paraIndex: number;
  snippetPre: string;
  snippetMatch: string;
  snippetPost: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: SectionNode[];
  contentMap: Record<string, string>;
  onResultClick: (sectionId: string, paraIndex: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  sections,
  contentMap,
  onResultClick
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Clean up query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (debouncedQuery.length < 2) return [];

    const lowerQuery = debouncedQuery.toLowerCase();
    const newResults: SearchResult[] = [];

    for (const section of sections) {
      const content = contentMap[section.id];
      if (!content) continue;

      const paragraphs = content.split('\n\n').filter(p => p.trim() !== '');

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        
        // Skip images
        if (p.startsWith('[IMG:') && p.endsWith(']')) continue;

        // Strip HTML (simple regex since it's mostly plain text with some tags)
        const plainText = p.replace(/<[^>]+>/g, '');
        const lowerText = plainText.toLowerCase();

        const matchIndex = lowerText.indexOf(lowerQuery);
        if (matchIndex !== -1) {
          // Found a match
          // Get snippet (up to 40 chars before and 60 chars after)
          const start = Math.max(0, matchIndex - 40);
          const end = Math.min(plainText.length, matchIndex + lowerQuery.length + 60);

          let snippetPre = plainText.substring(start, matchIndex);
          if (start > 0) snippetPre = '...' + snippetPre;

          const snippetMatch = plainText.substring(matchIndex, matchIndex + lowerQuery.length);

          let snippetPost = plainText.substring(matchIndex + lowerQuery.length, end);
          if (end < plainText.length) snippetPost = snippetPost + '...';

          newResults.push({
            sectionId: section.id,
            sectionTitle: section.title,
            paraIndex: i,
            snippetPre,
            snippetMatch,
            snippetPost
          });

          // Limit to max 5 results per chapter to avoid overwhelming
          if (newResults.filter(r => r.sectionId === section.id).length >= 5) {
            break;
          }
        }
      }
      
      // Stop if we found a ton of results globally
      if (newResults.length > 50) break;
    }

    return newResults;
  }, [debouncedQuery, sections, contentMap]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Header / Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
              <Search className="w-6 h-6 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search across all chapters..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2">
              {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
                <div className="p-8 text-center text-slate-500">
                  Type at least 2 characters to search.
                </div>
              )}
              
              {debouncedQuery.length >= 2 && results.length === 0 && (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
                  <Search className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  <p>No results found for "{debouncedQuery}"</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="flex flex-col gap-1 p-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                    {results.length} Result{results.length !== 1 ? 's' : ''} Found
                  </div>
                  {results.map((r, idx) => (
                    <button
                      key={`${r.sectionId}-${r.paraIndex}-${idx}`}
                      onClick={() => {
                        onResultClick(r.sectionId, r.paraIndex);
                        onClose();
                      }}
                      className="text-left w-full p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col gap-2 group"
                    >
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-duo-blue">
                        <BookOpen className="w-4 h-4" />
                        <span className="line-clamp-1">{r.sectionTitle}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        {r.snippetPre}
                        <mark className="bg-duo-yellow/40 text-slate-900 dark:text-slate-100 px-1 rounded mx-0.5 font-bold">
                          {r.snippetMatch}
                        </mark>
                        {r.snippetPost}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              
              {query.length === 0 && (
                <div className="p-8 text-center text-slate-400 dark:text-slate-600 italic">
                  Search for characters, locations, vocabulary, or concepts...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
