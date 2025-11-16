"use client";

import ParticleEffect from "./ParticleEffect";
import styles from "./GradientBackground.module.css";

export default function GradientBackground() {
  return (
    <div className={styles.gradientBackground}>
      <div className={`${styles.gradientSphere} ${styles.sphere1}`}></div>
      <div className={`${styles.gradientSphere} ${styles.sphere2}`}></div>
      <div className={`${styles.gradientSphere} ${styles.sphere3}`}></div>
      <div className={styles.glow}></div>
      <div className={styles.gridOverlay}></div>
      <div className={styles.noiseOverlay}></div>
      <ParticleEffect />
    </div>
  );
}

