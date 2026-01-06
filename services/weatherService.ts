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

/**
 * Reverse geocodes coordinates to a human-readable address.
 * Focuses on extracting Street/Road level details.
 */
export const getAddress = async (lat: number, lon: number): Promise<string> => {
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const geoRes = await fetch(geoUrl, {
      headers: { 
        'Accept-Language': 'en', 
        'User-Agent': 'HSE-Guardian/1.0 (mailto:niwamanyaelius95@gmail.com)' 
      }
    });
    const geoJson = await geoRes.json();
    
    if (!geoJson.address) return "Site Coordinates Only";

    const addr = geoJson.address;
    // Construct a specific street-level address
    const street = addr.road || addr.construction || addr.industrial || addr.pedestrian || addr.path || "";
    const suburb = addr.suburb || addr.neighbourhood || addr.village || "";
    const city = addr.city || addr.town || addr.state || "";

    const parts = [street, suburb, city].filter(p => p.length > 0);
    return parts.join(', ') || "Exact Site Location";
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
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&timezone=auto`;
          const weatherRes = await fetch(weatherUrl);
          const weatherJson = await weatherRes.json();

          const fullAddr = await getAddress(latitude, longitude);
          const current = weatherJson.current;
          
          resolve({
            temp: Math.round(current.temperature_2m),
            condition: getWeatherDescription(current.weather_code),
            conditionCode: current.weather_code,
            city: fullAddr.split(',')[0] || "Current Site",
            preciseLocation: fullAddr,
            isDay: current.is_day === 1,
            windSpeed: current.wind_speed_10m,
            humidity: current.relative_humidity_2m
          });
        } catch (err) {
          reject(new Error("Satellite Link Error. Check connection."));
        }
      }, (err) => {
        // Fallback Strategy: If high accuracy fails or times out, try standard accuracy
        if (options.enableHighAccuracy) {
          tryGetPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
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
      timeout: 45000, 
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