import React, { createContext, useContext, useState, useEffect, useReducer, ReactNode, useCallback } from 'react';
import { UserProfile, FetchedObservation, FetchedIncident } from '../types';
import { getAllProfiles } from '../services/profileService';
import { getAllReports, getAllIncidents } from '../services/airtableService';
import { STORAGE_KEYS } from '../constants';

// Define the shape of our context state
interface AppState {
  userProfile: UserProfile | null;
  appTheme: 'dark' | 'light';
  allReports: FetchedObservation[];
  allIncidents: FetchedIncident[];
  personnel: UserProfile[];
  isLoading: boolean;
  error: string | null;
}

// Define actions for our reducer
type Action =
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_APP_THEME'; payload: 'dark' | 'light' }
  | { type: 'SET_DATA'; payload: { reports: FetchedObservation[], incidents: FetchedIncident[], personnel: UserProfile[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFETCH_DATA' };

// Initial state
const initialState: AppState = {
  userProfile: null,
  appTheme: 'dark',
  allReports: [],
  allIncidents: [],
  personnel: [],
  isLoading: true,
  error: null,
};

// Reducer function
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    case 'SET_APP_THEME':
      return { ...state, appTheme: action.payload };
    case 'SET_DATA':
      return { ...state, allReports: action.payload.reports, allIncidents: action.payload.incidents, personnel: action.payload.personnel, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'REFETCH_DATA':
      return { ...state, isLoading: true }; // Trigger a refetch
    default:
      return state;
  }
};

// Create the context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  refetchData: () => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);


// Create the provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const refetchData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [reports, incidents, personnel] = await Promise.all([
        getAllReports(),
        getAllIncidents(),
        getAllProfiles()
      ]);
      dispatch({ type: 'SET_DATA', payload: { reports, incidents, personnel } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to refetch data.' });
    }
  }, []);

  useEffect(() => {
    // Load initial user and theme from localStorage
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (savedProfile) {
      try {
        dispatch({ type: 'SET_USER_PROFILE', payload: JSON.parse(savedProfile) });
      } catch (e) {
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
      }
    }

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light' | null;
    if (savedTheme) {
      dispatch({ type: 'SET_APP_THEME', payload: savedTheme });
    }

    // Initial data fetch
    refetchData();
    
    // Listen for profile updates from other components
    const handleProfileUpdate = () => {
        const updatedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (updatedProfile) {
            try {
                dispatch({ type: 'SET_USER_PROFILE', payload: JSON.parse(updatedProfile) });
            } catch (e) {}
        } else {
            dispatch({ type: 'SET_USER_PROFILE', payload: null });
        }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);

  }, [refetchData]);

  return (
    <AppContext.Provider value={{ state, dispatch, refetchData }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};