/***
 * A JSX application.
 */

import '../src/inflate.jsx';

__export__ class ZlibInflate {
  var array: Inflate.<Array.<number>>;
  var uint8: Inflate.<Uint8Array>;
  var typed: boolean;

  function constructor(input : variant, options : Map.<variant>) {
    if (input instanceof Array.<number>) {
      this.array = new Inflate.<Array.<number>>(input as __noconvert__  Array.<number>);
      this.typed = false;
    } else if (input instanceof Uint8Array) {
      this.uint8 = new Inflate.<Uint8Array>(input as __noconvert__ Uint8Array);
      this.typed = true;
    } else {
      throw new Error('invalid input');
    }
  }

  function decompress() : variant {
    return this.typed ? this.uint8.decompress() : this.array.decompress();
  }
}

// vim: set tabstop=2 shiftwidth=2 expandtab:

