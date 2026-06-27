import React, { useState } from 'react';
import { Star, Flame, Trash2, Edit3, Save, Maximize2, Sparkles, BookMarked } from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';

export interface BookHighlight {
  id: string;
  sectionId: string;
  sectionTitle: string;
  text: string;
  note: string;
  createdAt: number;
}

interface HighlightsSidebarProps {
  totalXP: number;
  streak: number;
  highlights: BookHighlight[];
  onDeleteHighlight: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  language: Language;
}

export const HighlightsSidebar: React.FC<HighlightsSidebarProps> = ({
  totalXP,
  streak,
  highlights,
  onDeleteHighlight,
  onUpdateNote,
  isFocusMode,
  onToggleFocusMode,
  language
}) => {
  const t = (key: string) => (TRANSLATIONS[language] as any)[key] || (TRANSLATIONS['en'] as any)[key];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const startEditing = (highlight: BookHighlight) => {
    setEditingId(highlight.id);
    setEditNoteText(highlight.note);
  };

  const saveNote = (id: string) => {
    onUpdateNote(id, editNoteText);
    setEditingId(null);
  };

  return (
    <div className="w-full h-full bg-[var(--card-bg)] border-l-4 border-[var(--border-color)] text-[var(--text-color)] flex flex-col overflow-hidden select-none">
      {/* Sidebar stats panel */}
      <div className="p-4 border-b-4 border-[var(--border-color)] bg-[var(--bg-color)] flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-duo-yellow fill-current" /> {t('focusLabActive')}
          </span>
          <button
            onClick={onToggleFocusMode}
            className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black border-2 transition-all btn-3d
              ${isFocusMode 
                ? 'bg-duo-purple border-duo-purple-dark text-white shadow-[0_3px_0_0_#8c25e0]' 
                : 'bg-white border-duo-gray text-gray-500 shadow-[0_3px_0_0_#e5e5e5]'
              }
            `}
            title="Toggle Focus Mode (Cmd+Shift+F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{isFocusMode ? 'Focus On' : t('readCap')}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5 mt-1">
          {/* XP */}
          <div className="bg-duo-yellow/10 rounded-2xl p-3 border-2 border-duo-yellow-dark/20 text-center flex flex-col items-center justify-center">
            <Star className="w-6 h-6 text-duo-yellow fill-duo-yellow mb-1" />
            <span className="text-lg font-black text-duo-yellow-dark">{totalXP}</span>
            <span className="text-[9px] font-black text-duo-yellow-dark/80 uppercase">Total XP</span>
          </div>

          {/* Streak */}
          <div className="bg-duo-orange/10 rounded-2xl p-3 border-2 border-duo-orange-dark/20 text-center flex flex-col items-center justify-center">
            <Flame className="w-6 h-6 text-duo-orange fill-duo-orange mb-1" />
            <span className="text-lg font-black text-duo-orange-dark">{streak} Day{streak !== 1 && 's'}</span>
            <span className="text-[9px] font-black text-duo-orange-dark/80 uppercase">Streak</span>
          </div>
        </div>
      </div>

      {/* Highlights & Notes list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 bg-[var(--card-bg)] border-b-2 border-[var(--border-color)] flex items-center justify-between shrink-0">
          <span className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <BookMarked className="w-4 h-4 text-duo-blue" /> Study Highlights
          </span>
          <span className="text-[10px] bg-[var(--bg-color)] border border-[var(--border-color)] font-black text-gray-400 px-2 py-0.5 rounded-full">
            {highlights.length} Clips
          </span>
        </div>

        {/* Highlights Scroller */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
          {highlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-gray-400">
              <span className="text-3xl mb-2">💡</span>
              <p className="text-xs font-extrabold uppercase tracking-wide">No highlights yet</p>
              <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                Select text in the reader and click "Highlight" to compile reference notes.
              </p>
            </div>
          ) : (
            highlights.map((hl) => {
              const isEditing = editingId === hl.id;

              return (
                <div 
                  key={hl.id}
                  className="bg-duo-yellow/5 border-2 border-duo-yellow/30 rounded-2xl p-3 flex flex-col gap-2 relative group shadow-sm transition-all hover:bg-duo-yellow/10"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => onDeleteHighlight(hl.id)}
                    className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete highlight"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Section Title tag */}
                  <span className="text-[9px] font-black text-duo-yellow-dark uppercase bg-duo-yellow/20 px-2 py-0.5 rounded-full w-fit max-w-[80%] truncate">
                    {hl.sectionTitle}
                  </span>

                  {/* Text clip */}
                  <p className="text-xs font-medium italic border-l-2 border-duo-yellow/40 pl-2 leading-relaxed text-wrap text-inherit opacity-90">
                    "{hl.text}"
                  </p>

                  {/* Note block */}
                  <div className="mt-1 pt-2 border-t border-duo-yellow/15 flex flex-col gap-1.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editNoteText}
                          onChange={(e) => setEditNoteText(e.target.value)}
                          placeholder="Add comment..."
                          className="flex-1 px-2.5 py-1 text-xs border border-duo-gray focus:border-duo-blue focus:outline-none rounded-lg"
                        />
                        <button
                          onClick={() => saveNote(hl.id)}
                          className="p-1.5 bg-duo-green text-white rounded-lg hover:bg-duo-green-hover transition-colors"
                          title="Save Note"
                        >
                          <Save className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        {hl.note ? (
                          <p className="text-xs font-semibold text-gray-800 leading-snug text-wrap flex-1">
                            {hl.note}
                          </p>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No notes added.</span>
                        )}
                        <button
                          onClick={() => startEditing(hl)}
                          className="text-gray-400 hover:text-duo-blue p-0.5 transition-colors"
                          title="Edit Note"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
