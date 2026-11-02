import { siteLinks } from '../../lib/site-links';
import { SocialLink } from '../social-links';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import { Brand } from './brand';
import { MobileNavigation } from './mobile-navigation';
import { marketingLinks } from './navigation';
import theme from '../marketing/product-theme.module.css';
import styles from './site-header.module.css';

export function SiteHeader() {
  return <header className={`${theme.theme} ${styles.header}`}>
    <a className={styles.skip} href="#hero-title">Skip to main content</a>
    <div className={styles.inner}><Brand />
      <nav className={styles.desktopLinks} aria-label="Main navigation">{marketingLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
      <SocialLink service="github" href={siteLinks.github} className={styles.githubLink} />
      <div className={styles.headerAction}><Button asChild size="sm"><a href="#interactive-demo-title">Try the demo</a></Button></div>
      <ThemeToggle /><MobileNavigation />
    </div>
  </header>;
}
