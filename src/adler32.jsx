import 'js.jsx';
import 'zlib_util.jsx';

final class Adler32.<T> {
  static function calc(array: T): int {
    ZlibUtil.checkArrayLike(array);

    return Adler32.<T>.update(1, array);
  }

  static function update(adler: int, array: T): int {
    var s1 = adler & 0xffff;
    var s2 = (adler >>> 16) & 0xffff;
    var len = array.length;
    var tlen: int;
    var i = 0;

    while (len > 0) {
      tlen = len > Adler32.<T>.optimizationParameter ?
        Adler32.<T>.optimizationParameter : len;
      len -= tlen;
      do {
        s1 += array[i++];
        s2 += s1;
      } while (--tlen);

      s1 %= 65521;
      s2 %= 65521;
    }

    return ((s2 << 16) | s1) >>> 0;
  }

  static const optimizationParameter: int = 1024;
}
