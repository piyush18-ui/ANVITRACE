import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Video, AlertCircle } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc?: string;
  title?: string;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  videoSrc = '/demo-video.mp4',
  title = 'ANVITRACE — Platform Overview & Forensic Intelligence Demo',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  // Check if source is a YouTube or Vimeo URL
  const isYouTube = videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be');
  const isVimeo = videoSrc.includes('vimeo.com');

  const getEmbedUrl = (url: string) => {
    if (isYouTube) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0` : url;
    }
    if (isVimeo) {
      const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : url;
    }
    return url;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      setHasError(false);
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // Autoplay policy fallback
        });
      }
    } else {
      document.body.style.overflow = '';
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-zinc-100 tracking-tight">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close demo video"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container (16:9 Aspect Ratio) */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {isYouTube || isVimeo ? (
            <iframe
              src={getEmbedUrl(videoSrc)}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-amber-400">
                <Video className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-zinc-100 mb-1">
                Demo Video Awaiting Placement
              </h4>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Save or copy your video file as <code className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono">frontend/public/demo.mp4</code>. It will play automatically here once provided.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Target: /demo.mp4</span>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              onError={() => setHasError(true)}
              className="w-full h-full object-contain"
            >
              <source src={videoSrc} type="video/mp4" />
              <source src="/demo%20video/demo-video.mp4" type="video/mp4" />
              <source src="/demo-video.mp4" type="video/mp4" />
              Your browser does not support HTML5 video playback.
            </video>
          )}
        </div>

        {/* Modal Footer / Information Bar */}
        <div className="px-5 py-3 bg-zinc-900/40 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            <span>Air-Gapped Forensic Platform Walkthrough</span>
          </div>
          <span className="hidden sm:inline text-zinc-500 font-mono text-[11px]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">ESC</kbd> or click outside to close
          </span>
        </div>
      </div>
    </div>
  );
};
