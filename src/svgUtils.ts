import * as vscode from 'vscode';

export interface srcRange {
  start: number;
  end: number;
}

export const cache = new Map<string, Map<number, srcRange>>();

const renderables = [
  "rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text",
  "tspan", "g", "symbol", "use", "image", "clippath", "mask"
];


export function nodeRangesSet(uri: vscode.Uri, mapaRangos: Map<number, srcRange>): void {
  cache.set(uri.toString(), mapaRangos);
}

export function nodeRangesGet(uri: vscode.Uri): Map<number, srcRange> | undefined {
  return cache.get(uri.toString());
}

export function clearNodeRanges(uri: vscode.Uri): void {
  cache.delete(uri.toString());
}

export function map2src(txInitial: string): { txtModified: string; mapaRangos: Map<number, srcRange>;} {
  const mapaRangos = new Map<number, srcRange>();
  let idCounter = 0;
  let resultado = '';
  let ultimoIndice = 0;

  // Detecta la apertura de cualquier tag (con o sin self-closing)
  const tagRegex = /<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+(?:=(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(txInitial)) !== null) {
    const [full, tagName] = match;
    const start = match.index;
    const end = start + full.length;
    //    if (!tagName || tagName.toLowerCase() === 'svg') {
    if (!tagName || renderables.indexOf(tagName) === -1) {
      continue; // opcional: no marcar la raíz
    }

    const id = idCounter++;
    mapaRangos.set(id, { start, end });

    const insertIndex = start + 1 + tagName.length;
    resultado += txInitial.slice(ultimoIndice, insertIndex);
    resultado += ` data-vsc-id="${id}"`;
    ultimoIndice = insertIndex;
  }
  resultado += txInitial.slice(ultimoIndice);
  return { txtModified: resultado, mapaRangos };
}