import { useState } from 'react';
import * as Location from 'expo-location';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [request, setRequest] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
const [locationError, setLocationError] = useState('');

async function useCurrentLocation() {
  setLocationError('');

  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    setLocationError('Location permission was not granted.');
    return;
  }

  const currentLocation = await Location.getCurrentPositionAsync({});

  setLocation(currentLocation);
}
const [isPreparing, setIsPreparing] = useState(false);
const [prepareMessage, setPrepareMessage] = useState('');
const [prepareError, setPrepareError] = useState('');
async function prepareMe() {
  setPrepareMessage('');
  setPrepareError('');

  if (!request.trim()) {
    setPrepareError('Please enter what you are getting ready for.');
    return;
  }

  setIsPreparing(true);

  try {
    const response = await fetch('http://127.0.0.1:8000/prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: request.trim(),
         latitude: location?.coords.latitude ?? null,
  longitude: location?.coords.longitude ?? null,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }

    const data = await response.json();
    setPrepareMessage(
  data.latitude != null && data.longitude != null
    ? `${data.message}. Location: ${data.latitude}, ${data.longitude}`
    : `${data.message}. No location provided.`
);
  } catch (error) {
    setPrepareError(
      error instanceof Error ? error.message : 'Something went wrong.'
    );
  } finally {
    setIsPreparing(false);
  }
}
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>ReadyFor</Text>

        <Text style={styles.heading}>
          What are you getting ready for?
        </Text>

        <TextInput
          value={request}
          onChangeText={setRequest}
          placeholder="Dentist tomorrow at 2 PM in New Hyde Park..."
          multiline
          style={styles.input}
        />
        <Pressable
  style={styles.locationButton}
  onPress={useCurrentLocation}
>
  <Text style={styles.locationText}>
    {location ? '✓ Current location added' : '⌖ Use my current location'}
  </Text>
</Pressable>

{locationError ? (
  <Text style={styles.errorText}>{locationError}</Text>
) : null}

        <Pressable
  style={styles.button}
  onPress={prepareMe}
  disabled={isPreparing}
>
  <Text style={styles.buttonText}>
    {isPreparing ? 'Sending...' : 'Prepare Me'}
  </Text>
</Pressable>

{prepareMessage ? <Text>{prepareMessage}</Text> : null}

{prepareError ? (
  <Text style={styles.errorText}>{prepareError}</Text>
) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  logo: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 48,
  },

  heading: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
    marginBottom: 20,
  },

  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    textAlignVertical: 'top',
    marginBottom: 16,
  },

  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  locationButton: {
  alignSelf: 'flex-start',
  paddingVertical: 10,
  marginBottom: 8,
},

locationText: {
  fontSize: 15,
  fontWeight: '500',
},

errorText: {
  fontSize: 14,
  marginBottom: 12,
},
});