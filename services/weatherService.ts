
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
  forecast?: Array<{
    time: string;
    temp: number;
    code: number;
  }>;
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
 * High-precision weather and location acquisition with robust fallback and forecasting.
 */
export const getLocalWeather = async (): Promise<WeatherData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Hardware Incompatible: GPS missing."));
      return;
    }

    const tryGetPosition = (options: PositionOptions) => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        try {
          // Fetch current and hourly forecast (next 24 hours)
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&timezone=auto`;
          const weatherRes = await fetch(weatherUrl);
          const weatherJson = await weatherRes.json();

          const fullAddr = await getAddress(latitude, longitude);
          const current = weatherJson.current;
          
          // Map the next 6 hours for the UI trend
          const forecast = weatherJson.hourly.time.slice(0, 6).map((time: string, idx: number) => ({
            time: time,
            temp: Math.round(weatherJson.hourly.temperature_2m[idx]),
            code: weatherJson.hourly.weather_code[idx]
          }));
          
          resolve({
            temp: Math.round(current.temperature_2m),
            condition: getWeatherDescription(current.weather_code),
            conditionCode: current.weather_code,
            city: fullAddr.split(',')[0] || "Current Site",
            preciseLocation: fullAddr,
            isDay: current.is_day === 1,
            windSpeed: current.wind_speed_10m,
            humidity: current.relative_humidity_2m,
            accuracy: Math.round(accuracy),
            forecast
          });
        } catch (err) {
          reject(new Error("Database Link Error."));
        }
      }, (err) => {
        // Fallback Strategy
        if (options.enableHighAccuracy) {
          console.warn("High Accuracy GPS failed, falling back to standard.");
          tryGetPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
        } else {
          let msg = "GPS Signal Locked.";
          if (err.code === err.TIMEOUT) msg = "Satellite Sync Timeout.";
          if (err.code === err.POSITION_UNAVAILABLE) msg = "Blind Spot Detected.";
          if (err.code === err.PERMISSION_DENIED) msg = "GPS Access Denied.";
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

export const getWeatherDescription = (code: number): string => {
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
  // Logic for future conditions (within next 3 hours)
  const incomingStorm = data.forecast?.slice(1, 4).some(f => f.code >= 95);
  const incomingRain = data.forecast?.slice(1, 4).some(f => f.code >= 51 && f.code <= 82);

  if (data.temp > 38) return "CRITICAL HEAT: Mandatory hydration stop every 15 mins.";
  if (incomingStorm) return "PRE-EMPTIVE ALERT: Thunderstorm expected within 3 hours.";
  if (data.conditionCode >= 95) return "LIGHTNING: Cease all external operations and crane movements.";
  if (data.temp > 35) return "HEAT ADVISORY: Hydration protocol active.";
  if (data.windSpeed > 30) return "WIND ALERT: Suspended loads restricted. Monitor crane anemometers.";
  if (incomingRain) return "WEATHER WARNING: Precipitation expected. Monitor site drainage.";
  if (data.conditionCode >= 51 && data.conditionCode <= 67) return "SLIP HAZARD: Wet surface mitigation required.";
  if (data.temp < 5) return "COLD ALERT: PPE Level 2 Thermal required.";
  
  return "Operational environment within safe parameters.";
};
