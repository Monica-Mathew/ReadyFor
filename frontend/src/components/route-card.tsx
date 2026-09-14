import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type Stop = { Time?: string; Place?: { Name?: string } };
type Leg = {
  type: string;
  duration_minutes?: number;
  wait_before_minutes?: number;
  Departure?: Stop;
  Arrival?: Stop;
  Transport?: { Mode?: string; ShortRouteName?: string; RouteName?: string; LongRouteName?: string; Headsign?: string };
};
export type TransitJourney = {
  arrival_buffer_minutes?: number;
  buffer_reason?: string;
  buffer_source?: string;
  target_arrival_time?: string;
  departure_time?: string;
  arrival_time?: string;
  walking_minutes?: number;
  legs?: Leg[];
  travel_minutes: number;
  distance_meters: number;
};
export default function RouteCard({ journey, timezone, index, count, onSelect }: {
  journey: TransitJourney; timezone: string; index: number; count: number;
  onSelect: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [index, journey]);
  const lineSummary = (journey.legs ?? []).filter(leg => leg.type !== 'Pedestrian').map(leg => {
    const transport = leg.Transport;
    return [transport?.Mode ?? leg.type, transport?.ShortRouteName || transport?.RouteName || transport?.LongRouteName].filter(Boolean).join(' ');
  }).join(' → ') || 'Walking route';
  const time = (value?: string) => value ? new Date(value).toLocaleTimeString('en-US', {
    timeZone: timezone, hour: 'numeric', minute: '2-digit',
  }) : 'Time unavailable';
  const date = journey.departure_time ? new Date(journey.departure_time).toLocaleDateString('en-US', {
    timeZone: timezone, month: 'short', day: 'numeric',
  }) : '';
  const lineStyle = { fontSize: 15, lineHeight: 23, color: '#374151' };
  return (
    <View style={{ marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: '#eef2ff', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {count > 1 ? <Pressable accessibilityLabel="Previous route" accessibilityRole="button"
          disabled={index === 0} onPress={() => onSelect(index - 1)}
          style={{ padding: 12, opacity: index === 0 ? 0.3 : 1 }}>
          <Text style={{ fontSize: 24 }}>‹</Text>
        </Pressable> : null}
        <Text style={{ fontSize: 17, fontWeight: '600' }}>Route {index + 1} of {Math.max(count, 1)}</Text>
        {count > 1 ? <Pressable accessibilityLabel="Next route" accessibilityRole="button"
          disabled={index === count - 1} onPress={() => onSelect(index + 1)}
          style={{ padding: 12, opacity: index === count - 1 ? 0.3 : 1 }}>
          <Text style={{ fontSize: 24 }}>›</Text>
        </Pressable> : null}
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Leave by {time(journey.departure_time)}</Text>
      <Text style={lineStyle}>{date} · Arrive {time(journey.arrival_time)}</Text>
      <Text style={lineStyle}>Arrive by {time(journey.target_arrival_time)} · {journey.arrival_buffer_minutes ?? 15} min early</Text>
      {journey.buffer_reason ? <Text style={lineStyle}>{journey.buffer_source}: {journey.buffer_reason}</Text> : null}
      <Text style={lineStyle}>{journey.travel_minutes} min total · {journey.walking_minutes ?? 0} min walking · {(journey.distance_meters / 1609.344).toFixed(1)} miles</Text>
      <Text style={{ ...lineStyle, fontWeight: '600' }}>{lineSummary}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        onPress={() => setExpanded(previous => !previous)} style={{ paddingVertical: 10 }}>
        <Text style={{ ...lineStyle, fontWeight: '600' }}>{expanded ? 'Hide steps ▴' : 'Show steps ▾'}</Text>
      </Pressable>
      {expanded ? (journey.legs ?? []).map((leg, i) => {
        const transport = leg.Transport;
        const name = leg.type === 'Pedestrian' ? 'Walk' : [transport?.Mode ?? leg.type,
          transport?.ShortRouteName || transport?.RouteName || transport?.LongRouteName].filter(Boolean).join(' ');
        return <View key={i} style={{ borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 12 }}>
          {!!leg.wait_before_minutes && <Text style={lineStyle}>Wait / transfer: {leg.wait_before_minutes} min</Text>}
          <Text style={{ ...lineStyle, fontWeight: '700' }}>{i + 1}. {name} · {leg.duration_minutes ?? '—'} min</Text>
          {transport?.Headsign ? <Text style={lineStyle}>Toward {transport.Headsign}</Text> : null}
          <Text style={lineStyle}>{time(leg.Departure?.Time)} — {leg.Departure?.Place?.Name ?? 'Starting point'}</Text>
          <Text style={lineStyle}>{time(leg.Arrival?.Time)} — {leg.Arrival?.Place?.Name ?? 'End of this leg'}</Text>
        </View>;
      }) : null}
      <Text style={{ fontSize: 12, color: '#6b7280' }}>Scheduled times · {timezone}. Check for service updates before leaving.</Text>
    </View>
  );
}
