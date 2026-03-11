const crypto = require("crypto");
const { getThresholds, setThresholds } = require("../services/thresholds");
const devicePollingService = require("../services/devicePollingService");

// Device types for industrial applications
const DEVICE_TYPES = [
  "LED Bulb",
  "Fluorescent Bulb",
  "Motor",
  "Industrial Heater",
  "Pump",
  "HVAC System",
  "Compressor",
  "Transformer",
  "Production Machine",
  "Smart Plug",
  "Refrigerator",
  "Air Conditioner",
  "Water Heater",
  "Solar Inverter",
  "Generator",
  "Other"
];

// Field mappings for 2-bulb single-channel setup (Approach A)
const FIELD_MAPPINGS = {
  led: {
    voltage: "field1",      // Shared voltage
    current: "field2",      // LED current
    power: "field4",        // LED power
    temperature: "field6",  // Shared temperature
    energy: "field7"        // LED energy
  },
  fluorescent: {
    voltage: "field1",      // Shared voltage
    current: "field3",      // Fluorescent current
    power: "field5",        // Fluorescent power
    temperature: "field6",  // Shared temperature
    energy: "field8"        // Fluorescent energy
  }
};

// ThingSpeak channel credentials (shared by both devices)
const CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID || "3294471";
const READ_KEY = process.env.THINGSPEAK_READ_KEY || "Y8FB83272XJSJ4K5";
const WRITE_KEY = process.env.THINGSPEAK_WRITE_KEY || "8CE7TT90YX7QC4I2";

// Initialize with 2 default devices sharing the same channel
let devices = [
  {
    deviceId: "led-bulb",
    name: "LED Bulb",
    location: "Production Floor",
    type: "LED Bulb",
    thresholds: getThresholds(),
    secretKey: WRITE_KEY,
    channelId: CHANNEL_ID,
    readKey: READ_KEY,
    writeKey: WRITE_KEY,
    fieldMapping: FIELD_MAPPINGS.led,
    ratedPower: Number(process.env.RATED_POWER || 15),
    tariffRate: Number(process.env.TARIFF_RATE || 6.50),
    emissionFactor: Number(process.env.CARBON_EMISSION_FACTOR || 0.82),
    status: "active",
    controlState: "on",
    peakDemandLimit: 100,
    temperatureWarning: 60,
    createdAt: new Date().toISOString()
  },
  {
    deviceId: "fluorescent-bulb",
    name: "Fluorescent Bulb",
    location: "Warehouse",
    type: "Fluorescent Bulb",
    thresholds: getThresholds(),
    secretKey: WRITE_KEY,
    channelId: CHANNEL_ID,
    readKey: READ_KEY,
    writeKey: WRITE_KEY,
    fieldMapping: FIELD_MAPPINGS.fluorescent,
    ratedPower: Number(process.env.RATED_POWER_2 || 40),
    tariffRate: Number(process.env.TARIFF_RATE || 6.50),
    emissionFactor: Number(process.env.CARBON_EMISSION_FACTOR || 0.82),
    status: "active",
    controlState: "on",
    peakDemandLimit: 200,
    temperatureWarning: 55,
    createdAt: new Date().toISOString()
  }
];

const listDevices = async (req, res, next) => {
  try {
    // Return devices without sensitive keys
    const safeDevices = devices.map((d) => ({
      deviceId: d.deviceId,
      name: d.name,
      location: d.location,
      type: d.type,
      thresholds: d.thresholds,
      ratedPower: d.ratedPower,
      tariffRate: d.tariffRate,
      emissionFactor: d.emissionFactor,
      status: d.status,
      controlState: d.controlState,
      peakDemandLimit: d.peakDemandLimit,
      temperatureWarning: d.temperatureWarning,
      createdAt: d.createdAt,
      channelId: d.channelId
    }));
    res.json(safeDevices);
  } catch (error) {
    next(error);
  }
};

const getDeviceTypes = (req, res) => {
  res.json(DEVICE_TYPES);
};

const createDevice = async (req, res, next) => {
  try {
    const { 
      deviceId, 
      name, 
      location, 
      type, 
      thresholds, 
      channelId, 
      readKey, 
      writeKey,
      ratedPower,
      tariffRate,
      emissionFactor,
      peakDemandLimit,
      temperatureWarning,
      fieldMapping
    } = req.body;

    // Validate required fields
    if (!deviceId || !name) {
      return res.status(400).json({ message: "deviceId and name are required" });
    }

    // Check if device already exists
    if (devices.find(d => d.deviceId === deviceId)) {
      return res.status(400).json({ message: "Device with this ID already exists" });
    }

    const secretKey = crypto.randomBytes(16).toString("hex");
    const device = {
      deviceId,
      name,
      location: location || "Unspecified",
      type: type || "Other",
      thresholds: thresholds || getThresholds(),
      secretKey,
      channelId: channelId || CHANNEL_ID,
      readKey: readKey || READ_KEY,
      writeKey: writeKey || WRITE_KEY,
      fieldMapping: fieldMapping || null,
      ratedPower: Number(ratedPower) || 100,
      tariffRate: Number(tariffRate) || 6.50,
      emissionFactor: Number(emissionFactor) || 0.82,
      status: "active",
      controlState: "off",
      peakDemandLimit: Number(peakDemandLimit) || 5000,
      temperatureWarning: Number(temperatureWarning) || 60,
      createdAt: new Date().toISOString()
    };

    devices.push(device);

    // Register device for polling if ThingSpeak credentials provided
    if (device.channelId && device.readKey) {
      devicePollingService.registerDevice(device);
    }
    
    // Return safe device info (without sensitive keys)
    const safeDevice = {
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      type: device.type,
      thresholds: device.thresholds,
      ratedPower: device.ratedPower,
      tariffRate: device.tariffRate,
      emissionFactor: device.emissionFactor,
      status: device.status,
      controlState: device.controlState,
      peakDemandLimit: device.peakDemandLimit,
      temperatureWarning: device.temperatureWarning,
      createdAt: device.createdAt,
      secretKey
    };
    
    res.status(201).json(safeDevice);
  } catch (error) {
    next(error);
  }
};

const getDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const device = devices.find((item) => item.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const safeDevice = {
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      type: device.type,
      thresholds: device.thresholds,
      channelId: device.channelId
    };

    res.json(safeDevice);
  } catch (error) {
    next(error);
  }
};

const updateDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { name, location, type, thresholds } = req.body;
    const device = devices.find((item) => item.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    device.name = name ?? device.name;
    device.location = location ?? device.location;
    device.type = type ?? device.type;
    if (thresholds) {
      device.thresholds = setThresholds(thresholds);
    }

    const safeDevice = {
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      type: device.type,
      thresholds: device.thresholds
    };

    res.json(safeDevice);
  } catch (error) {
    next(error);
  }
};

const rotateKey = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const device = devices.find((item) => item.deviceId === deviceId);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    device.secretKey = crypto.randomBytes(16).toString("hex");
    res.json({ deviceId: device.deviceId, secretKey: device.secretKey });
  } catch (error) {
    next(error);
  }
};

const deleteDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const index = devices.findIndex((item) => item.deviceId === deviceId);
    if (index === -1) {
      return res.status(404).json({ message: "Device not found" });
    }

    // Prevent deleting the last device
    if (devices.length === 1) {
      return res.status(400).json({ message: "Cannot delete the last device" });
    }

    devices.splice(index, 1);
    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Helper function to get device by ID with all details (including fieldMapping)
const getDeviceByIdWithKeys = (deviceId) => {
  return devices.find((item) => item.deviceId === deviceId);
};

// Get field mapping for a device
const getFieldMapping = (deviceId) => {
  const device = devices.find((item) => item.deviceId === deviceId);
  return device ? device.fieldMapping : null;
};

module.exports = { 
  listDevices, 
  createDevice, 
  getDevice,
  updateDevice, 
  rotateKey, 
  deleteDevice,
  getDeviceByIdWithKeys,
  getDeviceTypes,
  getFieldMapping,
  DEVICE_TYPES,
  FIELD_MAPPINGS
};
