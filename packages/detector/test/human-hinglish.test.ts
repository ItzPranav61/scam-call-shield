import { describe, expect, it } from 'vitest';
import { analyze, createDetectorState, SIGNAL_REASONS } from '../src/index.js';

export const speechSessions = [
  ['aapke bank se bol raha hoon kyc sambandhit baat karne ke liye call kiya gaya hai',
    'aapne kyc nahi ki toh aapka bank account block kiya jaayega',
    'aapko maine ek otp bheja hai kya mujhe wo otp de sakte ho'],
  ['ye ek kalpanik kyc verification call hai',
    'aapka kyc pending hai account block ho jaayega',
    'maine aapko otp bheja hai toh otp mujhe de dijiye'],
] as const;

describe('human Hinglish final transcript regressions', () => {
  it.each(speechSessions)('escalates the observed sequence starting with %s', (...segments) => {
    let state = createDetectorState();
    for (const [index, text] of segments.entries()) {
      const step = analyze(text, state);
      if (segments[0] === speechSessions[0][0] && index === 1)
        expect(['caution', 'danger']).toContain(step.result.level);
      expect(step.result.score).toBeGreaterThanOrEqual(state.score);
      state = step.state;
    }
    expect(state.level).toBe('danger');
    expect(state.signalGroups).toContain('sensitive');
  });
  it.each(['block kiya jaayega', 'block kar diya jaayega', 'band kar diya jaayega'])(
    'recognizes account threat %s after a bank claim', threat => {
      const bank = analyze(speechSessions[0][0], createDetectorState());
      const step = analyze(`aapka account ${threat}`, bank.state);
      expect(step.result.level).toBe('danger');
      expect(step.result.reasons).toContain(SIGNAL_REASONS.urgency);
    });
  const polite = ['otp de sakte ho', 'otp de dijiye', 'otp mujhe de dijiye',
    'otp bata sakte ho', 'wo otp bhej do', 'mujhe O T P de sakte ho', 'mujhe otp bataa sakte ho'];
  it.each(polite)('keeps a lone polite request at caution: %s', text => {
    expect(analyze(text, createDetectorState()).result).toMatchObject({ level: 'caution', category: 'kyc_otp' });
    for (const context of ['Main bank se bol raha hoon.', 'KYC pending hai.', 'account block kar diya jaayega']) {
      const previous = analyze(context, createDetectorState());
      const next = analyze(text, previous.state);
      expect(next.result).toMatchObject({ level: 'danger', warningCode: 'SENSITIVE_REQUEST' });
      expect(analyze('never share your OTP', next.state).result.level).toBe('danger');
    }
  });
  it.each([
    'otp kisi ko mat batana', 'never share your OTP',
    'Bank ki salah hai otp kisi ko mat dena.',
    'Apna OTP mujhe bhi nahi dena chahiye.',
    'Bank kehta hai OTP kabhi kisi ko mat bhejna.',
  ])('keeps genuine OTP warnings safe: %s', text => {
    const result = analyze(text, createDetectorState()).result;
    expect(result.level).toBe('safe');
    expect(result.reasons).not.toContain(SIGNAL_REASONS.sensitive);
  });
  it('does not downgrade direct secret requests or mix sessions', () => {
    const direct = analyze('otp bataiye', createDetectorState());
    expect(direct.result.level).toBe('danger');
    expect(analyze('otp de sakte ho', direct.state).result.level).toBe('danger');
    expect(analyze('otp de sakte ho', createDetectorState()).result.level).toBe('caution');
  });
});
