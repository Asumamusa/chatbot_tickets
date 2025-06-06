import React from 'react';
import { Bot, User, CheckCircle, Loader2 } from 'lucide-react';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const { text, isBot, timestamp, confidence, relatedTickets, isStreaming } = message;
  
  return (
    <div className={`flex gap-3 mb-4 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isBot ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
      }`}>
        {isBot ? <Bot size={16} /> : <User size={16} />}
      </div>
      
      <div className={`max-w-3xl ${isBot ? '' : 'text-right'}`}>
        <div className={`inline-block p-3 rounded-lg ${
          isBot 
            ? 'bg-gray-100 text-gray-800' 
            : 'bg-blue-600 text-white'
        }`}>
          <p className="whitespace-pre-wrap">
            {text}
            {isStreaming && (
              <span className="inline-flex items-center ml-1">
                <Loader2 size={12} className="animate-spin" />
              </span>
            )}
          </p>
          
          {isBot && confidence && !isStreaming && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle size={12} />
                <span>Confiance: {Math.round(confidence * 100)}%</span>
              </div>
              
              {relatedTickets && relatedTickets.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  Basé sur les tickets: {relatedTickets.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={`text-xs text-gray-500 mt-1 ${isBot ? '' : 'text-right'}`}>
          {timestamp}
          {isStreaming && <span className="ml-1 text-blue-500">• En cours...</span>}
        </div>
      </div>
    </div>
  );
};