import { describe, expect, it } from 'vitest';
import { analyze, createDetectorState, SIGNAL_REASONS } from '../src/index.js';

const threats = ['arrest ho jaaoge', 'arrest ho jaoge', 'arrest ho jayega', 'arrest ho jaayenge',
  'arrest kar liya jayega', 'aapke khilaf warrant hai', 'aapke naam par case darj hai',
  'aapke naam par ek case hai', 'aapke naam per ek case hai'];
const authorities = ['CBI', 'ED', 'police', 'customs', 'cyber crime'];
const genuine = [
  'police verification ke liye aapko thana aana hai, koi paisa nahi dena',
  'main courier company se hoon, aapka parcel kal aayega',
  'aapka bank statement ready hai, branch se collect kar lijiye',
  'kisi bhi case mein apna OTP share mat kijiye',
];

describe('human digital-arrest speech regressions', () => {
  it('recognizes the RBI / case / conditional-payment session without suppressing the consequence', () => {
    let state = createDetectorState();
    for (const text of ['mein rbi se bol raha hoon', 'yeah', 'aapke naam per ek case hai',
      'abhi payment nahi kiya toh arrest ho jaaoge']) {
      const step = analyze(text, state);
      expect(step.result.score).toBeGreaterThanOrEqual(state.score);
      state = step.state;
    }
    expect(state.level).toBe('danger');
    expect(state.signalGroups).toEqual(expect.arrayContaining(['authority', 'urgency', 'money']));
    expect(analyze('yeah', state).result).toMatchObject({ level: 'danger', category: 'digital_arrest', warningCode: 'DIGITAL_ARREST' });
  });
  it.each(threats)('combines the RBI claim with the legal threat: %s', threat => {
    const first = analyze('mein rbi se bol raha hoon', createDetectorState());
    const second = analyze(threat, first.state);
    expect(['caution', 'danger']).toContain(second.result.level);
    expect(second.result.reasons).toContain(SIGNAL_REASONS.urgency);
    const third = analyze('payment nahi kiya toh account block ho jayega', second.state);
    expect(third.result.level).toBe('danger');
    expect(third.result.reasons).toContain(SIGNAL_REASONS.money);
    expect(analyze('Never share your OTP.', third.state).result.level).toBe('danger');
  });
  it.each(authorities)('recognizes the authority claim and subsequent threats: %s', authority => {
    const first = analyze(`${authority} se bol raha hoon`, createDetectorState());
    expect(first.result.reasons).toContain(SIGNAL_REASONS.authority);
    const second = analyze('aapke khilaf warrant hai', first.state);
    expect(['caution', 'danger']).toContain(second.result.level);
    const third = analyze('payment nahi kiya toh arrest ho jaoge', second.state);
    expect(third.result).toMatchObject({ level: 'danger', category: 'digital_arrest', warningCode: 'DIGITAL_ARREST' });
    expect(third.result.reasons).toContain(SIGNAL_REASONS.money);
  });
  it.each(['jaaoge', 'jaoge', 'jayega', 'jaayenge'])('retains an arrest consequence after conditional nahi: %s', ending => {
    const first = analyze('mein rbi se bol raha hoon', createDetectorState());
    const next = analyze(`abhi payment nahi kiya toh arrest ho ${ending}`, first.state);
    expect(next.result).toMatchObject({ level: 'danger', category: 'digital_arrest' });
    expect(next.result.reasons).toEqual(expect.arrayContaining([SIGNAL_REASONS.urgency, SIGNAL_REASONS.money]));
  });
  it.each(genuine)('keeps genuine text at caution or below: %s', text => {
    expect(['safe', 'caution']).toContain(analyze(text, createDetectorState()).result.level);
  });
  it.each(['aapke khilaf warrant nahi hai', 'aapke naam par case nahi hai',
    'aapke naam par case darj nahi hai', 'arrest nahi hoga', 'payment nahi karna hai',
    'ED is an abbreviation.', 'cyber crime awareness workshop hai'])('does not turn negated or educational mentions into threats: %s', text => {
    const result = analyze(text, createDetectorState()).result;
    expect(result.level).toBe('safe');
    expect(result.reasons).not.toContain(SIGNAL_REASONS.money);
    expect(result.reasons).not.toContain(SIGNAL_REASONS.urgency);
  });
});
