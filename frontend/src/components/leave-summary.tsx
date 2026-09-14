import { Text, View } from 'react-native';
import type { TransitJourney } from './route-card';
export default function LeaveSummary({ travel, timezone }: { travel: TransitJourney & { target_arrival_time?: string; arrival_buffer_minutes?: number; buffer_source?: string; buffer_reason?: string }; timezone: string }) {
  const format = (value?: string) => value ? new Date(value).toLocaleString('en-US', {
    timeZone: timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : 'Time unavailable';
  return <View style={{ marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: '#eef2ff', gap: 8 }}>
    <Text style={{ fontSize: 22, fontWeight: '700' }}>Leave by {format(travel.departure_time)}</Text>
    <Text>Arrive by {format(travel.target_arrival_time)}</Text>
    <Text>{travel.travel_minutes} min travel + {travel.arrival_buffer_minutes ?? 15} min arrival buffer</Text>
    {travel.distance_meters != null ? <Text style={{ color: '#4b5563' }}>{(travel.distance_meters / 1609.344).toFixed(1)} miles</Text> : null}
    <Text style={{ color: '#4b5563' }}>{travel.buffer_source}: {travel.buffer_reason}</Text>
    <Text style={{ fontSize: 12, color: '#6b7280' }}>{timezone}</Text>
  </View>;
}
