import { expect } from 'chai';
import { PushOutputRendererUsecase } from './push-output-renderer.usecase';

describe('PushOutputRendererUsecase', () => {
  const usecase = new PushOutputRendererUsecase();

  it('returns only subject and body from already-translated controls', () => {
    expect(
      usecase.execute({
        subject: 'translated-subject',
        body: 'translated-body',
        providerOverrides: { fcm: { data: { orderId: '1' } } },
      })
    ).to.deep.equal({ subject: 'translated-subject', body: 'translated-body' });
  });

  it('defaults missing subject and body to empty strings', () => {
    expect(usecase.execute({})).to.deep.equal({ subject: '', body: '' });
  });
});
