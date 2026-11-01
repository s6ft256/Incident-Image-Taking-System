import React, { createContext, useContext, useEffect, useReducer, ReactNode, useCallback } from 'react';
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
  | { type: 'SET_DATA'; payload: { reports?: FetchedObservation[], incidents?: FetchedIncident[], personnel?: UserProfile[], error: string | null } }
  | { type: 'ADD_OBSERVATION'; payload: FetchedObservation }
  | { type: 'ADD_INCIDENT'; payload: FetchedIncident }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFETCH_DATA' };

// Initial state
const initialState: AppState = {
  userProfile: null,
  appTheme: 'light',
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
      return {
        ...state,
        allReports: action.payload.reports ?? state.allReports,
        allIncidents: action.payload.incidents ?? state.allIncidents,
        personnel: action.payload.personnel ?? state.personnel,
        error: action.payload.error,
        isLoading: false
      };
    case 'ADD_OBSERVATION':
      return { ...state, allReports: [action.payload, ...state.allReports] };
    case 'ADD_INCIDENT':
      return { ...state, allIncidents: [action.payload, ...state.allIncidents] };
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
  refetchData: () => Promise<void>;
  addObservationOptimistic: (record: FetchedObservation) => void;
  addIncidentOptimistic: (record: FetchedIncident) => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);


// Create the provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const refetchData = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const [reportsResult, incidentsResult, personnelResult] = await Promise.allSettled([
      getAllReports(),
      getAllIncidents(),
      getAllProfiles()
    ]);
    const errors: string[] = [];

    if (reportsResult.status === 'rejected') {
      errors.push(`Observations: ${getErrorMessage(reportsResult.reason)}`);
    }
    if (incidentsResult.status === 'rejected') {
      errors.push(`Incidents: ${getErrorMessage(incidentsResult.reason)}`);
    }
    if (personnelResult.status === 'rejected') {
      errors.push(`Personnel: ${getErrorMessage(personnelResult.reason)}`);
    }

    dispatch({
      type: 'SET_DATA',
      payload: {
        reports: reportsResult.status === 'fulfilled' ? reportsResult.value : undefined,
        incidents: incidentsResult.status === 'fulfilled' ? incidentsResult.value : undefined,
        personnel: personnelResult.status === 'fulfilled' ? personnelResult.value : undefined,
        error: errors.length > 0 ? errors.join(' ') : null
      }
    });
  }, []);

  const addObservationOptimistic = useCallback((record: FetchedObservation) => {
    dispatch({ type: 'ADD_OBSERVATION', payload: record });
  }, []);

  const addIncidentOptimistic = useCallback((record: FetchedIncident) => {
    dispatch({ type: 'ADD_INCIDENT', payload: record });
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
            } catch {
                localStorage.removeItem(STORAGE_KEYS.PROFILE);
                dispatch({ type: 'SET_USER_PROFILE', payload: null });
            }
        } else {
            dispatch({ type: 'SET_USER_PROFILE', payload: null });
        }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);

  }, [refetchData]);

  return (
    <AppContext.Provider value={{ state, dispatch, refetchData, addObservationOptimistic, addIncidentOptimistic }}>
      {children}
    </AppContext.Provider>
  );
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};