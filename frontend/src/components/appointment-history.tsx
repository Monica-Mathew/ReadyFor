import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { SavedAppointment } from '@/lib/appointment-types';
export default function AppointmentHistory({ items, onView, onReuse, onDelete }: {
  items: SavedAppointment[]; onView: (item: SavedAppointment) => void;
  onReuse: (item: SavedAppointment) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const matches = items.filter(item => [item.data.request, item.data.destination?.address, item.data.appointment_time, item.data.plan].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <View style={{ marginBottom: 16 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ paddingVertical: 12 }}><Text style={{ fontWeight: '600' }}>Past appointments ({items.length}) {open ? '▴' : '▾'}</Text></Pressable>
    {open ? <View style={{ gap: 10 }}>
      <TextInput accessibilityLabel="Search past appointments" placeholder="Search activity, place, date or plan" value={query} onChangeText={setQuery} style={{ borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 12 }} />
      <Text style={{ color: '#6b7280', fontSize: 12 }}>Saved on this device only. Old plans do not update automatically.</Text>
      {matches.length ? matches.map(item => <View key={item.id} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>{item.data.request}</Text>
        <Text>{item.data.destination?.title}</Text>
        <Text>{item.data.appointment_time ? new Date(item.data.appointment_time).toLocaleString() : 'No appointment time'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          <Pressable onPress={() => { onView(item); setOpen(false); }} style={{ paddingVertical: 10 }}><Text>View plan</Text></Pressable>
          <Pressable onPress={() => { onReuse(item); setOpen(false); }} style={{ paddingVertical: 10 }}><Text>Use details again</Text></Pressable>
          <Pressable onPress={() => setConfirm(item.id)} style={{ paddingVertical: 10 }}><Text>Delete</Text></Pressable>
        </View>
        {confirm === item.id ? <View style={{ flexDirection: 'row', gap: 20 }}>
          <Pressable onPress={() => { onDelete(item.id); setConfirm(null); }} style={{ paddingVertical: 10 }}><Text>Confirm delete</Text></Pressable>
          <Pressable onPress={() => setConfirm(null)} style={{ paddingVertical: 10 }}><Text>Keep</Text></Pressable>
        </View> : null}
      </View>) : <Text>No matching appointments.</Text>}
    </View> : null}
  </View>;
}
