const { fetchLatest } = require("../services/thingspeakService");
const { getThresholds } = require("../services/thresholds");
const { getDeviceByIdWithKeys } = require("./deviceController");

const getControl = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const feed = await fetchLatest();
    const thresholds = getThresholds();
    const fm = getDeviceByIdWithKeys(deviceId)?.fieldMapping;
    const powerField = fm?.power || "field3";
    const temperatureField = fm?.temperature || "field8";
    const power = Number(feed?.[powerField] || 0);
    const temperature = Number(feed?.[temperatureField] || 0);
    const relayStatus =
      power > thresholds.power || temperature > thresholds.temperature ? "OFF" : "ON";
    res.json({
      relayStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getControl };
