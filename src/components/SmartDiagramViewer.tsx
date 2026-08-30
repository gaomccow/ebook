import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, ZoomOut, RotateCcw, Crosshair, Pin, 
  Maximize2, Sparkles, ExternalLink, Move, Check
} from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import type { UsefulInfoItem } from './HighlightsSidebar';

export interface FigureZone {
  scale: number;
  x: number; // percentage offset (-50 to 50)
  y: number; // percentage offset (-50 to 50)
  label: string;
  beacon: { top: string; left: string; width: string; height: string };
}

export const FIGURE_ZONES: Record<string, FigureZone> = {
  'FIG. 1': {
    scale: 1.85,
    x: 0,
    y: 26,
    label: 'FIG. 1 (Top Section)',
    beacon: { top: '6%', left: '8%', width: '84%', height: '34%' }
  },
  'FIG. 2': {
    scale: 1.85,
    x: 0,
    y: -2,
    label: 'FIG. 2 (Middle Section)',
    beacon: { top: '38%', left: '8%', width: '84%', height: '30%' }
  },
  'FIG. 3': {
    scale: 2.15,
    x: 20,
    y: -28,
    label: 'FIG. 3 (Bottom-Left)',
    beacon: { top: '68%', left: '5%', width: '45%', height: '28%' }
  },
  'FIG. 4': {
    scale: 2.15,
    x: -20,
    y: -28,
    label: 'FIG. 4 (Bottom-Right)',
    beacon: { top: '68%', left: '50%', width: '45%', height: '28%' }
  },
  'OVERVIEW': {
    scale: 1.0,
    x: 0,
    y: 0,
    label: 'Full Overview',
    beacon: { top: '0%', left: '0%', width: '100%', height: '100%' }
  }
};

interface SmartDiagramViewerProps {
  imageSrc: string;
  filename: string;
  title: string;
  activeFigure: string | null;
  onFigureSelect?: (figureKey: string) => void;
  isAutoSyncActive: boolean;
  onToggleAutoSync: () => void;
  onOpenLightbox?: (filename: string) => void;
  usefulInfoItems?: UsefulInfoItem[];
  onSaveUsefulInfo?: (item: Omit<UsefulInfoItem, 'id' | 'createdAt'>) => void;
  onDeleteUsefulInfo?: (id: string) => void;
  sectionId: string;
  sectionTitle: string;
  isFloatingPiP?: boolean;
  onTogglePiP?: () => void;
  onSwapSides?: () => void;
  diagramPosition?: 'left' | 'right';
  className?: string;
}

export const SmartDiagramViewer: React.FC<SmartDiagramViewerProps> = ({
  imageSrc,
  filename,
  title,
  activeFigure,
  onFigureSelect,
  isAutoSyncActive,
  onToggleAutoSync,
  onOpenLightbox,
  usefulInfoItems = [],
  onSaveUsefulInfo,
  onDeleteUsefulInfo,
  sectionId,
  sectionTitle,
  isFloatingPiP = false,
  onTogglePiP,
  onSwapSides,
  diagramPosition = 'left',
  className = ''
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBeacon, setShowBeacon] = useState<boolean>(false);
  const [lastTargetLabel, setLastTargetLabel] = useState<string>('Overview');

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync camera when activeFigure changes (if autoSync is ON or manually triggered)
  useEffect(() => {
    if (!activeFigure) {
      if (isAutoSyncActive) {
        setScale(1.0);
        setPan({ x: 0, y: 0 });
        setShowBeacon(false);
        setLastTargetLabel('Full Overview');
      }
      return;
    }

    const normalizedKey = activeFigure.toUpperCase().trim();
    let matchedZone = FIGURE_ZONES[normalizedKey];

    if (!matchedZone) {
      // Check partial matches like FIG 1, (FIG. 1), etc.
      if (normalizedKey.includes('1')) matchedZone = FIGURE_ZONES['FIG. 1'];
      else if (normalizedKey.includes('2')) matchedZone = FIGURE_ZONES['FIG. 2'];
      else if (normalizedKey.includes('3')) matchedZone = FIGURE_ZONES['FIG. 3'];
      else if (normalizedKey.includes('4')) matchedZone = FIGURE_ZONES['FIG. 4'];
      else matchedZone = FIGURE_ZONES['OVERVIEW'];
    }

    if (matchedZone) {
      setScale(matchedZone.scale);
      setPan({ x: matchedZone.x, y: matchedZone.y });
      setLastTargetLabel(matchedZone.label);
      setShowBeacon(true);

      const timer = setTimeout(() => {
        setShowBeacon(false);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [activeFigure, isAutoSyncActive]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.35, 3.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.35, 0.7));
  const handleReset = () => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
    setShowBeacon(false);
    setLastTargetLabel('Full Overview');
    if (onFigureSelect) onFigureSelect('');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1.0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x * 4, y: e.clientY - pan.y * 4 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = (e.clientX - dragStart.x) / 4;
    const deltaY = (e.clientY - dragStart.y) / 4;
    setPan({
      x: Math.max(-60, Math.min(60, deltaX)),
      y: Math.max(-60, Math.min(60, deltaY))
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 5) {
      if (e.deltaY < 0) {
        setScale(prev => Math.min(prev + 0.15, 3.5));
      } else {
        setScale(prev => Math.max(prev - 0.15, 0.7));
      }
    }
  };

  // Pin / Useful Info handle
  const isSaved = usefulInfoItems.some(item => item.imageFilename === filename);
  const savedItem = usefulInfoItems.find(item => item.imageFilename === filename);

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved && savedItem) {
      if (onDeleteUsefulInfo) onDeleteUsefulInfo(savedItem.id);
    } else {
      if (onSaveUsefulInfo) {
        const cleanTitle = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        const firstUnderscore = sectionId.indexOf('_');
        const bookId = firstUnderscore !== -1 ? sectionId.substring(0, firstUnderscore) : 'book_default';
        onSaveUsefulInfo({
          bookId,
          imageFilename: filename,
          title: cleanTitle || title,
          note: '',
          sectionId,
          sectionTitle
        });
      }
    }
  };

  const currentZoneKey = Object.keys(FIGURE_ZONES).find(k => k === activeFigure?.toUpperCase()) || 'OVERVIEW';
  const currentBeacon = FIGURE_ZONES[currentZoneKey]?.beacon;

  return (
    <div 
      className={`
        flex flex-col bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-xl overflow-hidden backdrop-blur-md select-none transition-all
        ${className}
      `}
      style={{ minHeight: isFloatingPiP ? '380px' : '480px' }}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-500/5 dark:bg-slate-800/40 border-b border-[var(--border-color)]/60 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="uppercase text-[10px] tracking-wider hidden sm:inline">Smart Diagram</span>
          </span>

          {/* Target Indicator badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-700/50 text-[11px] font-bold text-[var(--text-color)]">
            <Crosshair className={`w-3 h-3 ${activeFigure ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="truncate max-w-[120px] sm:max-w-[160px]">{lastTargetLabel}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Auto-Sync Toggle Button */}
          <Tooltip content={isAutoSyncActive ? "Smart Auto-Tracking ON (glides as you read)" : "Smart Auto-Tracking OFF"}>
            <button
              onClick={onToggleAutoSync}
              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                isAutoSyncActive 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-700'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>{isAutoSyncActive ? 'Sync ON' : 'Sync OFF'}</span>
            </button>
          </Tooltip>

          {/* Quick Figure Switcher Buttons */}
          <div className="hidden xl:flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-lg p-0.5 ml-1">
            {['FIG. 1', 'FIG. 2', 'FIG. 3', 'FIG. 4'].map((figKey) => (
              <button
                key={figKey}
                onClick={() => onFigureSelect && onFigureSelect(figKey)}
                className={`px-1.5 py-0.5 text-[9px] font-black rounded-md transition-all ${
                  activeFigure?.toUpperCase() === figKey 
                    ? 'bg-blue-500 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-[var(--text-color)]'
                }`}
              >
                {figKey.replace('FIG. ', 'F')}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-[var(--border-color)] mx-1 hidden sm:block" />

          {/* Zoom Buttons */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
            <button
              onClick={handleZoomIn}
              className="p-1 text-[var(--text-color)] opacity-70 hover:opacity-100 hover:bg-white/40 dark:hover:bg-black/20 rounded transition-all"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-[var(--text-color)] opacity-70 hover:opacity-100 hover:bg-white/40 dark:hover:bg-black/20 rounded transition-all"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReset}
              className="p-1 text-[var(--text-color)] opacity-70 hover:opacity-100 hover:bg-white/40 dark:hover:bg-black/20 rounded transition-all"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Swap sides (for side-by-side mode) */}
          {!isFloatingPiP && onSwapSides && (
            <Tooltip content={diagramPosition === 'left' ? "Move Diagram to Right" : "Move Diagram to Left"}>
              <button
                onClick={onSwapSides}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <span className="text-[10px] font-black">{diagramPosition === 'left' ? '⇄ R' : '⇄ L'}</span>
              </button>
            </Tooltip>
          )}

          {/* Pop-Out to Picture-in-Picture */}
          {onTogglePiP && (
            <Tooltip content={isFloatingPiP ? "Dock back to Side-by-Side" : "Pop out to Floating Picture-in-Picture window"}>
              <button
                onClick={onTogglePiP}
                className={`p-1.5 rounded-lg transition-all ${
                  isFloatingPiP 
                    ? 'bg-blue-500 text-white' 
                    : 'text-slate-500 hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          {/* Lightbox / Fullscreen */}
          {onOpenLightbox && (
            <button
              onClick={() => onOpenLightbox(filename)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="Open full resolution lightbox"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Diagram Canvas Area with Smooth Transform */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`
          relative flex-1 w-full overflow-hidden bg-slate-900/5 dark:bg-black/20 flex items-center justify-center p-2
          ${scale > 1.0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        `}
      >
        <div 
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-500 ease-out"
          style={{
            transform: `scale(${scale}) translate(${pan.x}%, ${pan.y}%)`,
            transformOrigin: 'center center'
          }}
        >
          {/* Main Diagram Image */}
          <img 
            src={imageSrc} 
            alt={title || "Technical Schematic Diagram"}
            className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-lg border border-black/10 dark:border-white/10 pointer-events-none"
          />

          {/* Animated Spotlight Beacon Rectangle over Active Figure */}
          <AnimatePresence>
            {showBeacon && currentBeacon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute pointer-events-none rounded-xl border-2 border-blue-500 bg-blue-500/10 shadow-[0_0_25px_rgba(59,130,246,0.5)] z-20 flex items-start justify-end p-1.5"
                style={{
                  top: currentBeacon.top,
                  left: currentBeacon.left,
                  width: currentBeacon.width,
                  height: currentBeacon.height
                }}
              >
                <span className="flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-md animate-bounce">
                  <Check className="w-2.5 h-2.5" />
                  {activeFigure}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Pin / Save to Notebook Button */}
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
          <button
            onClick={handlePinToggle}
            className={`p-2 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center gap-1.5 text-xs font-bold ${
              isSaved 
                ? 'bg-duo-green text-white shadow-green-500/20' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
            }`}
            title={isSaved ? "Saved to Useful Info" : "Pin diagram to Useful Info"}
          >
            <Pin className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span className="text-[11px] hidden sm:inline">{isSaved ? 'Pinned' : 'Pin Info'}</span>
          </button>
        </div>

        {/* Drag Hint when Zoomed */}
        {scale > 1.2 && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 pointer-events-none opacity-80">
            <Move className="w-3 h-3" />
            <span>Drag to Pan • Wheel to Zoom</span>
          </div>
        )}
      </div>

      {/* Footer Info bar */}
      <div className="px-4 py-2 bg-slate-500/5 dark:bg-slate-800/30 border-t border-[var(--border-color)]/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="truncate max-w-[280px]">
          {title}
        </span>
        <span className="font-mono text-[10px] opacity-75">
          {Math.round(scale * 100)}% ZOOM
        </span>
      </div>
    </div>
  );
};
