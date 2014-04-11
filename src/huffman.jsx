import 'console.jsx';

/**
 * build huffman table from length list.
 * @return {!Array} huffman table.
 */
class ZlibHuffman.<T> {
  static function buildHuffmanTable(lengths: T): Array.<variant> {
    var listSize = lengths.length;
    var maxCodeLength = 0;
    var minCodeLength = 0xffffffff;
    var size: number;
    var table: Array.<number>;
    var bitLength: number;
    var code: number;
    var skip: number;
    var reversed: number;
    var rtemp: number;
    var i: number;
    var il: number;
    var j: number;

    // Math.max は遅いので最長の値は for-loop で取得する
    for (i = 0, il = listSize; i < il; ++i) {
      //console.log(i, lengths[i], lengths.length);
      if (lengths[i] > maxCodeLength) {
        maxCodeLength = lengths[i];
      }
      if (lengths[i] < minCodeLength) {
        minCodeLength = lengths[i];
      }
    }

    size = 1 << maxCodeLength;
    table = new Array.<number>(size);

    // ビット長の短い順からハフマン符号を割り当てる
    for (bitLength = 1, code = 0, skip = 2; bitLength <= maxCodeLength;) {
      for (i = 0; i < listSize; ++i) {
        if (lengths[i] == bitLength) {
          // ビットオーダーが逆になるためビット長分並びを反転する
          for (reversed = 0, rtemp = code, j = 0; j < bitLength; ++j) {
            reversed = (reversed << 1) | (rtemp & 1);
            rtemp >>= 1;
          }

          // 最大ビット長をもとにテーブルを作るため、
          // 最大ビット長以外では 0 / 1 どちらでも良い箇所ができる
          // そのどちらでも良い場所は同じ値で埋めることで
          // 本来のビット長以上のビット数取得しても問題が起こらないようにする
          for (j = reversed; j < size; j += skip) {
            table[j] = (bitLength << 16) | i;
          }

          ++code;
        }
      }

      // 次のビット長へ
      ++bitLength;
      code <<= 1;
      skip <<= 1;
    }

    return [table, maxCodeLength, minCodeLength];
  }
}
