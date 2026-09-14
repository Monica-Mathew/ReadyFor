import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
export default function LeaveReminder({ departure, activity, destination, timezone }: {
  departure: string; activity: string; destination: string; timezone: string;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function download() {
    if (new Date(departure).getTime() <= Date.now()) { setMessage('That leave time has passed. Prepare a new plan first.'); return; }
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ departure, activity, destination });
      const url = `http://127.0.0.1:8000/reminder.ics?${params}`;
      if (Platform.OS === 'web') {
        const response = await fetch(url);
        if (!response.ok) { const error = await response.json(); throw new Error(error.detail ?? 'Could not create the reminder.'); }
        const blobUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = blobUrl; link.download = 'readyfor-reminder.ics';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else { await Linking.openURL(url); }
      setMessage('Open the calendar file, save the event, and check its alert setting. If you change routes, update the saved event.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create the reminder.'); }
    finally { setBusy(false); }
  }
  return <View style={{ marginTop: 12 }}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={download}
      style={{ borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 12 }}>
      <Text style={{ fontWeight: '600' }}>{busy ? 'Creating reminder…' : 'Remind me — add to calendar'}</Text>
      <Text style={{ marginTop: 4, color: '#4b5563' }}>Leave at {new Date(departure).toLocaleString('en-US', { timeZone: timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
    </Pressable>
    <Text accessibilityLiveRegion="polite" style={{ color: '#6b7280', marginTop: 6, fontSize: 13 }}>{message || 'Save the downloaded event in your calendar to enable the reminder.'}</Text>
  </View>;
}
