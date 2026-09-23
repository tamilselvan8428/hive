import React, { useEffect, useState, useRef } from "react";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { apiKeyAPI, heaterAPI, userAPI, notificationAPI } from "../api";
import { notificationService } from "../services/notificationService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const weatherFor = (key) => {
  const k = (key || "").toLowerCase();
  if (/rain|drizzle/.test(k)) return { icon: "🌧️", text: "Rainy" };
  if (/cloud|mist/.test(k)) return { icon: "☁️", text: "Cloudy" };
  if (/clear/.test(k)) return { icon: "☀️", text: "Clear" };
  return { icon: "🌤️", text: "Sunny" };
};

const Dborad = () => {
  const [hives, setHives] = useState([]);
  const [hiveHistory, setHiveHistory] = useState([]);
  const [heaters, setHeaters] = useState({});
  const [weather, setWeather] = useState({
    temp: 24,
    humidity: 50,
    pressure: 1012,
    wind: 0,
    climate: "Sunny",
  });
  const [time, setTime] = useState(new Date());
  const [lastWeatherUpdated, setLastWeatherUpdated] = useState(null);
  const farmId = localStorage.getItem("farmId");

  // Heater System State
  const [heaterState, setHeaterState] = useState({
    farmId: farmId ? Number(farmId) : 1,
    temperature: null,
    humidity: null,
    heaterStatus: "OFF",
    mode: "AUTO",
    onThreshold: 30.0,
    offThreshold: 35.0,
    reason: "Initializing system...",
    smsStatus: "NOT REQUIRED",
    smsMessage: "",
    maskedRecipient: "Loading...",
    esp32Online: false,
    lastStateChangeAt: null,
    lastNotificationAt: null,
  });

  const [loadingHeater, setLoadingHeater] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastTriggeredNotifId, setLastTriggeredNotifId] = useState(null);

  // Ref tracking last known heater status to ensure notifications fire ONLY on state transition (OFF -> ON or ON -> OFF)
  const lastKnownHeaterStatusRef = useRef(null);

  const [tempThresholds, setTempThresholds] = useState({ onThreshold: 30.0, offThreshold: 35.0 });
  const [userProfile, setUserProfile] = useState({
    name: "",
    phoneNumber: "",
    farmName: "",
    address: "",
    email: "",
  });

  const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY || '8e88a178b6f8d7c81283a7bf200969fa';
  const THINGSPEAK_KEY = import.meta.env.VITE_THINGSPEAK_KEY || 'C4SNIR7EP4W21360';
  const THINGSPEAK_WRITE_KEY = import.meta.env.VITE_THINGSPEAK_WRITE_KEY || 'A0B9TJ5N4L8R72ZE';

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchWeather = async () => {
    if (!OPENWEATHER_KEY) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`
          );
          const data = await res.json();
          if (res.status === 200 && data.cod === 200) {
            setWeather({
              temp: Math.round(data.main.temp),
              humidity: data.main.humidity,
              pressure: data.main.pressure,
              wind: Math.round(data.wind?.speed || 0),
              climate: data.weather?.[0]?.main || "Unknown",
            });
            setLastWeatherUpdated(new Date());
          }
        } catch (err) {
          console.error("Error fetching weather:", err);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  };

  // Fetch backend heater status
  const fetchHeaterStatus = async () => {
    try {
      const res = await heaterAPI.getStatus(farmId || 1);
      if (res.data) {
        const newStatus = res.data.heaterStatus;
        if (newStatus) {
          // Fire alert ONLY on actual state transition (OFF -> ON or ON -> OFF)
          if (lastKnownHeaterStatusRef.current !== null && lastKnownHeaterStatusRef.current !== newStatus) {
            console.log(`[STATE CHANGE DETECTED] ${lastKnownHeaterStatusRef.current} -> ${newStatus}`);
            notificationService.showHeaterNotification({
              status: newStatus,
              temperature: res.data.temperature,
              mode: res.data.mode,
              reason: res.data.reason || `Heater state changed to ${newStatus}`,
            });
          }
          lastKnownHeaterStatusRef.current = newStatus;
        }

        setHeaterState(res.data);
        setHeaters((prev) => ({
          ...prev,
          [farmId || 1]: res.data.heaterStatus === "ON",
        }));
        setTempThresholds({
          onThreshold: res.data.onThreshold ?? 30.0,
          offThreshold: res.data.offThreshold ?? 35.0,
        });
      }
    } catch (err) {
      console.error("Error fetching heater status from backend:", err);
    }
  };

  // Fetch application notifications for the in-app alert center list ONLY (never loops popup alerts)
  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications(farmId || 1);
      if (res.data && res.data.notifications) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Notification sync:", err);
    }
  };

  // Fetch user profile for mobile number display & editing
  const fetchProfile = async () => {
    try {
      const res = await userAPI.getProfile();
      if (res.data && res.data.user) {
        setUserProfile(res.data.user);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const sendApiKey = async (currentFarmId, apiKey) => {
    const targetFarm = currentFarmId || localStorage.getItem("farmId");
    if (!targetFarm || !apiKey) {
      alert("farmId or apiKey is missing!");
      return;
    }

    try {
      await apiKeyAPI.saveKey({
        farmId: Number(targetFarm),
        apiKey,
      });
      alert("API key saved successfully!");
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Error saving API key");
    }
  };

  const fetchHives = async () => {
    try {
      const resLatest = await fetch(
        `https://api.thingspeak.com/channels/3126283/feeds.json?api_key=${THINGSPEAK_KEY}&results=10`
      );
      const dataLatest = await resLatest.json();

      if (dataLatest && Array.isArray(dataLatest.feeds) && dataLatest.feeds.length > 0) {
        const feeds = dataLatest.feeds;

        const latestSensorEntry =
          [...feeds].reverse().find((f) => f.field2 != null || f.field3 != null) ||
          feeds[feeds.length - 1];

        const lastUpdateTime = new Date(latestSensorEntry.created_at);
        const now = new Date();
        const diffMin = (now - lastUpdateTime) / 60000;

        const currentTemp = latestSensorEntry.field2 != null ? parseFloat(latestSensorEntry.field2) : null;
        const currentHumidity = latestSensorEntry.field3 != null ? parseFloat(latestSensorEntry.field3) : null;

        const hiveData = [
          {
            id: 1,
            temp: currentTemp != null ? currentTemp : 0,
            humidity: currentHumidity != null ? currentHumidity : 0,
            ph: latestSensorEntry.field4 != null ? parseFloat(latestSensorEntry.field4) : 0,
            weight: latestSensorEntry.field5 != null ? parseFloat(latestSensorEntry.field5) : 0,
            live: diffMin < 5,
          },
        ];
        setHives(hiveData);

        // Ground-truth physical heater state and control mode reported by ESP32 via ThingSpeak
        const hwHeaterStatus =
          latestSensorEntry.field6 != null
            ? String(latestSensorEntry.field6).trim() === "1"
              ? "ON"
              : "OFF"
            : null;
        const hwMode =
          latestSensorEntry.field7 != null
            ? String(latestSensorEntry.field7).trim() === "1"
              ? "MANUAL"
              : "AUTO"
            : null;

        // State change detection & heads-up status bar notification trigger directly from ThingSpeak hardware feed
        if (hwHeaterStatus != null) {
          if (
            lastKnownHeaterStatusRef.current !== null &&
            lastKnownHeaterStatusRef.current !== hwHeaterStatus
          ) {
            notificationService.showHeaterNotification({
              status: hwHeaterStatus,
              temperature: currentTemp != null ? currentTemp : 0,
              mode: hwMode || "AUTO",
              reason:
                hwMode === "MANUAL"
                  ? "Manual control command executed"
                  : hwHeaterStatus === "ON"
                  ? "Temperature rose above 35.0°C"
                  : "Temperature fell to 35.0°C or below",
            });
          }
          lastKnownHeaterStatusRef.current = hwHeaterStatus;

          setHeaterState((prev) => ({
            ...prev,
            heaterStatus: hwHeaterStatus,
            mode: hwMode || prev.mode || "AUTO",
            temperature: currentTemp != null ? currentTemp : prev.temperature,
            humidity: currentHumidity != null ? currentHumidity : prev.humidity,
            esp32Online: diffMin < 5,
          }));
        }

        // Asynchronously sync telemetry to backend for database history
        if (currentTemp != null) {
          heaterAPI
            .sendTelemetry({
              farmId: Number(farmId || 1),
              temperature: currentTemp,
              humidity: currentHumidity,
            })
            .catch(() => {});
        }
      } else {
        setHives([]);
      }

      // 30-minute average data for historical graph
      const resHistory = await fetch(
        `https://api.thingspeak.com/channels/3126283/feeds.json?api_key=${THINGSPEAK_KEY}&results=100&average=30`
      );
      const dataHistory = await resHistory.json();

      if (dataHistory && Array.isArray(dataHistory.feeds) && dataHistory.feeds.length > 0) {
        const history = dataHistory.feeds
          .filter((f) => f.field2 != null || f.field3 != null || f.field4 != null)
          .map((f) => ({
            time: new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            temp: f.field2 ? parseFloat(f.field2) : null,
            humidity: f.field3 ? parseFloat(f.field3) : null,
            ph: f.field4 ? parseFloat(f.field4) : null,
          }));
        setHiveHistory(history);
      } else {
        setHiveHistory([]);
      }
    } catch (err) {
      console.error("Error fetching hive data:", err);
      setHives([]);
      setHiveHistory([]);
    }
  };

  useEffect(() => {
    // Initialize Android Notification Channel on startup
    notificationService.init();

    fetchWeather();
    fetchHives();
    fetchHeaterStatus();
    fetchProfile();
    fetchNotifications();

    const hivesInterval = setInterval(fetchHives, 5000);
    const heaterInterval = setInterval(fetchHeaterStatus, 5000);
    const notifInterval = setInterval(fetchNotifications, 5000);
    const weatherInterval = setInterval(fetchWeather, 300000);

    return () => {
      clearInterval(hivesInterval);
      clearInterval(heaterInterval);
      clearInterval(notifInterval);
      clearInterval(weatherInterval);
    };
  }, []);

  // Mode Control Handler (Syncs directly to ThingSpeak & backend)
  const handleModeChange = async (newMode) => {
    try {
      setLoadingHeater(true);

      // 1. Direct ThingSpeak Cloud Broker update (Field 7: 0 = AUTO, 1 = MANUAL)
      try {
        const field7 = newMode === "MANUAL" ? 1 : 0;
        await fetch(
          `https://api.thingspeak.com/update?api_key=${THINGSPEAK_WRITE_KEY}&field1=${Number(farmId || 1)}&field7=${field7}`
        );
      } catch (tsErr) {
        console.warn("ThingSpeak direct sync notice:", tsErr);
      }

      // 2. Sync with Backend database & history
      try {
        await heaterAPI.setMode({
          farmId: Number(farmId || 1),
          mode: newMode,
        });
      } catch (beErr) {
        console.warn("Backend mode sync notice:", beErr);
      }

      setHeaterState((prev) => ({ ...prev, mode: newMode }));
      fetchHeaterStatus();
      fetchNotifications();
    } catch (err) {
      console.error("Error changing mode:", err);
      alert("Failed to switch mode");
    } finally {
      setLoadingHeater(false);
    }
  };

  // Manual Heater Control Handler (Syncs directly to ThingSpeak & backend)
  const handleManualHeater = async (turnOn) => {
    try {
      setLoadingHeater(true);
      const newStatus = turnOn ? "ON" : "OFF";
      const fieldVal = turnOn ? 1 : 0;

      // 1. Direct ThingSpeak Cloud Broker update (Field 6 = Status, Field 7 = MANUAL, Field 8 = Command)
      try {
        await fetch(
          `https://api.thingspeak.com/update?api_key=${THINGSPEAK_WRITE_KEY}&field1=${Number(farmId || 1)}&field6=${fieldVal}&field7=1&field8=${fieldVal}`
        );
      } catch (tsErr) {
        console.warn("ThingSpeak direct sync notice:", tsErr);
      }

      // 2. Sync with Backend database & history
      try {
        await heaterAPI.setManual({
          farmId: Number(farmId || 1),
          heater: turnOn,
        });
      } catch (beErr) {
        console.warn("Backend manual sync notice:", beErr);
      }

      if (lastKnownHeaterStatusRef.current !== newStatus) {
        lastKnownHeaterStatusRef.current = newStatus;
        notificationService.showHeaterNotification({
          status: newStatus,
          temperature: heaterState.temperature,
          mode: "MANUAL",
          reason: "Manual control command executed",
        });
      }

      setHeaterState((prev) => ({
        ...prev,
        heaterStatus: newStatus,
        mode: "MANUAL",
      }));
      fetchHeaterStatus();
      fetchNotifications();
    } catch (err) {
      console.error("Error changing heater state:", err);
      alert("Failed to control heater manually");
    } finally {
      setLoadingHeater(false);
    }
  };

  // Test Mobile Notification
  const handleTestMobileNotification = () => {
    notificationService.showHeaterNotification({
      status: heaterState.heaterStatus || "ON",
      temperature: heaterState.temperature || 28.5,
      mode: heaterState.mode || "AUTO",
      reason: "Test mobile alert notification in top status bar",
      force: true,
    });
  };


  // Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!userProfile.phoneNumber || userProfile.phoneNumber.trim().length < 8) {
      alert("Please enter a valid mobile number.");
      return;
    }

    try {
      const res = await userAPI.updateProfile({
        name: userProfile.name,
        phoneNumber: userProfile.phoneNumber,
        farmName: userProfile.farmName,
        address: userProfile.address,
      });

      if (res.data && res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUserProfile(res.data.user);
        setShowProfileModal(false);
        fetchHeaterStatus();
        alert("Mobile number updated successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update profile");
    }
  };

  const isHeaterOn = heaterState.heaterStatus === "ON";
  const isAuto = heaterState.mode === "AUTO";
  const displayTemp = heaterState.temperature != null
    ? `${Number(heaterState.temperature).toFixed(1)}°C`
    : hives[0]?.temp != null
    ? `${Number(hives[0].temp).toFixed(1)}°C`
    : "Sensor Error";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#689f38" }}>
      <Navbar />
      <main className="mt-20 max-w-7xl mx-auto px-6 py-8 text-[#f0f4c3]">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#f0f4c3]">Hive Dashboard 🐝</h1>
            <p className="text-sm text-[#f0f4c3]/80">
              Smart IoT Bee Hive Monitoring, Automated Hysteresis Heating & Mobile Notifications
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="bg-[#558b2f] text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow flex items-center gap-1.5"
            >
              <span>Farm ID: {farmId || "1"}</span>
            </span>

            {/* Mobile App Notification Alerts Button */}
            <button
              id="notification-center-btn"
              onClick={() => {
                fetchNotifications();
                setShowNotificationCenter(true);
              }}
              className="relative bg-[#33691e] text-[#f0f4c3] px-3.5 py-2 rounded-lg shadow hover:bg-[#2e7d32] transition font-semibold text-sm flex items-center gap-2"
            >
              <span>🔔 App Alerts</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Test Top-Bar Notification Button */}
            <button
              onClick={handleTestMobileNotification}
              className="bg-yellow-300 text-[#33691e] px-3.5 py-2 rounded-lg shadow hover:bg-yellow-400 transition font-bold text-xs flex items-center gap-1"
              title="Test the native notification bar alert on mobile"
            >
              📲 Test Top-Bar Alert
            </button>

            <button
              onClick={() => {
                const apiKey = prompt("Enter your API key:");
                if (!apiKey) return;
                sendApiKey(farmId, apiKey);
              }}
              className="bg-[#f0f4c3] text-[#33691e] px-4 py-2 rounded-lg shadow hover:scale-105 transition-transform font-semibold text-sm"
            >
              Update API Key
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* HEATER CONTROL & SYSTEM SAFETY STATUS                                     */}
        {/* ========================================================================= */}
        <section className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#f0f4c3] text-[#33691e] rounded-3xl shadow-xl p-6 md:p-8 border-2 border-[#cddc39]"
          >
            {/* Top Bar: Title + Badges */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-[#cddc39] gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔥</span>
                  <h2 className="text-2xl font-bold tracking-tight text-[#33691e]">
                    Smart Temperature & Heater Control
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-[#558b2f] mt-1 font-medium">
                  Dual-mode controller with temperature hysteresis protection and top-bar mobile notifications
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* ESP32 Status */}
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                    heaterState.esp32Online || hives[0]?.live
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      heaterState.esp32Online || hives[0]?.live ? "bg-green-600 animate-pulse" : "bg-red-600"
                    }`}
                  />
                  ESP32: {heaterState.esp32Online || hives[0]?.live ? "ONLINE" : "OFFLINE"}
                </div>

                {/* Mode Badge */}
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase shadow-sm ${
                    isAuto ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-purple-100 text-purple-800 border border-purple-300"
                  }`}
                >
                  Mode: {heaterState.mode}
                </div>

                {/* Heater State Badge */}
                <div
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${
                    isHeaterOn
                      ? "bg-red-600 text-white animate-pulse shadow-red-300"
                      : "bg-gray-200 text-gray-700 border border-gray-400"
                  }`}
                >
                  <span>{isHeaterOn ? "🔥 HEATER: ON" : "⚪ HEATER: OFF"}</span>
                </div>
              </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
              {/* Card 1: Hive Temperature */}
              <div className="p-4 bg-[#dcedc8] rounded-2xl border border-[#c5e1a5] flex flex-col justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#558b2f]">
                  Hive Temperature
                </span>
                <div className="my-2">
                  <div className="text-3xl font-black text-[#2e7d32]">
                    {displayTemp}
                  </div>
                  <div className="text-xs text-[#558b2f] mt-0.5">
                    DHT11 Sensor Telemetry
                  </div>
                </div>
                <div className="text-[11px] text-[#33691e]/80">
                  Humidity: {hives[0]?.humidity != null ? `${hives[0].humidity}%` : "N/A"}
                </div>
              </div>

              {/* Card 2: Temperature Rule */}
              <div className="p-4 bg-[#dcedc8] rounded-2xl border border-[#c5e1a5] flex flex-col justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#558b2f]">
                  Temperature Rule
                </span>
                <div className="my-2 space-y-1">
                  <div className="text-xs flex justify-between font-semibold">
                    <span>Auto Threshold:</span>
                    <span className="text-[#2e7d32] font-black text-sm">35.0°C</span>
                  </div>
                  <div className="text-xs text-[#33691e]">
                    • Above 35.0°C: <span className="font-bold text-red-600">HEATER ON</span>
                  </div>
                  <div className="text-xs text-[#33691e]">
                    • 35.0°C or below: <span className="font-bold text-gray-700">HEATER OFF</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#558b2f] italic">
                  Automatic hardware threshold
                </div>
              </div>

              {/* Card 3: Mobile Application Notification Alert */}
              <div className="p-4 bg-[#dcedc8] rounded-2xl border border-[#c5e1a5] flex flex-col justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#558b2f]">
                  Mobile Notification Alert
                </span>
                <div className="my-1">
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <span className="text-green-700 font-extrabold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                      ACTIVE (Top Status Bar)
                    </span>
                  </div>
                  <div className="text-xs text-[#33691e] font-medium mt-1">
                    Channel: <span className="font-semibold text-[#2e7d32]">High Priority / Sound</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#558b2f]">
                  Pops down at the top of the mobile screen on state changes
                </div>
              </div>

              {/* Card 4: Last State Change Timestamp */}
              <div className="p-4 bg-[#dcedc8] rounded-2xl border border-[#c5e1a5] flex flex-col justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#558b2f]">
                  Activity Log
                </span>
                <div className="my-1 space-y-1 text-xs">
                  <div>
                    <span className="font-semibold">Last Change: </span>
                    <span className="font-mono">
                      {heaterState.lastStateChangeAt
                        ? new Date(heaterState.lastStateChangeAt).toLocaleTimeString()
                        : "No change yet"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Latest Alert: </span>
                    <span className="font-mono">
                      {notifications[0]
                        ? new Date(notifications[0].createdAt).toLocaleTimeString()
                        : "Active"}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-[#558b2f]">
                  Anti-spam: alerts fire on transition only
                </div>
              </div>
            </div>

            {/* Current Reason Alert Box */}
            <div className="p-3.5 bg-white/70 border border-[#cddc39] rounded-xl flex items-start gap-3 my-4">
              <span className="text-lg">📢</span>
              <div className="text-xs md:text-sm">
                <span className="font-bold text-[#2e7d32]">Current System Decision: </span>
                <span className="text-[#33691e] font-medium font-mono">
                  "{heaterState.reason || "System running normally."}"
                </span>
              </div>
            </div>

            {/* Interactive Control Buttons */}
            <div className="mt-6 pt-4 border-t border-[#cddc39] flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Mode Selectors */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <span className="text-sm font-bold text-[#33691e]">Select Mode:</span>
                <div className="inline-flex rounded-xl shadow-sm bg-[#dcedc8] p-1 border border-[#c5e1a5]">
                  <button
                    id="mode-auto-btn"
                    disabled={loadingHeater}
                    onClick={() => handleModeChange("AUTO")}
                    className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                      isAuto
                        ? "bg-[#33691e] text-[#f0f4c3] shadow-md scale-102"
                        : "text-[#33691e] hover:bg-white/40"
                    }`}
                  >
                    AUTO
                  </button>
                  <button
                    id="mode-manual-btn"
                    disabled={loadingHeater}
                    onClick={() => handleModeChange("MANUAL")}
                    className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                      !isAuto
                        ? "bg-[#33691e] text-[#f0f4c3] shadow-md scale-102"
                        : "text-[#33691e] hover:bg-white/40"
                    }`}
                  >
                    MANUAL
                  </button>
                </div>
              </div>

              {/* Manual Command Buttons or Auto Info */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                {!isAuto ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-md">
                      Manual Controls Active
                    </span>
                    <button
                      id="manual-heater-on-btn"
                      disabled={loadingHeater}
                      onClick={() => handleManualHeater(true)}
                      className={`px-5 py-2 text-sm font-extrabold rounded-xl transition-all shadow-md ${
                        isHeaterOn
                          ? "bg-red-600 text-white ring-2 ring-red-400"
                          : "bg-red-500/80 text-white hover:bg-red-600 hover:scale-105"
                      }`}
                    >
                      HEATER ON
                    </button>
                    <button
                      id="manual-heater-off-btn"
                      disabled={loadingHeater}
                      onClick={() => handleManualHeater(false)}
                      className={`px-5 py-2 text-sm font-extrabold rounded-xl transition-all shadow-md ${
                        !isHeaterOn
                          ? "bg-gray-700 text-white ring-2 ring-gray-500"
                          : "bg-gray-500 text-white hover:bg-gray-700 hover:scale-105"
                      }`}
                    >
                      HEATER OFF
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-[#558b2f] bg-[#dcedc8] px-4 py-2 rounded-xl border border-[#c5e1a5]">
                    🤖 <strong>AUTO Mode Active:</strong> Temperature automatically manages the heater with hysteresis. Manual commands are disabled.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* WEATHER + PARAMETER TRENDS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            className="col-span-1 h-fit self-center bg-[#f0f4c3] text-[#33691e] rounded-3xl shadow-lg p-6 border border-[#cddc39]"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{weatherFor(weather.climate).icon}</div>
                <div>
                  <div className="text-3xl font-bold">{weather.temp}°C</div>
                  <div className="text-sm">{weatherFor(weather.climate).text}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">{time.toLocaleTimeString()}</div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              {lastWeatherUpdated
                ? `Updated: ${lastWeatherUpdated.toLocaleTimeString()}`
                : "No recent update"}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-[#dcedc8] rounded-lg">
                <div className="text-xs text-[#33691e]">Humidity</div>
                <div className="font-semibold">{weather.humidity}%</div>
              </div>
              <div className="p-2 bg-[#dcedc8] rounded-lg">
                <div className="text-xs text-[#33691e]">Pressure</div>
                <div className="font-semibold">{weather.pressure} hPa</div>
              </div>
              <div className="p-2 bg-[#dcedc8] rounded-lg">
                <div className="text-xs text-[#33691e]">Wind</div>
                <div className="font-semibold">{weather.wind} m/s</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="col-span-1 md:col-span-2 bg-[#f0f4c3] text-[#33691e] rounded-3xl shadow-lg p-6 flex flex-col justify-center border border-[#cddc39]"
            whileHover={{ scale: 1.01 }}
          >
            <h3 className="text-xl font-semibold mb-4 text-center md:text-left">
              Parameter Trends (30-Min Intervals, Last 100 Readings)
            </h3>
            <div className="w-full h-72 sm:h-80 md:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hiveHistory} margin={{ top: 5, right: 10, bottom: 20, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cddc39" />
                  <XAxis dataKey="time" stroke="#33691e" tick={{ fontSize: 10 }} minTickGap={30} tickMargin={10} />
                  <YAxis stroke="#33691e" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#f0f4c3",
                      borderColor: "#cddc39",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="temp" stroke="#e53935" name="Temp (°C)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="humidity" stroke="#1e88e5" name="Humidity (%)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ph" stroke="#8e24aa" name="pH" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </section>

        {/* HIVES LIST */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-[#f0f4c3]">Hive Summary</h2>
            <div className="text-sm text-[#f0f4c3]/80">Last updated: {time.toLocaleTimeString()}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hives.length === 0 ? (
              <p className="text-[#f0f4c3]">No hive data available...</p>
            ) : (
              hives.map((h) => (
                <motion.div
                  key={h.id}
                  className={`rounded-2xl p-5 shadow-md border transition-all duration-300 ${
                    h.live ? "bg-[#f0f4c3] border-[#cddc39]" : "bg-gray-200 border-gray-300"
                  }`}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-[#33691e] font-medium">Hive #{h.id}</div>
                      <div
                        className={`text-2xl font-bold ${
                          h.temp > 37 ? "text-red-600" : "text-[#33691e]"
                        }`}
                      >
                        {h.temp}°C
                      </div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${h.live ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                      title={h.live ? "Online" : "Offline"}
                    />
                  </div>

                  <div className="text-sm text-[#33691e] space-y-1 mb-3">
                    <div>Humidity: {h.humidity}%</div>
                    <div>pH: {h.ph?.toFixed(2)}</div>
                    <div>
                      Weight: {Number.isFinite(h.weight) ? h.weight.toFixed(2) : "0.00"} kg
                    </div>
                    {!h.live && (
                      <div className="text-red-600 text-xs font-semibold">
                        Device Offline (no update &gt;5 min)
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isHeaterOn
                          ? "bg-red-600 text-white"
                          : "bg-[#33691e] text-[#f0f4c3]"
                      }`}
                    >
                      {isHeaterOn ? "Heater ON" : "Heater OFF"}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MOBILE APPLICATION NOTIFICATIONS CENTER MODAL                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showNotificationCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#f0f4c3] text-[#33691e] rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border-2 border-[#cddc39] max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#cddc39]">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🔔</span> Application Alerts
                  </h3>
                  <p className="text-xs text-[#558b2f]">Real-time mobile top-bar alert history</p>
                </div>
                <button
                  onClick={() => setShowNotificationCenter(false)}
                  className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="overflow-y-auto my-4 space-y-2.5 pr-1 flex-1">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#558b2f]">
                    No alerts received yet. Alerts will appear here and in your phone's top notification bar.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        n.heaterStatus === "ON"
                          ? "bg-red-50 border-red-200"
                          : "bg-[#dcedc8] border-[#c5e1a5]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-sm text-[#2e7d32]">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-[#33691e] mt-1 font-medium">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-[#cddc39] flex justify-between items-center">
                <button
                  onClick={handleTestMobileNotification}
                  className="text-xs text-[#2e7d32] font-bold hover:underline"
                >
                  📲 Fire Test Alert to Status Bar
                </button>
                <button
                  onClick={() => setShowNotificationCenter(false)}
                  className="px-5 py-2 rounded-lg bg-[#33691e] text-[#f0f4c3] text-sm font-bold shadow hover:bg-[#2e7d32]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
};

export default Dborad;