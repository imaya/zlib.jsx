import "js.jsx";

class ZlibUtil {
  static function checkArrayLike(obj: variant): void {
    if (!(
      obj instanceof Array.<number> ||
      (js.global['Uint8Array'] as boolean && obj instanceof Uint8Array)
    )) {
      throw new Error('invalid arguments');
    }
  }
}

