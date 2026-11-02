'use client';

import { Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetTitle, SheetDescription } from '../ui/sheet';
import { marketingLinks } from './navigation';
import theme from '../marketing/product-theme.module.css';
import styles from './site-header.module.css';

export function MobileNavigation() {
  return <div className={styles.mobile}><Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation"><Menu aria-hidden="true" /></Button></SheetTrigger>
    <SheetContent className={theme.theme}>
      <SheetTitle className="mt-6 text-xl font-semibold">Explore ScamCall Shield</SheetTitle>
      <SheetDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">A research prototype for synthetic scam-awareness examples.</SheetDescription>
      <nav aria-label="Mobile navigation" className={styles.mobileLinks}>{marketingLinks.map(link => <SheetClose key={link.href} asChild><a href={link.href}>{link.label}</a></SheetClose>)}</nav>
      <SheetClose asChild><a className={styles.mobileStart} href="#interactive-demo-title">Try the demo<small>Synthetic examples and consented prototype testing</small></a></SheetClose>
    </SheetContent>
  </Sheet></div>;
}
