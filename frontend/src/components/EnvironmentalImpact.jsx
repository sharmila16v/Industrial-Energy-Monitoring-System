import React from "react";
import {
  Leaf,
  TreePine,
  Car,
  Factory,
  Award,
  TrendingDown,
  Globe,
  Droplets
} from "lucide-react";

const EnvironmentalImpact = ({ data, totalEnergy = 0, emissionFactor = 0.82 }) => {
  const co2Emissions = data?.co2Emissions ?? (totalEnergy * emissionFactor);
  const treesRequired = data?.treesRequired ?? Math.ceil(co2Emissions / 21);
  const carKmEquivalent = data?.carKmEquivalent ?? (co2Emissions / 0.12);
  const sustainabilityScore = data?.sustainabilityScore ?? Math.max(0, 100 - (emissionFactor * 100));
  const greenEnergyBadge = data?.greenEnergyBadge || 
    (sustainabilityScore > 80 ? "gold" : sustainabilityScore > 60 ? "silver" : "bronze");

  const badgeColors = {
    gold: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
    silver: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
    bronze: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" }
  };

  const badge = badgeColors[greenEnergyBadge] || badgeColors.bronze;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-600" />
          Environmental Impact
        </h3>
        
        {/* Green Energy Badge */}
        <div className={`px-4 py-2 rounded-full ${badge.bg} border ${badge.border}`}>
          <span className={`flex items-center gap-2 ${badge.text} font-medium text-sm`}>
            <Award className="w-4 h-4" />
            {greenEnergyBadge.toUpperCase()} Badge
          </span>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CO2 Emissions */}
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total CO₂ Emitted</p>
              <p className="text-2xl font-bold text-red-600">
                {co2Emissions.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">kg CO₂</p>
            </div>
            <div className="p-2 rounded-lg bg-red-50">
              <Factory className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Emission Factor: {emissionFactor} kg/kWh
            </p>
          </div>
        </div>

        {/* Trees Required */}
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Trees to Offset</p>
              <p className="text-2xl font-bold text-green-600">
                {treesRequired}
              </p>
              <p className="text-sm text-gray-500">trees/year</p>
            </div>
            <div className="p-2 rounded-lg bg-green-50">
              <TreePine className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              1 tree absorbs ~21 kg CO₂/year
            </p>
          </div>
        </div>

        {/* Car Km Equivalent */}
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Equivalent Car Travel</p>
              <p className="text-2xl font-bold text-blue-600">
                {carKmEquivalent.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">km driven</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Avg car: 0.12 kg CO₂/km
            </p>
          </div>
        </div>

        {/* Sustainability Score */}
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sustainability Score</p>
              <p className="text-2xl font-bold text-emerald-600">
                {sustainabilityScore.toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">/ 100</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50">
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${sustainabilityScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Tips */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-green-600" />
          Reduce Your Carbon Footprint
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-blue-600" />
              </div>
              <p className="font-medium text-gray-900">Off-Peak Usage</p>
            </div>
            <p className="text-sm text-gray-500">
              Shift energy-intensive tasks to off-peak hours (9PM-9AM) to reduce grid stress and costs.
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-green-600" />
              </div>
              <p className="font-medium text-gray-900">Renewable Sources</p>
            </div>
            <p className="text-sm text-gray-500">
              Consider solar panels or green energy plans to reduce your emission factor below 0.1 kg/kWh.
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Factory className="w-4 h-4 text-purple-600" />
              </div>
              <p className="font-medium text-gray-900">Equipment Upgrade</p>
            </div>
            <p className="text-sm text-gray-500">
              Replace inefficient devices with high-efficiency models (class A+++) to reduce consumption by 40%.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Monthly Projection
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Projected CO₂</span>
              <span className="text-lg font-semibold text-gray-900">{(co2Emissions * 30).toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Trees Needed</span>
              <span className="text-lg font-semibold text-green-600">{Math.ceil(treesRequired * 30 / 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Car Equivalent</span>
              <span className="text-lg font-semibold text-blue-600">{(carKmEquivalent * 30).toFixed(0)} km</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Regional Comparison
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Coal Grid (1.0 kg/kWh)</span>
              <span className="text-lg font-semibold text-red-600">{(totalEnergy * 1.0).toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">US Average (0.41 kg/kWh)</span>
              <span className="text-lg font-semibold text-orange-600">{(totalEnergy * 0.41).toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Renewable (0.05 kg/kWh)</span>
              <span className="text-lg font-semibold text-green-600">{(totalEnergy * 0.05).toFixed(1)} kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalImpact;
