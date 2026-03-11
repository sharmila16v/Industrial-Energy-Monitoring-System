const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { apiLimiter } = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/auth");
const deviceRoutes = require("./routes/devices");
const dataRoutes = require("./routes/data");
const analyticsRoutes = require("./routes/analytics");
const alertRoutes = require("./routes/alerts");
const controlRoutes = require("./routes/control");
const comparisonRoutes = require("./routes/comparison");
const adminRoutes = require("./routes/admin");

// Services
const devicePollingService = require("./services/devicePollingService");
const webSocketService = require("./services/websocketService");
const alertService = require("./services/alertService");
const { getDeviceByIdWithKeys, FIELD_MAPPINGS } = require("./controllers/deviceController");

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
webSocketService.initialize(server);

app.use(express.json({ limit: "1mb" }));
app.use(helmet());
app.use(morgan("dev"));

const corsOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: corsOrigins.length === 1 && corsOrigins[0] === "*" ? true : corsOrigins,
    credentials: true
  })
);

app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    websocket: webSocketService.getStats(),
    polling: "active"
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/device-control", controlRoutes);
app.use("/api/comparison", comparisonRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

const port = process.env.PORT || 5000;

// ThingSpeak channel credentials (shared by both bulbs)
const CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID || "3294471";
const READ_KEY = process.env.THINGSPEAK_READ_KEY || "Y8FB83272XJSJ4K5";
const WRITE_KEY = process.env.THINGSPEAK_WRITE_KEY || "8CE7TT90YX7QC4I2";

// Initialize services on startup
const initializeServices = () => {
  console.log("Initializing IoT Dashboard services...");

  // Register both bulbs as virtual devices sharing the same ThingSpeak channel
  const defaultDevices = [
    {
      deviceId: "led-bulb",
      channelId: CHANNEL_ID,
      readKey: READ_KEY,
      writeKey: WRITE_KEY,
      fieldMapping: FIELD_MAPPINGS.led
    },
    {
      deviceId: "fluorescent-bulb",
      channelId: CHANNEL_ID,
      readKey: READ_KEY,
      writeKey: WRITE_KEY,
      fieldMapping: FIELD_MAPPINGS.fluorescent
    }
  ];

  // Register devices for polling
  defaultDevices.forEach(device => {
    devicePollingService.registerDevice(device);
  });

  // Setup polling service to trigger alerts
  devicePollingService.on("reading", ({ deviceId, reading }) => {
    alertService.analyzeReading(deviceId, reading);
  });

  // Start polling (every 15 seconds)
  devicePollingService.startPolling(15);

  // Initialize email alerts if configured
  if (process.env.SMTP_HOST) {
    alertService.initializeEmail({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM,
      recipients: process.env.ALERT_RECIPIENTS
    });
  }

  console.log(`Registered ${defaultDevices.length} devices for polling (shared channel: ${CHANNEL_ID})`);
};

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket server ready`);
  initializeServices();
});
