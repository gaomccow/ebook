import React, { useState } from 'react';
import { Star, Flame, Trash2, Edit3, Save, Maximize2, Sparkles, BookMarked, Map, Image, Plus } from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';
import { GeminiClient } from '../services/GeminiClient';
import { Zap, Brain } from 'lucide-react';
import type { Language } from '../utils/translations';

export interface BookHighlight {
  id: string;
  sectionId: string;
  sectionTitle: string;
  text: string;
  note: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  bookId: string;
  highlightId?: string;
  question: string;
  answer: string;
  createdAt: number;
  masteryScore: number;
}

export interface UsefulInfoItem {
  id: string;
  bookId: string;
  imageFilename: string;
  title: string;
  note: string;
  createdAt: number;
  sectionId?: string;
  sectionTitle?: string;
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
  
  // Useful Info props
  usefulInfoItems: UsefulInfoItem[];
  onDeleteUsefulInfo: (id: string) => void;
  onUpdateUsefulInfo: (id: string, title: string, note: string) => void;
  activeImages: Record<string, string>;
  onOpenLightbox: (filename: string) => void;
  
  // Flashcard props
  flashcards?: Flashcard[];
  onSaveFlashcards?: (cards: Flashcard[]) => void;
  onDeleteFlashcard?: (id: string) => void;
  
  // AI props
  aiProvider?: 'gemini' | 'groq';
  apiKey?: string;
}

export const HighlightsSidebar: React.FC<HighlightsSidebarProps> = ({
  totalXP,
  streak,
  highlights,
  onDeleteHighlight,
  onUpdateNote,
  isFocusMode,
  onToggleFocusMode,
  language,
  usefulInfoItems,
  onDeleteUsefulInfo,
  onUpdateUsefulInfo,
  activeImages,
  onOpenLightbox,
  flashcards = [],
  onSaveFlashcards,
  onDeleteFlashcard,
  aiProvider = 'groq',
  apiKey = ''
}) => {
  const t = (key: string) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS['en'];
    return (dict as any)[key] || (TRANSLATIONS['en'] as any)[key] || key;
  };
  
  const [activeTab, setActiveTab] = useState<'highlights' | 'useful' | 'flashcards'>('highlights');
  
  // Flashcard generation state
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  
  // Highlight editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // Useful Info editing state
  const [editingUsefulId, setEditingUsefulId] = useState<string | null>(null);
  const [editUsefulTitle, setEditUsefulTitle] = useState('');
  const [editUsefulNote, setEditUsefulNote] = useState('');

  const startEditing = (highlight: BookHighlight) => {
    setEditingId(highlight.id);
    setEditNoteText(highlight.note);
  };

  const saveNote = (id: string) => {
    onUpdateNote(id, editNoteText);
    setEditingId(null);
  };

  const startEditingUseful = (item: UsefulInfoItem) => {
    setEditingUsefulId(item.id);
    setEditUsefulTitle(item.title);
    setEditUsefulNote(item.note);
  };

  const saveUsefulItem = (id: string) => {
    onUpdateUsefulInfo(id, editUsefulTitle, editUsefulNote);
    setEditingUsefulId(null);
  };

  const handleGenerateFlashcards = async (hl: BookHighlight) => {
    if (!apiKey) return;
    setGeneratingForId(hl.id);
    try {
      const cards = await GeminiClient.generateFlashcards(aiProvider, apiKey, hl.text, hl.note);
      
      const newFlashcards: Flashcard[] = cards.map(c => ({
        id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        bookId: hl.sectionId.split('_')[0] || 'book_default',
        highlightId: hl.id,
        question: c.question,
        answer: c.answer,
        createdAt: Date.now(),
        masteryScore: 0
      }));

      if (onSaveFlashcards) {
        onSaveFlashcards(newFlashcards);
      }
      setActiveTab('flashcards');
    } catch (e) {
      console.error('Failed to generate flashcards:', e);
    } finally {
      setGeneratingForId(null);
    }
  };

  return (
    <div className="w-full h-full bg-transparent text-[var(--text-color)] flex flex-col overflow-hidden select-none">
      {/* Sidebar stats panel */}
      {/* Sidebar stats panel */}
      <div className="p-4 border-b border-[var(--border-color)]/50 bg-[var(--bg-color)] flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[var(--text-color)]/75 uppercase tracking-widest flex items-center gap-1.5">
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
            <span className="text-lg font-black text-duo-orange-dark">{streak || 0} Day{(streak || 0) !== 1 && 's'}</span>
            <span className="text-[9px] font-black text-duo-orange-dark/80 uppercase">Streak</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-[var(--border-color)]/20 bg-[var(--bg-color)] p-1.5 gap-1.5">
        <button
          onClick={() => setActiveTab('highlights')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all border-2
            ${activeTab === 'highlights'
              ? 'bg-duo-blue border-duo-blue-dark text-white shadow-[0_2.5px_0_0_#185ea5]'
              : 'bg-transparent border-transparent text-[var(--text-color)]/60 hover:bg-black/5 dark:hover:bg-white/5'
            }
          `}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Lưu ý' : 'Study Clips'}</span>
        </button>
        <button
          onClick={() => setActiveTab('useful')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all border-2
            ${activeTab === 'useful'
              ? 'bg-duo-green border-duo-green-dark text-white shadow-[0_2.5px_0_0_#499914]'
              : 'bg-transparent border-transparent text-[var(--text-color)]/60 hover:bg-black/5 dark:hover:bg-white/5'
            }
          `}
        >
          <Map className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Thông tin hữu ích' : 'Useful Info'}</span>
        </button>
      </div>

      {/* Lists container */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--card-bg)]">
        {activeTab === 'highlights' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--card-bg)]">
            <div className="px-4 py-2.5 bg-[var(--bg-color)] border-b border-[var(--border-color)]/25 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-[var(--text-color)]/70 uppercase tracking-widest">
                Study Highlights
              </span>
              <span className="text-[9px] bg-[var(--card-bg)] border border-[var(--border-color)] font-black text-[var(--text-color)]/70 px-2 py-0.5 rounded-full">
                {(highlights || []).length} Clips
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar bg-[var(--card-bg)]">
              {(!highlights || highlights.length === 0) ? (
                <div className="flex flex-col items-center justify-center text-center py-12 text-[var(--text-color)]/60">
                  <span className="text-3xl mb-2">💡</span>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--text-color)]/80">No highlights yet</p>
                  <p className="text-[10px] text-[var(--text-color)]/60 mt-1 max-w-[200px] leading-relaxed">
                    Select text in the reader and click "Highlight" to compile reference notes.
                  </p>
                </div>
              ) : (
                highlights.map((hl) => {
                  if (!hl) return null;
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
                        {hl.sectionTitle || 'General'}
                      </span>

                      {/* Text clip */}
                      <p className="text-xs font-medium italic border-l-2 border-duo-yellow/40 pl-2 leading-relaxed text-wrap text-inherit opacity-90">
                        "{hl.text || ''}"
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
        ) : activeTab === 'flashcards' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--card-bg)]">
            <div className="px-4 py-2.5 bg-[var(--bg-color)] border-b border-[var(--border-color)]/25 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-[var(--text-color)]/70 uppercase tracking-widest">
                AI Flashcards
              </span>
              <span className="text-[9px] bg-[var(--card-bg)] border border-[var(--border-color)] font-black text-[var(--text-color)]/70 px-2 py-0.5 rounded-full">
                {(flashcards || []).length} Cards
              </span>
            </div>

            <div className="p-3 border-b border-[var(--border-color)]/20 shrink-0">
                <button
                  onClick={() => {
                      if (flashcards && flashcards.length > 0) {
                          // TODO: Open flashcard modal
                          const event = new CustomEvent('open-flashcards');
                          window.dispatchEvent(event);
                      }
                  }}
                  disabled={!flashcards || flashcards.length === 0}
                  className={`w-full py-3 rounded-2xl font-black flex items-center justify-center gap-2 border-2 transition-all btn-3d
                    ${(!flashcards || flashcards.length === 0) 
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-duo-purple border-duo-purple-dark text-white shadow-[0_4px_0_0_#8c25e0] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#8c25e0]'
                    }
                  `}
                >
                  <Brain className="w-5 h-5" />
                  Study {flashcards?.length || 0} Flashcards
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar bg-[var(--card-bg)]">
              {(!flashcards || flashcards.length === 0) ? (
                <div className="flex flex-col items-center justify-center text-center py-12 text-[var(--text-color)]/60">
                  <span className="text-3xl mb-2">⚡</span>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--text-color)]/80">No flashcards yet</p>
                  <p className="text-[10px] text-[var(--text-color)]/60 mt-1 max-w-[200px] leading-relaxed">
                    Go to the Notes tab and click "Flashcards" on any highlight to generate study cards!
                  </p>
                </div>
              ) : (
                flashcards.map((fc) => (
                  <div 
                    key={fc.id}
                    className="bg-duo-purple/5 border-2 border-duo-purple/30 rounded-2xl p-3 flex flex-col gap-2 relative group shadow-sm transition-all hover:bg-duo-purple/10"
                  >
                    <button
                      onClick={() => onDeleteFlashcard && onDeleteFlashcard(fc.id)}
                      className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-black text-duo-purple-dark uppercase bg-duo-purple/20 px-2 py-0.5 rounded-full w-fit">
                      Q&A Pair
                    </span>
                    <div className="flex flex-col gap-1.5 mt-1">
                      <p className="text-xs font-bold text-gray-800 dark:text-white leading-snug">
                        <span className="text-duo-purple opacity-70 mr-1">Q:</span>
                        {fc.question}
                      </p>
                      <div className="w-full h-px bg-duo-purple/10 my-1"></div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed italic">
                        <span className="text-duo-green opacity-70 mr-1 font-bold">A:</span>
                        {fc.answer}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--card-bg)]">
            <div className="px-4 py-2.5 bg-[var(--bg-color)] border-b border-[var(--border-color)]/25 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-[var(--text-color)]/70 uppercase tracking-widest">
                Useful Maps & Information
              </span>
              <span className="text-[9px] bg-[var(--card-bg)] border border-[var(--border-color)] font-black text-[var(--text-color)]/70 px-2 py-0.5 rounded-full">
                {(usefulInfoItems || []).length} Saved
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar bg-[var(--card-bg)]">
              {(!usefulInfoItems || usefulInfoItems.length === 0) ? (
                <div className="flex flex-col items-center justify-center text-center py-12 text-[var(--text-color)]/60">
                  <span className="text-3xl mb-2">🗺️</span>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--text-color)]/80">No reference items saved</p>
                  <p className="text-[10px] text-[var(--text-color)]/60 mt-1 max-w-[200px] leading-relaxed">
                    Pin maps and pictures from the book content or the gallery to view them here instantly.
                  </p>
                </div>
              ) : (
                usefulInfoItems.map((item) => {
                  if (!item) return null;
                  const isEditing = editingUsefulId === item.id;
                  const imageSrc = activeImages[item.imageFilename];

                  return (
                    <div 
                      key={item.id}
                      className="bg-duo-green/5 border-2 border-duo-green/30 rounded-2xl p-3 flex flex-col gap-2 relative group shadow-sm transition-all hover:bg-duo-green/10"
                    >
                      {/* Delete button */}
                      <button
                        onClick={() => onDeleteUsefulInfo(item.id)}
                        className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from useful info"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Header row: Section title */}
                      <span className="text-[9px] font-black text-duo-green-dark uppercase bg-duo-green/20 px-2 py-0.5 rounded-full w-fit max-w-[80%] truncate">
                        {item.sectionTitle || 'Reference Map'}
                      </span>

                      {/* Core Content: Thumbnail & Title */}
                      <div className="flex items-start gap-3">
                        {imageSrc ? (
                          <div 
                            onClick={() => onOpenLightbox(item.imageFilename)}
                            className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-[var(--border-color)] cursor-pointer group/thumb shadow-sm hover:ring-2 hover:ring-duo-green transition-all bg-black/5"
                          >
                            <img src={imageSrc} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4 text-white rotate-45" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0 border border-dashed border-gray-300">
                            <Image className="w-6 h-6 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={editUsefulTitle}
                                onChange={(e) => setEditUsefulTitle(e.target.value)}
                                placeholder="Item Title..."
                                className="w-full px-2 py-1 text-xs border border-duo-gray focus:border-duo-green focus:outline-none rounded-lg font-bold"
                              />
                              <input
                                type="text"
                                value={editUsefulNote}
                                onChange={(e) => setEditUsefulNote(e.target.value)}
                                placeholder="Add note or description..."
                                className="w-full px-2 py-1 text-[11px] border border-duo-gray focus:border-duo-green focus:outline-none rounded-lg"
                              />
                              <button
                                onClick={() => saveUsefulItem(item.id)}
                                className="px-2 py-1 self-end bg-duo-green text-white text-[10px] font-black rounded-lg hover:bg-duo-green-hover transition-colors flex items-center gap-1 btn-3d border border-duo-green-dark"
                              >
                                <Save className="w-3 h-3" /> Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <h4 
                                onClick={() => onOpenLightbox(item.imageFilename)}
                                className="text-xs font-bold text-gray-800 dark:text-white hover:text-duo-green cursor-pointer truncate"
                              >
                                {item.title || 'Untitled Map/Image'}
                              </h4>
                              {item.note ? (
                                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-snug">
                                  {item.note}
                                </p>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic mt-0.5">No custom notes added.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Row: Edit Action Button */}
                      {!isEditing && (
                        <div className="flex justify-end pt-1 border-t border-duo-green/10">
                          <button
                            onClick={() => startEditingUseful(item)}
                            className="text-gray-400 hover:text-duo-green p-0.5 transition-colors flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"
                          >
                            <Edit3 className="w-3 h-3" /> Edit Info
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
