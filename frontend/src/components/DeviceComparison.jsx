import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from "recharts";
import {
  Activity, ArrowRightLeft, Zap, DollarSign, Leaf, TrendingUp,
  Award, Gauge, Thermometer
} from "lucide-react";
import api from "../services/api";

const MetricCard = ({ label, valueA, valueB, unit, icon: Icon, better, difference }) => {
  const getHighlight = (device) => {
    if (!better) return "";
    return better === device ? "ring-2 ring-green-500" : "";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 bg-blue-50 rounded-lg text-center ${getHighlight("deviceA")}`}>
          <p className="text-xs text-gray-500 mb-1">Device A</p>
          <p className="text-lg font-bold text-gray-900">
            {typeof valueA === "number" ? valueA.toFixed(2) : valueA} {unit}
          </p>
        </div>
        <div className={`p-3 bg-cyan-50 rounded-lg text-center ${getHighlight("deviceB")}`}>
          <p className="text-xs text-gray-500 mb-1">Device B</p>
          <p className="text-lg font-bold text-gray-900">
            {typeof valueB === "number" ? valueB.toFixed(2) : valueB} {unit}
          </p>
        </div>
      </div>
      {difference !== undefined && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Difference: {typeof difference === "number" ? difference.toFixed(2) : difference}%
        </p>
      )}
    </div>
  );
};

const DeviceComparison = ({ devices }) => {
  const [deviceA, setDeviceA] = useState("");
  const [deviceB, setDeviceB] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchComparison = async () => {
    if (!deviceA || !deviceB || deviceA === deviceB) return;
    
    setLoading(true);
    try {
      const res = await api.post("/api/comparison/devices", {
        deviceAId: deviceA,
        deviceBId: deviceB
      });
      setComparison(res.data);
    } catch (err) {
      console.error("Failed to fetch comparison:", err);
    } finally {
      setLoading(false);
    }
  };

  const barChartData = comparison ? [
    {
      name: "Energy (kWh)",
      "Device A": comparison.deviceA.energyCost.totalEnergy,
      "Device B": comparison.deviceB.energyCost.totalEnergy
    },
    {
      name: "Cost (₹)",
      "Device A": comparison.deviceA.energyCost.totalCost,
      "Device B": comparison.deviceB.energyCost.totalCost
    },
    {
      name: "CO₂ (kg)",
      "Device A": comparison.deviceA.environmental.co2Emissions,
      "Device B": comparison.deviceB.environmental.co2Emissions
    }
  ] : [];

  const radarData = comparison ? [
    {
      metric: "Efficiency",
      "Device A": comparison.deviceA.powerMetrics.efficiency,
      "Device B": comparison.deviceB.powerMetrics.efficiency
    },
    {
      metric: "Power Factor",
      "Device A": comparison.deviceA.powerMetrics.powerFactor * 100,
      "Device B": comparison.deviceB.powerMetrics.powerFactor * 100
    },
    {
      metric: "Load Factor",
      "Device A": comparison.deviceA.powerMetrics.loadFactor,
      "Device B": comparison.deviceB.powerMetrics.loadFactor
    },
    {
      metric: "Sustainability",
      "Device A": 100 - (comparison.deviceA.environmental.co2Emissions * 10),
      "Device B": 100 - (comparison.deviceB.environmental.co2Emissions * 10)
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Device Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
          Device Comparison
        </h3>
        
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device A
            </label>
            <select
              value={deviceA}
              onChange={(e) => setDeviceA(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="">Select Device A</option>
              {devices?.filter(d => d.deviceId !== deviceB).map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device B
            </label>
            <select
              value={deviceB}
              onChange={(e) => setDeviceB(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="">Select Device B</option>
              {devices?.filter(d => d.deviceId !== deviceA).map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchComparison}
            disabled={!deviceA || !deviceB || deviceA === deviceB || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
          >
            <Activity className="w-4 h-4" />
            {loading ? "Loading..." : "Compare Devices"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && !loading && (
        <>
          {/* Primary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Energy Consumed"
              valueA={comparison.deviceA.energyCost.totalEnergy}
              valueB={comparison.deviceB.energyCost.totalEnergy}
              unit="kWh"
              icon={Zap}
              better={comparison.comparison.power.moreEfficient}
              difference={comparison.comparison.energy.difference}
            />
            <MetricCard
              label="Total Cost"
              valueA={comparison.deviceA.energyCost.totalCost}
              valueB={comparison.deviceB.energyCost.totalCost}
              unit="₹"
              icon={DollarSign}
              better={comparison.comparison.cost.cheaper}
              difference={comparison.comparison.cost.difference}
            />
            <MetricCard
              label="CO₂ Emissions"
              valueA={comparison.deviceA.environmental.co2Emissions}
              valueB={comparison.deviceB.environmental.co2Emissions}
              unit="kg"
              icon={Leaf}
              better={comparison.comparison.carbon.greener}
              difference={comparison.comparison.carbon.difference}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Power Factor"
              valueA={comparison.deviceA.powerMetrics.powerFactor}
              valueB={comparison.deviceB.powerMetrics.powerFactor}
              unit=""
              icon={Gauge}
              better={comparison.comparison.powerFactor.better}
              difference={comparison.comparison.powerFactor.difference}
            />
            <MetricCard
              label="Efficiency"
              valueA={comparison.deviceA.powerMetrics.efficiency}
              valueB={comparison.deviceB.powerMetrics.efficiency}
              unit="%"
              icon={TrendingUp}
              better={comparison.comparison.efficiency.better}
              difference={comparison.comparison.efficiency.difference}
            />
            <MetricCard
              label="Load Factor"
              valueA={comparison.deviceA.powerMetrics.loadFactor}
              valueB={comparison.deviceB.powerMetrics.loadFactor}
              unit="%"
              difference={comparison.comparison.loadFactor.difference}
            />
            <MetricCard
              label="Peak Power"
              valueA={comparison.deviceA.powerMetrics.peakPower}
              valueB={comparison.deviceB.powerMetrics.peakPower}
              unit="W"
              icon={Thermometer}
              difference={comparison.comparison.peakLoad.difference}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
                Side-by-Side Comparison
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Device A" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Device B" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
                Performance Radar
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" stroke="#6b7280" fontSize={11} />
                  <PolarRadiusAxis stroke="#e5e7eb" fontSize={10} />
                  <Radar
                    name="Device A"
                    dataKey="Device A"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Device B"
                    dataKey="Device B"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Analysis Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-sm text-gray-600 mb-2">Most Efficient</p>
                <p className="text-xl font-bold text-green-700">
                  {devices.find(d => d.deviceId === (comparison.comparison.efficiency.better === "deviceA" ? deviceA : deviceB))?.name}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-sm text-gray-600 mb-2">Most Cost Effective</p>
                <p className="text-xl font-bold text-green-700">
                  {devices.find(d => d.deviceId === (comparison.comparison.cost.cheaper === "deviceA" ? deviceA : deviceB))?.name}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-sm text-gray-600 mb-2">Greenest Choice</p>
                <p className="text-xl font-bold text-green-700">
                  {devices.find(d => d.deviceId === (comparison.comparison.carbon.greener === "deviceA" ? deviceA : deviceB))?.name}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* No comparison yet */}
      {!comparison && !loading && (
        <div className="bg-white border border-gray-200 p-12 rounded-lg text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">Select Devices to Compare</h3>
          <p className="text-gray-500">
            Choose two different devices and click "Compare Devices" to see detailed analytics
          </p>
        </div>
      )}
    </div>
  );
};

export default DeviceComparison;
