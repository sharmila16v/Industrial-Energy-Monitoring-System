/**
 * Device Polling Service
 * Handles real-time data fetching from ThingSpeak for all registered devices
 * Supports multi-device field mapping from a single ThingSpeak channel
 */

const axios = require("axios");
const cron = require("node-cron");
const { EventEmitter } = require("events");

class DevicePollingService extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
    this.pollingJobs = new Map();
    this.latestReadings = new Map();
    this.cache = new Map();
    this.cacheExpiry = 15000; // 15 seconds
    this.baseUrl = "https://api.thingspeak.com";
  }

  /**
   * Register a device for polling
   * @param {Object} device - Device configuration including fieldMapping
   * fieldMapping example: { voltage: 'field1', current: 'field2', power: 'field4', temperature: 'field6', energy: 'field7' }
   */
  registerDevice(device) {
    if (!device.channelId || !device.readKey) {
      console.warn(`Device ${device.deviceId} missing ThingSpeak credentials`);
      return false;
    }

    this.devices.set(device.deviceId, {
      ...device,
      lastFetch: null,
      status: "active",
      errorCount: 0
    });

    console.log(`Device registered for polling: ${device.deviceId} (fields: ${JSON.stringify(device.fieldMapping || 'default')})`);
    return true;
  }

  /**
   * Unregister a device from polling
   * @param {string} deviceId - Device identifier
   */
  unregisterDevice(deviceId) {
    this.devices.delete(deviceId);
    this.latestReadings.delete(deviceId);
    this.cache.delete(deviceId);
    
    const job = this.pollingJobs.get(deviceId);
    if (job) {
      job.stop();
      this.pollingJobs.delete(deviceId);
    }
    
    console.log(`Device unregistered from polling: ${deviceId}`);
  }

  /**
   * Fetch latest reading from ThingSpeak for a specific device
   * @param {string} deviceId - Device identifier
   */
  async fetchLatestReading(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Check cache first
    const cached = this.cache.get(deviceId);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const { data } = await axios.get(
        `${this.baseUrl}/channels/${device.channelId}/feeds/last.json`,
        {
          params: { api_key: device.readKey },
          timeout: 10000
        }
      );

      const reading = this.mapFeedToReading(data, deviceId, device.fieldMapping);
      
      // Update cache
      this.cache.set(deviceId, {
        data: reading,
        timestamp: Date.now()
      });

      // Update latest reading
      this.latestReadings.set(deviceId, reading);
      
      // Update device status
      device.lastFetch = new Date().toISOString();
      device.status = "active";
      device.errorCount = 0;

      // Emit reading event
      this.emit("reading", { deviceId, reading });

      return reading;
    } catch (error) {
      device.errorCount++;
      if (device.errorCount >= 3) {
        device.status = "error";
      }
      console.error(`Error fetching data for ${deviceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch historical feeds from ThingSpeak
   * @param {string} deviceId - Device identifier
   * @param {Object} options - Query options (start, end, results)
   */
  async fetchFeeds(deviceId, options = {}) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const params = {
      api_key: device.readKey,
      results: options.results || 100
    };

    if (options.start) {
      params.start = new Date(options.start).toISOString();
    }
    if (options.end) {
      params.end = new Date(options.end).toISOString();
    }

    try {
      const { data } = await axios.get(
        `${this.baseUrl}/channels/${device.channelId}/feeds.json`,
        { params, timeout: 30000 }
      );

      const feeds = (data.feeds || [])
        .filter(feed => feed && (feed.field1 || feed.field2 || feed.field3 || feed.field4 || feed.field5))
        .map(feed => this.mapFeedToReading(feed, deviceId, device.fieldMapping));

      return {
        channel: data.channel,
        feeds
      };
    } catch (error) {
      console.error(`Error fetching feeds for ${deviceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Map ThingSpeak feed to standardized reading format using device-specific field mapping.
   * 
   * Default mapping (legacy single-device):
   *   field1 → Voltage, field2 → Current, field3 → Power, field4 → Energy, field5 → Temperature
   * 
   * With fieldMapping (2-bulb Approach A):
   *   Each device specifies which ThingSpeak field maps to voltage/current/power/energy/temperature
   */
  mapFeedToReading(feed, deviceId, fieldMapping) {
    if (!feed) return null;

    if (fieldMapping) {
      // Use device-specific field mapping
      return {
        deviceId,
        voltage: this.parseField(feed[fieldMapping.voltage]),
        current: this.parseField(feed[fieldMapping.current]),
        power: this.parseField(feed[fieldMapping.power]),
        energy: this.parseField(feed[fieldMapping.energy]),
        temperature: this.parseField(feed[fieldMapping.temperature]),
        timestamp: feed.created_at || new Date().toISOString(),
        entryId: feed.entry_id
      };
    }

    // Legacy default mapping
    return {
      deviceId,
      voltage: this.parseField(feed.field1),
      current: this.parseField(feed.field2),
      power: this.parseField(feed.field3),
      energy: this.parseField(feed.field4),
      temperature: this.parseField(feed.field5),
      timestamp: feed.created_at || new Date().toISOString(),
      entryId: feed.entry_id
    };
  }

  /**
   * Parse field value with validation
   */
  parseField(value) {
    if (value === null || value === undefined || value === "") {
      return 0;
    }
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Get latest reading for a device (from cache)
   */
  getLatestReading(deviceId) {
    return this.latestReadings.get(deviceId) || null;
  }

  /**
   * Get all latest readings
   */
  getAllLatestReadings() {
    const readings = {};
    this.latestReadings.forEach((reading, deviceId) => {
      readings[deviceId] = reading;
    });
    return readings;
  }

  /**
   * Get device status
   */
  getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    return {
      deviceId: device.deviceId,
      status: device.status,
      lastFetch: device.lastFetch,
      errorCount: device.errorCount
    };
  }

  /**
   * Start global polling for all devices
   * @param {number} intervalSeconds - Polling interval
   */
  startPolling(intervalSeconds = 15) {
    // Poll every intervalSeconds seconds
    const cronExpression = `*/${intervalSeconds} * * * * *`;
    
    this.globalPollingJob = cron.schedule(cronExpression, async () => {
      // Group devices by channelId to avoid duplicate API calls
      const channelGroups = new Map();
      for (const [deviceId, device] of this.devices) {
        const key = `${device.channelId}_${device.readKey}`;
        if (!channelGroups.has(key)) {
          channelGroups.set(key, []);
        }
        channelGroups.get(key).push(device);
      }

      // Fetch once per channel, then map to each device
      for (const [channelKey, devices] of channelGroups) {
        try {
          const firstDevice = devices[0];
          const { data } = await axios.get(
            `${this.baseUrl}/channels/${firstDevice.channelId}/feeds/last.json`,
            {
              params: { api_key: firstDevice.readKey },
              timeout: 10000
            }
          );

          // Map the single feed to each virtual device using its field mapping
          for (const device of devices) {
            const reading = this.mapFeedToReading(data, device.deviceId, device.fieldMapping);
            
            this.cache.set(device.deviceId, {
              data: reading,
              timestamp: Date.now()
            });

            this.latestReadings.set(device.deviceId, reading);
            device.lastFetch = new Date().toISOString();
            device.status = "active";
            device.errorCount = 0;

            this.emit("reading", { deviceId: device.deviceId, reading });
          }
        } catch (error) {
          devices.forEach(device => {
            device.errorCount++;
            if (device.errorCount >= 3) {
              device.status = "error";
            }
          });
          console.error(`Error polling channel ${channelKey}:`, error.message);
        }
      }
    });

    console.log(`Started global polling every ${intervalSeconds} seconds`);
  }

  /**
   * Stop all polling
   */
  stopPolling() {
    if (this.globalPollingJob) {
      this.globalPollingJob.stop();
      this.globalPollingJob = null;
    }

    this.pollingJobs.forEach(job => job.stop());
    this.pollingJobs.clear();

    console.log("Stopped all polling jobs");
  }
}

// Singleton instance
const devicePollingService = new DevicePollingService();

module.exports = devicePollingService;
