import { ShieldCheck } from 'lucide-react';
import styles from './site-header.module.css';

export function Brand() {
  return <a className={styles.brand} href="#hero-title" aria-label="ScamCall Shield home"><span className={styles.mark}><ShieldCheck aria-hidden="true" /></span><span>ScamCall<span className={styles.brandLight}> Shield</span></span></a>;
}
