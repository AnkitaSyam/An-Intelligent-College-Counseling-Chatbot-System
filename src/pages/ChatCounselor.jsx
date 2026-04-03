import React, { useState, useRef, useEffect } from 'react';
import { Send, UserRound, ArrowLeft, Calendar, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import {
    collection, addDoc, query, orderBy, updateDoc,
    onSnapshot, serverTimestamp, doc, setDoc, getDoc
} from 'firebase/firestore';

const formatTimestamp = (ts) => {
    if (!ts) return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (ts.toDate) return ts.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const initializingChats = new Set();

const ChatCounselor = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatMetadata, setChatMetadata] = useState(null);
    const [slots, setSlots] = useState([]);
    const [showSlotsModal, setShowSlotsModal] = useState(false);
    const [slotTimeStatus, setSlotTimeStatus] = useState('none');
    const messagesEndRef = useRef(null);

    const userStr = localStorage.getItem('counseling_currentUser');
    const user = userStr ? JSON.parse(userStr) : null;
    const chatId = user?.uid || 'unknown';

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!user) return;

        const ensureChatRoom = async () => {
            if (initializingChats.has(chatId)) return;
            initializingChats.add(chatId);

            const chatRef = doc(db, 'counselorChats', chatId);
            const snap = await getDoc(chatRef);
            if (!snap.exists()) {
                await setDoc(chatRef, {
                    studentId: user.uid,
                    studentEmail: user.email,
                    createdAt: serverTimestamp()
                });
                await addDoc(collection(db, 'counselorChats', chatId, 'messages'), {
                    text: "Hello! I'm your assigned counselor. How can I support you today?",
                    sender: 'counselor',
                    createdAt: serverTimestamp()
                });
            }
        };

        ensureChatRoom();

        const q = query(
            collection(db, 'counselorChats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            msgs.sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now() + 100000;
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now() + 100000;
                return tA - tB;
            });
            setMessages(msgs);
            setLoading(false);
        });

        const chatUnsub = onSnapshot(doc(db, 'counselorChats', chatId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("chatMetadata updated:", data);
                setChatMetadata(data);
            }
        });

        const slotsUnsub = onSnapshot(collection(db, 'counselorSlots'), (snapshot) => {
            setSlots(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsub(); chatUnsub(); slotsUnsub(); };
    }, [chatId]);

    const slotStatus = chatMetadata?.slotStatus;

    let isSlotApproved = false;
    let approvedSlotDetails = null;

    if (slotStatus === 'approved' && chatMetadata?.approvedSlot) {
        isSlotApproved = true;
        approvedSlotDetails = chatMetadata.approvedSlot;
    } else {
        // Fallback: Check if they have a confirmed slot natively in counselorSlots
        // This instantly repairs any desynced database state for the student
        const activeSlot = slots.find(s => s.bookedByUid === chatId && s.status === 'confirmed');
        if (activeSlot) {
            isSlotApproved = true;
            approvedSlotDetails = {
                date: activeSlot.date,
                time: activeSlot.startTime || activeSlot.time,
                slotId: activeSlot.id
            };
        }
    }

    const endSlotDateMillis = React.useMemo(() => {
        if (!approvedSlotDetails) return null;
        try {
            const slotDate = new Date(`${approvedSlotDetails.date}T${approvedSlotDetails.time}`);
            let endSlotDate = new Date(slotDate.getTime() + 60 * 60 * 1000);
            if (approvedSlotDetails.endTime) {
                endSlotDate = new Date(`${approvedSlotDetails.date}T${approvedSlotDetails.endTime}`);
            } else if (approvedSlotDetails.slotId) {
                const matchedSlot = slots.find(s => s.id === approvedSlotDetails.slotId);
                if (matchedSlot && matchedSlot.endTime) {
                    endSlotDate = new Date(`${approvedSlotDetails.date}T${matchedSlot.endTime}`);
                }
            }
            return endSlotDate.getTime();
        } catch (e) {
            return null;
        }
    }, [approvedSlotDetails, slots]);

    useEffect(() => {
        const checkStatus = () => {
            if (!approvedSlotDetails) return 'none';
            try {
                const nowMillis = Date.now();
                const slotDate = new Date(`${approvedSlotDetails.date}T${approvedSlotDetails.time}`).getTime();

                if (nowMillis < slotDate) return 'upcoming';
                if (endSlotDateMillis && nowMillis > endSlotDateMillis) return 'expired';
                return 'active';
            } catch (e) {
                return 'none';
            }
        };

        const interval = setInterval(() => {
            setSlotTimeStatus(checkStatus());
        }, 10000);
        setSlotTimeStatus(checkStatus());
        return () => clearInterval(interval);
    }, [approvedSlotDetails, endSlotDateMillis]);

    const sentFinalMessage = endSlotDateMillis ? messages.some(m => {
        if (m.sender !== 'student') return false;
        const msgTime = m.createdAt?.toMillis ? m.createdAt.toMillis() : Date.now();
        return msgTime > endSlotDateMillis;
    }) : false;

    const canChat = isSlotApproved && slotTimeStatus === 'active';
    const hasSentFreeMessage = messages.some(m => m.sender === 'student');
    const canSendFinalMessage = isSlotApproved && slotTimeStatus === 'expired' && !sentFinalMessage;
    const isInputEnabled = canChat || !hasSentFreeMessage || canSendFinalMessage;

    const handleSelectSlot = async (slot) => {
        await updateDoc(doc(db, 'counselorChats', chatId), {
            requestedSlot: slot,
            slotStatus: 'requested'
        });
        await addDoc(collection(db, 'counselorNotifications'), {
            text: `Student (${user.email}) requested a slot on ${slot.date} at ${slot.time}`,
            type: 'slot_request',
            chatId,
            studentEmail: user.email,
            read: false,
            createdAt: serverTimestamp()
        });
        setShowSlotsModal(false);

        await addDoc(collection(db, 'counselorChats', chatId, 'messages'), {
            text: `You requested a slot on ${slot.date} at ${slot.time}. Please wait for counselor approval.`,
            sender: 'system',
            createdAt: serverTimestamp()
        });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !user) return;

        // Debug logs
        console.log("chatMetadata:", chatMetadata);
        console.log("slotStatus:", slotStatus);
        console.log("isSlotApproved:", isSlotApproved);
        console.log("canChat:", canChat);

        const text = input.trim();
        setInput('');

        if (!isInputEnabled) {
            return;
        }

        await addDoc(collection(db, 'counselorChats', chatId, 'messages'), {
            text,
            sender: 'student',
            senderEmail: user.email,
            createdAt: serverTimestamp()
        });

        if (!canChat && !hasSentFreeMessage) {
            await addDoc(collection(db, 'counselorChats', chatId, 'messages'), {
                text: "Please check Slot Management for any available slots, or wait for the counselor to add one. Come back after booking a slot!",
                sender: 'system',
                createdAt: serverTimestamp()
            });
        }

        await updateDoc(doc(db, 'counselorChats', chatId), {
            lastSenderRole: 'student',
            lastMessage: text,
            lastMessageAt: serverTimestamp()
        }).catch(() => { });

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
                            {isSlotApproved && approvedSlotDetails && (
                                <p className="text-xs text-green-500">
                                    Slot approved: {approvedSlotDetails.date} at {approvedSlotDetails.time}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowSlotsModal(true)}
                    className="flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full hover:bg-primary/20 transition-colors"
                >
                    <Calendar size={18} />
                    <span className="font-medium text-sm">Select Slot</span>
                </button>
            </header>

            {slotStatus === 'requested' && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
                    Slot requested — waiting for counselor approval.
                </div>
            )}
            {isSlotApproved && approvedSlotDetails && slotTimeStatus === 'upcoming' && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800 text-center">
                    Slot approved for {approvedSlotDetails.date} at {approvedSlotDetails.time}. Chat will unlock when your slot begins.
                </div>
            )}
            {isSlotApproved && approvedSlotDetails && slotTimeStatus === 'expired' && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-800 text-center">
                    {canSendFinalMessage ? "Your slot has ended. You may send one final wrap-up message." : `Your slot from ${approvedSlotDetails.date} at ${approvedSlotDetails.time} has ended. Please request a new slot.`}
                </div>
            )}
            {isSlotApproved && approvedSlotDetails && slotTimeStatus === 'active' && (
                <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-800 text-center">
                    ✓ Slot is active ({approvedSlotDetails.time}). You can now chat freely.
                </div>
            )}

            <main className="flex-1 p-4 overflow-y-auto max-w-4xl w-full mx-auto" style={{ height: 'calc(100vh - 140px)' }}>
                {loading ? (
                    <div className="flex justify-center items-center h-full text-gray-400">Loading messages...</div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex flex-col ${message.sender === 'system'
                                ? 'items-center'
                                : message.sender === 'student'
                                    ? 'items-end'
                                    : 'items-start'
                                }`}>
                                {message.sender !== 'system' && (
                                    <span className="text-xs text-gray-400 mb-1 ml-1 mr-1">
                                        {message.sender === 'student' ? 'You' : message.sender === 'tutor' ? `Tutor (${message.senderName || 'Tutor'})` : 'Counselor'}
                                    </span>
                                )}
                                <div className={`rounded-2xl p-4 shadow-sm ${message.sender === 'system'
                                    ? 'bg-gray-100 text-gray-500 text-xs px-4 py-2 rounded-full max-w-[90%] text-center'
                                    : message.sender === 'student'
                                        ? 'max-w-[75%] bg-primary text-white rounded-br-sm'
                                        : 'max-w-[75%] bg-card border border-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}>
                                    <p className="text-[15px] leading-relaxed">{message.text}</p>
                                    {message.sender !== 'system' && (
                                        <span className={`text-[10px] block mt-1 ${message.sender === 'student' ? 'text-blue-100 text-right' : 'text-gray-400 text-left'}`}>
                                            {formatTimestamp(message.createdAt)}
                                        </span>
                                    )}
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
                        placeholder={canChat ? "Message your counselor..." : (!hasSentFreeMessage ? "Send your first message..." : (slotTimeStatus === 'upcoming' ? "Waiting for slot to begin..." : (canSendFinalMessage ? "Send one final wrap-up message..." : (slotTimeStatus === 'expired' ? "Slot expired. Book a new slot" : "Book a slot to start chatting..."))))}
                        disabled={!isInputEnabled}
                        className="flex-1 bg-background border border-gray-200 text-gray-800 px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-[15px] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || !isInputEnabled}
                        className="bg-primary text-white p-3 rounded-full hover:bg-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20 flex-shrink-0"
                    >
                        <Send size={20} className="ml-1" />
                    </button>
                </form>
                {!isInputEnabled && slotTimeStatus !== 'upcoming' && (
                    <p className="text-center text-xs text-gray-400 mt-2">
                        Click Select Slot above to book an appointment with your counselor.
                    </p>
                )}
            </footer>

            {showSlotsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800">Available Slots</h3>
                            <button onClick={() => setShowSlotsModal(false)} className="text-gray-400 hover:text-gray-800">
                                <X size={20} />
                            </button>
                        </div>

                        {chatMetadata?.slotStatus === 'requested' && (
                            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-100 mb-4">
                                Slot requested on <strong>{chatMetadata.requestedSlot?.date}</strong> at <strong>{chatMetadata.requestedSlot?.time}</strong>. Waiting for approval.
                            </div>
                        )}
                        {isSlotApproved && approvedSlotDetails && (
                            <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm border border-green-100 mb-4">
                                Approved slot: <strong>{approvedSlotDetails.date}</strong> at <strong>{approvedSlotDetails.time}</strong>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {slots.filter(s => !s.isBooked).length === 0 ? (
                                <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    No slots available. Check back later.
                                </div>
                            ) : (
                                slots.filter(s => !s.isBooked).map(slot => (
                                    <div key={slot.id} className="flex items-center justify-between p-4 bg-background border border-gray-100 rounded-xl hover:border-primary/30 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{slot.date}</p>
                                                <p className="text-sm text-gray-500">{slot.time || slot.startTime}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSelectSlot(slot)}
                                            className="text-primary font-medium text-sm bg-primary/10 px-4 py-2 rounded-full hover:bg-primary hover:text-white transition-colors"
                                        >
                                            Request
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatCounselor;