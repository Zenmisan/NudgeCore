import { getNextTask, markTaskDone, snoozeTask } from '../db';
import {
  displayTaskNotification,
  cancelTaskNotification,
  updateServiceBody,
} from './notifications';
import { getActiveTaskId, setLastEvaluatedAt } from './runtime';
import { randomSnoozeMs } from '../utils';

const WORKING_SNOOZE_MS = 25 * 60 * 1000;

export async function evaluateAndDisplay(): Promise<void> {
  setLastEvaluatedAt(Date.now());
  const task = await getNextTask();

  if (!task) {
    const activeId = getActiveTaskId();
    if (activeId) {
      await cancelTaskNotification();
    }
    await updateServiceBody('No pending tasks.');
    return;
  }

  const activeId = getActiveTaskId();
  if (activeId === task.id) {
    return;
  }

  await displayTaskNotification(task);
  await updateServiceBody(`Up next: ${task.title}`);
}

export async function handleDone(taskId: string): Promise<void> {
  await cancelTaskNotification();
  await markTaskDone(taskId);
  await evaluateAndDisplay();
}

export async function handleWorking(taskId: string): Promise<void> {
  await cancelTaskNotification();
  await snoozeTask(taskId, Date.now() + WORKING_SNOOZE_MS);
  await evaluateAndDisplay();
}

export async function handleLater(taskId: string): Promise<void> {
  await cancelTaskNotification();
  await snoozeTask(taskId, Date.now() + randomSnoozeMs());
  await evaluateAndDisplay();
}
