'use client';

import React, { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  className?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Darker background to match the gradient
      ctx.fillStyle = 'rgba(20, 46, 85, 0.06)';
      ctx.fillRect(0, 0, width, height);

      const lineCount = 100;
      const points = 200;

      for (let i = 0; i < lineCount; i++) {
        // Green → Teal → Blue gradient (120 → 180 → 220)
        const progress = i / lineCount;
        let hue;
        if (progress <= 0.5) {
          // First half: green to teal
          hue = 120 + (progress / 0.5) * 60; // 120 → 180
        } else {
          // Second half: teal to blue
          hue = 180 + ((progress - 0.5) / 0.5) * 40; // 180 → 220
        }
        
        ctx.beginPath();
        
        for (let j = 0; j < points; j++) {
          const x = (j / points) * width;
          const baseY = height * 0.5;
          
          const wave1 = Math.sin((x * 0.005) + time + (i * 0.1)) * (80 + i * 2);
          const wave2 = Math.sin((x * 0.003) - time * 0.5 + (i * 0.05)) * 50;
          const wave3 = Math.sin((x * 0.008) + time * 1.5 + (i * 0.15)) * 30;
          
          const y = baseY + wave1 + wave2 + wave3 + (i * 0.5 - 25);
          
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        // Brighter, more saturated colors
        const alpha = 0.06 + (Math.sin(time + i * 0.1) * 0.04);
        const lightness = 55 + (progress * 10); // Slightly lighter as it progresses
        ctx.strokeStyle = `hsla(${hue}, 85%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      time += 0.01;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  );
};

export default AnimatedBackground;
