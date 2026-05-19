import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  User,
  Bot,
  FileCode2,
  File,
} from 'lucide-react';
import { Message, FileOperation } from '../types';
import { formatFileSize } from '../utils/format';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  isLoading?: boolean;
  onRetry?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  streamingContent,
  isLoading = false,
  onRetry,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              index={index}
              onCopy={(text) => copyToClipboard(text, index)}
              isCopied={copiedIndex === index}
              onRetry={onRetry}
            />
          ))}

          {/* Thinking indicator always appears first while loading */}
          {isLoading && !isStreaming && !streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex gap-4"
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-soft bg-gradient-to-br from-primary-600 to-primary-500">
                <Bot className="w-5 h-5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="inline-block max-w-[85%] rounded-3xl px-5 py-4 bg-white border border-gray-200 text-gray-900 shadow-soft">
                  <p className="text-sm text-gray-400 italic">Sedang menganalisis permintaan Anda...</p>

                  {/* Typing dots indicator */}
                  <div className="flex gap-1 mt-3">
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
              </div>
            </motion.div>
          )}

          {/* Streaming response appears below thinking indicator */}
          {isStreaming && (
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent || '...',
                timestamp: new Date().toISOString(),
                streaming: true,
              }}
              index={messages.length}
              onCopy={() => {}}
              isCopied={false}
              onRetry={onRetry}
            />
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  index: number;
  onCopy: (text: string) => void;
  isCopied: boolean;
  onRetry?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  index,
  onCopy,
  isCopied,
  onRetry,
}) => {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formatWorked = (ms?: number) => {
    if (!ms || ms < 1000) return null;
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    if (min > 0) return `Worked for ${min}m ${rem}s`;
    return `Worked for ${rem}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-soft ${
          isUser
            ? 'bg-gray-100'
            : 'bg-gradient-to-br from-primary-600 to-primary-500'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-gray-600" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
    )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`inline-block max-w-[85%] rounded-3xl px-5 py-4 ${
            isUser
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-soft'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 shadow-soft'
          }`}
        >
          {!isUser && message.fileOperations && message.fileOperations.length > 0 && (
            <FileChangesSummary changes={message.fileOperations} />
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.attachments.map((attachment, idx) => (
                <AttachmentPreview key={idx} attachment={attachment} />
              ))}
            </div>
          )}

          {/* Message content */}
          <MessageContent content={message.content} isUser={isUser} />

          {/* Streaming cursor */}
          {message.streaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-0.5 h-5 bg-current ml-1 align-middle"
            />
          )}
        </div>

        {/* Time and actions */}
        <div
          className={`flex items-center gap-2 mt-2 px-2 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
          {!isUser && !message.streaming && formatWorked(message.workedMs) && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatWorked(message.workedMs)}</span>
          )}
          {!isUser && !message.streaming && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onCopy(message.content)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </motion.button>
          )}
          {!isUser && !message.streaming && message.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface FileChangesSummaryProps {
  changes: FileOperation[];
}

const FileChangesSummary: React.FC<FileChangesSummaryProps> = ({ changes }) => {
  const totalFiles = changes.length;
  const totalAdded = changes.reduce((sum, item) => sum + (item.linesAdded || 0), 0);
  const totalDeleted = changes.reduce((sum, item) => sum + (item.linesDeleted || 0), 0);

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
      <div className="px-4 py-2.5 flex items-center justify-between bg-gray-100 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-800">
          {totalFiles} file{totalFiles > 1 ? 's' : ''} changed
        </span>
        <span className="text-xs font-mono">
          <span className="text-emerald-600">+{totalAdded}</span>{' '}
          <span className="text-rose-600">-{totalDeleted}</span>
        </span>
      </div>
      <div className="p-2 space-y-1.5">
        {changes.map((item, idx) => (
          <div
            key={`${item.path}-${idx}`}
            className="rounded-xl px-3 py-2 bg-white border border-gray-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-800 truncate">{item.path}</span>
              </div>
              <span className="text-xs font-mono flex-shrink-0 ml-3">
                <span className="text-emerald-600">+{item.linesAdded || 0}</span>{' '}
                <span className="text-rose-600">-{item.linesDeleted || 0}</span>
              </span>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

const renderInlineMarkdown = (text: string, isUser: boolean) => {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return segments.map((segment, i) => {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <code
          key={i}
          className={`px-1.5 py-0.5 rounded-lg text-sm font-mono ${
            isUser ? 'bg-white/20' : 'bg-gray-100 text-primary-600'
          }`}
        >
          {segment.slice(1, -1)}
        </code>
      );
    }

    if (segment.startsWith('**') && segment.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <React.Fragment key={i}>{segment}</React.Fragment>;
  });
};

const MessageContent: React.FC<MessageContentProps> = ({ content, isUser }) => {
  // Parse code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose prose-sm max-w-none">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          if (match) {
            const [, language, code] = match;
            return (
              <CodeBlock
                key={index}
                code={code.trim()}
                language={language || 'text'}
              />
            );
          }
        }

        const lines = part.split(/\r?\n/).filter((line) => line.trim().length > 0);
        const blocks: React.ReactNode[] = [];
        let listItems: string[] = [];
        let listType: 'ul' | 'ol' | null = null;

        const flushList = (keySeed: string) => {
          if (listItems.length === 0 || !listType) return;
          if (listType === 'ul') {
            blocks.push(
              <ul key={`ul-${keySeed}`} className="list-disc pl-6 my-2 space-y-1">
                {listItems.map((item, i) => (
                  <li key={i}>{renderInlineMarkdown(item, isUser)}</li>
                ))}
              </ul>
            );
          } else {
            blocks.push(
              <ol key={`ol-${keySeed}`} className="list-decimal pl-6 my-2 space-y-1">
                {listItems.map((item, i) => (
                  <li key={i}>{renderInlineMarkdown(item, isUser)}</li>
                ))}
              </ol>
            );
          }
          listItems = [];
          listType = null;
        };

        lines.forEach((line, lineIndex) => {
          const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
          const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);

          if (ulMatch) {
            if (listType && listType !== 'ul') {
              flushList(`${index}-${lineIndex}`);
            }
            listType = 'ul';
            listItems.push(ulMatch[1]);
            return;
          }

          if (olMatch) {
            if (listType && listType !== 'ol') {
              flushList(`${index}-${lineIndex}`);
            }
            listType = 'ol';
            listItems.push(olMatch[1]);
            return;
          }

          flushList(`${index}-${lineIndex}`);
          blocks.push(
            <p key={`p-${index}-${lineIndex}`} className="my-1 leading-relaxed">
              {renderInlineMarkdown(line, isUser)}
            </p>
          );
        });

        flushList(`${index}-end`);
        return <React.Fragment key={index}>{blocks}</React.Fragment>;
      })}
    </div>
  );
};

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden bg-gray-900 shadow-soft">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-400 uppercase">
          {language}
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </motion.button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-gray-100 font-mono leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
};

interface AttachmentPreviewProps {
  attachment: any;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment }) => {
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(
    attachment.type.toLowerCase()
  );

  if (isImage) {
    return (
      <div className="rounded-xl overflow-hidden border border-white/20">
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="max-w-xs max-h-64 object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl">
      <File className="w-4 h-4" />
      <span className="text-sm">{attachment.name}</span>
      <span className="text-xs opacity-70">
        ({formatFileSize(attachment.size)})
      </span>
    </div>
  );
};
