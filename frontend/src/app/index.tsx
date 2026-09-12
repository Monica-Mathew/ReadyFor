import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useMarkdown } from 'react-native-marked';
import AppointmentPicker from '@/components/appointment-picker';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
type PlaceSuggestion = {
  title: string;
  place_id: string;
  address: string;
};
type PlaceDetails = PlaceSuggestion & {
  latitude: number;
  longitude: number;
};
type TravelEstimate = {
  travel_minutes: number;
  distance_meters: number;
};
function PlanContent({ text }: { text: string }) {
  const elements = useMarkdown(text, { colorScheme: 'light' });

  return <View>{elements}</View>;
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const scrollRef = useRef<ScrollView>(null);
  const [editing, setEditing] = useState(false);
  const [request, setRequest] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] =
    useState<PlaceSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [destinationDetails, setDestinationDetails] =
  useState<PlaceDetails | null>(null);
const [isLoadingDetails, setIsLoadingDetails] = useState(false);
const [detailsError, setDetailsError] = useState('');
const [travel, setTravel] = useState<TravelEstimate | null>(null);
const [plan, setPlan] = useState('');
  useEffect(() => {
    if (plan && !isWide && !editing) {
      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [plan, isWide, editing]);
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
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);

  async function prepareMe() {
    setPrepareMessage('');
    setPrepareError('');
    setTravel(null); 
    setPlan('');
    if (!request.trim()) {
      setPrepareError('Please enter what you are getting ready for.');
      return;
    }
if (
  destination.trim() &&
  (
    !selectedPlace ||
    !destinationDetails ||
    destinationDetails.place_id !== selectedPlace.place_id ||
    isLoadingDetails
  )
) {
  setPrepareError(
    'Please select a destination and wait for it to finish loading.'
  );
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
          destination:
    destinationDetails?.place_id === selectedPlace?.place_id
      ? destinationDetails
      : null,
      appointment_time: appointmentTime?.toISOString() ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status}).`);
      }

      const data = await response.json();
      setEditing(false);
      setPlan(data.plan ?? '');
      setTravel(data.travel ?? null);
      console.log('Prepare response:', data);
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
  useEffect(() => {
  setDestinationDetails(null);
  setDetailsError('');
  setIsLoadingDetails(false);

  if (!selectedPlace) {
    return;
  }

  const controller = new AbortController();
  let active = true;

  async function loadDetails() {
    setIsLoadingDetails(true);

    try {
      const params = new URLSearchParams({
        place_id: selectedPlace!.place_id,
      });

      const response = await fetch(
        `http://127.0.0.1:8000/places/details?${params}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(
          'Could not load this destination. Please select it again.'
        );
      }

      const data: PlaceDetails = await response.json();

      if (active) {
        setDestinationDetails(data);
      }
    } catch (error) {
      if (active) {
        setDetailsError(
          error instanceof Error
            ? error.message
            : 'Could not load destination details.'
        );
      }
    } finally {
      if (active) {
        setIsLoadingDetails(false);
      }
    }
  }

  loadDetails();

  return () => {
    active = false;
    controller.abort();
  };
}, [selectedPlace]);
  return (
    <SafeAreaView style={styles.safeArea}>
  <ScrollView
    ref={scrollRef}
    style={{ flex: 1 }}
    contentContainerStyle={styles.container}
    keyboardShouldPersistTaps="handled"
  >
      <Text style={styles.logo}>ReadyFor</Text>
      <View style={[styles.layout, isWide && styles.wideLayout]}>
      {isWide || !plan || editing ? (
      <View style={[styles.formPanel, isWide && styles.wideForm]}>
        {!isWide && plan ? (
          <Pressable onPress={() => setEditing(false)} style={styles.editButton}>
            <Text style={styles.locationText}>Back to plan</Text>
          </Pressable>
        ) : null}

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
            <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>Appointment date and time</Text>

      <AppointmentPicker
        value={appointmentTime}
        onChange={setAppointmentTime}
      />

      <Text style={styles.searchHint}>
        Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </Text>
    </View>
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

            {isLoadingDetails ? (
  <Text style={styles.searchHint}>Loading destination…</Text>
) : null}

{detailsError ? (
  <Text style={styles.errorText}>{detailsError}</Text>
) : null}

{destinationDetails ? (
  <Text style={styles.searchHint}>
    ✓ Destination ready: {destinationDetails.address}
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
        {prepareError ? (
          <Text style={styles.errorText}>{prepareError}</Text>
        ) : null}
      </View>
      ) : null}
      {isWide || (plan && !editing) ? (
      <View style={styles.resultsPanel}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>Your plan</Text>
          {!isWide && plan ? (
            <Pressable onPress={() => setEditing(true)} style={styles.editButton}>
              <Text style={styles.locationText}>Edit appointment</Text>
            </Pressable>
          ) : null}
        </View>
        {!plan ? (
          <Text style={styles.emptyPlan}>
            {isPreparing ? 'Preparing your plan…' : 'Add your appointment and select Prepare Me to see your plan here.'}
          </Text>
        ) : null}
        {plan ? (
  <View style={styles.travelCard}>
    <PlanContent text={plan} />
  </View>
) : null}
        {travel ? (
  <View style={styles.travelCard}>
    <Text style={styles.travelLabel}>Estimated drive</Text>

    <Text style={styles.travelTime}>
      {travel.travel_minutes} min
    </Text>

    <Text style={styles.travelDistance}>
      {(travel.distance_meters / 1609.344).toFixed(1)} miles
    </Text>
  </View>
) : null}




      </View>
      ) : null}
      </View>
        </ScrollView>
</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 28, alignItems: 'stretch' },
  wideLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  formPanel: { width: '100%' },
  wideForm: { width: '47%', flexShrink: 0 },
  resultsPanel: { flex: 1, minWidth: 0, width: '100%' },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
  },
  resultTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  editButton: { paddingVertical: 12, paddingHorizontal: 4 },
  emptyPlan: {
    marginTop: 16, padding: 24, borderRadius: 12,
    backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: 16, lineHeight: 24,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  logo: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },

  heading: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 20,
  },

  input: {
    minHeight: 88,
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
  travelCard: {
  marginTop: 16,
  padding: 16,
  borderRadius: 12,
  backgroundColor: '#f3f4f6',
},

travelLabel: {
  fontSize: 14,
  color: '#4b5563',
},

travelTime: {
  fontSize: 24,
  fontWeight: '700',
  color: '#111827',
  marginTop: 4,
},

travelDistance: {
  fontSize: 14,
  color: '#4b5563',
  marginTop: 4,
},
container: {
  flexGrow: 1,
  paddingHorizontal: 24,
  paddingTop: 24,
  paddingBottom: 48,
  maxWidth: 1200,
  width: '100%',
  alignSelf: 'center',
},
});