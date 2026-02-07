
"use client";

import { useState, useEffect } from "react";
import PlayerPicker from "../components/player-picker";
import PlayersAdminContainer from "../components/admin";
import { ManualSessionCreator } from "../components/manual-session-creator";
import { SessionsHistory } from "../components/sessions/sessions-history";
import { PlayerStats } from "../components/stats/player-stats";
import { useTheme } from "../components/theme-provider";
import { Login } from "../components/auth/login";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"auto" | "manual" | "history" | "stats" | "admin">("auto");
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    localStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-gray-600 dark:text-neutral-400">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Navigation tabs */}
      <nav className="sticky top-0 z-30 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex gap-0.5 sm:gap-1">
              <button
                onClick={() => setActiveTab("auto")}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "auto"
                    ? "text-gray-900 dark:text-white border-b-2 border-indigo-500"
                    : "text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200"
                }`}
              >
                <span className="hidden sm:inline">Génération automatique</span>
                <span className="sm:hidden">Auto</span>
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "manual"
                    ? "text-gray-900 dark:text-white border-b-2 border-indigo-500"
                    : "text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200"
                }`}
              >
                <span className="hidden sm:inline">Création manuelle</span>
                <span className="sm:hidden">Manuel</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "history"
                    ? "text-gray-900 dark:text-white border-b-2 border-indigo-500"
                    : "text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200"
                }`}
              >
                Historique
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "stats"
                    ? "text-gray-900 dark:text-white border-b-2 border-indigo-500"
                    : "text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200"
                }`}
              >
                <span className="hidden sm:inline">Statistiques</span>
                <span className="sm:hidden">Stats</span>
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "admin"
                    ? "text-gray-900 dark:text-white border-b-2 border-indigo-500"
                    : "text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200"
                }`}
              >
                Admin
              </button>
            </div>
            
            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="py-6">
        {activeTab === "auto" && <PlayerPicker />}
        {activeTab === "manual" && <ManualSessionCreator />}
        {activeTab === "history" && (
          <div className="mx-auto max-w-6xl px-4">
            <SessionsHistory />
          </div>
        )}
        {activeTab === "stats" && <PlayerStats />}
        {activeTab === "admin" && <PlayersAdminContainer />}
      </div>
    </div>
  );
}
