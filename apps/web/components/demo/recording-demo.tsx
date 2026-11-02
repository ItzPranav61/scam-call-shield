import { DemoWorkspace } from './demo-workspace';
import theme from '../marketing/product-theme.module.css';
import styles from './recording-demo.module.css';

export function RecordingDemo() {
  return <main className={`${theme.theme} ${styles.capture}`} aria-label="Synthetic demo recording workspace">
    <h1 id="interactive-demo-title" tabIndex={-1} className={styles.hiddenTitle}>Scam-Call Shield synthetic demo</h1>
    <DemoWorkspace recording />
  </main>;
}
