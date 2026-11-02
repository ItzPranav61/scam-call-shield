import { isRecordMode } from '../lib/record-mode';
import { RecordingDemo } from '../components/demo/recording-demo';
import { Hero } from '../components/hero';
import { HowItWorks } from '../components/how-it-works';
import { ScamScenarios } from '../components/scam-scenarios';
import { PrototypeScope } from '../components/prototype-scope';
import { FAQ } from '../components/faq';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/layout/site-header';
import { Features } from '../components/marketing/features';
import { InteractiveDemo } from '../components/marketing/interactive-demo';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isRecordMode(await searchParams)) return <RecordingDemo />;
  return <><SiteHeader /><main><Hero /><HowItWorks /><Features /><InteractiveDemo /><PrototypeScope /><ScamScenarios /><FAQ /></main><SiteFooter /></>;
}
