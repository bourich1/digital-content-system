import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Download, Share2, Twitter, Facebook, Instagram } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';

interface QuoteShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteArabic: string;
  quoteEnglish: string;
  source: string;
}

const CARD_STYLES = [
  {
    name: 'Brown',
    bg: 'linear-gradient(180deg, #3b1a06 0%, #78350f 40%, #92400e 100%)',
    dot: '#78350f',
  },
  {
    name: 'Navy',
    bg: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
    dot: '#1e1b4b',
  },
  {
    name: 'Emerald',
    bg: 'linear-gradient(180deg, #022c22 0%, #064e3b 40%, #047857 100%)',
    dot: '#064e3b',
  },
  {
    name: 'Rose',
    bg: 'linear-gradient(180deg, #3b0717 0%, #881337 40%, #9f1239 100%)',
    dot: '#881337',
  },
];

export const QuoteShareModal = ({
  isOpen,
  onClose,
  quoteArabic,
  quoteEnglish,
  source,
}: QuoteShareModalProps) => {
  const [selectedStyle, setSelectedStyle] = useState(CARD_STYLES[0]);
  const [layout, setLayout] = useState<'post' | 'story'>('post');
  const cardRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleCopyText = async () => {
    const text = `${quoteArabic}\n\n"${quoteEnglish}"\n\n— ${source}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Quote copied to clipboard!');
    } catch {
      toast.error('Failed to copy text.');
    }
  };

  // Generate image at the correct export dimensions without affecting the visible DOM
  const generateImage = async (): Promise<string> => {
    if (!exportRef.current) throw new Error('No card');
    
    // We capture the dedicated hidden export container which is already sized 1080x1080 or 1080x1920
    const dataUrl = await toPng(exportRef.current, {
      quality: 1,
      pixelRatio: 1, // Already rendering at 1080px width, no need to up-scale
    });

    return dataUrl;
  };

  const handleSaveImage = async () => {
    try {
      toast.loading('Generating image...', { id: 'save-image' });
      const dataUrl = await generateImage();
      const link = document.createElement('a');
      link.download = `quote-${layout}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Image saved successfully!', { id: 'save-image' });
    } catch {
      toast.error('Failed to save image.', { id: 'save-image' });
    }
  };

  const handleShare = async () => {
    try {
      toast.loading('Preparing image...', { id: 'share-image' });
      const dataUrl = await generateImage();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'quote.png', { type: 'image/png' });
      toast.dismiss('share-image');

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Quote', files: [file] });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `quote-${layout}-${Date.now()}.png`;
        link.click();
        toast.success('Image downloaded!');
      }
    } catch (err) {
      toast.dismiss('share-image');
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share.');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-[580px] rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── TOP: Quote Preview (Gradient Dark) ─── */}
            <div
              ref={cardRef}
              className="relative flex flex-col items-center justify-center text-center px-8 pt-12 pb-10"
              style={{ background: selectedStyle.bg, minHeight: '420px' }}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Quote Icon */}
              <svg width="56" height="56" viewBox="0 0 48 48" fill="none" className="mb-10 opacity-90">
                <path d="M10 28C10 22 14 16 22 14L23 17C18 18.5 16 22 16 24H20C21.1 24 22 24.9 22 26V34C22 35.1 21.1 36 20 36H12C10.9 36 10 35.1 10 34V28Z" fill="white"/>
                <path d="M26 28C26 22 30 16 38 14L39 17C34 18.5 32 22 32 24H36C37.1 24 38 24.9 38 26V34C38 35.1 37.1 36 36 36H28C26.9 36 26 35.1 26 34V28Z" fill="white"/>
              </svg>

              {/* Arabic Text */}
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-relaxed"
                dir="rtl"
                style={{ fontFamily: "'Amiri', 'Noto Sans Arabic', serif" }}
              >
                {quoteArabic}
              </h2>

              {/* English Translation */}
              <p className="text-white/70 italic text-sm sm:text-base mb-8 max-w-[90%]">
                "{quoteEnglish}"
              </p>

              {/* Source */}
              <p
                className="text-base font-semibold text-white/60 mb-6"
                dir="rtl"
              >
                — {source}
              </p>

              {/* Logo */}
              <div className="absolute bottom-6 left-0 w-full flex justify-center">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-7 object-contain brightness-0 invert opacity-40"
                />
              </div>
            </div>

            {/* ─── BOTTOM: Controls (White) ─── */}
            <div className="bg-white px-8 py-7 flex flex-col gap-6">
              {/* Layout Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500">Size</span>
                <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
                  <button
                    onClick={() => setLayout('post')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      layout === 'post' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    Post
                  </button>
                  <button
                    onClick={() => setLayout('story')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      layout === 'story' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    Story
                  </button>
                </div>
              </div>

              {/* Card Style */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500">Card Style</span>
                <div className="flex items-center gap-3">
                  {CARD_STYLES.map((style) => (
                    <button
                      key={style.name}
                      onClick={() => setSelectedStyle(style)}
                      className={`w-11 h-11 rounded-full transition-all duration-200 ${
                        selectedStyle.name === style.name
                          ? 'ring-[3px] ring-offset-2 ring-blue-500 scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: style.dot }}
                      title={style.name}
                      aria-label={`Select ${style.name} style`}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border-2 border-zinc-200 text-zinc-600 font-bold text-sm hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  <Copy className="w-[18px] h-[18px]" />
                  Copy Text
                </button>
                <button
                  onClick={handleSaveImage}
                  className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/25"
                >
                  <Download className="w-[18px] h-[18px]" />
                  Save Image
                </button>
              </div>

              {/* Social Row */}
              <div className="flex items-center justify-center gap-5 pt-3 border-t border-zinc-100">
                <button
                  onClick={handleShare}
                  className="w-11 h-11 rounded-full border border-zinc-200 flex items-center justify-center text-sky-400 hover:bg-sky-50 hover:border-sky-200 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="w-11 h-11 rounded-full border border-zinc-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="w-11 h-11 rounded-full border border-zinc-200 flex items-center justify-center text-pink-500 hover:bg-pink-50 hover:border-pink-200 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="w-11 h-11 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── EXPORT CONTAINER (Visually Hidden but perfectly sized for toPng) ─── */}
      <div className="fixed top-0 left-0 -z-50 pointer-events-none opacity-0">
        <div
          ref={exportRef}
          className="relative flex flex-col items-center justify-center text-center p-20"
          style={{ 
            background: selectedStyle.bg, 
            width: '1080px', 
            height: layout === 'story' ? '1920px' : '1080px' 
          }}
        >
          {/* Quote Icon */}
          <svg width="120" height="120" viewBox="0 0 48 48" fill="none" className="mb-16 opacity-90">
            <path d="M10 28C10 22 14 16 22 14L23 17C18 18.5 16 22 16 24H20C21.1 24 22 24.9 22 26V34C22 35.1 21.1 36 20 36H12C10.9 36 10 35.1 10 34V28Z" fill="white"/>
            <path d="M26 28C26 22 30 16 38 14L39 17C34 18.5 32 22 32 24H36C37.1 24 38 24.9 38 26V34C38 35.1 37.1 36 36 36H28C26.9 36 26 35.1 26 34V28Z" fill="white"/>
          </svg>

          {/* Arabic Text */}
          <h2
            className="text-7xl font-bold text-white mb-10 leading-relaxed max-w-[900px]"
            dir="rtl"
            style={{ fontFamily: "'Amiri', 'Noto Sans Arabic', serif" }}
          >
            {quoteArabic}
          </h2>

          {/* English Translation */}
          <p className="text-white/70 italic text-4xl mb-12 max-w-[850px] leading-relaxed">
            "{quoteEnglish}"
          </p>

          {/* Source */}
          <p
            className="text-3xl font-semibold text-white/60 mb-20"
            dir="rtl"
          >
            — {source}
          </p>

          {/* Logo (Pinned exactly to the bottom center) */}
          <div className={`absolute left-0 w-full flex justify-center ${layout === 'story' ? 'bottom-32' : 'bottom-16'}`}>
            <img
              src="/logo.png"
              alt="Logo"
              className="h-14 object-contain brightness-0 invert opacity-50"
            />
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
