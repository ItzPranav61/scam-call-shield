import type { ReactNode } from 'react';
import { siteLinks, type SiteLinks } from '../lib/site-links';
import { Button } from './ui/button';
import styles from './social-links.module.css';

const services = ['github', 'linkedin', 'x'] as const;
const labels = { github: 'GitHub', linkedin: 'LinkedIn', x: 'X' };
const icons: Record<keyof SiteLinks, ReactNode> = {
  github: <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.4-1.22.72-1.5-2.51-.29-5.15-1.26-5.15-5.6 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.16a10.8 10.8 0 0 1 5.63 0c2.15-1.46 3.1-1.16 3.1-1.16.61 1.55.23 2.7.11 2.98.72.79 1.16 1.8 1.16 3.03 0 4.35-2.65 5.31-5.17 5.59.41.36.77 1.05.77 2.12v3.07c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />,
  linkedin: <><circle cx="5" cy="5" r="2" /><path d="M3 9h4v12H3zM10 9h4v1.6c.7-1.2 1.8-1.9 3.3-1.9 3.1 0 3.7 2 3.7 4.7V21h-4v-6.7c0-1.4-.3-2.3-1.5-2.3-1.3 0-1.5 1-1.5 2.3V21h-4z" /></>,
  x: <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L.8 2h6.5l4.5 6.8L18.9 2ZM17.8 20h1.7L6.3 4H4.5l13.3 16Z" />,
};

export function SocialLink({ service, href, className = '' }: { service: keyof SiteLinks; href: string; className?: string | undefined }) {
  if (!href.trim()) return null;
  return <Button asChild variant="outline" size="sm" className={`${styles.link} ${className}`}>
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={service === 'x' ? 'ScamCall Shield creator on X (opens in a new tab)' : `${labels[service]} (opens in a new tab)`}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">{icons[service]}</svg>{labels[service]}
    </a>
  </Button>;
}

export function SocialLinks({ links = siteLinks }: { links?: SiteLinks }) {
  return <nav className={styles.row} aria-label="Social links">{services.map(service => <SocialLink key={service} service={service} href={links[service]} />)}</nav>;
}
