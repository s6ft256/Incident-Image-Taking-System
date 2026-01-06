export interface WeatherData {
  temp: number;
  condition: string;
  conditionCode: number;
  city: string;
  isDay: boolean;
  windSpeed: number;
  humidity: number;
  preciseLocation?: string;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
};

const roundCoord = (value: number, decimals: number) => {
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
};

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

/**
 * Reverse geocodes coordinates to a human-readable address.
 * Focuses on extracting Street/Road level details.
 */
export const getAddress = async (lat: number, lon: number): Promise<string> => {
  try {
    // Cache by rounding coordinates to reduce unnecessary reverse-geocoding calls.
    const cacheKey = `geo_addr_${roundCoord(lat, 4)}_${roundCoord(lon, 4)}`;
    const cached = safeJsonParse<{ v: string; t: number }>(localStorage.getItem(cacheKey));
    if (cached && Date.now() - cached.t < 7 * 24 * 60 * 60 * 1000) {
      return cached.v;
    }

    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`;
    const controller = new AbortController();
    const geoRes = await withTimeout(
      fetch(geoUrl, {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'HSE-Guardian/1.0 (mailto:niwamanyaelius95@gmail.com)'
        }
      }),
      8000,
      'Geocoding timeout'
    );
    const geoJson = await geoRes.json();
    
    if (!geoJson.address) return "Site Coordinates Only";

    const addr = geoJson.address;
    // Construct a specific street-level address
    const street = addr.road || addr.construction || addr.industrial || addr.pedestrian || addr.path || "";
    const suburb = addr.suburb || addr.neighbourhood || addr.village || "";
    const city = addr.city || addr.town || addr.state || "";

    const parts = [street, suburb, city].filter(p => p.length > 0);
    const value = parts.join(', ') || "Exact Site Location";
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ v: value, t: Date.now() }));
    } catch {
      // ignore storage issues
    }
    return value;
  } catch (e) {
    return "GPS Verified Area";
  }
};

/**
 * High-precision weather and location acquisition with robust fallback.
 */
export const getLocalWeather = async (): Promise<WeatherData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser does not support Geolocation."));
      return;
    }

    const tryGetPosition = (options: PositionOptions) => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const cacheKey = `weather_${roundCoord(latitude, 3)}_${roundCoord(longitude, 3)}`;
          const cached = safeJsonParse<{ v: WeatherData; t: number }>(localStorage.getItem(cacheKey));
          if (cached && Date.now() - cached.t < 10 * 60 * 1000) {
            resolve(cached.v);
            return;
          }

          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&timezone=auto`;
          const controller = new AbortController();
          const weatherRes = await withTimeout(fetch(weatherUrl, { signal: controller.signal }), 10000, 'Weather fetch timeout');
          const weatherJson = await weatherRes.json();

          const fullAddr = await getAddress(latitude, longitude);
          const current = weatherJson.current;

          const result: WeatherData = {
            temp: Math.round(current.temperature_2m),
            condition: getWeatherDescription(current.weather_code),
            conditionCode: current.weather_code,
            city: fullAddr.split(',')[0] || "Current Site",
            preciseLocation: fullAddr,
            isDay: current.is_day === 1,
            windSpeed: current.wind_speed_10m,
            humidity: current.relative_humidity_2m
          };

          try {
            localStorage.setItem(cacheKey, JSON.stringify({ v: result, t: Date.now() }));
            localStorage.setItem('weather_last', JSON.stringify({ v: result, t: Date.now() }));
          } catch {
            // ignore storage issues
          }

          resolve(result);
        } catch (err) {
          const last = safeJsonParse<{ v: WeatherData; t: number }>(localStorage.getItem('weather_last'));
          if (last) {
            resolve(last.v);
            return;
          }
          reject(new Error("Satellite Link Error. Check connection."));
        }
      }, (err) => {
        // Fallback Strategy: If high accuracy fails or times out, try standard accuracy
        if (options.enableHighAccuracy) {
          tryGetPosition({ enableHighAccuracy: false, timeout: 7000, maximumAge: 10 * 60 * 1000 });
        } else {
          let msg = "GPS Access Denied.";
          if (err.code === err.TIMEOUT) msg = "Satellite Sync Timeout.";
          if (err.code === err.POSITION_UNAVAILABLE) msg = "GPS Signal Lost.";
          reject(new Error(msg));
        }
      }, options);
    };

    // Initial attempt: High accuracy, increased to 45s for cold start locks
    tryGetPosition({ 
      enableHighAccuracy: true, 
      timeout: 20000, 
      maximumAge: 0 
    });
  });
};

const getWeatherDescription = (code: number): string => {
  if (code === 0) return "Clear Sky";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy Conditions";
  if (code <= 55) return "Light Drizzle";
  if (code <= 65) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain Showers";
  if (code <= 99) return "Thunderstorm";
  return "Variable Conditions";
};

export const getWeatherSafetyTip = (data: WeatherData): string => {
  if (data.temp > 35) return "CRITICAL HEAT: Implement mandatory hydration breaks.";
  if (data.temp < 5) return "COLD RISK: Ensure thermal PPE and monitor for fatigue.";
  if (data.conditionCode >= 51 && data.conditionCode <= 67) return "SLIP HAZARD: Wet surfaces detected. Exercise caution on scaffolding.";
  if (data.conditionCode >= 95) return "LIGHTNING RISK: Stop all outdoor high-altitude work immediately.";
  if (data.windSpeed > 30) return "WIND ALERT: High-altitude crane operations restricted.";
  return "Standard site conditions. Maintain situational awareness.";
};