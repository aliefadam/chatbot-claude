import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Code,
  Bug,
  RefreshCw,
  Plus,
  Lightbulb,
} from 'lucide-react';

interface EmptyStateProps {
  projectName?: string;
  onQuickAction: (action: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  projectName,
  onQuickAction,
}) => {
  const quickActions = [
    {
      icon: Code,
      title: 'Explain codebase',
      description: 'Get an overview of your project structure',
      action: 'explain',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Bug,
      title: 'Find and fix bugs',
      description: 'Identify and resolve issues in your code',
      action: 'fix-bugs',
      gradient: 'from-red-500 to-pink-500',
    },
    {
      icon: RefreshCw,
      title: 'Refactor code',
      description: 'Improve code quality and structure',
      action: 'refactor',
      gradient: 'from-purple-500 to-primary-500',
    },
    {
      icon: Plus,
      title: 'Add new feature',
      description: 'Implement new functionality',
      action: 'add-feature',
      gradient: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex justify-center p-8 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-500 rounded-3xl shadow-glow-lg mb-6"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-display font-bold mb-3"
        >
          Hi! I'm <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Claude</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-gray-600 mb-12 max-w-xl mx-auto"
        >
          {projectName
            ? `Ready to help you code, debug, and build amazing things with ${projectName}.`
            : 'Ready to help you code, debug, and build amazing things.'}
        </motion.p>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          {quickActions.map((action, index) => (
            <motion.button
              key={action.action}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onQuickAction(action.action)}
              className="group relative bg-white border border-gray-200 rounded-2xl p-6 text-left hover:shadow-soft-lg transition-all duration-200 overflow-hidden"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />

              <div className="relative">
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-xl mb-4 shadow-soft`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Pro tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-2 text-sm text-gray-500"
        >
          <Lightbulb className="w-4 h-4" />
          <span>Pro tip: Ask Claude to analyze your project or explain specific files.</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
