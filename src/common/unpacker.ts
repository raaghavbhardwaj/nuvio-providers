/**
 * Dean Edwards P.A.C.K.E.R Unpacker
 * Decodes obfuscated JavaScript patterns commonly used in video hosting players
 * (e.g. `eval(function(p,a,c,k,e,d){...})`)
 */

export function isPacked(code: string): boolean {
  return /eval\(function\(p,a,c,k,e,d\)/.test(code);
}

export function unpack(code: string): string {
  const match = code.match(/}\s*\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/s);
  if (!match) return code;

  let [, payload, radixStr, countStr, symtabStr] = match;
  const radix = parseInt(radixStr, 10);
  const count = parseInt(countStr, 10);
  const symtab = symtabStr.split('|');

  if (symtab.length !== count) return code;

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

  return payload.replace(/\b\w+\b/g, (token) => lookup[token] ?? token);
}
