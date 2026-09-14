import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const KIND = 'readyfor-leave';
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
export async function pendingReminders() {
  return (await Notifications.getAllScheduledNotificationsAsync()).filter(item => item.content.data?.kind === KIND);
}
export async function cancelReminders() {
  for (const item of await pendingReminders()) await Notifications.cancelScheduledNotificationAsync(item.identifier);
}
export async function scheduleLeave(departure: string, activity: string, destination: string) {
  const date = new Date(departure);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('That leave time has passed. Prepare a new plan first.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('leave-reminders', {
      name: 'Leave-time reminders', importance: Notifications.AndroidImportance.HIGH, sound: 'default',
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    throw new Error('Notifications are off. Enable them for ReadyFor in your phone settings, then try again.');
  }
  if (date.getTime() <= Date.now()) throw new Error('That leave time has passed. Prepare a new plan first.');
  const previous = await pendingReminders();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to head out!',
      body: `Leave now for ${activity}${destination ? ' at ' + destination : ''}. Check your Bring list before you go.`,
      sound: 'default', data: { kind: KIND, departure, activity, destination },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'leave-reminders' },
  });
  try {
    for (const item of previous) await Notifications.cancelScheduledNotificationAsync(item.identifier);
  } catch {
    // Avoid silently keeping both the old and new reminder.
    await Notifications.cancelScheduledNotificationAsync(id);
    throw new Error('Could not replace the previous reminder. Check or cancel it before trying again.');
  }
  return id;
}
