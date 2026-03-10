import React, { useState } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import { login } from "../services/auth";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      window.location.href = "/";
    } catch (err) {
      setError("Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
      <form 
        className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-200 w-full max-w-sm sm:max-w-md"
        onSubmit={submit}
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <img src="/logo.png" alt="Logo" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto mb-4 shadow-lg" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Industrial Energy</h2>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Monitoring System</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">Sign in to access the dashboard</p>
        </div>

        {/* Input Fields */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-11 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-11 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 mt-3 text-center">
            {error}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Sign In
            </>
          )}
        </button>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 font-medium mb-2">Demo Credentials</p>
          <p className="text-sm text-gray-700">Email: <span className="font-medium">admin@iot.com</span></p>
          <p className="text-sm text-gray-700">Password: <span className="font-medium">admin123</span></p>
        </div>
      </form>
    </div>
  );
};

export default Login;
