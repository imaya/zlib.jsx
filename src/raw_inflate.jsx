import 'huffman.jsx';
import 'bytearray.jsx';
import 'js.jsx';

class RawInflate.<T> {
  class BufferType {
    static var block = 0;
    static var adaptive = 1;
  }

  static const blockSize = 0x8000;
  static const maxBackwardLength = 32768;
  static const maxCopyLength = 258;
  static const enableTypedArray = (js.global['Uint8Array'] != null);

  // inflated buffer
  var buffer: T;
  // buffer blocks
  var blocks = []: Array.<T>;
  // block size
  var bufferSize = RawInflate.<T>.blockSize;
  // total output buffer pointer
  var totalpos = 0;
  // input buffer pointer
  var ip = 0;
  // bit stream reader buffer
  var bitsbuf = 0;
  // bit stream reader buffer size
  var bitsbuflen = 0;
  // input buffer
  var input: T;
  // output buffer
  var output: T;
  // output buffer pointer
  var op: number;
  // is final block flag
  var bfinal = false;
  // resize flag for memory size optimization
  var resize = false;
  // current literal/length table
  var currentLitlenTable: Array.<variant>;
  // prev huffman code
  var prevHuffman = 0;

  function constructor(input: T, options: Map.<variant> = {}) {
    this.input = input;

    if (options['index'] != null) {
      this.ip = options['index'] as number;
    }
    if (options['bufferSize'] != null) {
      this.bufferSize = options['bufferSize'] as number;
    }
    if (options['resize'] != null) {
      this.resize = options['resize'] as boolean;
    }

    this.op = 0;
    this.output = new T(this.bufferSize);
  }

  function decompress(): T {
    while (!this.bfinal) {
      this.parseBlock();
    }

    return this.concatBuffer();
  }

  static const order =
    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]: Array.<number>;

  static const lengthCodeTable = [
    0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000a, 0x000b,
    0x000d, 0x000f, 0x0011, 0x0013, 0x0017, 0x001b, 0x001f, 0x0023, 0x002b,
    0x0033, 0x003b, 0x0043, 0x0053, 0x0063, 0x0073, 0x0083, 0x00a3, 0x00c3,
    0x00e3, 0x0102, 0x0102, 0x0102
  ]: Array.<number>;

  static const lengthExtraTable = [
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
    5, 5, 0, 0, 0
  ]: Array.<number>;

  static const distCodeTable = [
    0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0007, 0x0009, 0x000d, 0x0011,
    0x0019, 0x0021, 0x0031, 0x0041, 0x0061, 0x0081, 0x00c1, 0x0101, 0x0181,
    0x0201, 0x0301, 0x0401, 0x0601, 0x0801, 0x0c01, 0x1001, 0x1801, 0x2001,
    0x3001, 0x4001, 0x6001
  ]: Array.<number>;

  static const distExtraTable = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
    11, 12, 12, 13, 13
  ]: Array.<number>;

  static const fixedLiteralLengthTable = (function() {
    var lengths = new T(288);
    var i: number;
    var il: number;

    for (i = 0, il = lengths.length; i < il; ++i) {
      lengths[i] =
        (i <= 143) ? 8 :
        (i <= 255) ? 9 :
        (i <= 279) ? 7 :
        8;
    }

    return ZlibHuffman.<T>.buildHuffmanTable(lengths);
  })();

  static const fixedDistanceTable = (function() {
    var lengths = new T(30);
    var i: number;
    var il: number;

    for (i = 0, il = lengths.length; i < il; ++i) {
      lengths[i] = 5;
    }

    return ZlibHuffman.<T>.buildHuffmanTable(lengths);
  })();

  function parseBlock(): void {
    var hdr = this.readBits(3);

    // BFINAL
    if (hdr & 0x1) {
      this.bfinal = true;
    }

    // BTYPE
    hdr >>>= 1;
    switch (hdr) {
      // uncompressed
      case 0:
        this.parseUncompressedBlock();
        break;
        // fixed huffman
      case 1:
        this.parseFixedHuffmanBlock();
        break;
        // dynamic huffman
      case 2:
        this.parseDynamicHuffmanBlock();
        break;
        // reserved or other
      default:
        throw new Error('unknown BTYPE: ' + (hdr as string));
    }
  }

  function readBits(length: number): number {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;
    var octet: Nullable.<number>;

    // not enough buffer
    while (bitsbuflen < length) {
      // input byte
      octet = input[ip++];
      if (octet == null) {
        throw new Error('input buffer is broken');
      }

      // concat octet
      bitsbuf |= octet << bitsbuflen;
      bitsbuflen += 8;
    }

    // output byte
    octet = bitsbuf & /* MASK */ ((1 << length) - 1);
    bitsbuf >>>= length;
    bitsbuflen -= length;

    this.bitsbuf = bitsbuf;
    this.bitsbuflen = bitsbuflen;
    this.ip = ip;

    return octet;
  }

  function readCodeByTable(table: Array.<variant>): number {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;

    var codeTable = table[0] as __noconvert__ Array.<number>;
    var maxCodeLength = table[1] as __noconvert__ number;
    var octet: Nullable.<number>;
    var codeWithLength: number;
    var codeLength: number;

    // not enough buffer
    while (bitsbuflen < maxCodeLength) {
      octet = input[ip++];
      if (octet == null) {
        break;
      }
      bitsbuf |= octet << bitsbuflen;
      bitsbuflen += 8;
    }

    // read max length
    codeWithLength = codeTable[bitsbuf & ((1 << maxCodeLength) - 1)];
    codeLength = codeWithLength >>> 16;

    this.bitsbuf = bitsbuf >> codeLength;
    this.bitsbuflen = bitsbuflen - codeLength;
    this.ip = ip;

    return codeWithLength & 0xffff;
  }

  function parseUncompressedBlock(): void {
    var input = this.input;
    var ip = this.ip;
    var output = this.output;
    var op = this.op;

    var octet: Nullable.<number>;
    var len: number;
    var nlen: number;

    // skip buffered header bits
    this.bitsbuf = 0;
    this.bitsbuflen = 0;

    // len (1st)
    octet = input[ip++];
    if (octet == null) {
      throw new Error('invalid uncompressed block header: LEN (first byte)');
    }
    len = octet;

    // len (2nd)
    octet = input[ip++];
    if (octet == null) {
      throw new Error('invalid uncompressed block header: LEN (second byte)');
    }
    len |= octet << 8;

    // nlen (1st)
    octet = input[ip++];
    if (octet == null) {
      throw new Error('invalid uncompressed block header: NLEN (first byte)');
    }
    nlen = octet;

    // nlen (2nd)
    octet = input[ip++];
    if (octet == null) {
      throw new Error('invalid uncompressed block header: NLEN (second byte)');
    }
    nlen |= octet << 8;

    // check len & nlen
    if (len == ~nlen) {
      throw new Error('invalid uncompressed block header: length verify');
    }

    // check size
    if (ip + len > input.length) { throw new Error('input buffer is broken'); }

    // expand buffer
    while (op + len > output.length) {
      output = this.expandBuffer(({'fixRatio': 2}: Map.<variant>));
    }

    // copy
    ByteArray.set(output, ByteArray.subarray(input, ip, ip + len), op);
    op += len;
    ip += len;

    this.ip = ip;
    this.op = op;
    this.output = output;
  }

  function parseFixedHuffmanBlock(): void {
    this.decodeHuffman(
        RawInflate.<T>.fixedLiteralLengthTable,
        RawInflate.<T>.fixedDistanceTable
    );
  }

  function parseDynamicHuffmanBlock(): void {
    var hlit = this.readBits(5) + 257;
    var hdist = this.readBits(5) + 1;
    var hclen = this.readBits(4) + 4;
    var codeLengths = new T(RawInflate.<T>.order.length);
    var codeLengthsTable: Array.<variant>;
    var litlenLengths: T;
    var distLengths: T;
    var i: number;

    // decode code lengths
    for (i = 0; i < hclen; ++i) {
      codeLengths[RawInflate.<T>.order[i]] = this.readBits(3);
    }
    if (codeLengths instanceof Array.<number>) {
      for (i = hclen, hclen = codeLengths.length; i < hclen; ++i) {
        codeLengths[RawInflate.<T>.order[i]] = 0;
      }
    }
    codeLengthsTable = ZlibHuffman.<T>.buildHuffmanTable(codeLengths);

    // literal and length code
    litlenLengths = new T(hlit);

    // distance code
    distLengths = new T(hdist);

    this.decodeHuffman(
        ZlibHuffman.<T>.buildHuffmanTable(this.decode(hlit, codeLengthsTable, litlenLengths)),
        ZlibHuffman.<T>.buildHuffmanTable(this.decode(hdist, codeLengthsTable, distLengths))
     );
  }

  function decode(num: number, table: Array.<variant>, lengths: T): T {
    var code: number;
    var prev = this.prevHuffman;
    var repeat: number;
    var i: number;

    for (i = 0; i < num;) {
      code = this.readCodeByTable(table);
      switch (code) {
        case 16:
          repeat = 3 + this.readBits(2);
          while (repeat--) { lengths[i++] = prev; }
          break;
        case 17:
          repeat = 3 + this.readBits(3);
          while (repeat--) { lengths[i++] = 0; }
          prev = 0;
          break;
        case 18:
          repeat = 11 + this.readBits(7);
          while (repeat--) { lengths[i++] = 0; }
          prev = 0;
          break;
        default:
          lengths[i++] = code;
          prev = code;
          break;
      }
    }

    this.prevHuffman = prev;

    return lengths;
  }

  function decodeHuffman(litlen: Array.<variant>, dist: Array.<variant>): void {
    var output = this.output;
    var op = this.op;

    this.currentLitlenTable = litlen;

    var olength = output.length;
    var code: number;
    var ti: number;
    var codeDist: number;
    var codeLength: number;

    while ((code = this.readCodeByTable(litlen)) != 256) {
      // literal
      if (code < 256) {
        if (op >= olength) {
          output = this.expandBuffer({});
          olength = output.length;
        }
        output[op++] = code;

        continue;
      }

      // length code
      ti = code - 257;
      codeLength = RawInflate.<T>.lengthCodeTable[ti];
      if (RawInflate.<T>.lengthExtraTable[ti] > 0) {
        codeLength += this.readBits(RawInflate.<T>.lengthExtraTable[ti]);
      }

      // dist code
      code = this.readCodeByTable(dist);
      codeDist = RawInflate.<T>.distCodeTable[code];
      if (RawInflate.<T>.distExtraTable[code] > 0) {
        codeDist += this.readBits(RawInflate.<T>.distExtraTable[code]);
      }

      // lz77 decode
      if (op + codeLength > olength) {
        output = this.expandBuffer({});
        olength = output.length;
      }
      while (codeLength--) {
        output[op] = output[(op++) - codeDist];
      }
    }

    while (this.bitsbuflen >= 8) {
      this.bitsbuflen -= 8;
      this.ip--;
    }
    this.op = op;
  }

  function expandBuffer(option: Map.<variant> = {}): T {
    var buffer: T;
    var ratio = (this.input.length / this.ip + 1);
    var maxHuffCode: number;
    var newSize: number;
    var maxInflateSize = 0;

    var input = this.input;
    var output = this.output;

    if (option['fixRatio'] != null) {
      ratio = option['fixRatio'] as number;
    }
    if (option['addRatio'] != null) {
      ratio += option['addRatio'] as number;
    }

    // calculate new buffer size
    if (ratio < 2) {
      maxHuffCode =
        (input.length - this.ip) / (this.currentLitlenTable[2] as number);
      maxInflateSize = (maxHuffCode / 2 * 258) | 0;
      newSize = maxInflateSize < output.length ?
        output.length + maxInflateSize :
        output.length << 1;
    } else {
      newSize = output.length * ratio | 0;
    }

    // buffer expantion
    buffer = ByteArray.expand(output, newSize);

    this.output = buffer;

    return this.output;
  }

  function concatBuffer(): T {
    return this.buffer = ByteArray.truncate(this.output, this.op);
  }
}
