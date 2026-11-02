import { LockKeyhole, MicOff } from 'lucide-react';
import { HeroActions } from './hero-actions';
import { HeroProductWindow } from './hero-product-window';
import theme from './product-theme.module.css';
import styles from './experimental-hero.module.css';

export function Hero() {
  return <section className={`${theme.theme} ${styles.hero}`} aria-labelledby="hero-title">
    <div className={styles.inner}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}><span aria-hidden="true" />A little clarity. Before the next request.</p>
        <h1 id="hero-title" tabIndex={-1}>Explore the signs.<br />Practise when to pause.</h1>
        <p className={styles.description}>A calmer way to recognise a suspicious call.<br />See the conversation. Understand the pressure. Know when to pause.</p>
        <p className={styles.status}>Research prototype. Synthetic examples only; not for real calls.</p>
        <div id="start-protection" className={styles.actions}><HeroActions /></div>
        <div className={styles.assurances}><span><MicOff size={14} aria-hidden="true" />No microphone needed for the demo</span><span><LockKeyhole size={14} aria-hidden="true" />Your private codes stay private</span></div>
      </header>
      <HeroProductWindow />
      <p className={styles.note}>Built for speakerphone conversations. Live transcription and Hindi / Hinglish support require a verified service configuration.<br />Browsers cannot intercept cellular calls. Indicators never guarantee safety.</p>
    </div>
  </section>;
}
