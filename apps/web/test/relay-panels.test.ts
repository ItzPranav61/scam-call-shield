import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RiskPanel } from '../components/demo/relay-panels';

describe('ended assessment presentation', () => {
  it.each(['caution', 'danger'] as const)('labels the last %s assessment as ended with muted styling', level => {
    const html = renderToStaticMarkup(createElement(RiskPanel, {
      assessment: { level, summary: 'Synthetic indicators', indicators: [] },
      ended: true, warning: '', audioError: '', canReplay: false, onReplay: () => {}, recording: false,
    }));
    expect(html).toContain(`Session ended - last assessment: ${level.toUpperCase()}`);
    expect(html).toContain('data-ended="true"');
    expect(html).not.toContain('Play warning');
  });
  it('shows no assessment when an ended safe assessment has been cleared', () => {
    const html = renderToStaticMarkup(createElement(RiskPanel, {
      assessment: null, ended: true, warning: '', audioError: '', canReplay: false, onReplay: () => {}, recording: false,
    }));
    expect(html).toContain('No current assessment');
    expect(html).not.toContain('last assessment');
  });
});
