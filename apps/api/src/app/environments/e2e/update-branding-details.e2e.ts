import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update Branding Details - /environments/branding (PUT)', function () {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the branding details', async function () {
    const payload = {
      color: '#fefefe',
      fontColor: '#f4f4f4',
      contentBackground: '#fefefe',
      fontFamily: 'Nunito',
      logo: 'https://st.depositphotos.com/1186248/2404/i/600/depositphotos_24043595-stock-photo-fake-rubber-stamp.jpg',
    };

    await session.testAgent.put('/v1/environments/branding').send(payload);

    const environment = await environmentRepository.findById(session.environment._id);

    expect(environment.branding.color).to.equal(payload.color);
    expect(environment.branding.logo).to.equal(payload.logo);
    expect(environment.branding.fontColor).to.equal(payload.fontColor);
    expect(environment.branding.fontFamily).to.equal(payload.fontFamily);
    expect(environment.branding.contentBackground).to.equal(payload.contentBackground);
  });
});
