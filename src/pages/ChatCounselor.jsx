import React, { useState, useRef, useEffect } from 'react';
import { Send, UserRound, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import {
    collection, addDoc, query, orderBy,
    onSnapshot, serverTimestamp, doc, setDoc, getDoc
} from 'firebase/firestore';

const formatTimestamp = (ts) => {
    if (!ts) return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (ts.toDate) return ts.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ChatCounselor = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const user = auth.currentUser;
    // Chat room ID is based on the student's UID
    const chatId = user?.uid || 'unknown';

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);

    // ── Ensure chat room doc exists, then listen to messages ──
    useEffect(() => {
        if (!user) return;

        const ensureChatRoom = async () => {
            const chatRef = doc(db, 'counselorChats', chatId);
            const snap = await getDoc(chatRef);
            if (!snap.exists()) {
                // Create chat room with welcome message
                await setDoc(chatRef, {
                    studentId: user.uid,
                    studentEmail: user.email,
                    createdAt: serverTimestamp()
                });
                // Add welcome message from counselor
                await addDoc(collection(db, 'counselorChats', chatId, 'messages'), {
                    text: "Hello! I'm your assigned counselor. How can I support you today?",
                    sender: 'counselor',
                    createdAt: serverTimestamp()
                });
            }
        };

        ensureChatRoom();

        // Real-time listener
        const q = query(
            collection(db, 'counselorChats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setLoading(false);
        });

        return () => unsub();
    }, [chatId]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !user) return;

        const text = input;
        setInput('');

        // Save student message
        await addDoc(collection(db, 'counselorChats', chatId, 'messages'), {
            text,
            sender: 'student',
            senderEmail: user.email,
            createdAt: serverTimestamp()
        });

        // Create notification for counselor in Firestore
        await addDoc(collection(db, 'counselorNotifications'), {
            text: `New message from student (${user.email})`,
            type: 'message',
            chatId,
            studentEmail: user.email,
            read: false,
            createdAt: serverTimestamp()
        });
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="bg-card border-b border-gray-100 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-4">
                    <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div className="flex items-center space-x-3">
                        <div className="bg-primary/20 text-primary p-2 rounded-full">
                            <UserRound size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-800">College Counselor</h1>
                            <p className="text-xs text-green-500 font-medium flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 overflow-y-auto max-w-4xl w-full mx-auto" style={{ height: 'calc(100vh - 140px)' }}>
                {loading ? (
                    <div className="flex justify-center items-center h-full text-gray-400">Loading messages...</div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex flex-col ${message.sender === 'student' ? 'items-end' : 'items-start'}`}>
                                <span className="text-xs text-gray-400 mb-1 ml-1 mr-1">
                                    {message.sender === 'student' ? 'You' : 'Counselor'}
                                </span>
                                <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${message.sender === 'student'
                                    ? 'bg-primary text-white rounded-br-sm'
                                    : 'bg-card border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                                    <p className="text-[15px] leading-relaxed">{message.text}</p>
                                    <span className={`text-[10px] block mt-1 ${message.sender === 'student' ? 'text-blue-100 text-right' : 'text-gray-400 text-left'}`}>
                                        {formatTimestamp(message.createdAt)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </main>

            <footer className="bg-card border-t border-gray-100 p-4 sticky bottom-0">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Message your counselor..."
                        className="flex-1 bg-background border border-gray-200 text-gray-800 px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-[15px]"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="bg-primary text-white p-3 rounded-full hover:bg-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20 flex-shrink-0"
                    >
                        <Send size={20} className="ml-1" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatCounselor;
