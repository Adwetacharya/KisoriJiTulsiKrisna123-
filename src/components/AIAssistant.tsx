import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Sparkles, Brain, Calculator, FileText, Zap, WifiOff, Wifi, Mic, MicOff, Volume2, VolumeX, RotateCcw, Square } from 'lucide-react';
import { aiService } from '../services/aiService.js';
import { useAuth } from '../context/AuthContext.js';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isOffline?: boolean;
}

export const AIAssistant = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ai_campus_coach_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [
      {
        id: '1',
        text: "Hi! I'm your AI Coach. I can help you with math, study schedules, report outlines, or just practice communication. How can I help today?",
        sender: 'ai',
        timestamp: new Date()
      }
    ];
  });

  const MAX_HISTORY = 2000;

  useEffect(() => {
    localStorage.setItem('ai_campus_coach_history', JSON.stringify(messages.slice(-MAX_HISTORY)));
  }, [messages]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => localStorage.getItem('ai_coach_voice_uri') || '');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (!selectedVoiceURI && voices.length > 0) {
        // Try to find a good default (English female usually sounds clearest for coaching)
        const defaultVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google'))) || voices[0];
        setSelectedVoiceURI(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem('ai_coach_voice_uri', selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          console.log('No speech detected.');
        } else {
          console.error('Speech recognition error:', event.error);
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  const speak = (text: string) => {
    if (!isTTSEnabled) return;
    window.speechSynthesis.cancel();
    
    // Clean text for speech: remove symbols that sound weird
    let cleanText = text
      .replace(/\*\*/g, '') // Remove bold bold markdown
      .replace(/#/g, '')     // Remove headers
      .replace(/\$/g, '')    // Remove dollar signs/latex
      .replace(/\^/g, ' to the power of ')
      .replace(/\*/g, ' times ')
      .replace(/\//g, ' divided by ')
      .replace(/\[|\]/g, '') // Remove brackets
      .replace(/\{|\}/g, ''); // Remove braces

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Detect Language for better mobile support
    // Hindi character range: \u0900-\u097F
    const isHindi = /[\u0900-\u097F]/.test(cleanText);
    
    const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    
    if (isHindi) {
      utterance.lang = 'hi-IN';
      // If user hasn't selected a specific voice or selected an English one, 
      // try to find a Hindi voice specifically for this utterance
      if (!voice || !voice.lang.startsWith('hi')) {
        const hindiVoice = availableVoices.find(v => v.lang.startsWith('hi'));
        if (hindiVoice) utterance.voice = hindiVoice;
      }
    } else {
      utterance.lang = voice?.lang || 'en-US';
    }

    if (voice && !isHindi) {
      utterance.voice = voice;
    }
    
    // Apply gender-based pitch adjustment if applicable
    if (utterance.voice?.name.toLowerCase().includes('male')) {
      utterance.pitch = 0.9;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utterance.rate = 0.9; // Slower, more understandable rate
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const messageText = overrideInput || input;
    if (!messageText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideInput) setInput('');
    setIsTyping(true);

    try {
      const response = await aiService.generateChatResponse([...messages.map(m => ({
        role: m.sender === 'ai' ? 'ai' as const : 'user' as const,
        content: m.text
      })), { role: 'user' as const, content: messageText }]);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'ai',
        timestamp: new Date(),
        isOffline: response.mode === 'offline'
      };

      setMessages(prev => [...prev, aiMsg]);
      speak(response.text);
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    { label: 'Math Hint', icon: Calculator, prompt: 'Show me how to solve a quadratic equation.' },
    { label: 'Study Tip', icon: Brain, prompt: 'Give me a study tip for focus.' },
    { label: 'Sound Better', icon: Zap, prompt: 'How can I sound more professional in an email?' },
    { label: 'Report Structure', icon: FileText, prompt: 'Help me outline a lab report.' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l shadow-2xl z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <Brain size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold">AI Campus Coach</h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase opacity-80">
                    {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {isOnline ? 'Online' : 'Offline Mode'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isSpeaking && (
                   <button 
                   onClick={stopSpeaking}
                   className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-white flex items-center gap-1 mr-1"
                   title="Stop Speaking"
                 >
                   <Square size={16} fill="currentColor" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
                 </button>
                )}
                <button 
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-2 rounded-lg transition-colors ${showVoiceSettings ? 'bg-white/30' : 'hover:bg-white/10'}`}
                  title="Voice Settings"
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  id="close-ai-assistant"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Voice Settings Overlay */}
            <AnimatePresence>
              {showVoiceSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-[73px] left-0 right-0 bg-white border-b shadow-lg z-[80] p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-700">Voice Settings</h4>
                    <button 
                      onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        isTTSEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isTTSEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      {isTTSEnabled ? 'Speech On' : 'Speech Off'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Select Voice & Language</label>
                    <select 
                      value={selectedVoiceURI}
                      onChange={(e) => setSelectedVoiceURI(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableVoices.map((voice, index) => (
                        <option key={`${voice.voiceURI}-${index}`} value={voice.voiceURI}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => setShowVoiceSettings(false)}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
            >
              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                      m.sender === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] opacity-60">
                            {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {m.sender === 'ai' && (
                            <button 
                              onClick={() => speak(m.text)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Respeak"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                       </div>
                      {m.isOffline && (
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded italic">
                          Generated Locally
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-4 bg-white border-t space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.prompt);
                      // Auto-send would be nice but it might be better to let user edit
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all hover:text-indigo-600"
                  >
                    <action.icon size={14} />
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Ask your coach anything..."}
                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isListening ? 'ring-2 ring-red-400 placeholder:text-red-400' : ''}`}
                    id="ai-assistant-input"
                  />
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100"
                  id="send-ai-assistant"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
