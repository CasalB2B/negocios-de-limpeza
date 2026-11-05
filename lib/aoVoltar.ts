import { useEffect, useRef } from 'react';

// Phones freeze a backgrounded app: realtime events are lost and timers stop. When the user comes
// back (unlock, app switch, tab focus, network back), run `atualizar` again, at most once per `intervaloMs`.
export function useAoVoltar(atualizar: () => void, intervaloMs = 30_000) {
  const fn = useRef(atualizar);
  fn.current = atualizar;
  const ultima = useRef(Date.now());

  useEffect(() => {
    const voltar = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - ultima.current < intervaloMs) return;
      ultima.current = Date.now();
      fn.current();
    };
    document.addEventListener('visibilitychange', voltar);
    window.addEventListener('focus', voltar);
    window.addEventListener('pageshow', voltar);
    window.addEventListener('online', voltar);
    return () => {
      document.removeEventListener('visibilitychange', voltar);
      window.removeEventListener('focus', voltar);
      window.removeEventListener('pageshow', voltar);
      window.removeEventListener('online', voltar);
    };
  }, [intervaloMs]);
}

// A request in flight when the phone sleeps may never settle; give up after `ms` so the next sync can run.
export function comLimite<T>(p: PromiseLike<T>, ms = 20_000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}
