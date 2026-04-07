import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  BarChart3, 
  GitCompare, 
  Leaf, 
  Settings,
  Gauge,
  Activity,
  Zap,
  Bell
} from "lucide-react";
import KPICards from "../components/KPICards";
import StatusBadge from "../components/StatusBadge";
import GaugeChart from "../charts/GaugeChart";
import LineChartCard from "../charts/LineChartCard";
import UsageBarChart from "../charts/UsageBarChart";
import Filters from "../components/Filters";
import DeviceManager from "../components/DeviceManager";
import AdvancedAnalytics from "../components/AdvancedAnalytics";
import DeviceComparison from "../components/DeviceComparison";
import EnvironmentalImpact from "../components/EnvironmentalImpact";
import DeviceControlPanel from "../components/DeviceControlPanel";
import { SkeletonCard, SkeletonChart, SkeletonGauge } from "../components/AnimatedLoaders";
import { fetchLatest, fetchSeries, fetchPrediction, fetchAdvancedAnalytics } from "../services/data";
import { fetchDevices, createDevice } from "../services/device";
import { formatNumber, toChartSeries } from "../utils/format";

const Dashboard = () => {
  const [devices, setDevices] = useState([]);
  const [filters, setFilters] = useState({ deviceId: "", from: "", to: "" });
  const [latest, setLatest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [advancedMetrics, setAdvancedMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "advanced", label: "Analytics", icon: BarChart3 },
    { id: "control", label: "Control Panel", icon: Settings },
    { id: "comparison", label: "Comparison", icon: GitCompare },
    { id: "environmental", label: "Environmental", icon: Leaf }
  ];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const list = await fetchDevices();
        setDevices(list);
        if (list.length) {
          setFilters((prev) => ({ ...prev, deviceId: list[0].deviceId }));
        }
      } catch (err) {
        console.error('Error fetching devices:', err);
        // 401 errors are handled by api interceptor
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!filters.deviceId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [latestData, summaryData, predictionData, advancedData] = await Promise.all([
          fetchLatest(filters.deviceId),
          fetchSeries(filters.deviceId, filters.from, filters.to),
          fetchPrediction(filters.deviceId),
          fetchAdvancedAnalytics(filters.deviceId, filters.from, filters.to)
        ]);

        console.log("Dashboard data loaded:", { latestData, summaryData, predictionData, advancedData });
        
        setLatest(latestData);
        setSummary(summaryData);
        setPrediction(predictionData);
        setAdvancedMetrics(advancedData);
        
        // Check for alerts
        if (latestData?.power > 4000 || latestData?.temperature > 50) {
          setAlertCount(prev => prev + 1);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [filters]);

  const handleCreateDevice = async (deviceData) => {
    try {
      const newDevice = await createDevice(deviceData);
      const updatedDevices = await fetchDevices();
      setDevices(updatedDevices);
      setFilters((prev) => ({ ...prev, deviceId: newDevice.deviceId }));
    } catch (error) {
      console.error("Failed to create device:", error);
      throw error;
    }
  };

  const stats = summary?.stats || {};
  const totalEnergyValue = Number(stats.totalEnergy || 0);
  const kpis = [
    {
      label: "Total Energy",
      value: `${totalEnergyValue < 1 ? totalEnergyValue.toFixed(4) : totalEnergyValue.toFixed(2)} kWh`,
      caption: "Daily Accumulation",
      tone: "text-cyan-300"
    },
    {
      label: "Peak Power",
      value: formatNumber(stats.maxPower, " W"),
      caption: "Peak Load",
      tone: "text-orange-300"
    },
    {
      label: "Average Load",
      value: formatNumber(stats.avgPower, " W"),
      caption: "Stability",
      tone: "text-emerald-300"
    },
    {
      label: "Cost Estimate",
      value: formatNumber(stats.totalEnergy * 6.50, " INR"),
      caption: "Tamil Nadu @ ₹6.50/kWh",
      tone: "text-purple-300"
    },
    {
      label: "Area Temperature",
      value: formatNumber(latest?.temperature, " °C"),
      caption: "DHT11 ambient reading",
      tone: "text-orange-300"
    }
  ];

  const series = toChartSeries(summary?.series, "totalEnergy");
  const tempSeries = toChartSeries(summary?.series, "avgTemperature");
  const powerSeries = (summary?.series || []).map((item) => ({
    label: item._id,
    value: Number(item.avgPower || 0)
  }));

  const status = latest?.power > (stats.maxPower || 0) ? "danger" : "ok";
  const ecoEnergyFromStats = Number(summary?.stats?.totalEnergy ?? 0);
  const ecoEnergyFromLatest = Number(latest?.energy ?? 0);
  const ecoEnergy = Math.max(ecoEnergyFromStats, ecoEnergyFromLatest);
  const ecoCo2 =
    advancedMetrics?.carbonFootprint ??
    summary?.carbonEstimate ??
    (ecoEnergy * 0.82);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Device Manager */}
      <DeviceManager
        devices={devices}
        currentDevice={filters.deviceId}
        onDeviceSelect={(deviceId) =>
          setFilters((prev) => ({ ...prev, deviceId }))
        }
        onCreateDevice={handleCreateDevice}
      />

      <Filters value={filters} onChange={setFilters} devices={devices} />

      {/* Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Live Status</p>
          <h3 className="text-lg sm:text-xl md:text-2xl text-gray-900 font-semibold mt-1 truncate">
            {devices.find((d) => d.deviceId === filters.deviceId)?.name || filters.deviceId}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
            {devices.find((d) => d.deviceId === filters.deviceId)?.location}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {[
          { id: "overview", label: "Overview", Icon: LayoutDashboard },
          { id: "advanced", label: "Analytics", Icon: BarChart3 },
          { id: "control", label: "Control", Icon: Settings },
          { id: "comparison", label: "Compare", Icon: GitCompare },
          { id: "environmental", label: "Eco", Icon: Leaf }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
            {tab.id === "control" && alertCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4 sm:space-y-6">
          <KPICards items={kpis} />

          {/* Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <GaugeChart value={latest?.voltage || 0} max={480} label="Voltage" unit="V" color="cyan" />
            <GaugeChart value={latest?.current || 0} max={200} label="Current" unit="A" color="blue" />
            <GaugeChart value={latest?.power || 0} max={5000} label="Power" unit="W" color="orange" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <LineChartCard
              title="Power Consumption Trend"
              data={powerSeries}
              dataKey="value"
              stroke="#0ea5e9"
              showGradient
            />
            <LineChartCard
              title="Temperature Trend"
              data={tempSeries}
              dataKey="value"
              stroke="#f97316"
              showGradient
            />
          </div>

          {/* Summary Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 sm:mb-4">Basic Analytics</p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500">Efficiency</span>
                  <span className="text-base sm:text-lg font-semibold text-blue-600">
                    {summary?.efficiency || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Carbon Footprint</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatNumber(summary?.carbonEstimate, " kg CO₂")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Forecast (1h)</span>
                  <span className="text-lg font-semibold text-orange-600">
                    {formatNumber(prediction?.predictedPower, " W")}
                  </span>
                </div>
              </div>
            </div>

            <UsageBarChart data={series} />

            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Quick Info</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Peak detection active</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Temp: {Math.round(stats.avgTemperature || 0)}°C avg</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Status: {status === "danger" ? "⚠️ High Load" : "✓ Normal"}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analytics Tab */}
      {activeTab === "advanced" && (
        <div>
          <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-700 font-medium">Analytics Tab Active</p>
            <p className="text-gray-500 text-sm">
              Data status: {advancedMetrics ? `Loaded (${Object.keys(advancedMetrics).length} keys)` : "Not loaded"}
            </p>
          </div>
          {advancedMetrics && Object.keys(advancedMetrics).length > 0 ? (
            <AdvancedAnalytics data={advancedMetrics} />
          ) : (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500">
              {loading ? "Loading advanced analytics..." : "No advanced metrics available. Ensure device is sending data."}
            </div>
          )}
        </div>
      )}

      {/* Control Panel Tab */}
      {activeTab === "control" && (
        <div>
          <DeviceControlPanel devices={devices} />
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === "comparison" && (
        <div>
          <DeviceComparison devices={devices} />
        </div>
      )}

      {/* Environmental Impact Tab */}
      {activeTab === "environmental" && (
        <div>
          <EnvironmentalImpact
            totalEnergy={ecoEnergy}
            data={{
              co2Emissions: ecoCo2,
              treesRequired: ecoCo2 > 0 ? Math.max(1, Math.ceil(ecoCo2 / 21)) : 0,
              carKmEquivalent: ecoCo2 / 0.12,
              sustainabilityScore: advancedMetrics?.powerQualityIndex != null
                ? advancedMetrics.powerQualityIndex * 100
                : undefined
            }}
            devices={devices}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
