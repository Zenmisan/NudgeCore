/**
 * NudgeCore entry point
 */
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { foregroundServiceTask } from './src/services/foreground';
import { handleDone, handleWorking, handleLater } from './src/services/scheduler';
import { initDB } from './src/db';

enableScreens();

// Foreground service registration — must happen before AppRegistry
notifee.registerForegroundService(foregroundServiceTask);

// Background event handler — fires when the app is not in foreground
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const taskId = detail.notification?.data?.taskId;
  if (!taskId) return;

  initDB();

  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    if (actionId === 'done') await handleDone(taskId);
    else if (actionId === 'working') await handleWorking(taskId);
    else if (actionId === 'later') await handleLater(taskId);
  } else if (type === EventType.DISMISSED) {
    await handleLater(taskId);
  }
});

AppRegistry.registerComponent(appName, () => App);
