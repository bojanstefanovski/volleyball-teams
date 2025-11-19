
"use client";

import { useState } from "react";
import PlayerPicker from "../components/player-picker";
import PlayersAdminContainer from "../components/admin";
import { ManualSessionCreator } from "../components/manual-session-creator";
import { SessionsHistory } from "../components/sessions/sessions-history";
import { useTheme } from "../components/theme-provider";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"auto" | "manual" | "history" | "admin">("auto");
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Navigation tabs */}
      <nav className="sticky top-0 z-30 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5 sm:gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("auto")}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
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
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
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
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === "history"
                    ? "text-gray-900 dark:text-white border-b-2 border-indigo-500"
                    : "text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200"
                }`}
              >
                Historique
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
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
              className="ml-4 p-2 rounded-lg bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
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
        {activeTab === "admin" && <PlayersAdminContainer />}
      </div>
    </div>
  );
}
