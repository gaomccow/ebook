import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Pin, PinOff, RotateCcw, Hand } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  imageSrc: string;
  imageFilename: string;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (customTitle: string) => void;
  language: string;
  savedTitle?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  imageSrc,
  imageFilename,
  onClose,
  isSaved,
  onToggleSave,
  language,
  savedTitle = ''
}) => {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      x.set(0);
      y.set(0);
      setCustomTitle(savedTitle || imageFilename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    }
  }, [isOpen, imageFilename, savedTitle]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setScale(prev => {
      const next = Math.min(prev + 0.25, 4);
      return Math.round(next * 100) / 100;
    });
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) {
        x.set(0);
        y.set(0);
      }
      return Math.round(next * 100) / 100;
    });
  };

  const handleReset = () => {
    setScale(1);
    x.set(0);
    y.set(0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale(prev => {
        const next = Math.min(prev + 0.1, 4);
        return Math.round(next * 100) / 100;
      });
    } else {
      setScale(prev => {
        const next = Math.max(prev - 0.1, 0.5);
        if (next <= 1) {
          x.set(0);
          y.set(0);
        }
        return Math.round(next * 100) / 100;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md select-none justify-between p-4">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between w-full p-2 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 text-white shrink-0">
        <div className="flex flex-col gap-0.5 px-2">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-white/30 focus:border-duo-green focus:outline-none text-sm font-bold text-white py-0.5 max-w-[240px] md:max-w-md truncate"
            title="Click to rename"
            placeholder="Name this reference..."
          />
          <span className="text-[10px] text-gray-400 font-mono">{imageFilename}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-0.5 border border-white/5 mr-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 font-bold min-w-[36px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {(scale !== 1) && (
              <button
                onClick={handleReset}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pin to Useful Info */}
          <button
            onClick={() => onToggleSave(customTitle)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2
              ${isSaved
                ? 'bg-duo-green border-duo-green-dark text-white shadow-[0_2.5px_0_0_#499914]'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }
            `}
          >
            {isSaved ? (
              <>
                <PinOff className="w-3.5 h-3.5 fill-current" />
                <span>{language === 'vi' ? 'Bỏ lưu' : 'Unpin'}</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Lưu' : 'Pin Useful Info'}</span>
              </>
            )}
          </button>

          {/* Close Lightbox */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors ml-2"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Main Zoomable Image Canvas */}
      <div 
        ref={constraintsRef}
        className={`flex-1 w-full flex items-center justify-center overflow-hidden relative cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        onWheel={handleWheel}
      >
        {scale > 1 && (
          <div className="absolute top-4 left-4 z-10 bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 font-bold pointer-events-none">
            <Hand className="w-3 h-3" />
            <span>Drag image to pan / Scroll to zoom</span>
          </div>
        )}
        <motion.div
          drag={scale > 1}
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={true}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          style={{ x, y, scale }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="flex items-center justify-center relative"
        >
          <img
            src={imageSrc}
            alt="Reference map or picture"
            className="max-w-[95vw] max-h-[75vh] rounded-lg shadow-2xl border border-white/10 select-none pointer-events-none object-contain"
          />
        </motion.div>
      </div>

      {/* Footer hint */}
      <div className="text-center py-2 text-[10px] text-gray-500 shrink-0">
        {language === 'vi' 
          ? 'Kéo bằng chuột để di chuyển • Sử dụng bánh xe cuộn để phóng to/thu nhỏ'
          : 'Drag image to explore • Use scroll wheel or trackpad to zoom in/out'}
      </div>
    </div>
  );
};
