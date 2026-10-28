import { expect } from 'chai';
import { sseChunk, sseDone, sseFinish, sseKeepAlive, sseToolCallChunk } from './openai-sse';

describe('openai-sse', () => {
  it('frames a content chunk as OpenAI SSE', () => {
    const framed = sseChunk('Hello');

    expect(framed.startsWith('data: ')).to.equal(true);
    expect(framed.endsWith('\n\n')).to.equal(true);

    const payload = JSON.parse(framed.slice('data: '.length).trim());
    expect(payload.object).to.equal('chat.completion.chunk');
    expect(payload.choices[0].delta.content).to.equal('Hello');
    expect(payload.choices[0].finish_reason).to.equal(null);
  });

  it('frames a tool_call chunk', () => {
    const framed = sseToolCallChunk({
      id: 'call_1',
      type: 'function',
      function: { name: 'end_call', arguments: '{}' },
    });
    const payload = JSON.parse(framed.slice('data: '.length).trim());

    expect(payload.choices[0].delta.tool_calls[0].function.name).to.equal('end_call');
  });

  it('frames finish and done', () => {
    const finish = JSON.parse(sseFinish('stop').slice('data: '.length).trim());
    expect(finish.choices[0].finish_reason).to.equal('stop');
    expect(sseDone()).to.equal('data: [DONE]\n\n');
  });

  it('keepalive is an empty content chunk', () => {
    const payload = JSON.parse(sseKeepAlive().slice('data: '.length).trim());
    expect(payload.choices[0].delta.content).to.equal('');
  });
});
