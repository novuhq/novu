const { ReadableStream, WritableStream, TransformStream } = require('stream/web');

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}

if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = WritableStream;
}

if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = TransformStream;
}
