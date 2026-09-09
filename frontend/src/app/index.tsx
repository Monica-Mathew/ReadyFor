import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
type PlaceSuggestion = {
  title: string;
  place_id: string;
  address: string;
};
export default function HomeScreen() {
  const [request, setRequest] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] =
    useState<PlaceSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
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
  const [showDetails, setShowDetails] = useState(false);
  const [destination, setDestination] = useState('');
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
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status}).`);
      }

      const data = await response.json();
      console.log('Backend time zone:', data.timezone);
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
  useEffect(() => {
    setSuggestions([]);
    setSearchError('');
    setIsSearching(false);

    const query = destination.trim();

    if (!showDetails || selectedPlace || query.length < 3 || !location) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      setIsSearching(true);

      try {
        const params = new URLSearchParams({
          query,
          latitude: String(location.coords.latitude),
          longitude: String(location.coords.longitude),
        });

        const response = await fetch(
          `http://127.0.0.1:8000/places/suggest?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Could not search places. Please try again.');
        }

        const data = await response.json();

        if (active) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        if (active) {
          setSearchError(
            error instanceof Error ? error.message : 'Place search failed.'
          );
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [destination, location, selectedPlace, showDetails]);
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
          style={styles.detailsToggle}
          onPress={() => setShowDetails((previous) => !previous)}
        >
          <Text style={styles.locationText}>
            {showDetails ? '− Appointment details' : '+ Appointment details'}
          </Text>
        </Pressable>

        {showDetails ? (
          <View style={styles.detailsSection}>
            <Text style={styles.fieldLabel}>Destination</Text>

            <TextInput
              value={destination}
              onChangeText={(text) => {
                setDestination(text);
                setSelectedPlace(null);
                setSuggestions([]);
                setSearchError('');
              }}
              placeholder="Search for a place or address"
              placeholderTextColor="#6b7280"
              style={styles.destinationInput}
              autoCorrect={false}
            />

            {!location ? (
              <Text style={styles.searchHint}>
                Tap “Use my current location” below to enable nearby suggestions.
              </Text>
            ) : null}

            {isSearching ? (
              <Text style={styles.searchHint}>Searching places…</Text>
            ) : null}

            {searchError ? (
              <Text style={styles.errorText}>{searchError}</Text>
            ) : null}

            {suggestions.length > 0 ? (
              <View style={styles.suggestionList}>
                {suggestions.map((place) => (
                  <Pressable
                    key={place.place_id}
                    style={styles.suggestionItem}
                    accessibilityRole="button"
                    accessibilityLabel={`${place.title}, ${place.address}`}
                    onPress={() => {
                      setSelectedPlace(place);
                      setDestination(place.title);
                      setSuggestions([]);
                    }}
                  >
                    <Text style={styles.suggestionTitle}>{place.title}</Text>
                    <Text style={styles.suggestionAddress}>{place.address}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {selectedPlace ? (
              <Text style={styles.searchHint}>
                ✓ Selected: {selectedPlace.address || selectedPlace.title}
              </Text>
            ) : null}
          </View>
        ) : null}
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
  detailsToggle: {
    paddingVertical: 12,
  },

  detailsSection: {
    marginTop: 4,
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  destinationInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  searchHint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },

  suggestionList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },

  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },

  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  suggestionAddress: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});