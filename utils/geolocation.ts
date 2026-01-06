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
 * Tries to return a fast location first (cached/low accuracy) and then refines using high accuracy.
 *
 * - Calls `onUpdate` for each successful position (fast and/or refined)
 * - Resolves to the best available position
 */
export const getPositionWithRefinement = async (onUpdate?: PositionUpdateHandler): Promise<GeolocationPosition> => {
  let fastPos: GeolocationPosition | undefined;

  // Fast path: accept cached position for speed.
  try {
    fastPos = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 10 * 60 * 1000,
    });
    onUpdate?.(fastPos);
  } catch {
    // ignore; we'll try high accuracy below
  }

  // Best path: high accuracy (no cache) for precision.
  try {
    const precisePos = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    onUpdate?.(precisePos);
    return precisePos;
  } catch (err) {
    if (fastPos) return fastPos;
    throw err;
  }
};
