/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
// kardon imports
import { useTranslation } from "@kardon/i18n";
import { Button } from "@kardon/propel/button";
import { Input } from "@kardon/propel/input";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { usePowerK } from "@/hooks/store/use-power-k";
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useUser } from "@/hooks/store/user";
import useLocalStorage from "@/hooks/use-local-storage";
// services
import { AIService } from "@/services/ai.service";
import type { TTaskPayload } from "@/services/ai.service";
import { AI_EDITOR_TASKS } from "@/kardon-web/constants/ai";

// Initialize AI service
const aiService = new AIService();

// Define TypeScript interfaces
interface IMessage {
  id: string;
  content: string;
  contentHtml?: string;
  sender: 'user' | 'ai';
  timestamp: Date | string;
  operationType?: string;
  success?: boolean;
}

const PiChatPage = observer(() => {
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const commandPaletteService = useCommandPalette();
  const powerKService = usePowerK();
  const themeService = useAppTheme();
  const { data: user } = useUser();
  // translation
  const { t } = useTranslation();
  // states
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('orchestrator');
  // Use localStorage to persist conversation history
  const { storedValue: conversationHistory, setValue: setConversationHistory } = useLocalStorage<IMessage[][]>(
    `ai-agent-history-${workspaceSlug}`,
    []
  );
  // Current conversation messages
  const [messages, setMessages] = useState<IMessage[]>(() => {
    // Load the most recent conversation if available
    if (conversationHistory.length > 0) {
      // Convert timestamp strings back to Date objects and restore all message properties
      return conversationHistory[conversationHistory.length - 1].map(msg => ({
        id: msg.id,
        content: msg.content,
        contentHtml: msg.contentHtml,
        operationType: msg.operationType,
        success: msg.success,
        sender: msg.sender,
        timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
      }));
    }
    return [];
  });
  // refs
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to start a new conversation
  const handleNewConversation = () => {
    setMessages([]);
    setInputValue(""); // Clear input when starting new conversation
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    console.log("handleSendMessage called");
    console.log("inputValue:", inputValue);
    console.log("isLoading:", isLoading);
    console.log("selectedModel:", selectedModel);
    
    if (!inputValue.trim() || isLoading) {
      console.log("Early return: input empty or loading");
      return;
    }

    // Add user message to chat
    const userMessage: IMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    console.log("Set loading to true");

    try {
      // Determine task based on selected model
      const taskType = selectedModel === 'orchestrator' 
        ? AI_EDITOR_TASKS.ORCHESTRATE_TASK 
        : AI_EDITOR_TASKS.ASK_ANYTHING;
      
      console.log("taskType determined:", taskType);

      // Prepare payload for AI service
      const payload: TTaskPayload = {
        task: taskType,
        text_input: inputValue,
        selected_model: selectedModel,
      };
      
      console.log("payload prepared:", payload);

      // Call AI service to get response
      if (workspaceSlug) {
        console.log("Calling aiService with workspaceSlug:", workspaceSlug.toString());
        const response = await aiService.performEditorTask(workspaceSlug.toString(), payload);
        console.log("Response received:", response);

        // Handle enhanced response format from backend
        let responseContent = response.response || "No response received";
        let responseHtml = response.response_html || responseContent.replace(/\n/g, '<br/>');
        
        // Add AI response to chat
        const aiMessage: IMessage = {
          id: `ai-${Date.now()}`,
          content: responseContent,
          contentHtml: responseHtml,
          operationType: response.operation_type,
          success: response.success,
          sender: 'ai',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);

      // Add error message to chat
      const errorMessage: IMessage = {
        id: `error-${Date.now()}`,
        content: error?.response?.data?.error || error?.data?.error || "Sorry, I encountered an error processing your request.",
        sender: 'ai',
        success: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      console.log("Set loading to false");
    }
  };

  // Effect to update conversation history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const updatedHistory = [...conversationHistory];
      // Convert Date objects to strings for storage and preserve all message properties
      const messagesForStorage = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        contentHtml: msg.contentHtml,
        operationType: msg.operationType,
        success: msg.success,
        sender: msg.sender,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }));
      if (updatedHistory.length > 0) {
        // Update the last conversation
        updatedHistory[updatedHistory.length - 1] = messagesForStorage;
      } else {
        // Create a new conversation
        updatedHistory.push(messagesForStorage);
      }
      setConversationHistory(updatedHistory);
    }
  }, [messages, conversationHistory, setConversationHistory]);

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div className="relative h-full w-full overflow-hidden overflow-y-auto">
        {/* Messages Container */}
        <div className="flex flex-col h-full w-full bg-surface-1">
          {/* Main chat container with fixed max width */}
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                // Initial state: centered input with elegant design
                <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4">
                  
                  <div className="mb-8 text-center relative z-10">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-layer-1 border border-subtle">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-primary mb-2">Agents Orchestrator</h1>
                    <p className="text-secondary max-w-md">
                      Ask me anything about your workspace, projects, or tasks. I can help you find information, generate content, and more.
                    </p>
                  </div>
                  
                  {/* Centered input field with elegant styling */}
                  <div className="mb-4 flex justify-center">
                    <select 
                      value={selectedModel} 
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="px-4 py-2 border rounded-lg bg-surface-1 text-primary"
                    >
                      <option value="orchestrator">Orchestrator (Auto-select)</option>
                      <option value="general">General Assistant</option>
                    </select>
                  </div>
                  <div className="w-full max-w-2xl relative z-10">
                    <div className="relative">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask Agents Orchestrator anything..."
                        className="w-full py-6 px-6 text-lg shadow-lg focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary rounded-xl"
                        autoFocus
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-5 rounded-xl"
                      >
                        Send
                      </Button>
                    </div>
                    
                    {/* Suggestions */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        "What are my current tasks?",
                        "Summarize today's priorities",
                        "How do I create a new project?",
                        "Show me recent activity"
                      ].map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="secondary"
                          className="text-left p-4 h-auto rounded-xl"
                          onClick={() => setInputValue(suggestion)}
                        >
                          <span className="text-sm">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Conversation view
                <div className="pb-24">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.id}-${index}`}
                      className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          message.sender === 'user'
                            ? 'bg-accent-primary text-on-accent rounded-br-none'
                            : 'bg-layer-1 text-primary rounded-bl-none'
                        }`}
                      >
                        {message.contentHtml ? (
                          <div 
                            className="whitespace-pre-wrap text-base prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: message.contentHtml }} 
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-base">
                            {message.content}
                          </div>
                        )}
                        <div
                          className={`text-xs mt-2 flex flex-wrap gap-2 ${
                            message.sender === 'user' ? 'text-on-accent/70' : 'text-secondary'
                          }`}
                        >
                          {message.operationType && (
                            <span className="inline-block px-2 py-1 rounded bg-layer-2 text-xs">
                              {message.operationType}
                            </span>
                          )}
                          {typeof message.success !== 'undefined' && (
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              message.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {message.success ? 'Success' : 'Failed'}
                            </span>
                          )}
                          <span>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-layer-1 text-primary rounded-lg p-4 rounded-bl-none max-w-[85%]">
                        <div className="flex items-center">
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce"></div>
                            <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce delay-100"></div>
                            <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce delay-200"></div>
                          </div>
                          <span className="ml-3 text-sm text-secondary">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area - only show when there are messages */}
            {messages.length > 0 && (
              <div className="border-t border-subtle p-4 bg-surface-1 sticky bottom-0">
                <div className="flex gap-3">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Continue conversation..."
                    className="flex-1 py-5 px-4 text-base rounded-xl"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    className="px-6 py-5 rounded-xl"
                  >
                    Send
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleNewConversation}
                    className="rounded-xl"
                  >
                    New Chat
                  </Button>
                </div>
                <p className="text-xs text-secondary mt-3 text-center">
                  Agents Orchestrator may produce inaccurate information about people, places, or facts.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default PiChatPage;