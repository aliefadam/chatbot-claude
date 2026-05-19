import React from 'react';
import { motion } from 'framer-motion';
import {
  Folder,
  ChevronRight,
  Settings,
  Sparkles,
  Activity,
  Moon,
  Sun,
} from 'lucide-react';

interface HeaderProps {
  projectName?: string;
  conversationTitle?: string;
  modelName: string;
  onOpenSettings: () => void;
  usageStats?: UsageStats | null;
  onCheckUsage?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

interface UsageStats {
  success: boolean;
  data?: {
    used?: number;
    limit?: number;
    remaining?: number;
    resets_at?: string;
    [key: string]: any;
  };
  error?: string;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  conversationTitle,
  modelName,
  onOpenSettings,
  usageStats,
  onCheckUsage,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl transition-colors duration-200"
    >
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {projectName ? (
            <>
              <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {projectName}
              </span>
              {conversationTitle && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {conversationTitle}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Select a project</span>
          )}
        </div>

        {/* Right: Model, Usage & Settings */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Usage Button */}
          {onCheckUsage && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCheckUsage}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl transition-colors ${
                usageStats?.success
                  ? usageStats.data?.remaining !== undefined
                    ? usageStats.data.remaining > 0
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Cek Usage Limit"
            >
              <Activity className={`w-3.5 h-3.5 ${
                usageStats?.success
                  ? usageStats.data?.remaining !== undefined
                    ? usageStats.data.remaining > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`} />
              {usageStats?.success && usageStats.data ? (
                <span className={`text-xs font-medium ${
                  usageStats.data.remaining !== undefined
                    ? usageStats.data.remaining > 0
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {usageStats.data.used !== undefined && usageStats.data.limit !== undefined ? (
                    <>
                      {formatNumber(usageStats.data.used)} / {formatNumber(usageStats.data.limit)}
                    </>
                  ) : usageStats.data.remaining !== undefined ? (
                    <>
                      Sisa: {formatNumber(usageStats.data.remaining)}
                    </>
                  ) : (
                    'OK'
                  )}
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Usage</span>
              )}
            </motion.button>
          )}

          {/* Model Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
              {modelName}
            </span>
          </div>

          {/* Dark Mode Toggle */}
          {onToggleDarkMode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleDarkMode}
              className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </motion.button>
          )}

          {/* Settings Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings}
            className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};
