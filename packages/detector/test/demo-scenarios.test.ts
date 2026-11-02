import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { analyze, createDetectorState } from '../src/index.js';

interface Scenario { segments: string[]; expectedFinalLevel: string; expectedWarningCode: string | null }
const load = (name: string): Scenario => JSON.parse(readFileSync(new URL(`../../../data/scenarios/${name}.json`, import.meta.url), 'utf8')) as Scenario;

it.each(['kyc-otp', 'digital-arrest', 'refund-upi'])('preserves %s and adds a demo without the synthetic announcement word', (name) => {
  const original = load(name);
  const demo = load(`${name}-demo`);
  expect(original.segments.some((text) => /\bkalpanik\b/i.test(text))).toBe(true);
  expect(demo.segments.every((text) => !/\bkalpanik\b/i.test(text))).toBe(true);
  expect(demo.segments).toHaveLength(original.segments.length);
  expect(demo.expectedFinalLevel).toBe(original.expectedFinalLevel);
  expect(demo.expectedWarningCode).toBe(original.expectedWarningCode);
  let step = analyze('', createDetectorState());
  for (const segment of demo.segments) step = analyze(segment, step.state);
  expect(step.result.level).toBe('danger');
  expect(step.result.warningCode).toBe(demo.expectedWarningCode);
});
