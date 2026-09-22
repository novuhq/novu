import { HumanInteractionKindEnum } from '@novu/shared';
import { expect } from 'chai';
import { stub } from 'sinon';

import {
  buildHumanInteractionCardFromPromptUpdate,
  collapseHumanInteractionPromptOntoCard,
} from './human-interaction-card-from-prompt.migration';

describe('human-interaction-card-from-prompt migration', () => {
  it('builds content.cardChrome from a legacy prompt and unsets prompt', () => {
    const update = buildHumanInteractionCardFromPromptUpdate({
      _id: 'hi1',
      kind: HumanInteractionKindEnum.APPROVE,
      prompt: 'Deploy to production?',
    });

    expect(update).to.deep.equal({
      $set: { content: { cardChrome: { title: 'Deploy to production?' } } },
      $unset: { prompt: 1 },
    });
  });

  it('folds choose options onto content.cardChrome.options', () => {
    const update = buildHumanInteractionCardFromPromptUpdate({
      _id: 'hi2',
      kind: HumanInteractionKindEnum.CHOOSE,
      prompt: 'Which env?',
      options: [
        { id: 'opt_1', label: 'staging' },
        { id: 'opt_2', label: 'production' },
      ],
    });

    expect(update).to.deep.equal({
      $set: {
        content: {
          cardChrome: {
            title: 'Which env?',
            options: [
              { id: 'opt_1', label: 'staging' },
              { id: 'opt_2', label: 'production' },
            ],
          },
        },
      },
      $unset: { prompt: 1, options: 1 },
    });
  });

  it('is a no-op when content is already tagged and leftovers are gone', () => {
    expect(
      buildHumanInteractionCardFromPromptUpdate({
        _id: 'hi4',
        kind: HumanInteractionKindEnum.ASK,
        content: { cardChrome: { title: 'What SHA?' } },
      })
    ).to.equal(null);
  });

  it('skips rows that cannot produce a card title', () => {
    expect(
      buildHumanInteractionCardFromPromptUpdate({
        _id: 'hi5',
        kind: HumanInteractionKindEnum.ASK,
        prompt: '   ',
      })
    ).to.equal(null);
  });

  it('bulk-writes backfills for rows that still have prompt', async () => {
    const bulkWrite = stub().resolves({ modifiedCount: 1 });
    const collection = {
      find: () => ({
        batchSize: () => [
          {
            _id: 'hi1',
            kind: HumanInteractionKindEnum.TELL,
            prompt: 'Build finished.',
          },
        ],
      }),
      bulkWrite,
    };

    const result = await collapseHumanInteractionPromptOntoCard(collection as any);

    expect(result).to.deep.equal({ scanned: 1, modified: 1 });
    expect(bulkWrite.calledOnce).to.equal(true);
    expect(bulkWrite.firstCall.args[0]).to.deep.equal([
      {
        updateOne: {
          filter: { _id: 'hi1' },
          update: {
            $set: { content: { cardChrome: { title: 'Build finished.' } } },
            $unset: { prompt: 1 },
          },
        },
      },
    ]);
  });
});
