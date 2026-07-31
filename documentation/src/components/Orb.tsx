import React from 'react';
import styles from './Orb.module.css';

/**
 * The product's own orb, rebuilt for the documentation homepage.
 *
 * Same construction as `components/ink/Orb.tsx` in the application: a stack of
 * blurred conic and radial gradients drifting at different speeds behind a
 * glass gloss, clipped to a circle. It is the one piece of the interface a
 * reader will recognise instantly, so the front page opens with it rather than
 * with a screenshot of it.
 */
export default function Orb({size = 220}: {size?: number}) {
  return (
    <div
      className={styles.shell}
      style={{'--orb-size': `${size}px`} as React.CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.body}>
        <span className={`${styles.aurora} ${styles.a1}`} />
        <span className={`${styles.aurora} ${styles.a2}`} />
        <span className={`${styles.aurora} ${styles.a3}`} />
        <span className={`${styles.aurora} ${styles.a4}`} />
        <span className={styles.gloss} />
      </div>
    </div>
  );
}
