import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
export default function EmailPlan({ activity, plan, travel, timezone, sources }: {
  activity: string; plan: string; travel: any; timezone: string; sources: string[];
}) {
  const [error, setError] = useState('');
  async function compose() {
    const time = (value?: string) => value ? new Date(value).toLocaleString('en-US', { timeZone: timezone }) : '';
    const route = (travel?.legs ?? []).map((leg: any) => [leg.type,
      leg.Transport?.ShortRouteName || leg.Transport?.RouteName || '',
      time(leg.Departure?.Time), leg.Departure?.Place?.Name,
      time(leg.Arrival?.Time), leg.Arrival?.Place?.Name].filter(Boolean).join(' — ')).join('\n');
    const body = [`ReadyFor: ${activity}`, travel?.departure_time ? `Leave by ${time(travel.departure_time)} (${timezone})` : '', route, plan, ...sources].filter(Boolean).join('\n\n');
    try {
      setError('');
      if (Platform.OS !== 'web') {
        const composer = await import('expo-mail-composer');
        if (!await composer.isAvailableAsync()) throw new Error('No email account is configured.');
        await composer.composeAsync({ subject: 'ReadyFor: ' + activity, body });
      } else if (body.length > 1800) {
        const draft = 'X-Unsent: 1\r\nSubject: ReadyFor plan\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n' + body;
        const url = URL.createObjectURL(new Blob([draft], { type: 'message/rfc822' }));
        const link = document.createElement('a'); link.href = url; link.download = 'readyfor-plan.eml'; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setError('Full email draft downloaded. Open it in your email app, choose a recipient, and send.');
      } else { await Linking.openURL(`mailto:?subject=${encodeURIComponent('ReadyFor: ' + activity)}&body=${encodeURIComponent(body)}`); }
    }
    catch { setError('Could not open an email app. Configure an email app on this device and try again.'); }
  }
  return <View style={{ marginTop: 12 }}>
    <Pressable accessibilityRole="button" onPress={compose} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db' }}><Text style={{ fontWeight: '600' }}>Email my plan</Text></Pressable>
    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{error || 'Opens your email app. Choose a recipient, review, and send.'}</Text>
  </View>;
}
