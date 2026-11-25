import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { t } from '../../i18n';

type Props = {
  /** Called once per decoded code; the same code is ignored for `cooldownMs`. */
  onDetected: (code: string) => void;
  onClose: () => void;
  paused?: boolean;
  cooldownMs?: number;
};

/**
 * Phone/tablet camera scanner (QR + CODE128). Needs HTTPS (or localhost) for camera access.
 * Zebra devices should use their hardware trigger instead (DataWedge keyboard output).
 */
export function CameraScanner({ onDetected, onClose, paused = false, cooldownMs = 2500 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const pausedRef = useRef(paused);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  pausedRef.current = paused;
  onDetectedRef.current = onDetected;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(t('camera.https'));
        setStarting(false);
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current!,
          (result) => {
            if (!result || pausedRef.current) return;
            const text = result.getText().trim();
            const now = Date.now();
            if (text === lastRef.current.code && now - lastRef.current.at < cooldownMs) return;
            lastRef.current = { code: text, at: now };
            onDetectedRef.current(text);
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (err: any) {
        const name = err?.name ?? '';
        setError(
          name === 'NotAllowedError'
            ? t('camera.denied')
            : name === 'NotFoundError'
              ? t('camera.none')
              : t('camera.failed', { error: err?.message ?? name ?? '?' }),
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [cooldownMs]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-line bg-black">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/70" />
        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">{t('camera.starting')}</div>
        )}
      </div>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded border border-linestrong px-4 py-2 text-sm font-semibold text-soft hover:text-ink"
      >
        {t('camera.close')}
      </button>
    </div>
  );
}
