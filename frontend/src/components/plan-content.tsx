import { arrangePlan } from '@/lib/plan-sections';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMarkdown } from 'react-native-marked';

function Markdown({ text }: { text: string }) {
  const elements = useMarkdown(text, { colorScheme: 'light' });
  return <View>{elements}</View>;
}
export function splitBring(text: string) {
  const lines = text.split('\n');
  const heading = (line: string) => line.trim().replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').replace(/:$/, '').trim().toUpperCase();
  const start = lines.findIndex(line => heading(line) === 'BRING');
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && heading(lines[end]) !== 'BEFORE YOU GO' && !/^#{1,6}\s/.test(lines[end])) end++;
  const items: string[] = [], intro: string[] = [];
  for (const line of lines.slice(start + 1, end)) {
    const match = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(?:\[[ xX]\]\s*)?(.*)$/);
    if (match) items.push(match[1]);
    else if (line.trim() && items.length) items[items.length - 1] += '\n' + line.trim();
    else if (line.trim()) intro.push(line);
  }
  if (!items.length) return null;
  return { before: lines.slice(0, start).join('\n'), after: lines.slice(end).join('\n'), intro: intro.join('\n'), items };
}
function ChecklistContent({ text }: { text: string }) {
  const section = useMemo(() => splitBring(text), [text]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  if (!section) return <Markdown text={text} />;
  const done = section.items.filter(item => checked.has(item)).length;
  return <View>
    <Markdown text={section.before} />
    <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 12 }}>BRING</Text>
    <Text accessibilityLiveRegion="polite" style={{ color: '#6b7280', marginVertical: 8 }}>{done} of {section.items.length} packed</Text>
    {section.intro ? <Markdown text={section.intro} /> : null}
    {section.items.map((item, index) => {
      const selected = checked.has(item);
      return <Pressable key={index} accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }} accessibilityLabel={item.replace(/\*\*/g, '')}
        onPress={() => setChecked(previous => { const next = new Set(previous); if (next.has(item)) next.delete(item); else next.add(item); return next; })}
        style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 8, minHeight: 44 }}>
        <Text style={{ fontSize: 22, color: '#111827' }}>{selected ? '☑' : '☐'}</Text>
        <View style={{ flex: 1, opacity: selected ? 0.55 : 1 }}><Markdown text={item} /></View>
      </Pressable>;
    })}
    <Markdown text={section.after} />
  </View>;
}

const labels: Record<string, string> = {
  WEATHER: 'Weather', 'WEATHER & WHAT TO WEAR': 'Weather & what to wear',
  BRING: 'Things to bring', 'BEFORE YOU GO': 'Before you go',
  'PREPARATION STEPS': 'Preparation overview', 'SOURCES READ': 'Sources & links',
  'RESEARCH SOURCES': 'Sources & links', 'DETAILS TO CONFIRM': 'Refine your plan (optional)',
  'SOME DETAILS NEED CONFIRMATION': 'Some details need confirmation',
  'APPOINTMENT & ARRIVAL': 'Appointment & arrival', 'LEAVE BY': 'Leave time', 'YOUR ROUTE': 'Your route',
};
export default function PlanContent({ text }: { text: string }) {
  const sections = useMemo(() => arrangePlan(text), [text]);
  const [opened, setOpened] = useState<Record<number, boolean>>({});
  useEffect(() => setOpened({}), [text]);
  const isOpen = (index: number) => opened[index] ?? /^(WEATHER|WEATHER & WHAT TO WEAR|BRING|APPOINTMENT & ARRIVAL|LEAVE BY|STEP \d+.*)$/i.test(sections[index].title);
  const allOpen = sections.every((_, index) => isOpen(index));
  const hasInlineWarning = sections.some(section => section.warning);
  const hasWarningSection = sections.some(section => section.title.toUpperCase() === 'SOME DETAILS NEED CONFIRMATION');
  return <View style={{ gap: 12, marginTop: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{sections.length} sections · open what you need</Text>
      <Pressable accessibilityRole="button" onPress={() => setOpened(Object.fromEntries(sections.map((_, i) => [i, !allOpen])))} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
        <Text style={{ color: '#374151', fontWeight: '600' }}>{allOpen ? 'Collapse all' : 'Expand all'}</Text>
      </Pressable>
    </View>
    {hasInlineWarning && !hasWarningSection ? <View style={{ padding: 14, backgroundColor: '#fffbeb', borderRadius: 12 }}>
      <Text style={{ color: '#92400e' }}>Some details need confirmation. Sections marked “Check details” contain information that was not verified from the retrieved source.</Text>
    </View> : null}
    {sections.map((section, index) => {
      const expanded = isOpen(index);
      const kind = section.title.toUpperCase();
      const alert = kind === 'SOME DETAILS NEED CONFIRMATION';
      const label = labels[kind] || section.title;
      return <View key={index} style={{ borderWidth: 1, borderColor: alert ? '#fcd34d' : '#e5e7eb', borderRadius: 14, backgroundColor: alert ? '#fffbeb' : '#ffffff', overflow: 'hidden' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded }} onPress={() => setOpened(previous => ({ ...previous, [index]: !expanded }))}
          style={({ pressed }) => ({ padding: 16, minHeight: 60, flexDirection: 'row', gap: 12, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, lineHeight: 23, fontWeight: '600', color: alert ? '#92400e' : '#111827' }}>{label}</Text>
            {section.warning ? <Text style={{ color: '#92400e', fontSize: 12, marginTop: 4 }}>Check details · not verified from source</Text> : null}
            {alert && !expanded ? <Text style={{ color: '#92400e', fontSize: 13, marginTop: 4 }}>Open this notice before using the instructions.</Text> : null}
          </View>
          <Text style={{ color: '#6b7280', fontSize: 20 }}>{expanded ? '−' : '+'}</Text>
        </Pressable>
        <View style={{ display: expanded ? 'flex' : 'none', paddingHorizontal: 16, paddingBottom: 16 }}>
          {section.warning ? <Text style={{ color: '#92400e', lineHeight: 20, marginBottom: 10 }}>Confirm the uncertain details in this section with the linked official source.</Text> : null}
          <ChecklistContent text={kind === 'BRING' ? '### BRING\n' + section.body : section.body} />
        </View>
      </View>;
    })}
  </View>;
}
