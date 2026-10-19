import { expect } from 'chai';
import { ToolOutputRendererUsecase } from './tool-output-renderer.usecase';

describe('ToolOutputRendererUsecase', () => {
  const usecase = new ToolOutputRendererUsecase();

  it('returns only body from already-translated controls', () => {
    expect(
      usecase.execute({
        body: 'translated-body',
        providerOverrides: { pagerduty: { severity: 'critical' } },
      })
    ).to.deep.equal({ body: 'translated-body' });
  });

  it('defaults missing body to an empty string', () => {
    expect(usecase.execute({})).to.deep.equal({ body: '' });
  });
});
