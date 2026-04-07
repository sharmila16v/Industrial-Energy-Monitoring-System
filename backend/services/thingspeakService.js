const axios = require("axios");

const baseUrl = "https://api.thingspeak.com";

// ThingSpeak credentials (single channel for both bulbs)
const THINGSPEAK_CONFIG = {
  channelId: process.env.THINGSPEAK_CHANNEL_ID || "3294471",
  readKey: process.env.THINGSPEAK_READ_KEY || "Y8FB83272XJSJ4K5",
  writeKey: process.env.THINGSPEAK_WRITE_KEY || "8CE7TT90YX7QC4I2"
};

const getConfig = () => ({
  channelId: THINGSPEAK_CONFIG.channelId,
  readKey: THINGSPEAK_CONFIG.readKey,
  writeKey: THINGSPEAK_CONFIG.writeKey
});

const ensureConfig = () => {
  const { channelId, readKey, writeKey } = getConfig();
  if (!channelId || !readKey || !writeKey) {
    throw new Error("ThingSpeak keys are not configured");
  }
  return { channelId, readKey, writeKey };
};

/**
 * Write reading to ThingSpeak using the dual-load layout:
 * field1=voltage, field2=current_led, field3=power_led,
 * field4=energy_led, field5=current_incandescent,
 * field6=power_incandescent, field7=energy_incandescent,
 * field8=temperature(optional)
 */
const writeReading = async (reading) => {
  const { writeKey } = ensureConfig();
  const payload = {
    api_key: writeKey,
    field1: reading.voltage,
    field2: reading.current_led,
    field3: reading.power_led,
    field4: reading.energy_led,
    field5: reading.current_incandescent,
    field6: reading.power_incandescent,
    field7: reading.energy_incandescent,
    field8: reading.temperature
  };

  if (reading.timestamp) {
    payload.created_at = new Date(reading.timestamp).toISOString();
  }

  const { data } = await axios.post(`${baseUrl}/update.json`, payload);
  return data;
};

const fetchLatest = async () => {
  const { channelId, readKey } = ensureConfig();
  const { data } = await axios.get(
    `${baseUrl}/channels/${channelId}/feeds/last.json`,
    { params: { api_key: readKey } }
  );
  return data;
};

const fetchFeeds = async ({ start, end, results = 8000 }) => {
  const { channelId, readKey } = ensureConfig();
  const params = {
    api_key: readKey,
    results
  };

  if (start) {
    params.start = new Date(start).toISOString();
  }
  if (end) {
    params.end = new Date(end).toISOString();
  }

  const { data } = await axios.get(
    `${baseUrl}/channels/${channelId}/feeds.json`,
    { params }
  );
  return data;
};

const fetchCsv = async ({ start, end }) => {
  const { channelId, readKey } = ensureConfig();
  const params = { api_key: readKey };
  if (start) params.start = new Date(start).toISOString();
  if (end) params.end = new Date(end).toISOString();

  const { data } = await axios.get(
    `${baseUrl}/channels/${channelId}/feeds.csv`,
    { params }
  );
  return data;
};

module.exports = { writeReading, fetchLatest, fetchFeeds, fetchCsv, getConfig };
