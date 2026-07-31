import React from 'react';
import Orb from './Orb';
import styles from './AgentCard.module.css';

/**
 * One agent in the fleet that built this project.
 *
 * The orb on the left is the product's own, at a small size: the same shape a
 * person presses to talk stands for an agent here, because it is the same idea
 * in both places.
 */
export default function AgentCard({
  name,
  role,
  model,
  built,
  did,
  found,
}: {
  name: string;
  role: string;
  model?: string;
  built: React.ReactNode;
  did: React.ReactNode;
  found?: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.orb}>
        <Orb size={104} />
      </div>

      <div className={styles.text}>
        <p className={styles.role}>{role}</p>
        <h3 className={styles.name}>{name}</h3>
        {model && <p className={styles.model}>{model}</p>}

        <dl className={styles.rows}>
          <dt>How it was made</dt>
          <dd>{built}</dd>
          <dt>What it did</dt>
          <dd>{did}</dd>
          {found && (
            <>
              <dt>What it turned up</dt>
              <dd>{found}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
