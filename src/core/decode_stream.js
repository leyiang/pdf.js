/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Stream } from "./stream.js";
import { unreachable } from "../shared/util.js";

// Lots of DecodeStreams are created whose buffers are never used.  For these
// we share a single empty buffer. This is (a) space-efficient and (b) avoids
// having special cases that would be required if we used |null| for an empty
// buffer.
const emptyBuffer = new Uint8Array(0);

// Super class for the decoding streams.
class DecodeStream {
  constructor(maybeMinBufferLength) {
    this._rawMinBufferLength = maybeMinBufferLength || 0;

    this.pos = 0;
    this.bufferLength = 0;
    this.eof = false;
    this.buffer = emptyBuffer;
    this.minBufferLength = 512;
    if (maybeMinBufferLength) {
      // Compute the first power of two that is as big as maybeMinBufferLength.
      while (this.minBufferLength < maybeMinBufferLength) {
        this.minBufferLength *= 2;
      }
    }
  }

  // eslint-disable-next-line getter-return
  get length() {
    unreachable("Should not access DecodeStream.length");
  }

  get isEmpty() {
    while (!this.eof && this.bufferLength === 0) {
      this.readBlock();
    }
    return this.bufferLength === 0;
  }

  ensureBuffer(requested) {
    const buffer = this.buffer;
    if (requested <= buffer.byteLength) {
      return buffer;
    }
    let size = this.minBufferLength;
    while (size < requested) {
      size *= 2;
    }
    const buffer2 = new Uint8Array(size);
    buffer2.set(buffer);
    return (this.buffer = buffer2);
  }

  getByte() {
    const pos = this.pos;
    while (this.bufferLength <= pos) {
      if (this.eof) {
        return -1;
      }
      this.readBlock();
    }
    return this.buffer[this.pos++];
  }

  getUint16() {
    const b0 = this.getByte();
    const b1 = this.getByte();
    if (b0 === -1 || b1 === -1) {
      return -1;
    }
    return (b0 << 8) + b1;
  }

  getInt32() {
    const b0 = this.getByte();
    const b1 = this.getByte();
    const b2 = this.getByte();
    const b3 = this.getByte();
    return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
  }

  getBytes(length, forceClamped = false) {
    const pos = this.pos;
    let end;

    if (length) {
      this.ensureBuffer(pos + length);
      end = pos + length;

      while (!this.eof && this.bufferLength < end) {
        this.readBlock();
      }
      const bufEnd = this.bufferLength;
      if (end > bufEnd) {
        end = bufEnd;
      }
    } else {
      while (!this.eof) {
        this.readBlock();
      }
      end = this.bufferLength;
    }

    this.pos = end;
    const subarray = this.buffer.subarray(pos, end);
    // `this.buffer` is either a `Uint8Array` or `Uint8ClampedArray` here.
    return forceClamped && !(subarray instanceof Uint8ClampedArray)
      ? new Uint8ClampedArray(subarray)
      : subarray;
  }

  peekByte() {
    const peekedByte = this.getByte();
    if (peekedByte !== -1) {
      this.pos--;
    }
    return peekedByte;
  }

  peekBytes(length, forceClamped = false) {
    const bytes = this.getBytes(length, forceClamped);
    this.pos -= bytes.length;
    return bytes;
  }

  makeSubStream(start, length, dict = null) {
    if (length === undefined) {
      while (!this.eof) {
        this.readBlock();
      }
    } else {
      const end = start + length;
      while (this.bufferLength <= end && !this.eof) {
        this.readBlock();
      }
    }
    return new Stream(this.buffer, start, length, dict);
  }

  getByteRange(begin, end) {
    unreachable("Should not call DecodeStream.getByteRange");
  }

  skip(n) {
    if (!n) {
      n = 1;
    }
    this.pos += n;
  }

  reset() {
    this.pos = 0;
  }

  getBaseStreams() {
    if (this.str && this.str.getBaseStreams) {
      return this.str.getBaseStreams();
    }
    return [];
  }
}

class StreamsSequenceStream extends DecodeStream {
  constructor(streams) {
    let maybeLength = 0;
    for (const stream of streams) {
      maybeLength +=
        stream instanceof DecodeStream
          ? stream._rawMinBufferLength
          : stream.length;
    }
    super(maybeLength);

    this.streams = streams;
  }

  readBlock() {
    const streams = this.streams;
    if (streams.length === 0) {
      this.eof = true;
      return;
    }
    const stream = streams.shift();
    const chunk = stream.getBytes();
    const bufferLength = this.bufferLength;
    const newLength = bufferLength + chunk.length;
    const buffer = this.ensureBuffer(newLength);
    buffer.set(chunk, bufferLength);
    this.bufferLength = newLength;
  }

  getBaseStreams() {
    const baseStreams = [];
    for (const stream of this.streams) {
      if (stream.getBaseStreams) {
        baseStreams.push(...stream.getBaseStreams());
      }
    }
    return baseStreams;
  }
}

export { DecodeStream, StreamsSequenceStream };
