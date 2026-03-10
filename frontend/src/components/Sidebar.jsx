import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Cpu, FileText, Activity, X } from "lucide-react";

const NavItem = ({ to, label, icon: Icon, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`
    }
  >
    {Icon && <Icon className="w-5 h-5" />}
    {label}
  </NavLink>
);

const Sidebar = ({ onClose }) => (
  <aside className="bg-white h-full min-h-screen p-4 sm:p-6 flex flex-col gap-6 border-r border-gray-200 w-full">
    {/* Header with Logo and Close Button */}
    <div className="pb-4 border-b border-gray-200">
      {/* Mobile: Logo with text and close button */}
      <div className="flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-md" 
          />
          <div>
            <h1 className="text-base font-bold text-gray-900">IEMS</h1>
            <p className="text-xs text-gray-500">Energy Monitor</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {/* Laptop: Centered larger logo */}
      <div className="hidden lg:flex justify-center">
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="w-20 h-20 rounded-full object-cover shadow-md" 
        />
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex flex-col gap-1">
      <NavItem to="/" label="Dashboard" icon={LayoutDashboard} onClick={onClose} />
      <NavItem to="/devices" label="Devices" icon={Cpu} onClick={onClose} />
      <NavItem to="/reports" label="Reports" icon={FileText} onClick={onClose} />
    </nav>

    {/* Status Footer */}
    <div className="mt-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 text-gray-700 mb-2">
        <Activity className="w-4 h-4" />
        <span className="text-xs font-semibold">System Status</span>
      </div>
      <p className="text-sm text-green-600 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        All sensors online
      </p>
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{width: '75%'}}></div>
      </div>
      <p className="text-xs text-gray-500 mt-1">System Load: 75%</p>
    </div>
  </aside>
);

export default Sidebar;
