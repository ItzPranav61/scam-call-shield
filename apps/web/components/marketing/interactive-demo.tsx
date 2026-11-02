import { DemoWorkspace } from '../demo/demo-workspace';
import theme from './product-theme.module.css';
import styles from '../demo/interactive-demo.module.css';

export function InteractiveDemo() {
  return <section className={`${theme.theme} ${styles.section}`} aria-labelledby="interactive-demo-title">
    <div className={styles.inner}><header className={styles.header}><div><p className={styles.eyebrow}>Try it for yourself</p><h2 id="interactive-demo-title">A convincing conversation.<br />A different perspective.</h2></div><p>Follow a fictional call. Notice the pressure.<br />See why the next request deserves a pause.</p></header><DemoWorkspace /><p className={styles.disclaimer}>Scripted demo is a prepared preview. Live relay displays relay responses; microphone input requires consent and a configured relay. Synthetic testing only.</p></div>
  </section>;
}
