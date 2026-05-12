import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';
import type { Task } from '../types';
import { getActiveTaskId, setActiveTaskId } from './runtime';

export const CHANNEL_TASKS = 'nudgecore_tasks';
export const CHANNEL_SERVICE = 'nudgecore_service';
export const TASK_NOTIF_ID = 'current_task';
export const SERVICE_NOTIF_ID = 'nudgecore_service';

export async function setupChannels(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_TASKS,
    name: 'Task Reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    visibility: AndroidVisibility.PUBLIC,
  });
  await notifee.createChannel({
    id: CHANNEL_SERVICE,
    name: 'NudgeCore Service',
    importance: AndroidImportance.LOW,
    vibration: false,
    visibility: AndroidVisibility.SECRET,
  });
}

export async function requestNotifPermission(): Promise<void> {
  await notifee.requestPermission();
}

export async function startForegroundService(): Promise<void> {
  await notifee.displayNotification({
    id: SERVICE_NOTIF_ID,
    title: 'NudgeCore',
    body: 'Watching your task list...',
    android: {
      channelId: CHANNEL_SERVICE,
      importance: AndroidImportance.LOW,
      ongoing: true,
      asForegroundService: true,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  });
}

export async function updateServiceBody(body: string): Promise<void> {
  await notifee.displayNotification({
    id: SERVICE_NOTIF_ID,
    title: 'NudgeCore',
    body,
    android: {
      channelId: CHANNEL_SERVICE,
      importance: AndroidImportance.LOW,
      ongoing: true,
      asForegroundService: true,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  });
}

export async function displayTaskNotification(task: Task): Promise<void> {
  const currentId = getActiveTaskId();
  if (currentId && currentId !== task.id) {
    await notifee.cancelNotification(TASK_NOTIF_ID);
  }

  await notifee.displayNotification({
    id: TASK_NOTIF_ID,
    title: task.title,
    body: task.description ?? 'Tap an action to respond.',
    android: {
      channelId: CHANNEL_TASKS,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: false,
      pressAction: { id: 'default', launchActivity: 'default' },
      actions: [
        { title: 'Done', pressAction: { id: 'done' } },
        { title: 'Working on it', pressAction: { id: 'working' } },
        { title: 'Later', pressAction: { id: 'later' } },
      ],
    },
    data: { taskId: task.id },
  });

  setActiveTaskId(task.id);
}

export async function cancelTaskNotification(): Promise<void> {
  await notifee.cancelNotification(TASK_NOTIF_ID);
  setActiveTaskId(null);
}
