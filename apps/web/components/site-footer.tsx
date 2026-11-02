import { ArrowUpRight, ArrowUp, ShieldCheck, MicOff, LockKeyhole } from 'lucide-react';
import { SocialLinks } from './social-links';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import theme from './marketing/product-theme.module.css';
import styles from './site-footer.module.css';

const links = [
  { label: 'How It Works', href: '#how-it-works-title' },
  { label: 'Features', href: '#features-title' },
  { label: 'Interactive Demo', href: '#interactive-demo-title' },
  { label: 'Privacy & Safety', href: '#prototype-scope-title' },
  { label: 'Scam Scenarios', href: '#scam-scenarios-title' },
  { label: 'FAQ', href: '#faq-title' },
] as const;

export function SiteFooter() {
  return <footer className={`${theme.theme} ${styles.footer}`}>
    <div className={styles.inner}>
      <div className={styles.main}>
        <div className={styles.identity}>
          <a className={styles.brand} href="#hero-title" aria-label="ScamCall Shield home"><span className={styles.mark}><ShieldCheck size={23} aria-hidden="true" /></span>ScamCall Shield</a>
          <p>A call safety assistant prototype that helps you understand potential scam signals and decide when to pause.</p>
          <Button asChild className={styles.demoAction}><a href="#interactive-demo-title">Try the scripted demo<ArrowUpRight data-icon="inline-end" aria-hidden="true" /></a></Button>
        </div>
        <nav className={styles.navigation} aria-label="Footer navigation">
          <h2>Explore</h2>
          <ul>{links.map(link => <li key={link.href}><a href={link.href}>{link.label}</a></li>)}</ul>
        </nav>
        <div className={styles.project}>
          <h2>About this project</h2>
          <p>Built for the Gnani AI Great Indian AI Internship Challenge.</p>
          <p className={styles.attribution}>Independent project. No partnership or endorsement implied.</p>
          <p className={styles.sourceNote}><LockKeyhole size={14} aria-hidden="true" />Source code is maintained in a private GitHub repository.</p>
        </div>
      </div>
      <div className={styles.socialRow}><p>Built by Pranav and Vedant</p><SocialLinks /></div>
      <div className={styles.status}>
        <div><div className={styles.badges}><Badge variant="outline">Research prototype</Badge><Badge variant="secondary"><MicOff data-icon="inline-start" aria-hidden="true" />Microphone off</Badge></div><p>Scripted demo available. Live microphone monitoring is not connected.</p></div>
        <p className={styles.limit}>Scam indicators can be incomplete.<br />No warning does not guarantee a safe call.</p>
      </div>
      <div className={styles.bottom}><p>Keep OTPs, passwords and UPI PINs private.</p><Button asChild variant="ghost"><a href="#hero-title">Back to top<ArrowUp data-icon="inline-end" aria-hidden="true" /></a></Button></div>
    </div>
  </footer>;
}
