#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <DHT.h>

// -----------------------------
// Wi-Fi + ThingSpeak settings
// -----------------------------
const char* WIFI_SSID = "Anil";
const char* WIFI_PASS = "Vijay226";
const char* THINGSPEAK_WRITE_KEY = "8CE7TT90YX7QC4I2";

// ThingSpeak allows updates every >= 15 seconds on free tier.
const uint32_t UPLOAD_INTERVAL_MS = 15000;

// -----------------------------
// Electrical configuration
// -----------------------------
const float NOMINAL_VOLTAGE_RMS = 230.0f;      // Field1
const float ACS_DEFAULT_ZERO_VOLTAGE = 2.5f;   // ACS712 output at 0A

// Set these to your ACS712 variants (5A=185, 20A=100, 30A=66 mV/A)
const float LED_SENSOR_MV_PER_A = 185.0f;
const float INC_SENSOR_MV_PER_A = 185.0f;

// Small-current noise rejection
const float CURRENT_NOISE_FLOOR_A = 0.015f;

// DHT11 setup (temperature for field8)
const uint8_t DHT_PIN = D4;
const uint8_t DHT_TYPE = DHT11;

// Optional fallback if DHT read fails
const bool USE_ADS_TEMP_FALLBACK = false;

// -----------------------------
// Hardware objects
// -----------------------------
Adafruit_ADS1115 ads;
WiFiClient wifiClient;
DHT dht(DHT_PIN, DHT_TYPE);

// Energy accumulators (kWh)
float energyLedKWh = 0.0f;   // Field4
float energyIncKWh = 0.0f;   // Field7

uint32_t lastUploadMs = 0;
float acsZeroLedV = ACS_DEFAULT_ZERO_VOLTAGE;
float acsZeroIncV = ACS_DEFAULT_ZERO_VOLTAGE;

float calibrateAcsZeroVoltage(uint8_t channel, uint16_t samples = 1000) {
  double sum = 0.0;
  for (uint16_t i = 0; i < samples; i++) {
    int16_t raw = ads.readADC_SingleEnded(channel);
    sum += adsCountsToVolts(raw);
    delayMicroseconds(500);
  }
  return (float)(sum / samples);
}

float adsCountsToVolts(int16_t counts) {
  // ADS1115 @ GAIN_ONE => +/-4.096V full scale, 125 uV per count
  return counts * 0.000125f;
}

float readRmsCurrentA(uint8_t channel, float zeroOffsetV, float sensorMilliVoltsPerAmp, uint16_t samples = 600) {
  double sumSquares = 0.0;

  for (uint16_t i = 0; i < samples; i++) {
    int16_t raw = ads.readADC_SingleEnded(channel);
    float volts = adsCountsToVolts(raw);
    float centered = volts - zeroOffsetV;
    sumSquares += (double)centered * (double)centered;
    delayMicroseconds(800);
  }

  float vrms = sqrt(sumSquares / samples);
  float amps = vrms / (sensorMilliVoltsPerAmp / 1000.0f);

  if (amps < CURRENT_NOISE_FLOOR_A) {
    amps = 0.0f;
  }

  return amps;
}

float readTemperatureC() {
  float tempC = dht.readTemperature();
  if (!isnan(tempC) && tempC >= -20.0f && tempC <= 80.0f) {
    return tempC;
  }

  if (!USE_ADS_TEMP_FALLBACK) {
    return 0.0f;
  }

  int16_t raw = ads.readADC_SingleEnded(2); // A2 fallback (LM35)
  float volts = adsCountsToVolts(raw);
  float lm35Temp = volts * 100.0f;
  if (lm35Temp < -20.0f || lm35Temp > 125.0f) {
    return 0.0f;
  }
  return lm35Temp;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Connecting WiFi");
  uint8_t retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 60) {
    delay(500);
    Serial.print('.');
    retries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect timeout");
  }
}

void sendToThingSpeak(float voltage, float currentLed, float powerLed, float energyLed,
                      float currentInc, float powerInc, float energyInc, float temperatureC) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  HTTPClient http;

  String url = String("http://api.thingspeak.com/update?api_key=") + THINGSPEAK_WRITE_KEY +
               "&field1=" + String(voltage, 2) +
               "&field2=" + String(currentLed, 4) +
               "&field3=" + String(powerLed, 2) +
               "&field4=" + String(energyLed, 6) +
               "&field5=" + String(currentInc, 4) +
               "&field6=" + String(powerInc, 2) +
               "&field7=" + String(energyInc, 6) +
               "&field8=" + String(temperatureC, 2) +
               "&status=T:" + String(temperatureC, 1) + "C";

  http.begin(wifiClient, url);
  int httpCode = http.GET();
  String response = http.getString();
  http.end();

  Serial.print("ThingSpeak HTTP: ");
  Serial.print(httpCode);
  Serial.print(" response: ");
  Serial.println(response);
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Wire.begin();
  if (!ads.begin()) {
    Serial.println("ADS1115 not found. Check wiring.");
    while (true) {
      delay(1000);
    }
  }

  ads.setGain(GAIN_ONE);
  dht.begin();

  Serial.println("Calibrating ACS712 zero offsets. Keep both loads OFF...");
  delay(1500);
  acsZeroLedV = calibrateAcsZeroVoltage(0);
  acsZeroIncV = calibrateAcsZeroVoltage(1);
  Serial.printf("ACS LED zero V: %.5f, ACS INC zero V: %.5f\n", acsZeroLedV, acsZeroIncV);

  connectWiFi();
  lastUploadMs = millis();
}

void loop() {
  uint32_t now = millis();
  if (now - lastUploadMs < UPLOAD_INTERVAL_MS) {
    delay(20);
    return;
  }

  float dtHours = (now - lastUploadMs) / 3600000.0f;
  lastUploadMs = now;

  float voltage = NOMINAL_VOLTAGE_RMS;

  // ACS712 sensors via ADS1115 channels A0 and A1
  float currentLed = readRmsCurrentA(0, acsZeroLedV, LED_SENSOR_MV_PER_A);
  float currentInc = readRmsCurrentA(1, acsZeroIncV, INC_SENSOR_MV_PER_A);

  float powerLed = voltage * currentLed;
  float powerInc = voltage * currentInc;

  energyLedKWh += (powerLed / 1000.0f) * dtHours;
  energyIncKWh += (powerInc / 1000.0f) * dtHours;

  float tempC = readTemperatureC();

  sendToThingSpeak(
    voltage,
    currentLed,
    powerLed,
    energyLedKWh,
    currentInc,
    powerInc,
    energyIncKWh,
    tempC
  );

  Serial.println("--- Measurement ---");
  Serial.printf("V=%.2f | I_LED=%.4fA P_LED=%.2fW E_LED=%.6fkWh\n", voltage, currentLed, powerLed, energyLedKWh);
  Serial.printf("I_INC=%.4fA P_INC=%.2fW E_INC=%.6fkWh\n", currentInc, powerInc, energyIncKWh);
  Serial.printf("Temp=%.2fC\n", tempC);
}
