import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { EmptyState } from './components/EmptyState';
import { Dialog, ConfirmDialog } from './components/Dialog';
import { Project, Conversation, Message, ApiConfig, FileOperation, UsageInfo } from './types';
import './styles/index.css';

// Declare electron API types
declare global {
  interface Window {
    electronAPI: {
      selectProjectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      saveProjects: (projects: Project[]) => Promise<{ success: boolean }>;
      loadProjects: () => Promise<Project[]>;
      saveHistory: (conversations: Conversation[]) => Promise<{ success: boolean }>;
      loadHistory: () => Promise<Conversation[]>;
      readApiConfig: () => Promise<ApiConfig>;
      sendApiRequestStream: (data: any) => Promise<{ success: boolean; error?: string }>;
      onStreamChunk: (callback: (data: any) => void) => void;
      removeStreamListener: () => void;
      selectFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      selectImage: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      readFile: (path: string) => Promise<{ success: boolean; data: ArrayBuffer }>;
      readTextFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      listDirectory: (path: string) => Promise<{
        success: boolean;
        items?: Array<{
          name: string;
          path: string;
          isDirectory: boolean;
          size: number;
          modified: string | null;
        }>;
        error?: string;
      }>;
      getFileInfo: (path: string) => Promise<{ success: boolean; info: any }>;
      createDirectory: (path: string) => Promise<{ success: boolean; error?: string }>;
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
      getUsageStats: () => Promise<{ success: boolean; data?: any; error?: string }>;
    };
  }
}

interface FileOpInstruction {
  type: 'write' | 'delete';
  path: string;
  content?: string;
}

interface FileOpPayload {
  operations: FileOpInstruction[];
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [generalConversations, setGeneralConversations] = useState<Conversation[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageInfo | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<
    | { type: 'project'; id: string }
    | { type: 'conversation'; id: string; projectId: string }
    | { type: 'general-conversation'; id: string }
    | null
  >(null);
  const [requestStartedAt, setRequestStartedAt] = useState<number | null>(null);
  const [inputFocusToken, setInputFocusToken] = useState(0);
  const [lastUserRequest, setLastUserRequest] = useState<{ content: string; attachments: any[] } | null>(null);

  const normalizePath = (p: string) =>
    p.replace(/[\\/]+/g, '/').replace(/\/+$/, '');

  const isPathInsideProject = (absolutePath: string, projectPath: string) => {
    const candidate = normalizePath(absolutePath).toLowerCase();
    const root = normalizePath(projectPath).toLowerCase();
    return candidate === root || candidate.startsWith(`${root}/`);
  };

  const buildAbsolutePath = (projectPath: string, relativePath: string) => {
    const rel = relativePath.replace(/^[/\\]+/, '');
    return normalizePath(`${normalizePath(projectPath)}/${rel}`);
  };

  const getDirname = (filePath: string) => {
    const normalized = normalizePath(filePath);
    const idx = normalized.lastIndexOf('/');
    return idx > 0 ? normalized.slice(0, idx) : normalized;
  };

  const extractFileOpsPayload = (text: string): FileOpPayload | null => {
    const match = text.match(/<file_ops>\s*([\s\S]*?)\s*<\/file_ops>/i);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]) as FileOpPayload;
      if (!parsed || !Array.isArray(parsed.operations)) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const extractFallbackFileOps = (text: string): FileOpPayload | null => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: Array<{ lang: string; code: string; index: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push({
        lang: (match[1] || '').toLowerCase(),
        code: (match[2] || '').trim(),
        index: match.index,
      });
    }

    if (codeBlocks.length === 0) return null;

    const fileMentionRegex = /(?:file|berkas)?\s*`?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)`?/g;
    const fileMentions: string[] = [];
    while ((match = fileMentionRegex.exec(text)) !== null) {
      fileMentions.push(match[1].replace(/\\/g, '/'));
    }

    const inferFileNameFromLang = (lang: string) => {
      if (lang === 'html') return 'index.html';
      if (lang === 'css') return 'styles.css';
      if (lang === 'javascript' || lang === 'js') return 'script.js';
      if (lang === 'typescript' || lang === 'ts') return 'script.ts';
      if (lang === 'json') return 'data.json';
      return null;
    };

    const operations: FileOpInstruction[] = codeBlocks.map((block, idx) => {
      const mentioned = fileMentions[idx] || fileMentions[0];
      const inferred = inferFileNameFromLang(block.lang);
      const path = (mentioned || inferred || `generated-file-${idx + 1}.txt`).replace(/^[/\\]+/, '');
      return {
        type: 'write',
        path,
        content: block.code,
      };
    });

    return operations.length > 0 ? { operations } : null;
  };

  const stripFileOpsBlock = (text: string) =>
    text.replace(/<file_ops>[\s\S]*?<\/file_ops>/gi, '').trim();

  const countLines = (text: string) => {
    if (!text) return 0;
    return text.split(/\r?\n/).length;
  };

  const getLineDelta = (before: string, after: string) => {
    const oldLines = before.split(/\r?\n/);
    const newLines = after.split(/\r?\n/);

    let start = 0;
    while (
      start < oldLines.length &&
      start < newLines.length &&
      oldLines[start] === newLines[start]
    ) {
      start++;
    }

    let oldEnd = oldLines.length - 1;
    let newEnd = newLines.length - 1;
    while (oldEnd >= start && newEnd >= start && oldLines[oldEnd] === newLines[newEnd]) {
      oldEnd--;
      newEnd--;
    }

    return {
      linesAdded: Math.max(0, newEnd - start + 1),
      linesDeleted: Math.max(0, oldEnd - start + 1),
    };
  };

  const executeFileOperations = async (payload: FileOpPayload, projectPath: string) => {
    const logs: string[] = [];
    const changes: FileOperation[] = [];

    for (const op of payload.operations) {
      if (!op?.type || !op?.path) {
        logs.push('- skipped invalid operation');
        continue;
      }

      const absPath = buildAbsolutePath(projectPath, op.path);
      if (!isPathInsideProject(absPath, projectPath)) {
        logs.push(`- blocked: \`${op.path}\` is outside project root`);
        continue;
      }

      if (op.type === 'write') {
        const beforeRead = await window.electronAPI.readTextFile(absPath);
        const existedBefore = beforeRead.success;
        const beforeContent = beforeRead.success ? beforeRead.content || '' : '';

        const dir = getDirname(absPath);
        await window.electronAPI.createDirectory(dir);
        const result = await window.electronAPI.writeFile(absPath, op.content ?? '');
        if (result.success) {
          const delta = existedBefore
            ? getLineDelta(beforeContent, op.content ?? '')
            : { linesAdded: countLines(op.content ?? ''), linesDeleted: 0 };
          changes.push({
            type: existedBefore ? 'modified' : 'created',
            path: op.path,
            linesAdded: delta.linesAdded,
            linesDeleted: delta.linesDeleted,
            content: op.content ?? '',
          });
          logs.push(`- wrote \`${op.path}\``);
        } else {
          logs.push(`- failed to write \`${op.path}\`: ${result.error || 'unknown error'}`);
        }
      } else if (op.type === 'delete') {
        const beforeRead = await window.electronAPI.readTextFile(absPath);
        const result = await window.electronAPI.deleteFile(absPath);
        if (result.success) {
          changes.push({
            type: 'deleted',
            path: op.path,
            linesAdded: 0,
            linesDeleted: beforeRead.success ? countLines(beforeRead.content || '') : 0,
          });
          logs.push(`- deleted \`${op.path}\``);
        } else {
          logs.push(`- failed to delete \`${op.path}\`: ${result.error || 'unknown error'}`);
        }
      }
    }

    return { logs, changes };
  };

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load and apply dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      const isDark = savedDarkMode === 'true';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const loadInitialData = async () => {
    try {
      const [loadedProjects, loadedGeneralConversations, config] = await Promise.all([
        window.electronAPI.loadProjects(),
        window.electronAPI.loadHistory(),
        window.electronAPI.readApiConfig(),
      ]);

      setProjects(loadedProjects);
      const existingGeneralConversations = loadedGeneralConversations || [];
      if (existingGeneralConversations.length === 0) {
        const initialConversation: Conversation = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setGeneralConversations([initialConversation]);
        await window.electronAPI.saveHistory([initialConversation]);
        setCurrentProjectId(null);
        setCurrentConversationId(initialConversation.id);
      } else {
        setGeneralConversations(existingGeneralConversations);
        if (!currentProjectId && !currentConversationId) {
          setCurrentConversationId(existingGeneralConversations[0].id);
        }
      }
      setApiConfig(config);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const saveProjects = async (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    await window.electronAPI.saveProjects(updatedProjects);
  };

  const saveGeneralConversations = async (updatedConversations: Conversation[]) => {
    setGeneralConversations(updatedConversations);
    await window.electronAPI.saveHistory(updatedConversations);
  };

  const handleAddProject = async () => {
    try {
      const result = await window.electronAPI.selectProjectDirectory();
      if (result.canceled || !result.filePaths.length) return;

      const projectPath = result.filePaths[0];
      const projectName = projectPath.split(/[/\\]/).pop() || 'Unnamed Project';
      const normalizePath = (p: string) =>
        p.replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase();
      const normalizedNewPath = normalizePath(projectPath);

      // Check if project already exists
      if (projects.some((p) => normalizePath(p.path) === normalizedNewPath)) {
        alert('Project already exists!');
        return;
      }

      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newProject: Project = {
        id: Date.now().toString(),
        name: projectName,
        path: projectPath,
        conversations: [newConversation],
        createdAt: new Date().toISOString(),
      };

      const updatedProjects = [...projects, newProject];
      await saveProjects(updatedProjects);

      // Auto-select the new project and its first conversation
      setCurrentProjectId(newProject.id);
      setCurrentConversationId(newConversation.id);
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project && project.conversations.length > 0) {
      setCurrentConversationId(project.conversations[0].id);
    } else {
      setCurrentConversationId(null);
    }
  };

  const handleAddConversation = (projectId: string) => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          conversations: [...p.conversations, newConversation],
        };
      }
      return p;
    });

    saveProjects(updatedProjects);
    setCurrentProjectId(projectId);
    setCurrentConversationId(newConversation.id);
  };

  const createNewConversation = (): Conversation => ({
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSelectConversation = (projectId: string, conversationId: string) => {
    setCurrentProjectId(projectId);
    setCurrentConversationId(conversationId);
  };

  const handleAddGeneralConversation = async () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newConversation, ...generalConversations];
    await saveGeneralConversations(updated);
    setCurrentProjectId(null);
    setCurrentConversationId(newConversation.id);
  };

  const handleSelectGeneralConversation = (conversationId: string) => {
    setCurrentProjectId(null);
    setCurrentConversationId(conversationId);
  };

  const handleDeleteProject = (projectId: string) => {
    setDeleteDialog({ type: 'project', id: projectId });
  };

  const confirmDelete = () => {
    if (!deleteDialog) return;

    if (deleteDialog.type === 'project') {
      const updatedProjects = projects.filter((p) => p.id !== deleteDialog.id);
      saveProjects(updatedProjects);

      if (currentProjectId === deleteDialog.id) {
        setCurrentProjectId(null);
        setCurrentConversationId(null);
      }
    } else if (deleteDialog.type === 'conversation') {
      const freshConversation = createNewConversation();
      const updatedProjects = projects.map((p) => {
        if (p.id === deleteDialog.projectId) {
          return {
            ...p,
            conversations: [
              ...p.conversations.filter((c) => c.id !== deleteDialog.id),
              freshConversation,
            ],
          };
        }
        return p;
      });

      saveProjects(updatedProjects);
      setCurrentProjectId(deleteDialog.projectId);
      setCurrentConversationId(freshConversation.id);
      setInputFocusToken((v) => v + 1);
    } else {
      const freshConversation = createNewConversation();
      const updatedGeneralConversations = generalConversations.filter(
        (c) => c.id !== deleteDialog.id
      );
      const nextGeneralConversations = [...updatedGeneralConversations, freshConversation];
      saveGeneralConversations(nextGeneralConversations);
      setCurrentProjectId(null);
      setCurrentConversationId(freshConversation.id);
      setInputFocusToken((v) => v + 1);
    }

    setDeleteDialog(null);
  };

  const handleDeleteConversation = (projectId: string, conversationId: string) => {
    setDeleteDialog({ type: 'conversation', id: conversationId, projectId });
  };

  const handleDeleteGeneralConversation = (conversationId: string) => {
    setDeleteDialog({ type: 'general-conversation', id: conversationId });
  };

  const handleTogglePin = (projectId: string) => {
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, isPinned: !p.isPinned };
      }
      return p;
    });
    saveProjects(updatedProjects);
  };

  const deriveConversationTitle = (conversation: Conversation, firstPrompt: string) => {
    const trimmed = firstPrompt.trim();
    if (!trimmed) return conversation.title;
    if (conversation.messages.length === 0 || conversation.title === 'New Chat') {
      return trimmed.substring(0, 50);
    }
    return conversation.title;
  };

  const buildProjectContext = async (projectPath: string) => {
    try {
      const listResult = await window.electronAPI.listDirectory(projectPath);
      if (!listResult.success || !listResult.items) {
        return `Project path: ${projectPath}\nUnable to read project directory.`;
      }

      const items = listResult.items;
      const topLevel = items
        .slice(0, 30)
        .map((item) => `${item.isDirectory ? '[DIR]' : '[FILE]'} ${item.name}`)
        .join('\n');

      const keyFileNames = [
        'README.md',
        'readme.md',
        'package.json',
        'composer.json',
        'requirements.txt',
        'pyproject.toml',
        'go.mod',
        'Cargo.toml',
        '.env.example',
      ];

      const keyFiles = items.filter((item) => !item.isDirectory && keyFileNames.includes(item.name));
      const keyFileChunks: string[] = [];

      for (const keyFile of keyFiles.slice(0, 4)) {
        try {
          const read = await window.electronAPI.readTextFile(keyFile.path);
          if (read.success && read.content) {
            const trimmed = read.content.slice(0, 3500);
            keyFileChunks.push(
              `--- ${keyFile.name} ---\n${trimmed}${read.content.length > trimmed.length ? '\n...[truncated]' : ''}`
            );
          }
        } catch {
          // ignore per-file read failure
        }
      }

      return [
        `Project root: ${projectPath}`,
        'Top-level structure:',
        topLevel || '(empty)',
        keyFileChunks.length > 0 ? `\nKey file contents:\n${keyFileChunks.join('\n\n')}` : '',
      ].join('\n');
    } catch {
      return `Project path: ${projectPath}\nUnable to gather project context.`;
    }
  };

  const handleRetryLastRequest = async () => {
    if (isLoading || !lastUserRequest) return;
    await handleSendMessage(lastUserRequest.content, lastUserRequest.attachments || []);
  };

  const handleSendMessage = async (content: string, attachments: any[]) => {
    if (!currentConversationId || !apiConfig) return;
    setLastUserRequest({ content, attachments });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      attachments,
      timestamp: new Date().toISOString(),
    };

    // Add user message
    if (currentProjectId) {
      const updatedProjects = projects.map((p) => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            conversations: p.conversations.map((c) => {
              if (c.id === currentConversationId) {
                const updatedMessages = [...c.messages, userMessage];
                return {
                  ...c,
                  messages: updatedMessages,
                  title: deriveConversationTitle(c, content),
                  updatedAt: new Date().toISOString(),
                };
              }
              return c;
            }),
          };
        }
        return p;
      });
      await saveProjects(updatedProjects);
    } else {
      const updatedGeneralConversations = generalConversations.map((c) => {
        if (c.id === currentConversationId) {
          const updatedMessages = [...c.messages, userMessage];
          return {
            ...c,
            messages: updatedMessages,
            title: deriveConversationTitle(c, content),
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      await saveGeneralConversations(updatedGeneralConversations);
    }

    // Start streaming
    setIsLoading(true);
    setStreamingContent('');
    const startedAt = Date.now();
    setRequestStartedAt(startedAt);

    try {
      const appendAssistantMessage = async (assistantMessage: Message) => {
        if (currentProjectId) {
          const updatedProjects = projects.map((p) => {
            if (p.id === currentProjectId) {
              return {
                ...p,
                conversations: p.conversations.map((c) => {
                  if (c.id === currentConversationId) {
                    return {
                      ...c,
                      messages: [...c.messages, userMessage, assistantMessage],
                      title: deriveConversationTitle(c, content),
                      updatedAt: new Date().toISOString(),
                    };
                  }
                  return c;
                }),
              };
            }
            return p;
          });
          await saveProjects(updatedProjects);
        } else {
          const updatedGeneralConversations = generalConversations.map((c) => {
            if (c.id === currentConversationId) {
              return {
                ...c,
                messages: [...c.messages, userMessage, assistantMessage],
                title: deriveConversationTitle(c, content),
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });
          await saveGeneralConversations(updatedGeneralConversations);
        }
      };

      // Build messages for API
      const project = projects.find((p) => p.id === currentProjectId);
      const conversation = currentProjectId
        ? project?.conversations.find((c) => c.id === currentConversationId)
        : generalConversations.find((c) => c.id === currentConversationId);
      const projectPath = project?.path || '';

      const messages = conversation?.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) || [];
      const projectContext = projectPath ? await buildProjectContext(projectPath) : '';

      const systemInstruction = `You are a coding assistant running inside a desktop IDE.
You MUST always respond in Indonesian (Bahasa Indonesia) regardless of the user's language.
Current project root: ${projectPath}

When the user asks to create/edit/delete files, you MUST include a machine-readable block exactly once using this format:
<file_ops>
{"operations":[{"type":"write","path":"relative/path.ext","content":"full file content here"}]}
</file_ops>

Rules:
- You MUST always respond in Indonesian (Bahasa Indonesia).
- Use only relative paths inside project root.
- For edits, return type "write" with complete final file content.
- For deletions, use {"type":"delete","path":"relative/path.ext"}.
- If project root is empty, do NOT attempt any file operations.
- After <file_ops>, add a short human explanation in Indonesian.
- If no file changes are needed, do not include <file_ops>.`;

      messages.unshift({ role: 'user', content: `[SYSTEM]\n${systemInstruction}` });
      if (projectContext) {
        messages.unshift({
          role: 'user',
          content: `[PROJECT_CONTEXT]\nGunakan context project berikut sebagai sumber utama sebelum menjawab.\n${projectContext}`,
        });
      }
      messages.push({ role: 'user', content });

      // Setup streaming listener
      let buffer = '';
      let isFinalized = false;
      let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;

      const refreshTimeout = () => {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
          if (isFinalized) return;
          isFinalized = true;
          const timeoutMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Maaf, saya tidak menerima respons dari server (timeout). Silakan coba kirim lagi.',
            retryable: true,
            workedMs: Date.now() - startedAt,
            timestamp: new Date().toISOString(),
          };
          appendAssistantMessage(timeoutMessage);
          setIsLoading(false);
          setStreamingContent('');
          setRequestStartedAt(null);
          window.electronAPI.removeStreamListener();
        }, 45000);
      };

      refreshTimeout();

      window.electronAPI.onStreamChunk((data) => {
        refreshTimeout();
        if (data.type === 'text_delta') {
          buffer += data.text;
          setStreamingContent(buffer);
        } else if (data.type === 'done') {
          if (isFinalized) return;
          isFinalized = true;
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
          const finalize = async () => {
            const explicitOpsPayload = projectPath ? extractFileOpsPayload(buffer) : null;
            const fallbackOpsPayload =
              projectPath && !explicitOpsPayload ? extractFallbackFileOps(buffer) : null;
            const opsPayload = explicitOpsPayload || fallbackOpsPayload;
            const cleanedAssistantText = stripFileOpsBlock(buffer);
            const workedMs = Date.now() - startedAt;

            let assistantContent = cleanedAssistantText || buffer;
            let fileOperations: FileOperation[] | undefined;
            if (opsPayload && projectPath) {
              const results = await executeFileOperations(opsPayload, projectPath);
              fileOperations = results.changes;
              assistantContent = `${assistantContent}\n\nExecuted file operations:\n${results.logs.join('\n')}`;
            }

            // Save assistant message
            const assistantMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: assistantContent || 'Selesai diproses, tapi tidak ada konten balasan.',
              fileOperations,
              workedMs,
              timestamp: new Date().toISOString(),
            };
            await appendAssistantMessage(assistantMessage);
            setIsLoading(false);
            setStreamingContent('');
            setRequestStartedAt(null);
            window.electronAPI.removeStreamListener();
          };

          finalize();
        }
      });

      const requestResult = await window.electronAPI.sendApiRequestStream({
        model: apiConfig.model,
        messages,
      });

      if (!requestResult.success && !isFinalized) {
        isFinalized = true;
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Request failed: ${requestResult.error || 'Unknown error'}`,
          retryable: true,
          workedMs: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        };
        await appendAssistantMessage(assistantMessage);
        setIsLoading(false);
        setStreamingContent('');
        setRequestStartedAt(null);
        window.electronAPI.removeStreamListener();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      setStreamingContent('');
      setRequestStartedAt(null);
    }
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      explain: 'Please explain the structure and purpose of this codebase.',
      'fix-bugs': 'Help me find and fix bugs in this project.',
      refactor: 'Suggest refactoring improvements for this codebase.',
      'add-feature': 'I want to add a new feature. Can you help me plan it?',
    };

    const prompt = prompts[action];
    if (prompt) {
      handleSendMessage(prompt, []);
    }
  };

  const handleCheckUsage = async () => {
    if (!apiConfig) return;
    setLoadingUsage(true);
    try {
      const result = await window.electronAPI.getUsageStats();
      setUsageStats(result);
    } catch (error) {
      console.error('Failed to check usage:', error);
      setUsageStats({ success: false, error: 'Failed to check usage' });
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Get current data
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentConversation = currentProjectId
    ? currentProject?.conversations.find((c) => c.id === currentConversationId)
    : generalConversations.find((c) => c.id === currentConversationId);

  const modelName = apiConfig?.model?.replace('claude-', '').replace('-4-6', '-4') || 'Sonnet 4';

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        generalConversations={generalConversations}
        currentProjectId={currentProjectId}
        currentConversationId={currentConversationId}
        onAddProject={handleAddProject}
        onAddGeneralConversation={handleAddGeneralConversation}
        onSelectGeneralConversation={handleSelectGeneralConversation}
        onSelectProject={handleSelectProject}
        onSelectConversation={handleSelectConversation}
        onAddConversation={handleAddConversation}
        onDeleteGeneralConversation={handleDeleteGeneralConversation}
        onDeleteProject={handleDeleteProject}
        onDeleteConversation={handleDeleteConversation}
        onTogglePin={handleTogglePin}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          projectName={currentProject?.name || (currentConversation ? 'General Chat' : undefined)}
          conversationTitle={currentConversation?.title}
          modelName={modelName}
          onOpenSettings={() => setShowSettings(true)}
          usageStats={usageStats}
          onCheckUsage={handleCheckUsage}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentConversation && currentConversation.messages.length > 0 ? (
            <>
              <ChatArea
                messages={currentConversation.messages}
                isStreaming={isLoading}
                streamingContent={streamingContent}
                isLoading={isLoading}
                onRetry={handleRetryLastRequest}
              />
            </>
          ) : (
            <EmptyState
              projectName={currentProject?.name}
              onQuickAction={handleQuickAction}
            />
          )}

          {/* Input Area */}
          <InputArea
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            disabled={!currentConversationId}
            focusToken={inputFocusToken}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog !== null}
        onClose={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteDialog?.type === 'project' ? 'Project' : 'Conversation'}?`}
        message={`This action cannot be undone. All ${
          deleteDialog?.type === 'project' ? 'conversations and messages' : 'messages'
        } will be permanently deleted.`}
        type="danger"
        confirmText="Delete"
      />

      {/* Settings Dialog */}
      <Dialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
        type="info"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Base URL
            </label>
            <input
              type="text"
              defaultValue={apiConfig?.baseUrl}
              className="input-modern"
              placeholder="https://api.adacode.ai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              defaultValue={apiConfig?.authToken}
              className="input-modern"
              placeholder="Enter your API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select defaultValue={apiConfig?.model} className="input-modern">
              <option value="claude-sonnet-4-6">Sonnet 4</option>
              <option value="claude-opus-4-7">Opus 4</option>
              <option value="claude-haiku-4">Haiku 4</option>
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default App;
