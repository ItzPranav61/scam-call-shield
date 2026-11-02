/** Public links only. Leave a value empty to omit it from the site. */
export interface SiteLinks { github: string; linkedin: string; x: string }
export const siteLinks: SiteLinks = {
  github: 'https://github.com/ItzPranav61/scam-call-shield',
  linkedin: 'https://www.linkedin.com/in/pranav-sawant-1061a63a5',
  x: 'https://x.com/PSawant610',
};
export const readmeLink = siteLinks.github ? `${siteLinks.github}#readme` : '';
