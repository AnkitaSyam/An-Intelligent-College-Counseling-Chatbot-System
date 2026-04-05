import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ArrowLeft, Plus, MessageSquare, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { analyzeMood } from '../utils/moodAnalyzer';

const formatTimestamp = (ts) => {
  if (!ts) return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (ts.toDate) return ts.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ChatAI = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const bottomRef = useRef(null);

  // 1. Load User
  useEffect(() => {
    const userStr = localStorage.getItem('counseling_currentUser');
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  // 2. Fetch Sessions
  useEffect(() => {
    if (!user) return;
    const q = query(
        collection(db, 'aiChats', user.uid, 'sessions'), 
        orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
        const sess = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(sess);
    });
    return () => unsub();
  }, [user]);

  // 3. Fetch Messages for Active Session
  useEffect(() => {
    if (!user) return;
    if (!activeSessionId) {
        setMessages([]);
        return;
    }
    const q = query(
      collection(db, 'aiChats', user.uid, 'sessions', activeSessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user, activeSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    let currentSessionId = activeSessionId;

    try {
        // Create session if it doesn't exist
        if (!currentSessionId) {
            const sessionsRef = collection(db, 'aiChats', user.uid, 'sessions');
            const newSessionDoc = await addDoc(sessionsRef, {
                title: userMsg.length > 30 ? userMsg.substring(0, 30) + '...' : userMsg,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            currentSessionId = newSessionDoc.id;
            setActiveSessionId(currentSessionId);
        }

        const messagesRef = collection(db, 'aiChats', user.uid, 'sessions', currentSessionId, 'messages');

        // Save user message
        await addDoc(messagesRef, {
            text: userMsg,
            sender: 'user',
            timestamp: serverTimestamp()
        });
        
        // Log the sentiment globally
        const mood = analyzeMood(userMsg);
        await addDoc(collection(db, 'studentMoodLogs'), {
            studentId: user.uid,
            source: 'ai_chat',
            text: userMsg.length > 50 ? userMsg.substring(0, 50) + '...' : userMsg,
            score: mood.score,
            emotion: mood.emotion,
            dateStr: new Date().toLocaleDateString('en-US'),
            timestamp: serverTimestamp()
        });

        // Update session timestamp
        await updateDoc(doc(db, 'aiChats', user.uid, 'sessions', currentSessionId), {
            updatedAt: serverTimestamp()
        }).catch(() => {});

        // Fetch API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); 

        const res = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorText = await res.text().catch(() => 'No text');
            throw new Error(`Server ${res.status}: ${errorText}`);
        }

        const result = await res.json();
        if (!result || !result.reply) {
            throw new Error('Invalid response format from server');
        }

        // Save bot reply
        await addDoc(messagesRef, {
            text: result.reply,
            sender: 'bot',
            timestamp: serverTimestamp()
        });

        // Update session timestamp again
        await updateDoc(doc(db, 'aiChats', user.uid, 'sessions', currentSessionId), {
            updatedAt: serverTimestamp()
        }).catch(() => {});

        // Process alerts if necessary
        if (result.shouldAlert) {
            addDoc(collection(db, 'alerts'), {
               studentId: user.uid,
               studentName: user.name || user.email || 'Student',
               studentEmail: user.email || 'No Email',
               message: userMsg || '',
               emotion: result.emotion || 'unknown',
               severity: result.severity || 'unknown',
               timestamp: serverTimestamp(),
               read: false
            }).catch(e => console.error("Error logging alert:", e));

            addDoc(collection(db, 'counselorNotifications'), {
               type: 'alert',
               text: `Urgent AI Alert: ${result.severity || 'unknown'} severity ${result.emotion || 'unknown'} detected from student ${user.name || user.email || 'Student'}.`,
               studentId: user.uid,
               read: false,
               createdAt: serverTimestamp()
            }).catch(e => console.error("Error logging notification:", e));
        }

    } catch (err) {
        console.error(err);
        if (currentSessionId) {
            await addDoc(collection(db, 'aiChats', user.uid, 'sessions', currentSessionId, 'messages'), {
                text: `Error connecting to AI counselor: ${err.message}. Please restart backend or check api quota.`,
                sender: 'bot',
                timestamp: serverTimestamp()
            });
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
         <div className="fixed inset-0 bg-gray-600/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-[#f9f9f9] border-r border-gray-200 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-30 md:relative md:translate-x-0 flex flex-col`}>
         
         {/* Top Action */}
         <div className="p-3 border-b border-gray-200 bg-[#f9f9f9]">
             <Link to="/dashboard" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors p-2.5 rounded-lg font-medium text-[14px]">
                 <ArrowLeft size={18} />
                 <span>Back to Dashboard</span>
             </Link>
         </div>

         {/* Sidebar Header */}
         <div className="p-3 mb-2 flex items-center justify-between pointer-events-auto mt-1">
             <button onClick={handleNewChat} className="w-full flex items-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 p-2.5 rounded-lg shadow-sm transition-colors text-sm font-medium">
                 <Plus size={18} />
                 <span>New Chat</span>
             </button>
             <button className="md:hidden ml-2 p-2 text-gray-500 hover:bg-gray-200 rounded-lg" onClick={() => setSidebarOpen(false)}>
                <X size={20} />
             </button>
         </div>

         {/* History List */}
         <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
             {sessions.length === 0 && <div className="text-xs text-gray-400 p-2 text-center mt-4">No recent chats</div>}
             {sessions.map(session => (
                 <button 
                     key={session.id}
                     onClick={() => handleSelectSession(session.id)}
                     className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left text-[14px] transition-colors relative group ${activeSessionId === session.id ? 'bg-[#e5e5e5] font-medium text-gray-900 pointer-events-none' : 'text-gray-700 hover:bg-gray-200'}`}
                 >
                     <MessageSquare size={16} className={`flex-shrink-0 ${activeSessionId === session.id ? 'text-gray-800' : 'text-gray-500'}`} />
                     <span className="truncate flex-1">{session.title}</span>
                 </button>
             ))}
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative h-full">
         
         {/* Header */}
         <div className="h-[60px] border-b border-gray-100 flex items-center px-4 justify-between shrink-0 bg-white z-10 w-full sticky top-0">
             <div className="flex items-center space-x-3">
                 <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-800 p-2 -ml-2 rounded-lg">
                     <Menu size={24} />
                 </button>
                 <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                        <Bot size={22} className="text-primary tracking-tight" /> 
                        AI Counselor
                    </span>
                 </div>
             </div>
         </div>

         {/* Chat Messages Array */}
         <div className="flex-1 overflow-y-auto px-4 md:px-0 scroll-smooth pb-4">
            {messages.length === 0 && !loading && (
                <div className="h-full flex flex-col items-center gap-4 justify-center text-center opacity-70">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Bot size={32} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 tracking-tight">How can I help you today?</h2>
                    <p className="max-w-[400px] text-[15px] px-4">I'm your AI counselor. Feel free to ask me questions regarding academics or your mental wellbeing.</p>
                </div>
            )}
            
            <div className="max-w-3xl mx-auto w-full pt-8 pb-32 space-y-6">
                {messages.map((msg) => (
                <div key={msg.id} className={`flex px-2 md:px-6 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'bot' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                            <Bot size={18} className="text-primary" />
                        </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-5 py-3 ${msg.sender === 'user' ? 'bg-[#f4f4f4] text-gray-900 border border-gray-100' : 'text-gray-800'}`}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-[11px] block mt-2 opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {formatTimestamp(msg.timestamp)}
                    </span>
                    </div>
                </div>
                ))}

                {loading && (
                <div className="flex px-2 md:px-6 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mr-4">
                        <Bot size={18} className="text-primary" />
                    </div>
                    <div className="bg-transparent px-2 py-3 rounded-2xl text-[15px] text-gray-500 font-medium">
                    <span className="flex gap-1 items-center">Thinking<span className="animate-pulse">...</span></span>
                    </div>
                </div>
                )}
                <div ref={bottomRef} className="h-6" />
            </div>
         </div>

         {/* Message Input Area (Floating style like ChatGPT) */}
         <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-8 pb-6 px-4 md:px-8">
             <div className="max-w-3xl mx-auto relative bg-[#f4f4f4] border border-gray-200 rounded-[24px] shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all overflow-hidden flex items-end">
                 <textarea
                     className="w-full max-h-[200px] min-h-[56px] resize-none px-5 py-[16px] text-[15px] leading-relaxed outline-none text-gray-800 bg-transparent custom-scrollbar"
                     placeholder="Message AI Counselor..."
                     value={input}
                     onChange={(e) => {
                         setInput(e.target.value);
                         e.target.style.height = 'auto';
                         e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                     }}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             if(input.trim()) {
                                 sendMessage();
                                 e.target.style.height = 'auto';
                             }
                         }
                     }}
                     disabled={loading}
                     rows={1}
                 />
                 <div className="p-2 shrink-0 self-end">
                     <button
                         onClick={(e) => {
                             sendMessage();
                             const textArea = e.currentTarget.parentElement.previousElementSibling;
                             if(textArea) textArea.style.height = 'auto';
                         }}
                         disabled={loading || !input.trim()}
                         className={`p-2.5 rounded-full transition-colors flex items-center justify-center ${input.trim() && !loading ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                     >
                         <Send size={18} className={input.trim() && !loading ? 'translate-x-[1px] translate-y-[1px]' : ''} />
                     </button>
                 </div>
             </div>
             <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
                 AI Counselor can make mistakes. Consider verifying important or sensitive information.
             </p>
         </div>
      </div>
    </div>
  );
};

export default ChatAI;