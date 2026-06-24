import { expect } from 'chai';
import {
  callbackPayloadNeedsTokenization,
  encodedTelegramCallbackDataByteLength,
  encodedWhatsAppCallbackDataLength,
  TELEGRAM_CALLBACK_DATA_LIMIT_BYTES,
  WHATSAPP_CALLBACK_DATA_LIMIT,
} from './card-callback-button.walker';

describe('card-callback-button.walker', () => {
  it('counts id-only callback data the same way as the Telegram adapter', () => {
    const actionId = 'mcp-approval:approve:toolu_01ABC';

    expect(encodedTelegramCallbackDataByteLength(actionId)).to.equal(
      Buffer.byteLength(`chat:${JSON.stringify({ a: actionId })}`, 'utf8')
    );
  });

  it('includes button value in the encoded callback size', () => {
    const actionId = 'mcp-approval:approve:toolu_01ABC';
    const value = 'GitHub -> list_repos: {"owner":"foo"}';

    expect(encodedTelegramCallbackDataByteLength(actionId, value)).to.equal(
      Buffer.byteLength(`chat:${JSON.stringify({ a: actionId, v: value })}`, 'utf8')
    );
  });

  it('requires tokenization when id is short but value pushes payload over the Telegram limit', () => {
    const actionId = 'mcp-approval:approve:toolu_01ABC';
    const value = 'stripe -> create_payment_intent: {"amount":1000,"currency":"usd"}';

    expect(encodedTelegramCallbackDataByteLength(actionId)).to.be.at.most(TELEGRAM_CALLBACK_DATA_LIMIT_BYTES);
    expect(encodedTelegramCallbackDataByteLength(actionId, value)).to.be.greaterThan(TELEGRAM_CALLBACK_DATA_LIMIT_BYTES);
    expect(callbackPayloadNeedsTokenization(actionId, value)).to.equal(true);
  });

  it('does not require tokenization when id and value fit within the Telegram limit', () => {
    const actionId = 'nested:approve:tool2:turn2';
    const value = 'nested-value';

    expect(encodedTelegramCallbackDataByteLength(actionId, value)).to.be.at.most(TELEGRAM_CALLBACK_DATA_LIMIT_BYTES);
    expect(callbackPayloadNeedsTokenization(actionId, value)).to.equal(false);
  });

  it('requires tokenization when the WhatsApp callback payload exceeds 256 characters', () => {
    const actionId = `mcp-approval:approve-tool:toolu_01ABC:${'list_issues'.repeat(20)}:Linear`;
    const value = 'Linear -> list_issues: {"me":true,"filter":"very long filter value that pushes payload over limit"}';

    expect(encodedWhatsAppCallbackDataLength(actionId, value)).to.be.greaterThan(WHATSAPP_CALLBACK_DATA_LIMIT);
    expect(callbackPayloadNeedsTokenization(actionId, value)).to.equal(true);
  });
});
