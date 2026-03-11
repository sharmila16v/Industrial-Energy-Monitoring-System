const { toNumber, requiredFields } = require("../utils/validate");
const { writeReading, fetchLatest, fetchFeeds } = require("../services/thingspeakService");
const { getDeviceByIdWithKeys } = require("./deviceController");

/**
 * Map a ThingSpeak feed to a reading using device-specific field mapping.
 * If the device has a fieldMapping, use it; otherwise fall back to default.
 */
const mapFeedToReading = (feed, deviceId) => {
  const device = getDeviceByIdWithKeys(deviceId);
  const fm = device ? device.fieldMapping : null;

  if (fm) {
    return {
      deviceId,
      voltage: Number(feed[fm.voltage] || 0),
      current: Number(feed[fm.current] || 0),
      power: Number(feed[fm.power] || 0),
      energy: Number(feed[fm.energy] || 0),
      temperature: Number(feed[fm.temperature] || 0),
      timestamp: feed.created_at
    };
  }

  // Legacy default mapping
  return {
    deviceId,
    voltage: Number(feed.field1 || 0),
    current: Number(feed.field2 || 0),
    power: Number(feed.field3 || 0),
    energy: Number(feed.field4 || 0),
    temperature: Number(feed.field5 || 0),
    timestamp: feed.created_at
  };
};

const ingestData = async (req, res, next) => {
  try {
    const missing = requiredFields(req.body, [
      "deviceId",
      "voltage",
      "current",
      "energy",
      "temperature",
      "timestamp"
    ]);

    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    const voltage = toNumber(req.body.voltage, 0);
    const current = toNumber(req.body.current, 0);
    const power = toNumber(req.body.power, voltage * current);
    const energy = toNumber(req.body.energy, 0);
    const temperature = toNumber(req.body.temperature, 0);

    const entryId = await writeReading({
      deviceId: req.body.deviceId,
      voltage,
      current,
      power,
      energy,
      temperature,
      timestamp: req.body.timestamp
    });

    res.status(201).json({ status: "ok", entryId });
  } catch (error) {
    next(error);
  }
};

const listData = async (req, res, next) => {
  try {
    const { deviceId, from, to, page = 1, limit = 200 } = req.query;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    const response = await fetchFeeds({ start: from, end: to, results: Number(limit) });
    const feeds = response.feeds || [];
    const data = feeds.map((feed) => mapFeedToReading(feed, deviceId));
    res.json({ data, total: data.length, page: Number(page), limit: Number(limit) });
  } catch (error) {
    next(error);
  }
};

const latestData = async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    const feed = await fetchLatest();
    res.json(feed ? mapFeedToReading(feed, deviceId) : null);
  } catch (error) {
    next(error);
  }
};

const streamLatest = async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const interval = setInterval(async () => {
      const feed = await fetchLatest();
      const reading = feed ? mapFeedToReading(feed, deviceId) : null;
      res.write(`data: ${JSON.stringify(reading)}\n\n`);
    }, 3000);

    req.on("close", () => {
      clearInterval(interval);
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { ingestData, listData, latestData, streamLatest, mapFeedToReading };
