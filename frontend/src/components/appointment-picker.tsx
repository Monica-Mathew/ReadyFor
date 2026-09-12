import { useState } from 'react';
import { Button, Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  value: Date | null;
  onChange: (value: Date | null) => void;
};

export default function AppointmentPicker({ value, onChange }: Props) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);

  return (
    <View style={{ gap: 8 }}>
      <Button
        title={value ? value.toLocaleDateString() : 'Choose date'}
        onPress={() => setMode('date')}
      />

      <Button
        title={
          value
            ? value.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'Choose time'
        }
        disabled={!value}
        onPress={() => setMode('time')}
      />

      {mode ? (
        <>
          <DateTimePicker
            value={value ?? new Date()}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_event, date) => {
              const next = new Date(date);
              next.setSeconds(0, 0);
              onChange(next);

              if (Platform.OS === 'android') {
                setMode(null);
              }
            }}
            onDismiss={() => setMode(null)}
          />

          {Platform.OS === 'ios' ? (
            <Button title="Done" onPress={() => setMode(null)} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}