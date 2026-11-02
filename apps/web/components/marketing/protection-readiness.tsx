'use client';

import type { ReactElement } from 'react';
import { ShieldAlert, MicOff, ArrowRight } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import theme from './product-theme.module.css';

export function ProtectionReadiness({ children }: { children: ReactElement }) {
  return <Dialog><DialogTrigger asChild>{children}</DialogTrigger><DialogContent themeClassName={theme.theme} closeLabel="Close prototype information">
    <DialogHeader>
      <DialogTitle>Before you try the prototype</DialogTitle>
      <DialogDescription>This is a synthetic-testing prototype, not a real-call protection service.</DialogDescription>
    </DialogHeader>
    <div className="mt-6 flex flex-col gap-5">
      <Alert><AlertTitle><span className="flex items-center gap-2"><MicOff size={18} aria-hidden="true" />Microphone off</span></AlertTitle><AlertDescription>No audio is being captured. Opening this window does not request permission or start monitoring.</AlertDescription></Alert>
      <p className="text-sm leading-relaxed text-muted-foreground">Microphone testing requires explicit consent and Start in the live demo. Speak synthetic dialogue only. Browsers cannot intercept normal phone calls.</p>
      <Alert variant="warning"><AlertTitle><span className="flex items-center gap-2"><ShieldAlert size={18} aria-hidden="true" />Always keep private codes private</span></AlertTitle><AlertDescription>Do not share OTPs, passwords or UPI PINs. If a call feels suspicious, pause and independently contact the organisation.</AlertDescription></Alert>
      <DialogClose asChild><Button>Understood<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></DialogClose>
    </div>
  </DialogContent></Dialog>;
}
