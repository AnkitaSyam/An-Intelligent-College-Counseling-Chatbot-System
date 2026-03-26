import React, { useState, useRef, useEffect } from 'react';
import { Send, Info, X } from 'lucide-react';
import { db } from '../firebaseConfig';
import {
    collection, addDoc, query, orderBy,
    onSnapshot, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';

const formatTimestamp = (ts) => {
    if (!ts) return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (ts.toDate) return ts.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ChatInterface = ({ student }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [showModal, setShowModal] = useState(false);
    const messagesEndRef = useRef(null);

    // Chat room ID = student's uid (same as ChatCounselor uses)
    const chatId = student.id;

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);

    // ── Real-time listener for this student's chat ──
    useEffect(() => {
        if (!chatId) return;

        const q = query(
            collection(db, 'counselorChats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setMessages(msgs);
        });
        return () => unsub();
    }, [chatId]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const text = input;
        setInput('');

        // Save counselor message to Firestore
        await addDoc(collection(db, 'counselorChats', chatId, 'messages'), {
            text,
            sender: 'counselor',
            createdAt: serverTimestamp()
        });

        // Update chat room metadata so StudentChat can show new message badge
        await updateDoc(doc(db, 'counselorChats', chatId), {
            lastSenderRole: 'counselor',
            lastMessage: text,
            lastMessageAt: serverTimestamp()
        }).catch(() => {}); // ignore if doc doesn't exist yet

        // Notify student via Firestore
        await addDoc(collection(db, 'studentNotifications'), {
            text: 'New message from your counselor',
            type: 'message',
            studentEmail: student.email,
            studentUid: student.id,
            read: false,
            createdAt: serverTimestamp()
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] bg-background rounded-2xl overflow-hidden border border-gray-200/50 shadow-inner">
            {/* Top Bar */}
            <div className="bg-card p-4 border-b border-gray-200/50 flex items-center justify-between shadow-sm">
                <div>
                    <h2 className="font-bold text-gray-800">{student.name || student.email}</h2>
                    <p className="text-xs text-green-500 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="p-2 text-primary hover:bg-secondary/30 rounded-full transition-colors">
                    <Info size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-card/40">
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex flex-col ${message.sender === 'counselor' ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs text-gray-400 mb-1 ml-1 mr-1">
                                {message.sender === 'counselor' ? 'You' : (student.name || student.email)}
                            </span>
                            <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${message.sender === 'counselor'
                                ? 'bg-primary text-white rounded-br-sm'
                                : 'bg-card border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                                <p className="text-[14px] leading-relaxed">{message.text}</p>
                                <span className={`text-[10px] block mt-1 ${message.sender === 'counselor' ? 'text-blue-100 text-right' : 'text-gray-400 text-left'}`}>
                                    {formatTimestamp(message.createdAt)}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="bg-card p-3 border-t border-gray-200/50">
                <form onSubmit={handleSend} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-background border border-gray-200 text-gray-800 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-[14px]"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="bg-primary text-white p-2.5 rounded-full hover:bg-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
                    >
                        <Send size={18} className="ml-0.5" />
                    </button>
                </form>
            </div>

            {/* Info Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800">Student Details</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-background rounded-xl p-3 border border-gray-100">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Name</span>
                                <p className="font-medium text-gray-800 text-lg mt-1">{student.name || '—'}</p>
                            </div>
                            <div className="bg-background rounded-xl p-3 border border-gray-100">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email</span>
                                <p className="font-medium text-gray-800 mt-1">{student.email || '—'}</p>
                            </div>
                            <div className="bg-background rounded-xl p-3 border border-gray-100">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">College ID</span>
                                <p className="font-medium text-gray-800 mt-1">{student.collegeId || '—'}</p>
                            </div>
                            <div className="bg-background rounded-xl p-3 border border-gray-100">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Batch / Class</span>
                                <p className="font-medium text-gray-800 mt-1">{student.batch || '—'} {student.studentClass ? `· ${student.studentClass}` : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
