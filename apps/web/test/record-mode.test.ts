import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Home from '../app/page';
import { RecordingDemo } from '../components/demo/recording-demo';
import { isRecordMode } from '../lib/record-mode';

describe('recording query opt-in', () => {
  it.each([{}, { record: '0' }, { record: 'true' }, { record: '01' }, { record: ['1', '1'] }])('does not enable recording for %j', params => {
    expect(isRecordMode(params)).toBe(false);
  });
  it('accepts only record=1 and leaves other query values alone', () => {
    expect(isRecordMode({ record: '1', other: 'unchanged' })).toBe(true);
  });
  it('selects the dedicated capture layout only when opted in', async () => {
    const record = await Home({ searchParams: Promise.resolve({ record: '1' }) });
    expect(record.type).toBe(RecordingDemo);
    const normal = await Home({ searchParams: Promise.resolve({}) });
    expect(normal.type).not.toBe(RecordingDemo);
  });
  it('renders only the workspace, with both badges and closed technical details after capture', () => {
    const html = renderToStaticMarkup(createElement(RecordingDemo));
    expect(html).toContain('data-recording="true"');
    expect(html).toContain('Demo build - synthetic scenarios only. Not for use on real calls.');
    expect(html).toContain('Relay: unreachable');
    expect(html).not.toContain('Frequently asked questions');
    expect(html).not.toContain('<nav'); expect(html).not.toContain('<footer');
    expect(html.indexOf('Technical details')).toBeGreaterThan(html.indexOf('Relay transcript'));
    expect(html.match(/<details[^>]*>/)?.[0]).not.toMatch(/\sopen(?:=|\s|>)/);
    expect(html).toContain('Return to capture view');
  });
});
