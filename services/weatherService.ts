
export interface WeatherData {
  temp: number;
  condition: string;
  conditionCode: number;
  city: string;
  isDay: boolean;
  windSpeed: number;
  humidity: number;
  preciseLocation?: string;
  accuracy?: number;
}

/**
 * Enhanced reverse geocoding to extract granular site data.
 */
export const getAddress = async (lat: number, lon: number): Promise<string> => {
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Incident-Image-Taking-System-V3' }
    });
    
    if (!geoRes.ok) throw new Error("Resolution Server Timeout");
    
    const geoJson = await geoRes.json();
    if (!geoJson.address) return "Unmapped Zone";

    const a = geoJson.address;
    
    // Prioritize high-granularity fields for construction/industrial sites
    const pointOfInt = a.amenity || a.building || a.industrial || a.construction || "";
    const street = a.road || a.pedestrian || a.path || a.suburb || "";
    const cityArea = a.city_district || a.neighbourhood || a.suburb || "";
    const city = a.city || a.town || a.village || a.state || "";

    const parts = [pointOfInt, street, cityArea, city]
      .filter(p => p.length > 0)
      .map(p => p.trim());

    // Fallback logic for remote sites
    if (parts.length === 0) return `Remote Sector [${lat.toFixed(4)}, ${lon.toFixed(4)}]`;
    
    return parts.join(', ');
  } catch (e) {
    console.error("GPS Reverse Geocoding Fault:", e);
    return "Satellite Verified Area";
  }
};

/**
 * High-precision weather and location acquisition.
 */
export const getLocalWeather = async (): Promise<WeatherData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Hardware Incompatible: GPS missing."));
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude, accuracy } = position.coords;

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
          humidity: current.relative_humidity_2m,
          accuracy: Math.round(accuracy)
        });
      } catch (err) {
        reject(new Error("Database Link Error."));
      }
    }, (err) => {
      let msg = "GPS Signal Locked.";
      if (err.code === err.TIMEOUT) msg = "Satellite Sync Timeout.";
      if (err.code === err.POSITION_UNAVAILABLE) msg = "Blind Spot Detected.";
      reject(new Error(msg));
    }, { 
      enableHighAccuracy: true, 
      timeout: 15000, 
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
  if (data.temp > 35) return "CRITICAL HEAT: Hydration protocol active.";
  if (data.temp < 5) return "COLD ALERT: PPE Level 2 Thermal required.";
  if (data.conditionCode >= 51 && data.conditionCode <= 67) return "SLIP HAZARD: Wet surface mitigation required.";
  if (data.conditionCode >= 95) return "LIGHTNING: Cease all external operations.";
  if (data.windSpeed > 30) return "WIND ALERT: Suspended loads restricted.";
  return "Operational environment within safe parameters.";
};
