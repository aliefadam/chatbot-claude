import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Folder,
  MessageSquare,
  MoreVertical,
  Trash2,
  Star,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Project, Conversation } from '../types';

interface SidebarProps {
  projects: Project[];
  generalConversations: Conversation[];
  currentProjectId: string | null;
  currentConversationId: string | null;
  onAddProject: () => void;
  onAddGeneralConversation: () => void;
  onSelectGeneralConversation: (conversationId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectConversation: (projectId: string, conversationId: string) => void;
  onAddConversation: (projectId: string) => void;
  onDeleteGeneralConversation: (conversationId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDeleteConversation: (projectId: string, conversationId: string) => void;
  onTogglePin: (projectId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  generalConversations,
  currentProjectId,
  currentConversationId,
  onAddProject,
  onAddGeneralConversation,
  onSelectGeneralConversation,
  onSelectProject,
  onSelectConversation,
  onAddConversation,
  onDeleteGeneralConversation,
  onDeleteProject,
  onDeleteConversation,
  onTogglePin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedProjects = filteredProjects.filter((p) => p.isPinned);
  const regularProjects = filteredProjects.filter((p) => !p.isPinned);

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col h-screen"
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl flex items-center justify-center shadow-soft">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-semibold text-gray-900">
              Claude
            </h1>
            <p className="text-xs text-gray-500">AI Coding Assistant</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddGeneralConversation}
          className="w-full mb-2 bg-white text-gray-700 font-medium py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 border border-gray-200 shadow-soft hover:bg-gray-50 transition-all duration-200"
        >
          <MessageSquare className="w-4 h-4" />
          New Conversation
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddProject}
          className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-soft hover:shadow-glow transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </motion.button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-3">
        {generalConversations.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <MessageSquare className="w-3 h-3" />
              General Chats
            </div>
            {generalConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={currentProjectId === null && currentConversationId === conv.id}
                onSelect={() => onSelectGeneralConversation(conv.id)}
                onDelete={() => onDeleteGeneralConversation(conv.id)}
              />
            ))}
          </div>
        )}

        {pinnedProjects.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Star className="w-3 h-3" />
              Pinned
            </div>
            {pinnedProjects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isExpanded={expandedProjects.has(project.id)}
                isActive={currentProjectId === project.id}
                currentConversationId={currentConversationId}
                onToggle={() => toggleProject(project.id)}
                onSelect={() => onSelectProject(project.id)}
                onSelectConversation={(convId) =>
                  onSelectConversation(project.id, convId)
                }
                onDeleteConversation={(convId) =>
                  onDeleteConversation(project.id, convId)
                }
                onAddConversation={() => onAddConversation(project.id)}
                onDelete={() => onDeleteProject(project.id)}
                onTogglePin={() => onTogglePin(project.id)}
              />
            ))}
          </div>
        )}

        {regularProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Folder className="w-3 h-3" />
              Projects
            </div>
            {regularProjects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isExpanded={expandedProjects.has(project.id)}
                isActive={currentProjectId === project.id}
                currentConversationId={currentConversationId}
                onToggle={() => toggleProject(project.id)}
                onSelect={() => onSelectProject(project.id)}
                onSelectConversation={(convId) =>
                  onSelectConversation(project.id, convId)
                }
                onDeleteConversation={(convId) =>
                  onDeleteConversation(project.id, convId)
                }
                onAddConversation={() => onAddConversation(project.id)}
                onDelete={() => onDeleteProject(project.id)}
                onTogglePin={() => onTogglePin(project.id)}
              />
            ))}
          </div>
        )}

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 px-4">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{projects.length} projects</span>
        </div>
      </div>
    </motion.aside>
  );
};

interface ProjectItemProps {
  project: Project;
  isExpanded: boolean;
  isActive: boolean;
  currentConversationId: string | null;
  onToggle: () => void;
  onSelect: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onAddConversation: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  isExpanded,
  isActive,
  currentConversationId,
  onToggle,
  onSelect,
  onSelectConversation,
  onDeleteConversation,
  onAddConversation,
  onDelete,
  onTogglePin,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-1"
    >
      <div
        className={`group relative rounded-2xl transition-all duration-200 ${
          isActive
            ? 'bg-primary-50 border border-primary-200 shadow-soft'
            : 'hover:bg-white hover:shadow-soft'
        }`}
      >
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={onToggle}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <div
            onClick={onSelect}
            className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
          >
            <Folder
              className={`w-4 h-4 flex-shrink-0 ${
                isActive ? 'text-primary-600' : 'text-amber-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isActive ? 'text-primary-900' : 'text-gray-900'
                }`}
              >
                {project.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{project.path}</p>
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-soft-xl border border-gray-200 py-1 z-50"
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Star
                      className={`w-3 h-3 ${
                        project.isPinned ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                    {project.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Conversations */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pl-10 pr-3 pb-3 space-y-1">
                {project.conversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={currentConversationId === conv.id}
                    onSelect={() => onSelectConversation(conv.id)}
                    onDelete={() => onDeleteConversation(conv.id)}
                  />
                ))}

                <button
                  onClick={onAddConversation}
                  className="w-full text-left px-3 py-2 text-xs text-primary-600 hover:bg-primary-50 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  New Chat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
}) => {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      onClick={onSelect}
      className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-primary-100 text-primary-900'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MessageSquare className="w-3 h-3 flex-shrink-0" />
        <span className="text-xs truncate">{conversation.title}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
};
