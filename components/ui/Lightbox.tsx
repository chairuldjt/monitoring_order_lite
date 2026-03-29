'use client';

import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
    images: string[];
    initialIndex: number;
    onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') {
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            }
            if (e.key === 'ArrowRight') {
                setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length, onClose]);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-fade-in p-4"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50"
            >
                <X className="w-6 h-6" />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 sm:left-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50 border border-white/10"
                    >
                        <ChevronLeft className="w-7 h-7" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 sm:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50 border border-white/10"
                    >
                        <ChevronRight className="w-7 h-7" />
                    </button>
                </>
            )}

            <div
                className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={images[currentIndex]}
                    alt={`Dokumentasi ${currentIndex + 1}`}
                    className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-scale-in"
                />

                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-1 bg-white/10 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/10">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>

            {images.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto pb-2 no-scrollbar">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(idx);
                            }}
                            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${currentIndex === idx ? 'border-indigo-400 scale-110 shadow-lg shadow-indigo-500/20' : 'border-transparent opacity-40 hover:opacity-100'
                                }`}
                        >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
