import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze, createDetectorState, SIGNAL_REASONS } from '../src/index.js';

describe('contextual live STT arrest spellings', () => {
  for (const context of ['Main police se bol raha hoon.', 'Main CBI se bol raha hoon.', 'Main officer bol raha hoon.']) {
    it.each(['rest karenge', 'rest kar denge', 'arrest', 'arrested'])(`${context} followed by %s`, (threat) => {
      const first = analyze(context, createDetectorState());
      const { result } = analyze(`Aapko ${threat}.`, first.state);
      expect(result.reasons).toContain(SIGNAL_REASONS.authority);
      expect(result.reasons).toContain(SIGNAL_REASONS.urgency);
      expect(result).toMatchObject({ level: 'danger', category: 'digital_arrest', warningCode: 'DIGITAL_ARREST' });
    });
  }
  it.each(['Police aapko rest karenge.', 'CBI aapko rest kar denge.', 'Officer says you will be arrested.'])(
    'recognizes context and threat in one segment: %s', (text) => {
      expect(analyze(text, createDetectorState()).result).toMatchObject({ level: 'danger', category: 'digital_arrest' });
    },
  );
  it.each(['take rest', 'take some rest', 'I need rest', 'rest karenge', 'rest kar denge', 'Police advise you to take some rest.'])(
    'does not treat ordinary or unanchored rest as an arrest threat: %s', (text) => {
      const { result } = analyze(text, createDetectorState());
      expect(result.level).toBe('safe');
      expect(result.category).not.toBe('digital_arrest');
      expect(result.reasons).not.toContain(SIGNAL_REASONS.urgency);
      expect(result.warningCode).toBeUndefined();
    },
  );
  it('does not use a bank claim as police context for the ambiguous rest spelling', () => {
    const bank = analyze('Main bank se bol raha hoon.', createDetectorState());
    const { result } = analyze('Aapko rest karenge.', bank.state);
    expect(result.level).toBe('safe');
    expect(result.category).not.toBe('digital_arrest');
    expect(result.reasons).not.toContain(SIGNAL_REASONS.urgency);
  });
  it.each(['You will not be arrested.', 'Aapko rest karenge nahi.', 'Aapko rest kar denge nahi.'])(
    'retains threat negation despite police context: %s', (text) => {
      const context = analyze('Main police se bol raha hoon.', createDetectorState());
      const { result } = analyze(text, context.state);
      expect(result.level).toBe('safe');
      expect(result.category).not.toBe('digital_arrest');
      expect(result.reasons).not.toContain(SIGNAL_REASONS.urgency);
    },
  );
  it('does not leak police context into another session or retain an earlier unanchored rest phrase', () => {
    const first = analyze('Main police se bol raha hoon.', createDetectorState());
    expect(analyze('rest karenge', first.state).result.category).toBe('digital_arrest');
    expect(analyze('rest karenge', createDetectorState()).result.level).toBe('safe');
    const unanchored = analyze('rest karenge', createDetectorState());
    expect(analyze('Main police se bol raha hoon.', unanchored.state).result.category).not.toBe('digital_arrest');
  });
});

describe('remaining observed request, secrecy and block variants', () => {
  it.each(['family ko mat batana', 'call per raho'])('recognizes secrecy: %s', (text) => {
    expect(analyze(text, createDetectorState()).result.reasons).toContain(SIGNAL_REASONS.secrecy);
  });
  it.each(['account block ho gaya', 'account block ho jaayega'])('recognizes account threat: %s', (text) => {
    expect(analyze(text, createDetectorState()).result.reasons).toContain(SIGNAL_REASONS.urgency);
  });
  it('recognizes abhi bataiye with OTP', () => {
    expect(analyze('apna otp abhi bataiye', createDetectorState()).result)
      .toMatchObject({ level: 'danger', category: 'kyc_otp', warningCode: 'SENSITIVE_REQUEST' });
  });
  it.each(['bank will never ask for otp', 'apna otp kisi ko mat bataiye', 'take some rest', 'I need rest'])(
    'keeps protective and benign text safe: %s', (text) => {
      expect(analyze(text, createDetectorState()).result).toMatchObject({ level: 'safe', score: 0 });
    },
  );
  it.each(['genuine-bank-alert', 'borderline-delivery'])('keeps the entire %s scenario safe', (name) => {
    const scenario = JSON.parse(readFileSync(new URL(`../../../data/scenarios/${name}.json`, import.meta.url), 'utf8')) as { segments: string[] };
    let state = createDetectorState();
    for (const segment of scenario.segments) {
      const step = analyze(segment, state);
      expect(step.result.level).toBe('safe');
      state = step.state;
    }
  });
});
