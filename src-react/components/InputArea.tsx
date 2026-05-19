import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  Loader2,
} from 'lucide-react';

interface InputAreaProps {
  onSendMessage: (message: string, attachments: any[]) => void;
  isLoading: boolean;
  disabled?: boolean;
  focusToken?: number;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
  focusToken = 0,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [focusToken, disabled]);

  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || isLoading || disabled) {
      return;
    }

    onSendMessage(message, attachments);
    setMessage('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleAttachImage = () => {
    imageInputRef.current?.click();
  };

  const addAttachmentFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name || `pasted-image-${Date.now()}.png`,
          type: file.type.split('/')[1] || 'file',
          mediaType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      addAttachmentFromFile(file);
    }

    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();

    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (file) {
        addAttachmentFromFile(file);
      }
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl transition-colors duration-200">
      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pt-4 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <AttachmentChip
                  key={index}
                  attachment={attachment}
                  onRemove={() => removeAttachment(index)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Container */}
      <div className="px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative glass-effect dark:bg-gray-800/50 rounded-3xl shadow-soft-lg overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-end gap-2 p-2">
              {/* Textarea */}
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Ask Claude to help with your code..."
                  disabled={disabled || isLoading}
                  rows={1}
                  className="w-full px-4 py-3 bg-transparent border-none resize-none focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 max-h-[200px]"
                  style={{ minHeight: '52px' }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0 pb-1 pr-1">
                {/* Attach File */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAttachFile}
                  disabled={disabled || isLoading}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </motion.button>

                {/* Attach Image */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAttachImage}
                  disabled={disabled || isLoading}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach image"
                >
                  <ImageIcon className="w-5 h-5" />
                </motion.button>

                {/* Send Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={disabled || isLoading || (!message.trim() && attachments.length === 0)}
                  className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl shadow-soft hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-soft"
                  title="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Claude can make mistakes. Please double-check responses.
          </p>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*"
      />
    </div>
  );
};

interface AttachmentChipProps {
  attachment: any;
  onRemove: () => void;
}

const AttachmentChip: React.FC<AttachmentChipProps> = ({
  attachment,
  onRemove,
}) => {
  const isImage = attachment.mediaType?.startsWith('image/');

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="group relative flex items-center gap-2 pl-2 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-soft hover:shadow-soft-lg transition-all"
    >
      {isImage ? (
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="w-10 h-10 object-cover rounded-lg"
        />
      ) : (
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <Paperclip className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
          {attachment.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {(attachment.size / 1024).toFixed(1)} KB
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};
