import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  isMocked: boolean;
}

export interface LocationState {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
    permissionGranted: false,
  });

  // Request permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setState(prev => ({
        ...prev,
        permissionGranted: status === 'granted',
      }));
    } catch (e) {
      console.log('Error checking location permissions');
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setState(prev => ({
        ...prev,
        permissionGranted: granted,
        error: granted ? null : 'Location permission denied',
      }));
      return granted;
    } catch (e) {
      setState(prev => ({
        ...prev,
        error: 'Failed to request location permission',
      }));
      return false;
    }
  };

  const getCurrentLocation = useCallback(async (): Promise<UserLocation | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check/request permission first
      if (!state.permissionGranted) {
        const granted = await requestPermission();
        if (!granted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Location permission is required to check in',
          }));
          return null;
        }
      }

      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      // Check for mock location (Android only)
      let isMocked = false;
      if (Platform.OS === 'android') {
        // On Android, we can check if the location is mocked
        isMocked = location.mocked || false;
      }

      const userLocation: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 100,
        isMocked,
      };

      setState(prev => ({
        ...prev,
        location: userLocation,
        loading: false,
        error: null,
      }));

      return userLocation;
    } catch (e: any) {
      let errorMessage = 'Could not get your location';
      
      if (e.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location services are unavailable. Please enable GPS.';
      } else if (e.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return null;
    }
  }, [state.permissionGranted]);

  return {
    ...state,
    requestPermission,
    getCurrentLocation,
    checkPermissions,
  };
}

export default useLocation;
