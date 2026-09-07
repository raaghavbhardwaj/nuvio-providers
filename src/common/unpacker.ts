/**
 * @fileoverview Dean Edwards P.A.C.K.E.R decoder for obfuscated web players.
 * Conforms to Google TypeScript Style Guide.
 */

/**
 * Checks whether a given string contains a Dean Edwards packed script.
 *
 * @param code Raw JavaScript string to inspect.
 * @returns True if the code matches the packer signature.
 */
export function isPacked(code: string): boolean {
  return /eval\(function\(p,a,c,k,e,d\)/.test(code);
}

/**
 * Unpacks code packed with Dean Edwards P.A.C.K.E.R.
 *
 * @param code The obfuscated JavaScript string containing eval(function(p,a,c,k,e,d)...).
 * @returns The unpacked and decompressed JavaScript source string.
 */
export function unpack(code: string): string {
  const match = code.match(/}\s*\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/s);
  if (!match) {
    return code;
  }

  const [, payload, radixStr, countStr, symtabStr] = match;
  const radix = parseInt(radixStr, 10);
  const count = parseInt(countStr, 10);
  const symtab = symtabStr.split('|');

  if (symtab.length !== count) {
    return code;
  }

  const baseUnpack = (val: number, rad: number): string => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    while (val > 0) {
      res = chars[val % rad] + res;
      val = Math.floor(val / rad);
    }
    return res || '0';
  };

  const lookup: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const key = baseUnpack(i, radix);
    lookup[key] = symtab[i] || key;
  }

  return payload.replace(/\b\w+\b/g, token => lookup[token] ?? token);
}
