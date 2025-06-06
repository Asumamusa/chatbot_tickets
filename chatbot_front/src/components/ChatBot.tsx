import React, { useState, useRef, useEffect } from 'react';
import { Send, Wifi, AlertCircle, Clock } from 'lucide-react';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { sendMessage } from '../services/api';
import type { Message as MessageType } from '../types';

export const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: 1,
      text: "Bonjour ! Je suis l'assistant virtuel de MiNET. Je peux vous aider avec vos problèmes de connexion internet, de configuration WiFi, ou toute autre question technique. Comment puis-je vous aider aujourd'hui ?",
      isBot: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage: MessageType = {
      id: messages.length + 1,
      text: inputMessage,
      isBot: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    
    const botMessageId = messages.length + 2;
    
    const initialBotMessage: MessageType = {
      id: botMessageId,
      text: "",
      isBot: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, initialBotMessage]);
    setIsLoading(false);
    
        
    await sendMessage(
      currentInput,
      (char: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: msg.text + char }
            : msg
        ));
      },
      (confidence: number) => {
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { 
                ...msg, 
                confidence: confidence
              }
            : msg
        ));
      },
      () => {
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        ));
      },
      (error: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: error, isStreaming: false }
            : msg
        ));
      }
    );
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wifi className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Support MiNET</h1>
            <p className="text-sm text-gray-600">Assistant virtuel - Télécom SudParis</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Décrivez votre problème technique..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              Envoyer
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <AlertCircle size={12} />
              Appuyez sur Entrée pour envoyer
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Support disponible 24h/7j
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};