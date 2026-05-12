import { initDB } from '../db';
import { evaluateAndDisplay } from './scheduler';

const INTERVAL_MS = 30_000;

export const foregroundServiceTask = (_notification: any): Promise<void> => {
  return new Promise(async () => {
    try {
      initDB();
      await evaluateAndDisplay();
    } catch (_) {}

    setInterval(async () => {
      try {
        await evaluateAndDisplay();
      } catch (_) {}
    }, INTERVAL_MS);

    // Promise intentionally never resolves — keeps the foreground service alive.
  });
};
