import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Orb from '@site/src/components/Orb';
import styles from './index.module.css';

/**
 * The front page opens with the orb and one sentence, because that is the
 * whole product argument: you press it and you talk, and the ledger follows.
 * Everything else on this page is a route into the documentation.
 */

const ROUTES = [
  {
    to: '/docs/intro',
    eyebrow: 'Start here',
    title: 'What Split Tally is',
    body:
      'The thesis, the medieval tally stick it is named after, and a map of the rest of this site.',
  },
  {
    to: '/docs/how-it-works/ai-integration',
    eyebrow: 'The heart of it',
    title: 'How the AI works',
    body:
      'Thirteen client tools that write the real ledger, realtime transcription, and vision on a bank statement. Every model named.',
  },
  {
    to: '/docs/how-it-works/the-ledger',
    eyebrow: 'The trust',
    title: 'The ledger and the score',
    body:
      'How balances are computed, and why the Tally Score is arithmetic anybody can check rather than a number handed down.',
  },
  {
    to: '/docs/using-it/user-flows',
    eyebrow: 'See it',
    title: 'Every flow, step by step',
    body:
      'Recording an expense by talking, filling a form by voice, snapping a statement, selling what you are owed.',
  },
  {
    to: '/docs/project/quality',
    eyebrow: 'The finish',
    title: 'What testing found',
    body:
      'A mapped QA pass run by parallel browser agents, the blockers it caught, and the one finding that turned out to be wrong.',
  },
  {
    to: '/docs/judging-alignment',
    eyebrow: 'For the judges',
    title: 'Criterion by criterion',
    body:
      'AI Integration, Innovation and UX, Speed and Quality, Feasibility, each answered with something you can open and check.',
  },
];

export default function Home(): React.ReactElement {
  return (
    <Layout
      title="Finance without forms"
      description="Split Tally: a voice-native shared ledger with a market for what you are owed. Built for the AI Designathon @ MERGE 2026."
    >
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>AI Designathon @ MERGE 2026 · Design Eng</p>
            <h1 className={styles.title}>Finance without forms.</h1>
            <p className={styles.lead}>
              Split Tally is a shared ledger you talk to. Say what you spent and it is recorded,
              split and confirmed before you would have finished filling in the second field. When
              somebody owes you and you need the money now, you can sell that tally to a friend at
              a discount, which is what tally sticks were for in the first place.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} to="/docs/intro">
                Read the documentation
              </Link>
              <Link className={styles.secondary} to="https://split-tally-seven.vercel.app">
                Open the live app
              </Link>
            </div>
            <p className={styles.byline}>Built by Pablo Azevedo.</p>
          </div>

          <div className={styles.heroOrb}>
            <Orb size={260} />
            <p className={styles.orbCaption}>Press it, and say what you spent.</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          {ROUTES.map((route) => (
            <Link key={route.to} to={route.to} className={styles.card}>
              <p className={styles.cardEyebrow}>{route.eyebrow}</p>
              <h2 className={styles.cardTitle}>{route.title}</h2>
              <p className={styles.cardBody}>{route.body}</p>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
