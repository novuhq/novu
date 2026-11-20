import { GetNovuLayout } from './get-novu-layout.usecase';

describe('Get Novu Layout Usecase', () => {
  it('should retrieve the novu layout', async () => {
    const layout = await new GetNovuLayout().execute({});

    expect(layout).toContain(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">'
    );
  });
});
