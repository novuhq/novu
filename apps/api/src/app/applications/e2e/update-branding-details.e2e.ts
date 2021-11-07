import { ApplicationRepository } from '@notifire/dal';
import { UserSession } from '@notifire/testing';
import { expect } from 'chai';

describe('Update Branding Details - /applications/branding (PUT)', function () {
  let session: UserSession;
  const applicationRepository = new ApplicationRepository();

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

    await session.testAgent.put('/v1/applications/branding').send(payload);

    const application = await applicationRepository.findById(session.application._id);
    expect(application.branding.color).to.equal(payload.color);
    expect(application.branding.logo).to.equal(payload.logo);
    expect(application.branding.fontColor).to.equal(payload.fontColor);
    expect(application.branding.fontFamily).to.equal(payload.fontFamily);
    expect(application.branding.contentBackground).to.equal(payload.contentBackground);
  });
});
