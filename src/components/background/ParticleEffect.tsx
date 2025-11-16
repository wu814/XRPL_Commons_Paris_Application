"use client";

import { useEffect, useRef } from "react";
import styles from "./GradientBackground.module.css";

export default function ParticleEffect() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const particlesContainer = containerRef.current;
    if (!particlesContainer) return;

    const particleCount = 80;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      createParticle(particlesContainer);
    }

    // Mouse interaction handler
    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = (e.clientX / window.innerWidth) * 100;
      const mouseY = (e.clientY / window.innerHeight) * 100;

      // Create temporary particle at mouse position
      const particle = document.createElement("div");
      particle.className = styles.particle;

      const size = Math.random() * 4 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${mouseX}%`;
      particle.style.top = `${mouseY}%`;
      particle.style.opacity = "0.6";

      particlesContainer.appendChild(particle);

      // Animate outward
      setTimeout(() => {
        particle.style.transition = "all 2s ease-out";
        particle.style.left = `${mouseX + (Math.random() * 10 - 5)}%`;
        particle.style.top = `${mouseY + (Math.random() * 10 - 5)}%`;
        particle.style.opacity = "0";

        setTimeout(() => {
          particle.remove();
        }, 2000);
      }, 10);

      // Subtle movement of gradient spheres
      const spheres = document.querySelectorAll(`.${styles.gradientSphere}`);
      const moveX = (e.clientX / window.innerWidth - 0.5) * 5;
      const moveY = (e.clientY / window.innerHeight - 0.5) * 5;

      spheres.forEach((sphere) => {
        (sphere as HTMLElement).style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <div ref={containerRef} className={styles.particlesContainer} id="particles-container"></div>;
}

function createParticle(container: HTMLDivElement) {
  const particle = document.createElement("div");
  particle.className = styles.particle;

  const size = Math.random() * 3 + 1;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;

  resetParticle(particle);
  container.appendChild(particle);
  animateParticle(particle);
}

function resetParticle(particle: HTMLDivElement) {
  const posX = Math.random() * 100;
  const posY = Math.random() * 100;

  particle.style.left = `${posX}%`;
  particle.style.top = `${posY}%`;
  particle.style.opacity = "0";

  return { x: posX, y: posY };
}

function animateParticle(particle: HTMLDivElement) {
  const pos = resetParticle(particle);
  const duration = Math.random() * 10 + 10;
  const delay = Math.random() * 5;

  setTimeout(() => {
    particle.style.transition = `all ${duration}s linear`;
    particle.style.opacity = String(Math.random() * 0.3 + 0.1);

    const moveX = pos.x + (Math.random() * 20 - 10);
    const moveY = pos.y - Math.random() * 30;

    particle.style.left = `${moveX}%`;
    particle.style.top = `${moveY}%`;

    setTimeout(() => {
      animateParticle(particle);
    }, duration * 1000);
  }, delay * 1000);
}

