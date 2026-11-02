'use client';

import { Play, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { ScamSimulator } from '../scam-simulator';
import theme from './product-theme.module.css';
import styles from './hero.module.css';

export function HeroActions() {
  return <div className={styles.actions}>
    <Button asChild size="lg"><a href="#interactive-demo-title">Try the demo<ArrowRight data-icon="inline-end" aria-hidden="true" /></a></Button>
    <ScamSimulator onOpen={() => {}} themeClassName={theme.theme}><Button id="interactive-demo" variant="outline" size="lg"><Play data-icon="inline-start" aria-hidden="true" />Try Interactive Demo</Button></ScamSimulator>
  </div>;
}
