import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  FileSearch,
  FileEdit,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { AgentStatus as AgentStatusType } from '../types';

interface AgentStatusProps {
  status: AgentStatusType;
  startedAt?: number | null;
}

const formatDuration = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
};

export const AgentStatus: React.FC<AgentStatusProps> = ({ status, startedAt }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;

  const icons = {
    thinking: Brain,
    reading: FileSearch,
    editing: FileEdit,
    generating: Sparkles,
    idle: Loader2,
  };

  const colors = {
    thinking: 'from-purple-500 to-primary-500',
    reading: 'from-blue-500 to-cyan-500',
    editing: 'from-green-500 to-emerald-500',
    generating: 'from-amber-500 to-orange-500',
    idle: 'from-gray-400 to-gray-500',
  };

  const Icon = icons[status.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto mb-6"
    >
      <div className="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-2xl shadow-soft">
        {/* Animated Icon */}
        <div className={`relative w-8 h-8 bg-gradient-to-br ${colors[status.type]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />

          {/* Pulse Animation */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute inset-0 bg-gradient-to-br ${colors[status.type]} rounded-xl`}
          />
        </div>

        {/* Status Text */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{status.message}</p>
          <p className="text-xs text-gray-500 mt-0.5">Working for {formatDuration(elapsedMs)}</p>
        </div>

        {/* Typing Dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
