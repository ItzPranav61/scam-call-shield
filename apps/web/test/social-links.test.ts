import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SocialLinks } from '../components/social-links';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/layout/site-header';
import { LiveRelayDemo } from '../components/demo/live-relay-demo';
import { siteLinks, readmeLink } from '../lib/site-links';

const anchors = (html: string) => html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
afterEach(() => vi.unstubAllEnvs());

describe('public social links', () => {
  it('renders all configured links as safe, labelled external anchors', () => {
    const links = siteLinks;
    expect(links.x).toBe('https://x.com/PSawant610');
    const html = renderToStaticMarkup(createElement(SocialLinks, { links }));
    const rendered = anchors(html);
    expect(rendered).toHaveLength(3);
    for (const [index, label] of ['GitHub', 'LinkedIn', 'X'].entries()) {
      const link = rendered[index]!;
      expect(link).toContain(`href="${Object.values(links)[index]}"`);
      expect(link).toContain('target="_blank"');
      expect(link).toContain('rel="noopener noreferrer"');
      expect(link).toContain(`aria-label="${label === 'X' ? 'ScamCall Shield creator on X' : label} (opens in a new tab)"`);
      expect(link).toContain('aria-hidden="true"');
      expect(link).toContain(`${label}</a>`);
    }
  });
  it('omits an empty X link without placeholders', () => {
    const html = renderToStaticMarkup(createElement(SocialLinks, { links: { ...siteLinks, x: '' } }));
    expect(anchors(html)).toHaveLength(2);
    expect(html).not.toContain('x.com');
    expect(html).not.toContain('YOUR_X_HANDLE');
  });
  it.each(['github', 'linkedin', 'x'] as const)('omits any empty value: %s', service => {
    const links = { github: '', linkedin: '', x: '', [service]: ' ' };
    expect(anchors(renderToStaticMarkup(createElement(SocialLinks, { links })))).toHaveLength(0);
  });
  it('uses the supplied destinations, with shared GitHub link in header and footer', () => {
    expect(siteLinks.github).toBe('https://github.com/ItzPranav61/scam-call-shield');
    expect(siteLinks.linkedin).toBe('https://www.linkedin.com/in/pranav-sawant-1061a63a5');
    for (const component of [SiteHeader, SiteFooter]) {
      const html = renderToStaticMarkup(createElement(component));
      const github = anchors(html).find(link => link.includes(`href="${siteLinks.github}"`));
      expect(github).toContain('target="_blank"');
      expect(github).toContain('rel="noopener noreferrer"');
    }
    expect(renderToStaticMarkup(createElement(SiteFooter))).toContain('Built by Pranav and Vedant');
  });
  it('links only README in the unchanged hosted notice', () => {
    vi.stubEnv('NEXT_PUBLIC_RELAY_URL', '');
    const html = renderToStaticMarkup(createElement(LiveRelayDemo));
    expect(readmeLink).toBe('https://github.com/ItzPranav61/scam-call-shield#readme');
    const link = anchors(html)[0]!;
    expect(link).toContain(`href="${readmeLink}"`);
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
    expect(link).toContain('>README</a>');
  });
});
