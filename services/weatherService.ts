
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
 */
export const getAddress = async (lat: number, lon: number): Promise<string> => {
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'HSE-Guardian-App' }
    });
    const geoJson = await geoRes.json();
    return geoJson.display_name || "Unknown Site";
  } catch (e) {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
};

/**
 * Fetches current weather using Open-Meteo (No API key required)
 * and reverse geocoding using Nominatim.
 */
export const getLocalWeather = async (): Promise<WeatherData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser does not support Geolocation."));
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        // 1. Fetch Weather Data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherJson = await weatherRes.json();

        // 2. Fetch Detailed Address Info
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'HSE-Guardian-App' }
        });
        const geoJson = await geoRes.json();
        
        // Extract specific road/suburb for precision
        const addr = geoJson.address;
        const locationName = addr.road || addr.suburb || addr.neighbourhood || addr.industrial || addr.city || "Current Site";
        const fullAddr = geoJson.display_name;

        const current = weatherJson.current;
        
        resolve({
          temp: Math.round(current.temperature_2m),
          condition: getWeatherDescription(current.weather_code),
          conditionCode: current.weather_code,
          city: locationName,
          preciseLocation: fullAddr,
          isDay: current.is_day === 1,
          windSpeed: current.wind_speed_10m,
          humidity: current.relative_humidity_2m
        });
      } catch (err) {
        reject(new Error("Satellite Link Error. Check connection."));
      }
    }, (err) => {
      let msg = "GPS Access Denied.";
      if (err.code === err.TIMEOUT) msg = "GPS Search Timed Out.";
      if (err.code === err.POSITION_UNAVAILABLE) msg = "GPS Signal Lost.";
      reject(new Error(msg));
    }, { 
      enableHighAccuracy: true, 
      timeout: 15000, 
      maximumAge: 0 
    });
  });
};

/**
 * Maps WMO Weather interpretation codes (WW) to human readable strings.
 */
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

/**
 * Provides an HSE safety recommendation based on weather.
 */
export const getWeatherSafetyTip = (data: WeatherData): string => {
  if (data.temp > 35) return "CRITICAL HEAT: Implement mandatory hydration breaks.";
  if (data.temp < 5) return "COLD RISK: Ensure thermal PPE and monitor for fatigue.";
  if (data.conditionCode >= 51 && data.conditionCode <= 67) return "SLIP HAZARD: Wet surfaces detected. Exercise caution on scaffolding.";
  if (data.conditionCode >= 95) return "LIGHTNING RISK: Stop all outdoor high-altitude work immediately.";
  if (data.windSpeed > 30) return "WIND ALERT: High-altitude crane operations restricted.";
  return "Standard site conditions. Maintain situational awareness.";
};
