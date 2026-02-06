/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import { useState, useEffect, useRef } from "react";

import { Button } from "../button";
import { Input } from "../form-fields/input";
import { cn } from "../utils";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const MessageInput: React.FunctionComponent<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  autoFocus = true,
}) => {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="relative flex items-center gap-2 w-full">
      <Input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 resize-none focus:ring-0 focus-visible:ring-0 border-0 shadow-none focus:border-none"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="rounded-full h-8 w-8 p-0"
        variant="primary"
      >
        <span className="text-xs">Send</span>
      </Button>
    </div>
  );
};