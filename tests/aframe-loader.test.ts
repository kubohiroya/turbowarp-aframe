import {afterEach, describe, expect, it, vi} from 'vitest';
import {aframeIntegrity, aframeUrl, ensureAFrame} from '../src/aframe-loader.js';

class FakeScript {
  public src = '';
  public integrity = '';
  public crossOrigin: string | null = null;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public removed = false;

  public remove(): void {
    this.removed = true;
  }
}

function stubDocument() {
  const scripts: FakeScript[] = [];
  vi.stubGlobal('document', {
    head: {append: (script: FakeScript) => scripts.push(script)},
    createElement: () => new FakeScript()
  });
  return scripts;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (globalThis as {__twAframeLoading?: unknown}).__twAframeLoading;
});

describe('ensureAFrame', () => {
  it('loads A-Frame 1.8.0 once from jsDelivr with its integrity hash', async () => {
    const scripts = stubDocument();
    const first = ensureAFrame();
    const second = ensureAFrame();
    expect(scripts).toHaveLength(1);
    const [script] = scripts;
    expect(script?.src).toBe('https://cdn.jsdelivr.net/npm/aframe@1.8.0/dist/aframe-v1.8.0.min.js');
    expect(script?.src).toBe(aframeUrl);
    expect(script?.integrity).toBe(aframeIntegrity);
    expect(script?.crossOrigin).toBe('anonymous');

    vi.stubGlobal('AFRAME', {version: '1.8.0'});
    script?.onload?.();
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    await ensureAFrame();
    expect(scripts).toHaveLength(1);
  });

  it('uses A-Frame 1.8.0 that the page already has, and refuses any other version', async () => {
    const scripts = stubDocument();
    vi.stubGlobal('AFRAME', {version: '1.8.0'});
    await expect(ensureAFrame()).resolves.toBeUndefined();
    vi.stubGlobal('AFRAME', {version: '1.7.1'});
    await expect(ensureAFrame()).rejects.toThrow(
      'A-Frame 1.7.1 is already on the page; TurboWarp-A-Frame needs 1.8.0.'
    );
    expect(scripts).toHaveLength(0);
  });

  it('reports a failed load and tries again on the next call', async () => {
    const scripts = stubDocument();
    const failed = ensureAFrame();
    scripts[0]?.onerror?.();
    await expect(failed).rejects.toThrow(/integrity hash/u);
    expect(scripts[0]?.removed).toBe(true);

    const retry = ensureAFrame();
    expect(scripts).toHaveLength(2);
    vi.stubGlobal('AFRAME', {version: '1.8.0'});
    scripts[1]?.onload?.();
    await expect(retry).resolves.toBeUndefined();
  });

  it('gives up when the CDN does not answer', async () => {
    vi.useFakeTimers();
    const scripts = stubDocument();
    const loading = ensureAFrame();
    const settled = expect(loading).rejects.toThrow(/no response in 30 s/u);
    await vi.advanceTimersByTimeAsync(30_000);
    await settled;
    expect(scripts[0]?.removed).toBe(true);
  });

  it('loads nothing without a document', async () => {
    await expect(ensureAFrame()).resolves.toBeUndefined();
  });
});
