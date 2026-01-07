export type PositionUpdateHandler = (pos: GeolocationPosition) => void;
export type ProgressHandler = (status: GPSStatus) => void;

export interface GPSStatus {
  stage: 'initializing' | 'acquiring' | 'refining' | 'complete' | 'error';
  accuracy: number | null;
  message: string;
  position: GeolocationPosition | null;
}

const getCurrentPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser does not support Geolocation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
};

/**
 * Uses watchPosition to continuously acquire better GPS signal until accuracy threshold or timeout
 */
const watchForBestPosition = (
  targetAccuracy: number,
  timeout: number,
  onUpdate?: PositionUpdateHandler
): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser does not support Geolocation."));
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let watchId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (timeoutId) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      if (bestPosition) {
        resolve(bestPosition);
      } else {
        reject(new Error("GPS timeout - could not acquire signal"));
      }
    }, timeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        
        // Always update if this is the first position or better than previous
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
          onUpdate?.(position);
        }

        // If we've hit target accuracy, resolve immediately
        if (accuracy <= targetAccuracy) {
          cleanup();
          resolve(position);
        }
      },
      (error) => {
        // Don't reject immediately on error - keep trying until timeout
        if (!bestPosition) {
          cleanup();
          reject(error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Tries to return a fast location first (cached/low accuracy) and then refines using high accuracy.
 *
 * - Calls `onUpdate` for each successful position (fast and/or refined)
 * - Resolves to the best available position
 * - Uses watchPosition for continuous signal improvement
 */
export const getPositionWithRefinement = async (onUpdate?: PositionUpdateHandler): Promise<GeolocationPosition> => {
  let fastPos: GeolocationPosition | undefined;

  // Fast path: accept cached position for speed.
  try {
    fastPos = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 3000,
      maximumAge: 5 * 60 * 1000,
    });
    onUpdate?.(fastPos);
  } catch {
    // ignore; we'll try high accuracy below
  }

  // Best path: use watchPosition to continuously refine until we get good accuracy or timeout
  try {
    const precisePos = await watchForBestPosition(
      20, // target 20m accuracy
      12000, // 12 second timeout
      onUpdate
    );
    return precisePos;
  } catch (err) {
    // Fallback: try single high-accuracy request
    try {
      const singlePos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      onUpdate?.(singlePos);
      return singlePos;
    } catch {
      if (fastPos) return fastPos;
      throw err;
    }
  }
};

/**
 * Enhanced GPS acquisition with progress callbacks for UI feedback.
 * Reports stages: initializing -> acquiring -> refining -> complete/error
 */
export const getPositionWithProgress = async (
  onProgress?: ProgressHandler,
  targetAccuracy: number = 20,
  maxTimeout: number = 15000
): Promise<GeolocationPosition> => {
  if (!navigator.geolocation) {
    const errorStatus: GPSStatus = {
      stage: 'error',
      accuracy: null,
      message: 'Geolocation not supported',
      position: null
    };
    onProgress?.(errorStatus);
    throw new Error('Browser does not support Geolocation.');
  }

  onProgress?.({
    stage: 'initializing',
    accuracy: null,
    message: 'Initializing GPS...',
    position: null
  });

  return new Promise((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number;
    let timeoutId: ReturnType<typeof setTimeout>;
    let fastTimeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (timeoutId) clearTimeout(timeoutId);
      if (fastTimeoutId) clearTimeout(fastTimeoutId);
    };

    // Fast initial position (cached)
    fastTimeoutId = setTimeout(() => {
      if (!bestPosition) {
        onProgress?.({
          stage: 'acquiring',
          accuracy: null,
          message: 'Acquiring satellite signal...',
          position: null
        });
      }
    }, 500);

    // Final timeout
    timeoutId = setTimeout(() => {
      cleanup();
      if (bestPosition) {
        onProgress?.({
          stage: 'complete',
          accuracy: bestPosition.coords.accuracy,
          message: `Location acquired (±${Math.round(bestPosition.coords.accuracy)}m)`,
          position: bestPosition
        });
        resolve(bestPosition);
      } else {
        const errorStatus: GPSStatus = {
          stage: 'error',
          accuracy: null,
          message: 'GPS timeout - could not acquire signal',
          position: null
        };
        onProgress?.(errorStatus);
        reject(new Error('GPS timeout'));
      }
    }, maxTimeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        const isImprovement = !bestPosition || accuracy < bestPosition.coords.accuracy;
        
        if (isImprovement) {
          bestPosition = position;
          
          const stage = accuracy <= targetAccuracy ? 'complete' : 
                       accuracy <= 100 ? 'refining' : 'acquiring';
          
          onProgress?.({
            stage,
            accuracy,
            message: stage === 'complete' 
              ? `High-precision lock (±${Math.round(accuracy)}m)`
              : stage === 'refining'
              ? `Refining accuracy (±${Math.round(accuracy)}m)...`
              : `Acquiring signal (±${Math.round(accuracy)}m)...`,
            position
          });

          // If we've hit target accuracy, resolve immediately
          if (accuracy <= targetAccuracy) {
            cleanup();
            resolve(position);
          }
        }
      },
      (error) => {
        if (!bestPosition) {
          cleanup();
          let message = 'GPS error';
          if (error.code === error.PERMISSION_DENIED) message = 'Location permission denied';
          if (error.code === error.POSITION_UNAVAILABLE) message = 'GPS signal unavailable';
          if (error.code === error.TIMEOUT) message = 'GPS acquisition timeout';
          
          const errorStatus: GPSStatus = {
            stage: 'error',
            accuracy: null,
            message,
            position: null
          };
          onProgress?.(errorStatus);
          reject(new Error(message));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: maxTimeout,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat: number, lon: number, accuracy?: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const accStr = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}${accStr}`;
};
