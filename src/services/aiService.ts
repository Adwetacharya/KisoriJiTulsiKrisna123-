import { GoogleGenAI, Type } from '@google/genai';

export interface AISuggestion {
  text: string;
  type: 'reply' | 'grammar' | 'academic' | 'coach';
}

export interface AIResponse {
  suggestions: AISuggestion[];
  mode: 'online' | 'offline';
}

class AIService {
  private ai: GoogleGenAI | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  async generateChatResponse(messages: { role: 'user' | 'assistant' | 'ai'; content: string }[]): Promise<{ text: string; mode: 'online' | 'offline' }> {
    // Limit context window to last 20 messages for performance and token limits
    const contextWindow = messages.slice(-20);
    
    if (this.isOnline && this.ai) {
      try {
        const lastMsg = contextWindow[contextWindow.length - 1].content;
        
        // Smart routing: check if it's a math expression or simple pattern handled better offline
        const cleaned = lastMsg.toLowerCase().replace(/\s+/g, '');
        if (cleaned.match(/^[0-9+\-*/().^%]+$/) || (cleaned.includes('=') && cleaned.includes('x'))) {
           return { text: this.solveMath(lastMsg), mode: 'offline' };
        }

        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: contextWindow.map(m => ({
            role: m.role === 'ai' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          config: {
            systemInstruction: `You are a Smart Campus AI Academic & Communication Coach. 
            CORE RULES:
            1. BE CONVERSATIONAL: Explain concepts like a friendly tutor. Avoid dense technical symbols ($$, LaTeX) unless requested.
            2. VOICE FRIENDLY: Use plain English for math (e.g., say "e to the power of y" instead of "e^y").
            3. COACHING: If a user asks to "sound better" or "be professional", provide a polished version of their sentence.
            4. CONCISE: Keep responses short and digestible.
            5. STEP-BY-STEP: When solving a problem, give one clear step at a time.
            
            Current mode: You are ONLINE and full capabilities are enabled.`
          }
        });

        return { text: response.text || "I'm sorry, I couldn't generate a response.", mode: 'online' };
      } catch (error: any) {
        console.error('Online Chat Error:', error);
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
          const offline = this.generateOfflineChatResponse(contextWindow[contextWindow.length - 1].content);
          return { 
            text: `(Rate Limit Reached - Switching to Offline Mode)\n\n${offline.text}`, 
            mode: 'offline' 
          };
        }
        return this.generateOfflineChatResponse(contextWindow[contextWindow.length - 1].content);
      }
    } else {
      return this.generateOfflineChatResponse(contextWindow[contextWindow.length - 1].content);
    }
  }

  private generateOfflineChatResponse(input: string): { text: string; mode: 'offline' } {
    const msg = input.toLowerCase();
    
    // 1. Math solving
    const cleaned = msg.replace(/\s+/g, '');
    if (cleaned.match(/^[0-9+\-*/().^%]+$/) || (cleaned.includes('=') && cleaned.includes('x'))) {
      return { text: this.solveMath(input), mode: 'offline' };
    }

    // 2. Report/Essay formats
    if (msg.includes('report') || msg.includes('structure')) {
      return { text: this.generateReportStructure(input), mode: 'offline' };
    }
    if (msg.includes('essay') || msg.includes('outline')) {
      return { text: this.generateReportStructure(input, 'essay'), mode: 'offline' };
    }

    // 3. Schedule
    if (msg.includes('schedule') || msg.includes('planner')) {
      return { text: this.generateSchedule('daily'), mode: 'offline' };
    }

    // 4. Basic coaching/replies
    if (msg.includes('hello') || msg.includes('hi')) {
       return { text: "Hello! I'm your offline AI Coach. I can help with math, reports, schedules, and grammar while you're disconnected. What's on your mind?", mode: 'offline' };
    }
    
    if (msg.includes('better') || msg.includes('professional')) {
      const better = this.checkGrammar(input);
      return { text: `Here is a more polished version: "${better}"`, mode: 'offline' };
    }

    return { 
      text: "I'm in offline mode right now, so I'm limited to basic math, report structures, and study tips. If you have a specific problem, just ask! I'll try to explain it simply without any complicated symbols.", 
      mode: 'offline' 
    };
  }

  async getAssistantResponse(chatHistory: string, lastMessage: string): Promise<AIResponse> {
    if (this.isOnline && this.ai) {
      return this.getOnlineResponse(chatHistory, lastMessage);
    } else {
      return this.getOfflineResponse(lastMessage);
    }
  }

  private async getOnlineResponse(chatHistory: string, lastMessage: string): Promise<AIResponse> {
    try {
      const response = await this.ai!.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context: ${chatHistory}\nLast Message: ${lastMessage}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['reply', 'grammar', 'academic', 'coach'] }
                  },
                  required: ['text', 'type']
                }
              }
            },
            required: ["suggestions"]
          },
          systemInstruction: `You are a Smart Campus AI Academic & Communication Coach. 
          Provide 3-4 distinct suggestions based on the user's input:
          - A smart reply to keep the conversation flowing (type: 'reply').
          - A "Sound Better" version of their message to improve professional or academic tone (type: 'coach').
          - If they ask for help with a problem (math, science, etc.), provide a hint or a first step, not just the answer (type: 'academic').
          - A grammar correction if needed (type: 'grammar').
          
          Focus on being an active listener and helping the student sound more articulate.`
        }
      });

      const data = JSON.parse(response.text || '{"suggestions":[]}');
      return {
        suggestions: data.suggestions,
        mode: 'online'
      };
    } catch (error: any) {
      console.error('Online AI Error:', error);
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        const offline = this.getOfflineResponse(lastMessage);
        return {
          ...offline,
          mode: 'offline'
        };
      }
      return this.getOfflineResponse(lastMessage);
    }
  }

  private getOfflineResponse(lastMessage: string): AIResponse {
    const suggestions: AISuggestion[] = [];
    const msg = lastMessage.toLowerCase();

    // 1. Enhanced Smart Reply Patterns
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      suggestions.push({ text: "Hey! How's it going?", type: 'reply' });
      suggestions.push({ text: "Hi! How's your semester going?", type: 'coach' });
    } else if (msg.includes('thanks') || msg.includes('thank')) {
      suggestions.push({ text: "You're welcome!", type: 'reply' });
      suggestions.push({ text: "I appreciate your help with this.", type: 'coach' });
    } else if (msg.includes('sorry')) {
      suggestions.push({ text: "I apologize for the delay in my response.", type: 'coach' });
    }

    // 2. Communication "Sound Better" Coach (Offline)
    if (lastMessage.length > 5) {
      if (msg.includes('want') || msg.includes('give me')) {
        suggestions.push({ text: "Better: 'I would appreciate it if you could share...'", type: 'coach' });
      } else if (msg.includes('think')) {
        suggestions.push({ text: "Better: 'From my perspective...' or 'Evidence suggests...'", type: 'coach' });
      }
    }

    // 3. Subject-Specific Guidance (Offline)
    if (msg.includes('math') || msg.includes('solve')) {
      suggestions.push({ text: "Step 1: Identify your variables and constants.", type: 'academic' });
    } else if (msg.includes('history') || msg.includes('war')) {
      suggestions.push({ text: "Tip: Contextualize the event within its socio-economic era.", type: 'academic' });
    } else if (msg.includes('science') || msg.includes('bio') || msg.includes('chem')) {
      suggestions.push({ text: "Tip: Relate the concept to a real-world biological process.", type: 'academic' });
    }

    // 4. Local Grammar
    if (lastMessage.length > 0) {
      let corrected = this.checkGrammar(lastMessage);
      if (corrected !== lastMessage) {
        suggestions.push({ text: `Corrected: ${corrected}`, type: 'grammar' });
      }
    }

    // Filter and ensure diversity
    const typesOrder: Array<'reply' | 'coach' | 'academic' | 'grammar'> = ['reply', 'coach', 'academic', 'grammar'];
    const finalSuggestions: AISuggestion[] = [];
    
    typesOrder.forEach(type => {
      const match = suggestions.find(s => s.type === type);
      if (match) finalSuggestions.push(match);
    });

    return {
      suggestions: finalSuggestions.slice(0, 3),
      mode: 'offline'
    };
  }

  // Enhanced offline math solving for complex expressions and simple equations
  solveMath(expr: string): string {
    const cleaned = expr.toLowerCase().replace(/\s+/g, '');
    
    // Check if it's an equation to solve for x: e.g., 2x + 5 = 15
    if (cleaned.includes('=') && cleaned.includes('x')) {
      return this.solveLinearEquation(cleaned);
    }

    try {
      // 1. Identify all alphabetic sequences (words)
      const allowedFunctions = ['sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'log10', 'exp', 'abs', 'floor', 'ceil', 'round', 'pow', 'min', 'max'];
      const allowedConstants = ['pi', 'e'];
      
      // Sanitization process
      let sanitized = cleaned;
      
      // Replace words with Math. prefixed versions if they are allowed
      sanitized = sanitized.replace(/[a-z0-9]+/g, (match) => {
        // If it's a number, keep it
        if (/^[0-9.]+$/.test(match)) return match;
        
        // If it's an allowed function
        if (allowedFunctions.includes(match)) return `Math.${match}`;
        
        // If it's an allowed constant
        if (allowedConstants.includes(match)) {
          if (match === 'pi') return 'Math.PI';
          if (match === 'e') return 'Math.E';
        }
        
        // Disallow everything else
        return '';
      });

      // Handle power operator and cleanup
      sanitized = sanitized.replace(/\^/g, '**');
      
      // Final security check
      if (/[^0-9+\-*/(). ,%*Matha-zPIE]/.test(sanitized)) {
        return "Invalid characters in expression.";
      }

      // Evaluate
      const result = new Function(`return ${sanitized}`)();
      
      if (typeof result !== 'number' || isNaN(result)) {
        return "Invalid result.";
      }
      
      const formattedResult = Number.isInteger(result) ? result : result.toFixed(4);
      return `${expr} = ${formattedResult}`;
    } catch (error) {
      return "Evaluation error.";
    }
  }

  // Simple linear equation solver for patterns like: ax + b = c, ax = c
  private solveLinearEquation(eqn: string): string {
    try {
      const [left, right] = eqn.split('=');
      const targetVal = parseFloat(right);
      
      // Very basic parser for ax + b
      // Match a*x + b or a*x - b or x + b etc.
      const match = left.match(/(-?[\d.]*)x\s*([+-]\s*[\d.]+)?/);
      if (!match) return "Patterns: ax + b = c supported.";

      let a = match[1] === "" ? 1 : match[1] === "-" ? -1 : parseFloat(match[1]);
      let b = match[2] ? parseFloat(match[2].replace(/\s/g, '')) : 0;

      if (isNaN(a) || isNaN(b) || isNaN(targetVal)) return "Numbers only please.";

      const x = (targetVal - b) / a;
      return `For ${eqn}, x = ${Number.isInteger(x) ? x : x.toFixed(2)}`;
    } catch {
      return "Equation too complex.";
    }
  }

  // Schedule formatting utility
  generateSchedule(type: 'daily' | 'weekly'): string {
    const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    if (type === 'daily') {
      return `Daily Schedule:\n` + timeSlots.map(t => `${t}: [Task]`).join('\n') + `\nNotes: `;
    } else {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      return `Weekly Academic Planner:\n` + days.map(d => `${d}:\n  - Morning: \n  - Afternoon: \n  - Evening: `).join('\n');
    }
  }

  // Academic report structure generation
  generateReportStructure(topic: string = "[Topic]", format: 'report' | 'essay' | 'bib' | 'cheat' = 'report'): string {
    if (format === 'essay') {
      return `Essay Outline: ${topic}\n\n` +
             `I. INTRODUCTION\n   - Hook\n   - Thesis Statement\nII. BODY PARAGRAPH 1\n   - Topic Sentence\n   - Evidence\nIII. BODY PARAGRAPH 2\nIV. CONCLUSION\n   - Summary\n   - Final Thought`;
    }
    if (format === 'bib') {
      return `APA Bibliography Template:\n\n` +
             `Author, A. A. (Year). Title of work. Publisher.\n` +
             `Author, B. B. (Year, Month Day). Title of article. Journal Name, Volume(Issue), pages.\n` +
             `URL: https://www.example.com`;
    }
    if (format === 'cheat') {
      return `Math Formula Cheat Sheet:\n\n` +
             `- Quadratic: x = [-b ± sqrt(b² - 4ac)] / 2a\n` +
             `- Pythagorean: a² + b² = c²\n` +
             `- Area Circle: πr²\n` +
             `- Vol Sphere: (4/3)πr³`;
    }
    return `Academic Report Structure: ${topic}\n\n` +
           `1. TITLE PAGE\n` +
           `2. ABSTRACT / EXECUTIVE SUMMARY\n` +
           `3. INTRODUCTION\n   - Background\n   - Problem Statement\n   - Objectives\n` +
           `4. LITERATURE REVIEW\n` +
           `5. METHODOLOGY\n` +
           `6. RESULTS & DISCUSSION\n` +
           `7. CONCLUSION & RECOMMENDATIONS\n` +
           `8. REFERENCES (APA/Harvard Style)\n` +
           `9. APPENDICES`;
  }

  // Local rule-based grammar check
  checkGrammar(text: string): string {
    let output = text.trim();
    if (!output) return "";
    
    // Capitalization
    output = output.charAt(0).toUpperCase() + output.slice(1);
    
    // Common mistakes
    const replacements: { [key: string]: string } = {
      ' i ': ' I ',
      ' dont': " don't",
      ' cant': " can't",
      ' im ': " I'm ",
      ' u ': ' you ',
      ' r ': ' are ',
    };

    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(key, 'gi');
      output = output.replace(regex, replacements[key]);
    });

    return output;
  }
}

export const aiService = new AIService();
