import * as vscode from 'vscode'

const cache = new Map<string, vscode.ColorInformation[]>();

export function setCachedColors(uri: vscode.Uri, colores: vscode.ColorInformation[]): void {
  cache.set(uri.toString(), colores);
}

export function getCachedColors(uri: vscode.Uri): vscode.ColorInformation[] | undefined {
  return cache.get(uri.toString());
}

export function clearCachedColors(uri: vscode.Uri): void {
  cache.delete(uri.toString());
}

const COLOR_KEYWORDS: { [key: string]: string } = {
  black: "#000000", silver: "#c0c0c0", gray: "#808080", white: "#ffffff", maroon: "#800000",
  red: "#ff0000", purple: "#800080", fuchsia: "#ff00ff", green: "#008000", lime: "#00ff00",
  olive: "#808000", yellow: "#ffff00", navy: "#000080", blue: "#0000ff", teal: "#008080",
  aqua: "#00ffff", aliceblue: "#f0f8ff", antiquewhite: "#faebd7", aquamarine: "#7fffd4",
  azure: "#f0ffff", beige: "#f5f5dc", bisque: "#ffe4c4", blanchedalmond: "#ffebcd", blueviolet: "#8a2be2",
  brown: "#a52a2a", burlywood: "#deb887", cadetblue: "#5f9ea0", chartreuse: "#7fff00",
  chocolate: "#d2691e", coral: "#ff7f50", cornflowerblue: "#6495ed", cornsilk: "#fff8dc",
  crimson: "#dc143c", cyan: "#00ffff", darkblue: "#00008b", darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b", darkgray: "#a9a9a9", darkgreen: "#006400", darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b", darkmagenta: "#8b008b", darkolivegreen: "#556b2f", darkorange: "#ff8c00",
  darkorchid: "#9932cc", darkred: "#8b0000", darksalmon: "#e9967a", darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b", darkslategray: "#2f4f4f", darkslategrey: "#2f4f4f", darkturquoise: "#00ced1",
  darkviolet: "#9400d3", deeppink: "#ff1493", deepskyblue: "#00bfff", dimgray: "#696969",
  dimgrey: "#696969", dodgerblue: "#1e90ff", firebrick: "#b22222", floralwhite: "#fffaf0",
  forestgreen: "#228b22", gainsboro: "#dcdcdc", ghostwhite: "#f8f8ff", gold: "#ffd700", goldenrod: "#daa520",
  greenyellow: "#adff2f", grey: "#808080", honeydew: "#f0fff0", hotpink: "#ff69b4", indianred: "#cd5c5c",
  indigo: "#4b0082", ivory: "#fffff0", khaki: "#f0e68c", lavender: "#e6e6fa", lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00", lemonchiffon: "#fffacd", lightblue: "#add8e6", lightcoral: "#f08080",
  lightcyan: "#e0ffff", lightgoldenrodyellow: "#fafad2", lightgray: "#d3d3d3", lightgreen: "#90ee90",
  lightgrey: "#d3d3d3", lightpink: "#ffb6c1", lightsalmon: "#ffa07a", lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa", lightslategray: "#778899", lightslategrey: "#778899", lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0", limegreen: "#32cd32", linen: "#faf0e6", magenta: "#ff00ff",
  mediumaquamarine: "#66cdaa", mediumblue: "#0000cd", mediumorchid: "#ba55d3", mediumpurple: "#9370db",
  mediumseagreen: "#3cb371", mediumslateblue: "#7b68ee", mediumspringgreen: "#00fa9a", mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585", midnightblue: "#191970", mintcream: "#f5fffa", mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5", navajowhite: "#ffdead", oldlace: "#fdf5e6", olivedrab: "#6b8e23", orange: "#ffa500",
  orangered: "#ff4500", orchid: "#da70d6", palegoldenrod: "#eee8aa", palegreen: "#98fb98",
  paleturquoise: "#afeeee", palevioletred: "#db7093", papayawhip: "#ffefd5", peachpuff: "#ffdab9",
  peru: "#cd853f", pink: "#ffc0cb", plum: "#dda0dd", powderblue: "#b0e0e6", rebeccapurple: "#663399",
  rosybrown: "#bc8f8f", royalblue: "#4169e1", saddlebrown: "#8b4513", salmon: "#fa8072", sandybrown: "#f4a460",
  seagreen: "#2e8b57", seashell: "#fff5ee", sienna: "#a0522d", skyblue: "#87ceeb", slateblue: "#6a5acd",
  slategray: "#708090", slategrey: "#708090", snow: "#fffafa", springgreen: "#00ff7f", steelblue: "#4682b4",
  tan: "#d2b48c", thistle: "#d8bfd8",
  tomato: "#ff6347",
  transparent: "#ffff",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  whitesmoke: "#f5f5f5",
  yellowgreen: "#9acd32"
};


// Extensión rápida para limpiar strings
String.prototype.utilityTrim = function () {
  return this.replace(/\s+/g, '');
};
declare global {
  interface String { utilityTrim(): string; }
}

function hex2i(s: string) {
  return parseInt(s, 16);

}

export function parseStringToVsCodeColor(colorStr: string): vscode.Color | null {
  // Reemplazamos la función extendida por un método nativo y limpio
  let str = colorStr.toLowerCase().replace(/\s+/g, '');

  if (COLOR_KEYWORDS[str]) {
    str = COLOR_KEYWORDS[str] || "";
  }

  if (str.startsWith('#')) {
    const hex = str.substring(1);
    let r = 0, g = 0, b = 0, a = 1;

    if (hex.length === 3 || hex.length === 4) {
      const rh = hex[0] || "0", gh = hex[1] || "0", bh = hex[2] || "0", ah = hex[3] || "0";
      r = hex2i(rh + rh);
      g = hex2i(gh + gh);
      b = hex2i(bh + bh);
      if (hex.length === 4 && ah) a = hex2i(ah + ah) / 255;
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
      if (hex.length === 8) a = parseInt(hex.substring(6, 8), 16) / 255;
    } else {
      return null;
    }
    return new vscode.Color(r / 255, g / 255, b / 255, a);
  }

  // 2. Formato RGB / RGBA
  if (str.startsWith('rgb')) {
    const matches = str.match(/[\d.]+/g);
    // Validamos explícitamente que existan al menos los 3 canales principales
    if (matches && matches.length >= 3 && matches[0] && matches[1] && matches[2]) {
      const r = parseFloat(matches[0]) / 255;
      const g = parseFloat(matches[1]) / 255;
      const b = parseFloat(matches[2]) / 255;
      const a = matches[3] ? parseFloat(matches[3]) : 1.0;
      return new vscode.Color(r, g, b, a);
    }
  }

  // 3. Formato HSL / HSLA
  if (str.startsWith('hsl')) {
    const matches = str.match(/[\d.]+/g);
    if (matches && matches.length >= 3 && matches[0] && matches[1] && matches[2]) {
      const h = parseFloat(matches[0]);
      const s = parseFloat(matches[1]) / 100;
      const l = parseFloat(matches[2]) / 100;
      const a = matches[3] ? parseFloat(matches[3]) : 1.0;

      const k = (n: number) => (n + h / 30) % 12;
      const aFactor = s * Math.min(l, 1 - l);
      const f = (n: number) => l - aFactor * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

      return new vscode.Color(f(0), f(8), f(4), a);
    }
  }

  return null;
}


export function vsColor2str(color: vscode.Color) {
  const r = Math.round(color.red * 255);
  const g = Math.round(color.green * 255);
  const b = Math.round(color.blue * 255);
  const a = color.alpha;

  let stringRes: string;

  if (a < 1) {
    stringRes = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  } else {
    const hex = (c: number) => c.toString(16).padStart(2, '0').toUpperCase();
    stringRes = `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  return stringRes;
}