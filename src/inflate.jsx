import 'adler32.jsx';
import 'raw_inflate.jsx';
import 'zlib_util.jsx';

class Inflate.<T> {
  var input: T;
  var ip: int;
  var rawInflate: RawInflate.<T>;
  var verify: boolean;
  var method: int;

  class CompressionMethod {
    static var deflate = 8;
  }

  function constructor(input: T, options: Map.<variant> = {}) {
    var cmf: number;
    var flg: number;

    ZlibUtil.checkArrayLike(input);

    this.input = input;
    this.ip =
      options['index'] != null ? options['index'] as number : 0;
    this.verify =
      options['verify'] != null ? options['verify'] as boolean : false;

    // Compression Method and Flags
    cmf = input[this.ip++];
    flg = input[this.ip++];

    // compression method
    switch (cmf & 0x0f) {
      case Inflate.<T>.CompressionMethod.deflate:
        this.method = Inflate.<T>.CompressionMethod.deflate;
        break;
      default:
        throw new Error('unsupported compression method');
    }

    // fcheck
    if (((cmf << 8) + flg) % 31 != 0) {
      throw new Error(
        'invalid fcheck flag:' +
        (((cmf << 8) + flg) % 31) as string
      );
    }

    // fdict (not supported)
    if (flg & 0x20) {
      throw new Error('fdict flag is not supported');
    }

    // RawInflate
    this.rawInflate = new RawInflate.<T>(input, {
      'index': this.ip,
      'bufferSize': options['bufferSize'],
      'bufferType': options['bufferType'],
      'resize': options['resize']
    });
  }

  function decompress(): T {
    var input = this.input;
    var buffer: T;
    var adler32: int;

    buffer = this.rawInflate.decompress();
    this.ip = this.rawInflate.ip;

    // verify adler-32
    if (this.verify) {
      adler32 = (
        input[this.ip++] << 24 | input[this.ip++] << 16 |
        input[this.ip++] << 8 | input[this.ip++]
      ) >>> 0;

      if (adler32 != Adler32.<T>.calc(buffer)) {
        throw new Error('invalid adler-32 checksum');
      }
    }

    return buffer;
  }
}
