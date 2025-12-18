
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

export const HSEAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: "Hello! I am your HSECES Assistant. I can help you with Health, Safety, and Environmental Critical Equipment and Systems. Do you have questions about safety barriers, critical equipment failures, or performance standards?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to store the chat session so it persists across renders but not page reloads
  const chatSessionRef = useRef<Chat | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const initializeChat = () => {
    if (!chatSessionRef.current) {
      try {
        // Fix: Use process.env.API_KEY directly as per guidelines
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatSessionRef.current = ai.chats.create({
          // Fix: Use gemini-3-flash-preview for general text tasks
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: `You are an expert Technical Authority and Assistant specialized in Health, Safety, and Environment (HSE), with a comprehensive focus on **HSECES (Health, Safety, and Environmental Critical Equipment and Systems)**.

Your mandate is to assist users in managing risks associated with equipment whose failure could cause a major accident or whose purpose is to prevent/limit the consequences of one.

**Your knowledge base covers all HSECES groups, including but not limited to:**
1.  **Structure & Maritime Integrity:** Hulls, jackets, mooring systems.
2.  **Process Containment:** Pressure vessels, piping, PSVs (Pressure Safety Valves), isolation valves.
3.  **Ignition Control:** Ex-rated equipment, earthing/bonding, flame arrestors.
4.  **Detection Systems:** Fire and Gas (F&G) detection systems, smoke detectors.
5.  **Protection Systems:** Deluge systems, firewater pumps, passive fire protection (PFP).
6.  **Shutdown Systems:** ESD (Emergency Shutdown) logic, blowdown valves.
7.  **Emergency Response:** Lifeboats, TEMPSC, life jackets, escape routes, communications.
8.  **Life Saving:** H2S breathing apparatus, portable gas detectors.

**Your Responsibilities:**
*   **Incident Reporting:** Help users describe failures in these systems accurately (e.g., "The ESD valve failed to close within the specified time").
*   **Root Cause Analysis:** Suggest potential failure mechanisms (corrosion, calibration drift, logic error) for critical equipment.
*   **Mitigation:** Advise on interim safety measures if an HSECES is impaired (e.g., "If the fire pump is out, stop hot work immediately").
*   **Performance Standards:** Explain the functionality, availability, reliability, and survivability required for these systems.

**Strict Constraint:**
You must STRICTLY focus on HSE and HSECES topics. If a user asks about unrelated topics (like coding, cooking, sports, or general trivia), politely decline and state that your function is restricted to Critical Safety Systems and HSE management.`,
            temperature: 0.4, // Lower temperature for more factual/technical responses
          },
        });
      } catch (error) {
        console.error("Failed to initialize Gemini:", error);
        throw error;
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      initializeChat();
      if (!chatSessionRef.current) throw new Error("Chat could not be initialized.");

      const result = await chatSessionRef.current.sendMessageStream({ message: userMessage });
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        // Fix: Use .text property as per guidelines (no parentheses)
        const text = c.text || '';
        fullResponse += text;
        
        // Update the last message with the accumulated text
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: fullResponse };
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      
      let errorMessage = "I'm having trouble connecting to the safety database right now. Please try again.";
      
      // Provide more specific feedback for common deployment issues
      if (error.message && (error.message.includes("API Key") || error.message.includes("401") || error.message.includes("403"))) {
        errorMessage = "System Error: API Configuration is missing or invalid. Please check your application settings.";
      } else if (error.message) {
         // Display the actual error for debugging
         errorMessage = `Connection Error: ${error.message}`;
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto w-80 sm:w-96 h-[500px] max-h-[70vh] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-emerald-500/50 shadow-lg shadow-emerald-900/50 bg-white">
                <img 
                  src="https://static.vecteezy.com/system/resources/previews/004/734/033/non_2x/hse-icon-with-a-shield-vector.jpg" 
                  alt="HSE Icon"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">HSECES Assistant</h3>
                <p className="text-[10px] text-emerald-300">Critical Systems AI • developed by @Elius</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
                  }`}
                >
                  {/* Simple formatting for basic markdown-like lists */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-600 flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-slate-800 border-t border-slate-700">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about critical equipment..."
                className="w-full bg-slate-900 text-white text-sm rounded-full pl-4 pr-10 py-2.5 border border-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => {
           setIsOpen(!isOpen);
           if (!isOpen) setTimeout(scrollToBottom, 100);
        }}
        className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] hover:scale-105 transition-all duration-300 border border-emerald-400 p-0 overflow-hidden"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-in zoom-in duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <img 
            src="https://static.vecteezy.com/system/resources/previews/004/734/033/non_2x/hse-icon-with-a-shield-vector.jpg" 
            alt="HSE Assistant" 
            className="h-full w-full object-cover animate-in zoom-in duration-200"
          />
        )}
        
        {!isOpen && (
            <span className="absolute right-2 top-2 flex h-3.5 w-3.5 z-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border-2 border-white"></span>
            </span>
        )}
      </button>
    </div>
  );
};
