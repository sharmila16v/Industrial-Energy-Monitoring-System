const { toCsv } = require("../utils/csvExport");
const { buildPdfReport } = require("../utils/pdfReport");
const { fetchFeeds, fetchCsv } = require("../services/thingspeakService");
const { buildAdvancedAnalytics } = require("../services/advancedCalculations");
const { getDeviceByIdWithKeys } = require("./deviceController");

/**
 * Map a ThingSpeak feed to a reading using device-specific field mapping.
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

const buildStats = (rows) => {
  if (!rows.length) {
    return {
      avgPower: 0,
      maxPower: 0,
      avgVoltage: 0,
      avgCurrent: 0,
      totalEnergy: 0,
      minTemperature: 0,
      maxTemperature: 0
    };
  }

  const sum = rows.reduce(
    (acc, row) => {
      acc.power += row.power;
      acc.voltage += row.voltage;
      acc.current += row.current;
      acc.maxPower = Math.max(acc.maxPower, row.power);
      acc.maxEnergy = Math.max(acc.maxEnergy, row.energy);
      acc.minTemp = Math.min(acc.minTemp, row.temperature);
      acc.maxTemp = Math.max(acc.maxTemp, row.temperature);
      return acc;
    },
    {
      power: 0,
      voltage: 0,
      current: 0,
      maxPower: 0,
      maxEnergy: 0,
      minTemp: Number.POSITIVE_INFINITY,
      maxTemp: 0
    }
  );

  return {
    avgPower: sum.power / rows.length,
    maxPower: sum.maxPower,
    avgVoltage: sum.voltage / rows.length,
    avgCurrent: sum.current / rows.length,
    totalEnergy: sum.maxEnergy,
    minTemperature: sum.minTemp === Number.POSITIVE_INFINITY ? 0 : sum.minTemp,
    maxTemperature: sum.maxTemp
  };
};

const buildDailySeries = (rows) => {
  const byDay = new Map();
  rows.forEach((row) => {
    const day = new Date(row.timestamp).toISOString().slice(0, 10);
    const current = byDay.get(day) || { sumPower: 0, count: 0, energy: 0, temp: 0 };
    current.sumPower += row.power;
    current.temp += row.temperature;
    current.count += 1;
    current.energy = Math.max(current.energy, row.energy);
    byDay.set(day, current);
  });

  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, data]) => ({
      _id: day,
      avgPower: data.count ? data.sumPower / data.count : 0,
      totalEnergy: data.energy,
      avgTemperature: data.count ? data.temp / data.count : 0
    }));
};

const predictNextHour = (rows) => {
  if (!rows.length) {
    return { predictedPower: 0 };
  }

  const sorted = rows.slice(-60);
  const n = sorted.length;
  const xMean = (n - 1) / 2;
  const yMean = sorted.reduce((sum, item) => sum + item.power, 0) / n;

  let numerator = 0;
  let denominator = 0;

  sorted.forEach((item, index) => {
    numerator += (index - xMean) * (item.power - yMean);
    denominator += (index - xMean) ** 2;
  });

  const slope = denominator === 0 ? 0 : numerator / denominator;
  return { predictedPower: Math.max(0, yMean + slope * 1) };
};

const summary = async (req, res, next) => {
  try {
    const { deviceId, from, to } = req.query;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    const response = await fetchFeeds({ start: from, end: to });
    const rows = (response.feeds || []).map((feed) => mapFeedToReading(feed, deviceId));
    const stats = buildStats(rows);
    const series = buildDailySeries(rows);

    const efficiency = stats.maxPower
      ? Math.round((stats.avgPower / stats.maxPower) * 100)
      : 0;

    const carbonFactor = Number(process.env.CARBON_EMISSION_FACTOR || 0.82);
    const carbonEstimate = stats.totalEnergy * carbonFactor;

    // Build advanced analytics
    const advancedAnalytics = buildAdvancedAnalytics(rows, carbonFactor);

    res.json({ 
      stats, 
      series, 
      efficiency, 
      carbonEstimate,
      advanced: advancedAnalytics.advancedMetrics
    });
  } catch (error) {
    next(error);
  }
};

const compare = async (req, res, next) => {
  try {
    const { deviceId, date } = req.query;
    if (!deviceId || !date) {
      return res.status(400).json({ message: "deviceId and date are required" });
    }
    const currentStart = new Date(`${date}T00:00:00Z`);
    const currentEnd = new Date(`${date}T23:59:59Z`);
    const prevDate = new Date(currentStart);
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    const prevStart = new Date(prevDate.toISOString().slice(0, 10) + "T00:00:00Z");
    const prevEnd = new Date(prevDate.toISOString().slice(0, 10) + "T23:59:59Z");

    const [currentFeeds, prevFeeds] = await Promise.all([
      fetchFeeds({ start: currentStart, end: currentEnd }),
      fetchFeeds({ start: prevStart, end: prevEnd })
    ]);

    const currentRows = (currentFeeds.feeds || []).map((feed) =>
      mapFeedToReading(feed, deviceId)
    );
    const prevRows = (prevFeeds.feeds || []).map((feed) => mapFeedToReading(feed, deviceId));

    res.json({ current: buildStats(currentRows), previous: buildStats(prevRows) });
  } catch (error) {
    next(error);
  }
};

const predict = async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    const response = await fetchFeeds({ results: 60 });
    const rows = (response.feeds || []).map((feed) => mapFeedToReading(feed, deviceId));
    res.json(predictNextHour(rows));
  } catch (error) {
    next(error);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    const { deviceId, from, to } = req.query;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    const csv = await fetchCsv({ start: from, end: to });
    if (!csv) {
      const response = await fetchFeeds({ start: from, end: to });
      const rows = (response.feeds || []).map((feed) => mapFeedToReading(feed, deviceId));
      const fallback = toCsv(rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=export.csv");
      return res.send(fallback);
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=export.csv");
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

const exportPdf = async (req, res, next) => {
  try {
    const { deviceId, from, to } = req.query;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }

    const filter = { deviceId };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const response = await fetchFeeds({ start: from, end: to });
    const rows = (response.feeds || []).map((feed) => mapFeedToReading(feed, deviceId));
    const stats = buildStats(rows);
    const rangeLabel = `${from || "beginning"} to ${to || "now"}`;
    buildPdfReport({ res, deviceId, rangeLabel, stats, rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { summary, compare, predict, exportCsv, exportPdf };
