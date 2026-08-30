import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, ZoomOut, RotateCcw, Crosshair, Pin, 
  Maximize2, Sparkles, ExternalLink, Move, Check, ArrowLeftRight
} from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import type { UsefulInfoItem } from './HighlightsSidebar';

export interface FigureZone {
  scale: number;
  x: number; // percentage offset (-60 to 60)
  y: number; // percentage offset (-60 to 60)
  label: string;
  beacon: { top: string; left: string; width: string; height: string };
}

/**
 * Dynamically computes optimal zoom coordinates and spotlight beacon
 * for ANY figure number and ANY layout (1, 2 top/bottom, 3, 4, or 5+ grid).
 */
export function calculateDynamicFigureZone(figureKey: string, totalFigures: number = 4): FigureZone {
  if (!figureKey || figureKey === 'OVERVIEW') {
    return {
      scale: 1.0,
      x: 0,
      y: 0,
      label: 'Full Overview',
      beacon: { top: '0%', left: '0%', width: '100%', height: '100%' }
    };
  }

  // Extract number from key (e.g. "FIG. 5" -> 5, "Fig. 2b" -> 2)
  const match = figureKey.match(/\d+/);
  const figNum = match ? parseInt(match[0], 10) : 1;
  const isSubA = /a$/i.test(figureKey.trim());
  const isSubB = /b$/i.test(figureKey.trim());

  // --- Layout Case 1: Single Diagram ---
  if (totalFigures <= 1) {
    return {
      scale: 1.15,
      x: 0,
      y: 0,
      label: `FIG. ${figNum}`,
      beacon: { top: '4%', left: '4%', width: '92%', height: '92%' }
    };
  }

  // --- Layout Case 2: Exactly 2 Diagrams (Top & Bottom Layout) ---
  if (totalFigures === 2) {
    if (figNum === 1) {
      return {
        scale: 1.45,
        x: 0,
        y: 22,
        label: 'FIG. 1 (Top)',
        beacon: { top: '5%', left: '5%', width: '90%', height: '42%' }
      };
    } else {
      return {
        scale: 1.45,
        x: 0,
        y: -22,
        label: `FIG. ${figNum} (Bottom)`,
        beacon: { top: '50%', left: '5%', width: '90%', height: '44%' }
      };
    }
  }

  // --- Layout Case 3: Exactly 3 Diagrams ---
  if (totalFigures === 3) {
    if (figNum === 1) {
      return {
        scale: 1.45,
        x: 0,
        y: 24,
        label: 'FIG. 1 (Top)',
        beacon: { top: '5%', left: '5%', width: '90%', height: '36%' }
      };
    } else if (figNum === 2) {
      return {
        scale: 1.65,
        x: 16,
        y: -22,
        label: 'FIG. 2 (Bottom-Left)',
        beacon: { top: '48%', left: '4%', width: '45%', height: '46%' }
      };
    } else {
      return {
        scale: 1.65,
        x: -16,
        y: -22,
        label: `FIG. ${figNum} (Bottom-Right)`,
        beacon: { top: '48%', left: '51%', width: '45%', height: '46%' }
      };
    }
  }

  // --- Layout Case 4: Exactly 4 Diagrams ---
  if (totalFigures === 4) {
    if (figNum === 1) {
      return {
        scale: 1.45,
        x: isSubB ? -12 : (isSubA ? 12 : 0),
        y: 20,
        label: `FIG. ${figNum} (Top)`,
        beacon: { top: '5%', left: '5%', width: '90%', height: '32%' }
      };
    } else if (figNum === 2) {
      return {
        scale: 1.45,
        x: 0,
        y: -3,
        label: `FIG. ${figNum} (Middle)`,
        beacon: { top: '38%', left: '5%', width: '90%', height: '28%' }
      };
    } else if (figNum === 3) {
      return {
        scale: 1.65,
        x: 14,
        y: -24,
        label: `FIG. ${figNum} (Bottom-L)`,
        beacon: { top: '68%', left: '4%', width: '45%', height: '28%' }
      };
    } else {
      return {
        scale: 1.65,
        x: -14,
        y: -24,
        label: `FIG. ${figNum} (Bottom-R)`,
        beacon: { top: '68%', left: '51%', width: '45%', height: '28%' }
      };
    }
  }

  // --- Layout Case 5: 5 or More Figures (Dynamic 2-Column or 3-Column Matrix) ---
  const cols = totalFigures >= 7 ? 3 : 2;
  const rows = Math.ceil(totalFigures / cols);
  const zeroIndex = Math.min(figNum - 1, totalFigures - 1);
  const row = Math.floor(zeroIndex / cols);
  const col = zeroIndex % cols;

  // Calculate normalized coordinate offset for camera
  const normY = rows > 1 ? ((rows - 1) / 2 - row) / ((rows - 1) / 2) : 0;
  const normX = cols > 1 ? ((cols - 1) / 2 - col) / ((cols - 1) / 2) : 0;

  const yOffset = Math.round(normY * 26);
  const xOffset = Math.round(normX * 18);

  const cellWidth = Math.round(88 / cols);
  const cellHeight = Math.round(88 / rows);
  const cellLeft = Math.round(6 + col * (88 / cols));
  const cellTop = Math.round(6 + row * (88 / rows));

  return {
    scale: 1.75,
    x: xOffset,
    y: yOffset,
    label: `FIG. ${figNum}`,
    beacon: {
      top: `${cellTop}%`,
      left: `${cellLeft}%`,
      width: `${cellWidth}%`,
      height: `${cellHeight}%`
    }
  };
}

interface SmartDiagramViewerProps {
  imageSrc: string;
  filename: string;
  title: string;
  activeFigure: string | null;
  discoveredFigures?: string[];
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
  isScrolling?: boolean;
}

export const SmartDiagramViewer: React.FC<SmartDiagramViewerProps> = ({
  imageSrc,
  filename,
  title,
  activeFigure,
  discoveredFigures = ['FIG. 1', 'FIG. 2', 'FIG. 3', 'FIG. 4'],
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

  const totalFiguresCount = useMemo(() => {
    if (!discoveredFigures || discoveredFigures.length === 0) return 4;
    return Math.max(...discoveredFigures.map(f => {
      const m = f.match(/\d+/);
      return m ? parseInt(m[0], 10) : 1;
    }), discoveredFigures.length);
  }, [discoveredFigures]);

  // Sync camera when activeFigure changes
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

    const matchedZone = calculateDynamicFigureZone(activeFigure, totalFiguresCount);

    setScale(matchedZone.scale);
    setPan({ x: matchedZone.x, y: matchedZone.y });
    setLastTargetLabel(matchedZone.label);
    setShowBeacon(true);

    const timer = setTimeout(() => {
      setShowBeacon(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [activeFigure, isAutoSyncActive, totalFiguresCount]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.8));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.7));
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

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 5) {
      if (e.deltaY < 0) {
        setScale(prev => Math.min(prev + 0.15, 3.8));
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

  const activeBeacon = useMemo(() => {
    if (!activeFigure) return null;
    return calculateDynamicFigureZone(activeFigure, totalFiguresCount).beacon;
  }, [activeFigure, totalFiguresCount]);

  // Display quick jump chips for all figures discovered in the chapter
  const quickJumpFigures = useMemo(() => {
    if (discoveredFigures && discoveredFigures.length > 0) {
      return discoveredFigures.slice(0, 8); // Display up to 8 quick chips
    }
    return ['FIG. 1', 'FIG. 2', 'FIG. 3', 'FIG. 4'];
  }, [discoveredFigures]);

  return (
    <div 
      className={`
        flex flex-col h-full w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-xl overflow-hidden select-none transition-all
        ${className}
      `}
      style={{ minHeight: isFloatingPiP ? '320px' : '440px' }}
    >
      {/* Redesigned Compact Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-500/10 dark:bg-slate-800/60 border-b border-[var(--border-color)]/60 text-xs font-semibold">
        {/* Left: Target Badge & Sync Button */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="p-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Smart</span>
          </span>

          <Tooltip content="Current focus target in diagram">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60 text-[11px] font-bold text-[var(--text-color)] truncate max-w-[120px]">
              <Crosshair className={`w-3 h-3 shrink-0 ${activeFigure ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
              <span className="truncate">{lastTargetLabel}</span>
            </div>
          </Tooltip>

          {/* Auto-Sync Toggle Button */}
          <Tooltip content={isAutoSyncActive ? "Smart Auto-Tracking ON (glides as you read)" : "Smart Auto-Tracking OFF"}>
            <button
              onClick={onToggleAutoSync}
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 ${
                isAutoSyncActive 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{isAutoSyncActive ? 'SYNC' : 'MANUAL'}</span>
            </button>
          </Tooltip>
        </div>

        {/* Right: Dynamic Quick Fig Chips & View Controls */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {/* Dynamically generated Figure Jump Chips */}
          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-md p-0.5 overflow-x-auto max-w-[170px] no-scrollbar">
            {quickJumpFigures.map((figKey) => {
              const shortLabel = figKey.replace(/^(?:FIG|Fig|Figure)\.?\s*/i, 'F');
              const isActive = activeFigure?.toUpperCase().replace(/\s+/g, '') === figKey.toUpperCase().replace(/\s+/g, '');
              return (
                <button
                  key={figKey}
                  onClick={() => onFigureSelect && onFigureSelect(figKey)}
                  className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all shrink-0 ${
                    isActive 
                      ? 'bg-blue-500 text-white shadow-xs scale-105' 
                      : 'text-slate-500 hover:text-[var(--text-color)]'
                  }`}
                  title={`Focus on ${figKey}`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>

          <div className="h-3.5 w-[1px] bg-[var(--border-color)] mx-0.5" />

          {/* Zoom Buttons */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-md p-0.5">
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
                className="p-1 rounded-md text-slate-500 hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          {/* Pop-Out to Picture-in-Picture / Dock */}
          {onTogglePiP && (
            <Tooltip content={isFloatingPiP ? "Dock back to Side-by-Side" : "Pop out to Floating Picture-in-Picture window"}>
              <button
                onClick={onTogglePiP}
                className={`p-1 rounded-md transition-all ${
                  isFloatingPiP 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          {/* Fullscreen Lightbox */}
          {onOpenLightbox && (
            <button
              onClick={() => onOpenLightbox(filename)}
              className="p-1 rounded-md text-slate-500 hover:text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="Full resolution view"
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
          relative flex-1 w-full min-h-0 overflow-hidden bg-slate-900/5 dark:bg-black/30 flex items-center justify-center p-2
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
            className="max-w-full max-h-[64vh] object-contain rounded-xl shadow-md border border-black/10 dark:border-white/10 pointer-events-none"
          />

          {/* Animated Spotlight Beacon Rectangle over Active Figure */}
          <AnimatePresence>
            {showBeacon && activeBeacon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute pointer-events-none rounded-xl border-2 border-blue-500 bg-blue-500/10 shadow-[0_0_25px_rgba(59,130,246,0.5)] z-20 flex items-start justify-end p-1.5"
                style={{
                  top: activeBeacon.top,
                  left: activeBeacon.left,
                  width: activeBeacon.width,
                  height: activeBeacon.height
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
            className={`p-1.5 rounded-full shadow-md transition-all transform hover:scale-105 flex items-center gap-1 text-xs font-bold ${
              isSaved 
                ? 'bg-duo-green text-white shadow-green-500/20' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
            }`}
            title={isSaved ? "Saved to Useful Info" : "Pin diagram to Useful Info"}
          >
            <Pin className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span className="text-[10px] hidden sm:inline">{isSaved ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>

        {/* Drag Hint when Zoomed */}
        {scale > 1.15 && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 pointer-events-none opacity-80">
            <Move className="w-2.5 h-2.5" />
            <span>Pan / Zoom</span>
          </div>
        )}
      </div>

      {/* Footer Info bar */}
      <div className="px-3.5 py-1.5 bg-slate-500/5 dark:bg-slate-800/40 border-t border-[var(--border-color)]/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="truncate max-w-[240px]">
          {title}
        </span>
        <span className="font-mono text-[9px] opacity-80">
          {Math.round(scale * 100)}% ZOOM
        </span>
      </div>
    </div>
  );
};
