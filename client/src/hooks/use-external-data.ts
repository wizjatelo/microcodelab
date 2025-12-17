// ============================================
// µCodeLab v2.0 - External Data Source Hooks
// React hooks for integrating external IoT platforms
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for ThingSpeak data integration
 */
export const useThingSpeak = (channelId: string, readKey: string, options: any = {}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!channelId || !readKey) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        api_key: readKey,
        results: options.results || '100'
      });

      const response = await fetch(
        `https://api.thingspeak.com/channels/${channelId}/feeds.json?${params}`
      );

      if (!response.ok) {
        throw new Error(`ThingSpeak error: ${response.status}`);
      }

      const result = await response.json();

      // Parse and format data
      const formattedData = {
        channelId: result.channel.id,
        channelName: result.channel.name,
        fields: Object.keys(result.channel)
          .filter(key => key.startsWith('field'))
          .reduce((acc: any, key) => {
            acc[key] = result.channel[key];
            return acc;
          }, {}),
        feeds: result.feeds.map((feed: any) => ({
          timestamp: new Date(feed.created_at),
          field1: parseFloat(feed.field1),
          field2: parseFloat(feed.field2),
          field3: parseFloat(feed.field3),
          field4: parseFloat(feed.field4),
          field5: parseFloat(feed.field5),
          field6: parseFloat(feed.field6),
          field7: parseFloat(feed.field7),
          field8: parseFloat(feed.field8)
        }))
      };

      setData(formattedData);
    } catch (err: any) {
      setError(err.message);
      console.error('ThingSpeak fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId, readKey, options.results]);

  useEffect(() => {
    fetchData();

    // Set up polling if enabled
    if (options.pollInterval) {
      intervalRef.current = setInterval(fetchData, options.pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, options.pollInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook for Adafruit IO integration
 */
export const useAdafruitIO = (username: string, aioKey: string, feedKey: string, options: any = {}) => {
  const [data, setData] = useState<any[]>([]);
  const [latestValue, setLatestValue] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFeedData = useCallback(async () => {
    if (!username || !aioKey || !feedKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://io.adafruit.com/api/v2/${username}/feeds/${feedKey}/data?limit=${options.limit || 100}`,
        {
          headers: {
            'X-AIO-Key': aioKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Adafruit IO error: ${response.status}`);
      }

      const result = await response.json();
      const formattedData = result.map((point: any) => ({
        id: point.id,
        value: parseFloat(point.value) || point.value,
        timestamp: new Date(point.created_at),
        lat: point.lat,
        lon: point.lon
      }));

      setData(formattedData);
      if (formattedData.length > 0) {
        setLatestValue(formattedData[0]);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Adafruit IO fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [username, aioKey, feedKey, options.limit]);

  const publishValue = useCallback(async (value: any) => {
    if (!username || !aioKey || !feedKey) {
      throw new Error('Missing Adafruit IO credentials');
    }

    try {
      const response = await fetch(
        `https://io.adafruit.com/api/v2/${username}/feeds/${feedKey}/data`,
        {
          method: 'POST',
          headers: {
            'X-AIO-Key': aioKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value })
        }
      );

      if (!response.ok) {
        throw new Error(`Adafruit IO publish error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Adafruit IO publish error:', err);
      throw err;
    }
  }, [username, aioKey, feedKey]);

  useEffect(() => {
    fetchFeedData();

    if (options.pollInterval) {
      intervalRef.current = setInterval(fetchFeedData, options.pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchFeedData, options.pollInterval]);

  return {
    data,
    latestValue,
    loading,
    error,
    refetch: fetchFeedData,
    publish: publishValue
  };
};

/**
 * Hook for Blynk integration
 */
export const useBlynk = (authToken: string, options: any = {}) => {
  const [pins, setPins] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const server = options.server || 'blynk.cloud';
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const readPin = useCallback(async (pin: string) => {
    if (!authToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://${server}/external/api/get?token=${authToken}&${pin}`
      );

      if (!response.ok) {
        throw new Error(`Blynk error: ${response.status}`);
      }

      const value = await response.json();
      setPins(prev => ({
        ...prev,
        [pin]: Array.isArray(value) ? value : [value]
      }));

      return value;
    } catch (err: any) {
      setError(err.message);
      console.error('Blynk read error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authToken, server]);

  const writePin = useCallback(async (pin: string, value: any) => {
    if (!authToken) {
      throw new Error('Missing Blynk auth token');
    }

    const values = Array.isArray(value) ? value.join(',') : value;

    try {
      const response = await fetch(
        `https://${server}/external/api/update?token=${authToken}&${pin}=${values}`
      );

      if (!response.ok) {
        throw new Error(`Blynk write error: ${response.status}`);
      }

      setPins(prev => ({
        ...prev,
        [pin]: Array.isArray(value) ? value : [value]
      }));

      return { success: true, pin, value };
    } catch (err) {
      console.error('Blynk write error:', err);
      throw err;
    }
  }, [authToken, server]);

  const readMultiplePins = useCallback(async (pinList: string[]) => {
    const promises = pinList.map(pin => readPin(pin));
    return await Promise.all(promises);
  }, [readPin]);

  useEffect(() => {
    if (options.monitorPins && options.monitorPins.length > 0) {
      readMultiplePins(options.monitorPins);

      if (options.pollInterval) {
        intervalRef.current = setInterval(() => {
          readMultiplePins(options.monitorPins);
        }, options.pollInterval);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [options.monitorPins, options.pollInterval, readMultiplePins]);

  return {
    pins,
    loading,
    error,
    readPin,
    writePin,
    readMultiplePins
  };
};

/**
 * Hook for OpenWeatherMap integration
 */
export const useWeatherData = (apiKey: string, lat: number, lon: number, options: any = {}) => {
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!apiKey || lat === undefined || lon === undefined) return;

    setLoading(true);
    setError(null);

    try {
      const units = options.units || 'metric';

      // Current weather
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`
      );

      if (!currentResponse.ok) {
        throw new Error(`OpenWeatherMap error: ${currentResponse.status}`);
      }

      const currentData = await currentResponse.json();

      setWeather({
        temperature: currentData.main.temp,
        feelsLike: currentData.main.feels_like,
        humidity: currentData.main.humidity,
        pressure: currentData.main.pressure,
        windSpeed: currentData.wind.speed,
        windDirection: currentData.wind.deg,
        clouds: currentData.clouds.all,
        visibility: currentData.visibility,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        sunrise: new Date(currentData.sys.sunrise * 1000),
        sunset: new Date(currentData.sys.sunset * 1000),
        timestamp: new Date(currentData.dt * 1000)
      });

      // Forecast (if requested)
      if (options.includeForecast) {
        const forecastResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`
        );

        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          setForecast(
            forecastData.list.map((item: any) => ({
              timestamp: new Date(item.dt * 1000),
              temperature: item.main.temp,
              humidity: item.main.humidity,
              pressure: item.main.pressure,
              description: item.weather[0].description,
              icon: item.weather[0].icon
            }))
          );
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiKey, lat, lon, options.units, options.includeForecast]);

  useEffect(() => {
    fetchWeather();

    // Weather updates every 10 minutes by default
    const pollInterval = options.pollInterval || 600000;
    intervalRef.current = setInterval(fetchWeather, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchWeather, options.pollInterval]);

  return {
    weather,
    forecast,
    loading,
    error,
    refetch: fetchWeather
  };
};

/**
 * Hook for AWS IoT Core integration
 */
export const useAWSIoT = (config: any, options: any = {}) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mqttClientRef = useRef<any>(null);

  useEffect(() => {
    if (!config.endpoint || !config.clientId) return;

    // Initialize MQTT connection
    const initConnection = async () => {
      try {
        // In a real implementation, you'd use AWS IoT Device SDK
        // This is a simplified example
        const client = {
          // MQTT client initialization
          endpoint: config.endpoint,
          clientId: config.clientId,
          connected: false
        };

        mqttClientRef.current = client;
        setConnected(true);

        // Subscribe to topics
        if (config.topics?.subscribe) {
          config.topics.subscribe.forEach((topic: string) => {
            // Subscribe to topic
            console.log(`Subscribed to ${topic}`);
          });
        }
      } catch (err: any) {
        setError(err.message);
        console.error('AWS IoT connection error:', err);
      }
    };

    initConnection();

    return () => {
      if (mqttClientRef.current) {
        // Disconnect MQTT client
        setConnected(false);
      }
    };
  }, [config]);

  const publish = useCallback(async (topic: string, message: any) => {
    if (!mqttClientRef.current || !connected) {
      throw new Error('Not connected to AWS IoT');
    }

    try {
      // Publish message
      console.log(`Publishing to ${topic}:`, message);
      return { success: true };
    } catch (err) {
      console.error('AWS IoT publish error:', err);
      throw err;
    }
  }, [connected]);

  return {
    connected,
    messages,
    error,
    publish
  };
};

/**
 * Hook for generic IoT platform integration
 */
export const useIoTPlatform = (platform: string, config: any, options: any = {}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let result;
        switch (platform) {
          case 'thingsboard':
            result = await fetchThingsBoardData(config);
            break;
          case 'particle':
            result = await fetchParticleData(config);
            break;
          case 'arduino':
            result = await fetchArduinoCloudData(config);
            break;
          default:
            throw new Error(`Unsupported platform: ${platform}`);
        }
        setData(result);
      } catch (err: any) {
        setError(err.message);
        console.error(`${platform} fetch error:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (options.pollInterval) {
      const interval = setInterval(fetchData, options.pollInterval);
      return () => clearInterval(interval);
    }
  }, [platform, config, options.pollInterval]);

  return { data, loading, error };
};

// Helper functions
async function fetchThingsBoardData(config: any) {
  const response = await fetch(
    `${config.endpoint}/api/plugins/telemetry/DEVICE/${config.deviceId}/values/timeseries`,
    {
      headers: {
        'X-Authorization': `Bearer ${config.token}`
      }
    }
  );
  return await response.json();
}

async function fetchParticleData(config: any) {
  const response = await fetch(
    `https://api.particle.io/v1/devices/${config.deviceId}/${config.variable}?access_token=${config.accessToken}`
  );
  return await response.json();
}

async function fetchArduinoCloudData(config: any) {
  const response = await fetch(
    `https://api2.arduino.cc/iot/v2/things/${config.thingId}/properties/${config.propertyId}`,
    {
      headers: {
        'Authorization': `Bearer ${config.token}`
      }
    }
  );
  return await response.json();
}

/**
 * Hook for combining multiple data sources
 */
export const useMultiSourceData = (sources: any[]) => {
  const [combinedData, setCombinedData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAllSources = async () => {
      setLoading(true);
      const data: Record<string, any> = {};
      const errs: Record<string, string> = {};

      for (const source of sources) {
        try {
          let result;
          switch (source.type) {
            case 'thingspeak':
              // Fetch from ThingSpeak
              break;
            case 'adafruit':
              // Fetch from Adafruit IO
              break;
            case 'blynk':
              // Fetch from Blynk
              break;
            // Add more source types
          }
          data[source.id] = result;
        } catch (err: any) {
          errs[source.id] = err.message;
        }
      }

      setCombinedData(data);
      setErrors(errs);
      setLoading(false);
    };

    fetchAllSources();
  }, [sources]);

  return { data: combinedData, loading, errors };
};

export default {
  useThingSpeak,
  useAdafruitIO,
  useBlynk,
  useWeatherData,
  useAWSIoT,
  useIoTPlatform,
  useMultiSourceData
};