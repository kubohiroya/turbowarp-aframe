/** The A-Frame this extension is built and tested against, including three-vrm on its Three.js. */
export const aframeVersion = '1.8.0';
export const aframeUrl = `https://cdn.jsdelivr.net/npm/aframe@${aframeVersion}/dist/aframe-v${aframeVersion}.min.js`;
/** Subresource integrity of `aframeUrl`, so a changed file on the CDN is refused. */
export const aframeIntegrity =
  'sha384-d2HJ2eWTxYenz2Vcmsy7gDZW7G2Gq51k1M15G7vv2O/S60nSNYZVjtgGzPnd3sG+';
const loadTimeoutMs = 30_000;

interface AFrameGlobal {
  AFRAME?: {version?: string};
  __twAframeLoading?: Promise<void>;
}

/**
 * Makes sure A-Frame 1.8.0 is on the page, loading it from jsDelivr when it is not.
 *
 * A page that already has A-Frame 1.8.0, such as an offline venue that serves its own copy,
 * loads nothing. Any other A-Frame version is refused, because a second copy cannot be
 * loaded beside it and three-vrm is verified on 1.8.0 only. Without a document, as in tests
 * and non-browser runtimes, the scene graph works without A-Frame and nothing is loaded.
 */
export async function ensureAFrame(): Promise<void> {
  const state = globalThis as AFrameGlobal;
  if (state.AFRAME !== undefined) {
    requireVersion(state.AFRAME);
    return;
  }
  const head = typeof document === 'undefined' ? undefined : document.head;
  if (head === undefined || head === null) return;
  state.__twAframeLoading ??= load(head).catch((error: unknown) => {
    delete state.__twAframeLoading;
    throw error;
  });
  await state.__twAframeLoading;
}

function load(head: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = (reason: string) => {
      clearTimeout(timer);
      script.remove();
      reject(new Error(`Could not load A-Frame ${aframeVersion} from ${aframeUrl}: ${reason}`));
    };
    const timer = setTimeout(() => fail(`no response in ${loadTimeoutMs / 1000} s`), loadTimeoutMs);
    script.src = aframeUrl;
    script.integrity = aframeIntegrity;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      clearTimeout(timer);
      const loaded = (globalThis as AFrameGlobal).AFRAME;
      if (loaded === undefined) {
        reject(new Error(`A-Frame ${aframeVersion} loaded but did not define AFRAME.`));
        return;
      }
      try {
        requireVersion(loaded);
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    script.onerror = () => fail('the request failed or the file did not match its integrity hash');
    head.append(script);
  });
}

function requireVersion(aframe: {version?: string}): void {
  if (aframe.version !== aframeVersion) {
    throw new Error(
      `A-Frame ${aframe.version ?? '(unknown version)'} is already on the page; TurboWarp-A-Frame needs ${aframeVersion}.`
    );
  }
}
