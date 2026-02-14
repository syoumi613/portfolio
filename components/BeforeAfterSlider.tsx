'use client';

import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { motion, useMotionValue, useMotionTemplate, animate, transform } from 'framer-motion';

interface BeforeAfterSliderProps {
    beforeUrl: string;
    afterUrl: string;
}

export default function BeforeAfterSlider({ beforeUrl, afterUrl }: BeforeAfterSliderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Initial position 0 (Fully visible Before image)
    const x = useMotionValue(0);

    // Dynamic styles based on motion value
    const clipPath = useMotionTemplate`inset(0 0 0 ${x}%)`;
    const leftPos = useMotionTemplate`${x}%`;

    useEffect(() => {
        // Auto-slide demo on mount: 0 -> 50%
        const controls = animate(x, 50, {
            delay: 0.5,
            type: "spring",
            stiffness: 100,
            damping: 20
        });

        return () => controls.stop();
    }, [x]);

    const handleMove = (clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Calculate percentage (0 to 100)
        // x represents the percentage cut from the RIGHT.
        // So 0 means full image (inset 0 0 0 0 is wrong? Wait.)
        // Original logic: clipPath: `inset(0 0 0 ${sliderPosition}%)`
        // If sliderPosition is 50%, we cut 50% from the right? No, inset top right bottom left.
        // inset(0 0 0 50%) means cut 50% from the LEFT.
        // So the AFTER image is cut 50% from the left, revealing the BEFORE image on the left?
        // Let's re-verify the original logic.
        // Original: style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
        // Absolute Background: Before Image.
        // Absolute Foreground: After Image, with clipPath.
        // If slider is at 10% (left), clipPath inset left 10%. 
        // Then After Image starts at 10%. Before Image is visible 0-10%.
        // Wait, if I want Before on Left and After on Right...
        // If I use inset(0 0 0 X%), I am clipping X% from the left of the After image.
        // So the After image is visible from X% to 100%.
        // That means the LEFT side (0-X%) shows the background (Before).
        // Correct.

        const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (offsetX / rect.width) * 100;

        x.set(percentage);
        if (!hasInteracted) setHasInteracted(true);
    };

    const handleMouseDown = () => {
        setIsDragging(true);
        if (!hasInteracted) setHasInteracted(true);
    };
    const handleTouchStart = () => {
        setIsDragging(true);
        if (!hasInteracted) setHasInteracted(true);
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            handleMove(e.clientX);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            e.preventDefault(); // Prevent scrolling while dragging
            handleMove(e.touches[0].clientX);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]);

    const handleTrackClick = (e: React.MouseEvent) => {
        handleMove(e.clientX);
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full select-none overflow-hidden cursor-crosshair group touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={handleTrackClick}
        >
            {/* Background Image (Before - Left - Darker/Raw) */}
            <div className="absolute inset-0 w-full h-full">
                <img
                    src={beforeUrl}
                    alt="Before"
                    className="w-full h-full object-cover grayscale-[0%] filter brightness-90"
                    draggable={false}
                />
                <span className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none z-10 font-medium tracking-wider">
                    BEFORE
                </span>
            </div>

            {/* Foreground Image (After - Right - Edit) - Clipped */}
            <motion.div
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ clipPath }}
            >
                <img
                    src={afterUrl}
                    alt="After"
                    className="w-full h-full object-cover"
                    draggable={false}
                />
                <span className="absolute top-4 right-4 bg-blue-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none z-10 font-medium tracking-wider">
                    AFTER
                </span>
            </motion.div>

            {/* Slider Handle */}
            <motion.div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20"
                style={{ left: leftPos }}
                whileHover={{ scaleX: 1.5 }}
                whileTap={{ scaleX: 1.5 }}
            >
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600"
                    animate={hasInteracted ? {} : {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                        ]
                    }}
                    transition={hasInteracted ? {} : {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <GripVertical className="w-4 h-4" />
                </motion.div>
            </motion.div>
        </div>
    );
}
