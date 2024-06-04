import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';

import { GetNovuLayout } from './get-novu-layout.usecase';

describe('Get Novu Layout Usecase', function () {
  let useCase: GetNovuLayout;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<GetNovuLayout>(GetNovuLayout);
  });

  it('should retrieve the novu layout', async function () {
    const layout = await useCase.execute({});

    expect(layout).toContain(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">'
    );
  });
});
