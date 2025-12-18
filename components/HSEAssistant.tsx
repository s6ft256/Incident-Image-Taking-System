import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

export const HSEAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: "Hello! I am your HSECES Assistant. How can I help with safety protocols today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, isOpen]);

  const initializeChat = () => {
    if (!chatSessionRef.current) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: `You are an expert Technical Authority specialized in HSE and HSECES (Health, Safety, and Environmental Critical Equipment and Systems). Focus strictly on safety topics.`,
          temperature: 0.4,
        },
      });
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    try {
      initializeChat();
      const result = await chatSessionRef.current!.sendMessageStream({ message: userMessage });
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      for await (const chunk of result) {
        fullResponse += (chunk as GenerateContentResponse).text || '';
        setMessages(prev => {
          const m = [...prev];
          m[m.length - 1] = { role: 'model', text: fullResponse };
          return m;
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Connectivity issue. Please retry." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="pointer-events-auto w-80 sm:w-96 h-[500px] max-h-[70vh] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900 p-4 border-b border-white/5 flex justify-between items-center text-white">
            <h3 className="text-sm font-black uppercase tracking-widest">HSECES Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100 transition-opacity"><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-600'}`}>{msg.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
            <div className="relative flex items-center">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Safety query..." className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs rounded-full pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none" />
              <button type="submit" disabled={isLoading} className="absolute right-1.5 p-1.5 bg-blue-600 text-white rounded-full"><svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
            </div>
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="pointer-events-auto h-14 w-14 bg-blue-600 text-white rounded-full shadow-xl hover:scale-105 transition-all flex items-center justify-center border-2 border-white dark:border-slate-800 overflow-hidden"><img src="https://static.vecteezy.com/system/resources/previews/004/734/033/non_2x/hse-icon-with-a-shield-vector.jpg" className="h-full w-full object-cover" /></button>
    </div>
  );
};