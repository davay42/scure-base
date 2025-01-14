import assert from 'node:assert';
import {
  base32,
  base32nopad,
  base32hex,
  base32hexnopad,
  base32crockford,
  base58,
  base58xmr,
  createBase58check,
  base58xrp,
  base64,
  base64nopad,
  base64url,
  base64urlnopad,
  bech32,
  bech32m,
  bytes,
  str,
  utils,
} from '../lib/esm/index.js';
import { sha256 } from '@noble/hashes/sha2';
import { Buffer } from 'node:buffer';
import { should } from 'micro-should';
import { json, RANDOM } from './utils.js';

const base58check = createBase58check(sha256);
const vectors = json('./vectors/base_vectors.json').v;

const CODERS = {
  base32,
  base32hex,
  base32crockford,
  base64,
  base64url,
  base58,
  base58xmr,
  base58check,
  base58xrp,
};

const NODE_CODERS = {
  hex: {
    encode: (buf) => Buffer.from(buf).toString('hex'),
    decode: (str) => Buffer.from(str, 'hex'),
  },
  base64: {
    encode: (buf) => Buffer.from(buf).toString('base64'),
    decode: (str) => Buffer.from(str, 'base64'),
  },
};

for (const c in NODE_CODERS) {
  const node = NODE_CODERS[c];
  should(`${c} against node`, () => {
    for (let i = 0; i < 1024; i++) {
      const buf = RANDOM.slice(0, i);
      const nodeStr = node.encode(buf);
      assert.deepStrictEqual(nodeStr, str(c, buf));
      assert.deepStrictEqual(buf, bytes(c, nodeStr));
    }
  });
}

should('14335 vectors, base32/64 58/hex/url/xmr, bech32/m', () => {
  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    const data = Uint8Array.from(Buffer.from(v.data, 'hex'));
    const coder = {
      base32,
      base32hex,
      base64,
      base64url,
      base58,
      base58xmr,
      bech32: {
        encode: (data) => bech32.encode('bech32', bech32.toWords(data), 9000),
        decode: (str) => bech32.fromWords(bech32.decode(str, 9000).words),
      },
      bech32m: {
        encode: (data) => bech32m.encode('bech32m', bech32m.toWords(data), 9000),
        decode: (str) => bech32m.fromWords(bech32m.decode(str, 9000).words),
      },
    };
    assert.deepStrictEqual(coder[v.fn_name].encode(data), v.exp, 'encode ' + i);
    assert.deepStrictEqual(coder[v.fn_name].decode(v.exp), data, 'decode ' + i);
  }
});

const TEST_BYTES = new TextEncoder().encode('@scure/base encoding / decoding');

should('nopad variants: base32', () => {
  assert.strictEqual(
    base32nopad.encode(TEST_BYTES),
    'IBZWG5LSMUXWEYLTMUQGK3TDN5SGS3THEAXSAZDFMNXWI2LOM4'
  );

  assert.deepStrictEqual(
    base32nopad.decode('IBZWG5LSMUXWEYLTMUQGK3TDN5SGS3THEAXSAZDFMNXWI2LOM4'),
    TEST_BYTES
  );

  assert.strictEqual(
    base32hexnopad.encode(TEST_BYTES),
    '81PM6TBICKNM4OBJCKG6ARJ3DTI6IRJ740NI0P35CDNM8QBECS'
  );

  assert.deepStrictEqual(
    base32hexnopad.decode('81PM6TBICKNM4OBJCKG6ARJ3DTI6IRJ740NI0P35CDNM8QBECS'),
    TEST_BYTES
  );
});

should('nopad variants: base64', () => {
  assert.strictEqual(base64nopad.encode(TEST_BYTES), 'QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw');
  assert.deepStrictEqual(
    base64nopad.decode('QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw'),
    TEST_BYTES
  );

  assert.strictEqual(
    base64urlnopad.encode(TEST_BYTES),
    'QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw'
  );

  assert.deepStrictEqual(
    base64urlnopad.decode('QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw'),
    TEST_BYTES
  );
});

should('utils: radix2', () => {
  const t = (bits) => {
    const coder = utils.radix2(bits);
    const val = new Uint8Array(1024).fill(0xff);
    const valPattern = Uint8Array.from({ length: 1024 }, (i, j) => j);
    assert.deepStrictEqual(
      coder.decode(coder.encode(val)).slice(0, 1024),
      val,
      `radix2(${bits}, 0xff)`
    );
    assert.deepStrictEqual(
      coder.decode(coder.encode(valPattern)).slice(0, 1024),
      valPattern,
      `radix2(${bits}, pattern)`
    );
  };
  assert.throws(() => t(0));
  for (let i = 1; i < 27; i++) t(i);
  assert.throws(() => t(27)); // 34 bits
  t(28);
  assert.throws(() => t(29)); // 36 bits
  assert.throws(() => t(30)); // 36 bits
  assert.throws(() => t(31)); // 38 bits
  t(32); // ok
  // true is not a number
  assert.throws(() => utils.radix2(4).decode([1, true, 1, 1]));
});

should('utils: radix', () => {
  const t = (base) => {
    const coder = utils.radix(base);
    const val = new Uint8Array(128).fill(0xff);
    const valPattern = Uint8Array.from({ length: 128 }, (i, j) => j);
    assert.deepStrictEqual(
      coder.decode(coder.encode(val)).slice(0, 128),
      val,
      `radix(${base}, 0xff)`
    );
    assert.deepStrictEqual(
      coder.decode(coder.encode(valPattern)).slice(0, 128),
      valPattern,
      `radix(${base}, pattern)`
    );
  };
  assert.throws(() => t(1));
  for (let i = 1; i < 46; i++) t(2 ** i);
  for (let i = 2; i < 46; i++) t(2 ** i - 1);
  for (let i = 1; i < 46; i++) t(2 ** i + 1);
  // carry overflows here
  t(35195299949887);
  assert.throws(() => t(35195299949887 + 1));
  for (let i = 46; i < 53; i++) assert.throws(() => t(2 ** i));
  // true is not a number
  assert.throws(() => utils.radix(2 ** 4).decode([1, true, 1, 1]));
});

should('utils: alphabet', () => {
  const a = utils.alphabet('12345');
  const ab = utils.alphabet(['11', '2', '3', '4', '5']);
  assert.deepStrictEqual(a.encode([1]), ['2']);
  assert.deepStrictEqual(ab.encode([0]), ['11']);
  assert.deepStrictEqual(a.encode([2]), ab.encode([2]));
  assert.throws(() => a.encode([1, 2, true, 3]));
  assert.throws(() => a.decode(['1', 2, true]));
  assert.throws(() => a.decode(['1', 2]));
  assert.throws(() => a.decode(['toString']));
});

should('utils: join', () => {
  assert.throws(() => utils.join('1').encode(['1', 1, true]));
});

should('utils: padding', () => {
  const coder = utils.padding(4, '=');
  assert.throws(() => coder.encode(['1', 1, true]));
  assert.throws(() => coder.decode(['1', 1, true, '=']));
});

export { CODERS };
should.runWhen(import.meta.url);
