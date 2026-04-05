import React, { useState, useRef, useEffect } from 'react';
import { Send, Info, X, CheckCircle, XCircle, Clock, CheckCheck } from 'lucide-react';
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
    const [chatMetadata, setChatMetadata] = useState(null);
    const [isChatActive, setIsChatActive] = useState(false);
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

            // Fix: Mark student messages as read automatically
            let newUnreadFound = false;
            msgs.forEach(msg => {
                if (msg.sender === 'student' && !msg.read) {
                    newUnreadFound = true;
                    updateDoc(doc(db, 'counselorChats', chatId, 'messages', msg.id), { read: true }).catch(() => {});
                }
            });
            
            // Clear the notification flag structurally on the parent room if unread messages existed and were just read.
            // Or if we just successfully loaded the chat and are viewing it, forcefully verify no unread remain
            if (newUnreadFound || msgs.length > 0) {
                 updateDoc(doc(db, 'counselorChats', chatId), { hasUnreadMessagesFromStudent: false }).catch(() => {});
            }
            
            // Fix: Re-sort to force pending messages to the bottom locally
            msgs.sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now() + 100000;
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now() + 100000;
                return tA - tB;
            });
            
            setMessages(msgs);
        });

        const chatUnsub = onSnapshot(doc(db, 'counselorChats', chatId), (docSnap) => {
            if (docSnap.exists()) {
                setChatMetadata(docSnap.data());
            }
        });

        return () => {
            unsub();
            chatUnsub();
        };
    }, [chatId]);

    const isSlotApproved = chatMetadata?.slotStatus === 'approved' && chatMetadata?.approvedSlot;
    
    // Check if current time is within slot time
    const checkSlotActive = () => {
        if (!isSlotApproved) return false;
        try {
            const now = new Date();
            const slotDate = new Date(`${chatMetadata.approvedSlot.date}T${chatMetadata.approvedSlot.time}`);
            
            let endSlotDate = new Date(slotDate.getTime() + 60 * 60 * 1000); 
            if (chatMetadata.approvedSlot.endTime) {
                endSlotDate = new Date(`${chatMetadata.approvedSlot.date}T${chatMetadata.approvedSlot.endTime}`);
            }

            return now >= slotDate && now <= endSlotDate;
        } catch (e) {
            return false;
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setIsChatActive(checkSlotActive());
        }, 10000);
        setIsChatActive(checkSlotActive());
        return () => clearInterval(interval);
    }, [chatMetadata]);

    const canChat = true; // Counselor can always chat

    const handleApproveSlot = async () => {
        if (!chatMetadata?.requestedSlot) return;
        
        try {
            await addDoc(collection(db, 'studentNotifications'), {
                text: `Your chat slot for ${chatMetadata.requestedSlot.date} at ${chatMetadata.requestedSlot.time} has been approved.`,
                type: 'slot_approval',
                studentUid: student.id || chatMetadata?.studentId || 'unknown',
                studentEmail: chatMetadata?.studentEmail || student.email || 'unknown',
                read: false,
                createdAt: serverTimestamp()
            });
            
            await updateDoc(doc(db, 'counselorChats', chatId), {
                slotStatus: 'approved',
                approvedSlot: chatMetadata.requestedSlot,
                requestedSlot: null // clear requested
            });
            
            // Sync with global counselorSlots so Dashboard recognizes it
            if (chatMetadata?.requestedSlot?.slotId) {
                await updateDoc(doc(db, 'counselorSlots', chatMetadata.requestedSlot.slotId), {
                    status: 'confirmed'
                }).catch(() => {});
            }
        } catch (e) {
            console.error("Error approving slot:", e);
        }
    };

    const handleRejectSlot = async () => {
        try {
            await addDoc(collection(db, 'studentNotifications'), {
                text: `Your requested chat slot was rejected. Please select another slot.`,
                type: 'slot_rejection',
                studentUid: student.id || chatMetadata?.studentId || 'unknown',
                studentEmail: chatMetadata?.studentEmail || student.email || 'unknown',
                read: false,
                createdAt: serverTimestamp()
            });
            
            await updateDoc(doc(db, 'counselorChats', chatId), {
                slotStatus: 'pending',
                requestedSlot: null
            });
            
            // Free the slot in counselorSlots so it is available again
            if (chatMetadata?.requestedSlot?.slotId) {
                await updateDoc(doc(db, 'counselorSlots', chatMetadata.requestedSlot.slotId), {
                    status: 'available',
                    isBooked: false,
                    bookedBy: null,
                    bookedByEmail: null,
                    bookedByUid: null
                }).catch(() => {});
            }
        } catch (e) {
            console.error("Error rejecting slot:", e);
        }
    };

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
            lastMessageAt: serverTimestamp(),
            chatOpenedByCounselor: true // This will unlock the chat for the student
        }).catch(() => {}); // ignore if doc doesn't exist yet

        // Notify student via Firestore
        await addDoc(collection(db, 'studentNotifications'), {
            text: 'New message from your counselor',
            type: 'message',
            studentUid: student.id || student.uid || chatMetadata?.studentId || 'unknown_uid',
            studentEmail: chatMetadata?.studentEmail || student.email || 'unknown_email',
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

            {/* Slot Request Banner */}
            {chatMetadata?.slotStatus === 'requested' && chatMetadata?.requestedSlot && (
                <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-800">
                        <Clock size={18} />
                        <span className="text-sm">
                            Student requested a slot on <strong>{chatMetadata.requestedSlot.date}</strong> at <strong>{chatMetadata.requestedSlot.time}</strong>
                        </span>
                    </div>
                    <div className="flex space-x-2">
                        <button 
                            onClick={handleApproveSlot}
                            className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded flex items-center shadow-sm transition-colors text-sm font-medium px-3 flex-shrink-0"
                        >
                            <CheckCircle size={16} className="mr-1" /> Approve
                        </button>
                        <button 
                            onClick={handleRejectSlot}
                            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded flex items-center shadow-sm transition-colors text-sm font-medium px-3 flex-shrink-0"
                        >
                            <XCircle size={16} className="mr-1" /> Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-card/40">
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex flex-col ${message.sender === 'counselor' ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs text-gray-400 mb-1 ml-1 mr-1">
                                {message.sender === 'counselor' ? 'You' : message.sender === 'tutor' ? `Tutor (${message.senderName || 'Tutor'})` : (student.name || student.email)}
                            </span>
                            <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${message.sender === 'counselor'
                                ? 'bg-primary text-white rounded-br-sm'
                                : 'bg-card border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                                <p className="text-[14px] leading-relaxed">{message.text}</p>
                                <div className={`flex items-center mt-1 ${message.sender === 'counselor' ? 'justify-end text-blue-100' : 'justify-start text-gray-400'}`}>
                                    <span className="text-[10px] block mt-0.5">
                                        {formatTimestamp(message.createdAt)}
                                    </span>
                                    {message.sender === 'counselor' && (
                                        <CheckCheck size={14} className={`ml-1 mt-0.5 ${message.read ? 'text-[#34B7F1] drop-shadow-sm' : 'text-blue-200 opacity-80'}`} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="bg-card p-3 border-t border-gray-200/50 flex flex-col">
                <form onSubmit={handleSend} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        disabled={false}
                        className="flex-1 bg-background border border-gray-200 text-gray-800 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-[14px] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || !canChat}
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
