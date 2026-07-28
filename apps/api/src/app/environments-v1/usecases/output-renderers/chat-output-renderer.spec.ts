import { expect } from 'chai';
import { ChatOutputRendererUsecase } from './chat-output-renderer.usecase';

describe('ChatOutputRendererUsecase', () => {
  const usecase = new ChatOutputRendererUsecase();

  it('returns only body from already-translated controls', () => {
    expect(
      usecase.execute({
        body: 'translated-body',
        providerOverrides: { slack: { blocks: [{ type: 'divider' }] } },
      })
    ).to.deep.equal({ body: 'translated-body' });
  });

  it('defaults missing body to an empty string', () => {
    expect(usecase.execute({})).to.deep.equal({ body: '' });
  });
});
