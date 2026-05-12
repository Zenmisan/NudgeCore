import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'nudgecore_runtime' });

const KEYS = {
  ACTIVE_TASK_ID: 'activeTaskId',
  SERVICE_STATE: 'serviceState',
  LAST_EVALUATED_AT: 'lastEvaluatedAt',
} as const;

export function getActiveTaskId(): string | undefined {
  return storage.getString(KEYS.ACTIVE_TASK_ID);
}

export function setActiveTaskId(id: string | null): void {
  if (id === null) {
    storage.remove(KEYS.ACTIVE_TASK_ID);
  } else {
    storage.set(KEYS.ACTIVE_TASK_ID, id);
  }
}

export function getServiceState(): string {
  return storage.getString(KEYS.SERVICE_STATE) ?? 'idle';
}

export function setServiceState(state: 'running' | 'idle'): void {
  storage.set(KEYS.SERVICE_STATE, state);
}

export function setLastEvaluatedAt(ts: number): void {
  storage.set(KEYS.LAST_EVALUATED_AT, ts);
}
