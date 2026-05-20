import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  collectSvgPreviewCandidates,
  findSvgPreviewAtOffset,
  svgToDataUri,
  type SvgPreviewOptions
} from './svgPreview'

const previewOptions: SvgPreviewOptions = {
  contrastColor: '#000000',
  minSize: 16,
  useCamelCase: false
}

describe('collectSvgPreviewCandidates', () => {
  it('keeps existing inline svg previews working', () => {
    const [candidate] = collectSvgPreviewCandidates(
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M0 0h24v24H0z"/></svg>',
      previewOptions
    )

    assert.strictEqual(candidate.kind, 'svg')
    assert.ok(candidate.previewSvg.includes('xmlns="http://www.w3.org/2000/svg"'))
    assert.ok(candidate.previewSvg.includes('width="16" height="16"'))
    assert.ok(candidate.previewSvg.includes('fill="#000000"'))
  })

  it('creates renderable previews for symbol definitions', () => {
    const documentText = `<svg class="hidden">
      <symbol id="icon-clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </symbol>
    </svg>`

    const symbolCandidate = collectSvgPreviewCandidates(documentText, previewOptions)
      .find(candidate => candidate.kind === 'symbol')

    assert.ok(symbolCandidate)
    assert.ok(symbolCandidate.previewSvg.startsWith('<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"'))
    assert.ok(symbolCandidate.previewSvg.includes('viewBox="0 0 24 24"'))
    assert.ok(symbolCandidate.previewSvg.includes('<circle cx="12" cy="12" r="10"/>'))
    assert.ok(!symbolCandidate.previewSvg.includes('<symbol'))
  })

  it('resolves use references inside svg previews from symbols in the same document', () => {
    const documentText = `<svg class="hidden">
      <symbol id="icon-location" viewBox="0 0 24 24">
        <path d="M12 0C7.8 0 4 3.4 4 8"/>
      </symbol>
    </svg>
    <svg class="w-5 h-5"><use href="#icon-location"/></svg>`

    const useSvgCandidate = collectSvgPreviewCandidates(documentText, previewOptions)
      .find(candidate => candidate.kind === 'svg' && candidate.source.includes('<use'))

    assert.ok(useSvgCandidate)
    assert.ok(useSvgCandidate.previewSvg.includes('viewBox="0 0 24 24"'))
    assert.ok(useSvgCandidate.previewSvg.includes('<defs><symbol id="icon-location"'))
    assert.ok(useSvgCandidate.previewSvg.includes('<use href="#icon-location"/>'))
  })

  it('creates standalone previews for use references', () => {
    const documentText = `<svg class="hidden">
      <symbol id="icon-location" viewBox="0 0 24 24">
        <path d="M12 0C7.8 0 4 3.4 4 8"/>
      </symbol>
    </svg>
    <svg class="w-5 h-5"><use href="#icon-location"/></svg>`

    const useCandidate = collectSvgPreviewCandidates(documentText, previewOptions)
      .find(candidate => candidate.kind === 'use')

    assert.ok(useCandidate)
    assert.ok(useCandidate.previewSvg.includes('<defs><symbol id="icon-location"'))
    assert.ok(useCandidate.previewSvg.includes('<use href="#icon-location"/>'))
    assert.ok(useCandidate.previewSvg.includes('viewBox="0 0 24 24"'))
  })

  it('resolves JSX xlinkHref use references', () => {
    const documentText = `<svg>
      <symbol id="icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></symbol>
    </svg>
    <svg><use xlinkHref="#icon-clock" /></svg>`

    const useSvgCandidate = collectSvgPreviewCandidates(documentText, {
      ...previewOptions,
      useCamelCase: true
    }).find(candidate => candidate.kind === 'svg' && candidate.source.includes('xlinkHref'))

    assert.ok(useSvgCandidate)
    assert.ok(useSvgCandidate.previewSvg.includes('<defs><symbol id="icon-clock"'))
    assert.ok(useSvgCandidate.previewSvg.includes('xlink:href="#icon-clock"'))
  })

  it('ignores use references without a matching symbol', () => {
    const candidates = collectSvgPreviewCandidates('<use href="#missing"/>', previewOptions)

    assert.deepStrictEqual(candidates, [])
  })
})

describe('findSvgPreviewAtOffset', () => {
  it('prefers the nested use preview over the surrounding svg preview', () => {
    const documentText = `<svg><symbol id="icon" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></symbol></svg>
    <svg><use href="#icon"/></svg>`
    const offset = documentText.indexOf('<use') + 1
    const candidate = findSvgPreviewAtOffset(documentText, offset, previewOptions)

    assert.strictEqual(candidate?.kind, 'use')
  })
})

describe('svgToDataUri', () => {
  it('encodes renderable svg as an image data uri', () => {
    const dataUri = svgToDataUri('<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    assert.ok(dataUri.startsWith('data:image/svg+xml;base64,'))
  })
})
