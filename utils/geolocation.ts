export type PositionUpdateHandler = (pos: GeolocationPosition) => void;

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
