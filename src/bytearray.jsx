final class ByteArray {
  static function subarray(array: Array.<number>, start: number, end: number): Array.<number> {
    return array.slice(start, end);
  }

  static function subarray(array: Uint8Array, start: number, end: number): Uint8Array {
    return array.subarray(start, end);
  }

  static function set(target: Array.<number>, source: Array.<number>, offset: number = 0): void {
    var i = 0;
    var il = source.length;

    for (; i < il; ++i) {
      target[offset + i] = source[i];
    }
  }

  static function set(target: Uint8Array, source: Uint8Array, offset: number = 0): void {
    target.set(source, offset);
  }

  static function set(target: Uint8Array, source: Array.<number>, offset: number = 0): void {
    target.set(source, offset);
  }

  static function truncate(array: Array.<number>, length: number): Array.<number> {
    array.length = length;

    return array;
  }

  static function truncate(array: Uint8Array, length: number): Uint8Array {
    var newArray = new Uint8Array(length);

    newArray.set(array.subarray(0, length));

    return newArray;
  }

  static function get(array: Array.<number>, n: number): number {
    return array[n];
  }

  static function get(array: Uint8Array, n: number): number {
    return array[n];
  }

  static function expand(array: Array.<number>, newSize: number): Array.<number> {
    if (array.length > newSize) {
      array.length = newSize;
    }

    return array;
  }

  static function expand(array: Uint8Array, newSize: number): Uint8Array {
    var newBuffer = new Uint8Array(newSize);

    ByteArray.set(newBuffer, array);

    return newBuffer;
  }
}
