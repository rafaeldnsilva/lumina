import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { CompareSlider } from './components/CompareSlider';
import { ChatInterface } from './components/ChatInterface';
import { ChatMessage, StyleOption } from './types';
import { editRoomImage, chatWithConsultant } from './services/geminiService';
import { Upload, Wand2, RefreshCw, MessageSquare, Image as ImageIcon, Loader2 } from 'lucide-react';

const STYLES: StyleOption[] = ['Modern', 'Scandinavian', 'Industrial', 'Bohemian', 'Minimalist', 'Art Deco'];

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'design' | 'chat'>('design');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setOriginalImage(base64);
        setCurrentImage(base64);
        setChatHistory([]); // Reset chat on new image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateStyle = async (style: string) => {
    if (!currentImage) return;
    await runEdit(`Redesign this room in a ${style} style.`);
  };

  const handleCustomEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim() || !currentImage) return;
    await runEdit(editPrompt);
    setEditPrompt('');
  };

  const runEdit = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const newImage = await editRoomImage(currentImage!, prompt);
      setCurrentImage(newImage);
      // Add a system note to chat to keep context fresh
      setChatHistory(prev => [...prev, { role: 'model', text: `I've updated the design based on: "${prompt}". How does it look?` }]);
    } catch (error) {
      alert("Failed to edit image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatMessage = async (text: string) => {
    if (!currentImage) return;
    
    const newUserMsg: ChatMessage = { role: 'user', text };
    setChatHistory(prev => [...prev, newUserMsg]);
    
    setIsChatting(true);
    try {
      const response = await chatWithConsultant(chatHistory, currentImage, text);
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        text: response.text,
        groundingChunks: response.groundingChunks
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsChatting(false);
    }
  };

  // Mobile Tab Switcher
  const TabButton = ({ id, icon: Icon, label }: { id: 'design' | 'chat', icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  if (!originalImage) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 mb-4">
              <ImageIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Design Your Space</h2>
            <p className="text-slate-500">Upload a photo of your room to start remodeling with AI. Try different styles or ask for specific changes.</p>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-10 hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer group"
            >
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-700">Click to upload photo</span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT: Visualizer Panel */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all ${activeTab === 'design' ? 'block' : 'hidden md:flex'}`}>
          
          {/* Image Area */}
          <div className="flex-1 bg-slate-900 relative flex items-center justify-center overflow-hidden">
             {currentImage && originalImage && (
               <CompareSlider 
                 originalImage={originalImage} 
                 modifiedImage={currentImage}
                 className="h-full w-full"
               />
             )}
             
             {/* Loading Overlay */}
             {isGenerating && (
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white">
                 <Loader2 className="w-10 h-10 animate-spin mb-3" />
                 <p className="font-medium">Redesigning your space...</p>
               </div>
             )}

             {/* Reset Button */}
             <button 
               onClick={() => setCurrentImage(originalImage)}
               className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-2 rounded-lg border border-white/20 transition-colors"
               title="Reset to original"
             >
               <RefreshCw className="w-5 h-5" />
             </button>
          </div>

          {/* Tools Area */}
          <div className="bg-white border-t border-slate-200 p-4 md:p-6 space-y-6 z-30 shrink-0 overflow-y-auto max-h-[40vh]">
            
            {/* Quick Styles */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-600" />
                Quick Styles
              </h3>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => handleGenerateStyle(style)}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Edit */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Custom Edit
              </h3>
              <form onSubmit={handleCustomEdit} className="flex gap-2">
                <input 
                  type="text" 
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g. Make the rug blue, add a plant..."
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button 
                  type="submit" 
                  disabled={isGenerating || !editPrompt.trim()}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Generate
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT: Chat Panel */}
        <div className={`w-full md:w-96 border-l border-slate-200 flex flex-col bg-white transition-all ${activeTab === 'chat' ? 'block h-full' : 'hidden md:flex'}`}>
          <ChatInterface 
            messages={chatHistory} 
            onSendMessage={handleChatMessage} 
            isLoading={isChatting}
          />
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex bg-white border-t border-slate-200">
        <TabButton id="design" icon={ImageIcon} label="Design" />
        <TabButton id="chat" icon={MessageSquare} label="Consultant" />
      </div>
    </div>
  );
}
