import { type DataStreamFrame, parseDataStream } from './data-stream-parser';

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<DataStreamFrame[]> {
  const frames: DataStreamFrame[] = [];
  for await (const frame of parseDataStream(stream)) {
    frames.push(frame);
  }

  return frames;
}

describe('parseDataStream', () => {
  it('parses SSE data frames', async () => {
    const frames = await collect(
      streamFromChunks(['data: {"type":"start"}\n\n', 'data: {"type":"text-delta","id":"m1","delta":"hi"}\n\n'])
    );

    expect(frames).toEqual([{ type: 'start' }, { type: 'text-delta', id: 'm1', delta: 'hi' }]);
  });

  it('handles frames split across network chunks', async () => {
    const frames = await collect(
      streamFromChunks([
        'data: {"type":"text-del',
        'ta","id":"m1","delta":"chunked"}',
        '\n\ndata: {"type":"finish"}\n\n',
      ])
    );

    expect(frames).toEqual([{ type: 'text-delta', id: 'm1', delta: 'chunked' }, { type: 'finish' }]);
  });

  it('stops at [DONE] and ignores anything after it', async () => {
    const frames = await collect(
      streamFromChunks(['data: {"type":"finish"}\n\n', 'data: [DONE]\n\n', 'data: {"type":"start"}\n\n'])
    );

    expect(frames).toEqual([{ type: 'finish' }]);
  });

  it('skips malformed frames without killing the stream', async () => {
    const frames = await collect(
      streamFromChunks(['data: {broken json}\n\n', ': comment line\n\n', 'data: {"type":"finish"}\n\n'])
    );

    expect(frames).toEqual([{ type: 'finish' }]);
  });

  it('flushes a trailing frame when the server closes without a final blank line', async () => {
    const frames = await collect(streamFromChunks(['data: {"type":"finish"}']));

    expect(frames).toEqual([{ type: 'finish' }]);
  });

  it('ignores frames without a string type', async () => {
    const frames = await collect(streamFromChunks(['data: {"noType":true}\n\n', 'data: 42\n\n']));

    expect(frames).toEqual([]);
  });
});
