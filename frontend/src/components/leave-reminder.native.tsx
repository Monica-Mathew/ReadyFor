import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import { cancelReminders, pendingReminders, scheduleLeave } from '@/lib/leave-notifications';

type Saved = { departure: string; activity: string; destination: string };
export default function LeaveReminder({ departure, activity, destination, timezone }: Saved & { timezone: string }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function refresh() {
    const item = (await pendingReminders())[0];
    const data = item?.content.data;
    setSaved(data && typeof data.departure === 'string' ? {
      departure: data.departure, activity: String(data.activity ?? ''), destination: String(data.destination ?? ''),
    } : null);
  }
  useEffect(() => {
    refresh().catch(() => setMessage('Could not read scheduled reminders.'));
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refresh().catch(() => setMessage('Could not read scheduled reminders.'));
    });
    return () => listener.remove();
  }, []);
  const same = saved?.departure === departure && saved?.activity === activity && saved?.destination === destination;
  const time = (value: string) => new Date(value).toLocaleString('en-US', {
    timeZone: timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  async function change(cancel = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      if (cancel) { await cancelReminders(); setSaved(null); setMessage('Reminder cancelled.'); }
      else {
        await scheduleLeave(departure, activity, destination);
        setSaved({ departure, activity, destination }); setMessage('Reminder scheduled on this phone.');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update the reminder. Check notification and alarm permissions in phone settings.'); }
    finally { setBusy(false); lock.current = false; }
  }
  return <View style={{ marginTop: 12, gap: 8 }}>
    {saved ? <Text style={{ color: '#4b5563' }}>Current reminder: {time(saved.departure)}{same ? '' : ' — for your previous selection'}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy || same} onPress={() => change()}
      style={{ padding: 14, borderRadius: 12, backgroundColor: '#111827', opacity: same ? 0.65 : 1 }}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{busy ? 'Updating reminder…' : same ? 'Reminder set' : saved ? 'Update reminder to this route' : 'Remind me on this phone'}</Text>
      <Text style={{ color: '#fff', marginTop: 4 }}>Leave at {time(departure)}</Text>
    </Pressable>
    {saved ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => change(true)} style={{ paddingVertical: 10 }}>
      <Text>Cancel reminder</Text>
    </Pressable> : null}
    <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, color: '#6b7280' }}>{message || 'One active leave-time reminder. Delivery follows your phone’s notification settings.'}</Text>
    {message && !saved ? <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} style={{ paddingVertical: 8 }}><Text>Open phone settings</Text></Pressable> : null}
  </View>;
}
