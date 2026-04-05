import React, { useState, useEffect } from 'react';
import CounselorSidebar from '../components/CounselorSidebar';
import StudentCard from '../components/StudentCard';
import ChatInterface from '../components/ChatInterface';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Plus, Trash2, X } from 'lucide-react';

const StudentChat = () => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [students, setStudents] = useState([]);
    const [allChats, setAllChats] = useState({});
    const [loading, setLoading] = useState(true);
    const [showSlotsManager, setShowSlotsManager] = useState(false);
    const [slots, setSlots] = useState([]);
    const [newSlotDate, setNewSlotDate] = useState('');
    const [newSlotTime, setNewSlotTime] = useState('');

    // ── Load real students from Firestore (users with role 'student') ──
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            const studentList = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(u => u.role === 'student');
            setStudents(studentList);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // ── Load all chat rooms to show new message indicators ──
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'counselorChats'), (snapshot) => {
            const chatsData = {};
            snapshot.docs.forEach(d => {
                chatsData[d.id] = d.data();
            });
            setAllChats(chatsData);
        });
        
        // ── Load available slots ──
        const slotsUnsub = onSnapshot(collection(db, 'counselorSlots'), (snapshot) => {
            const slotsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // sort by date and time
            slotsData.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
            setSlots(slotsData);
        });
        
        return () => {
            unsub();
            slotsUnsub();
        };
    }, []);

    const handleAddSlot = async (e) => {
        e.preventDefault();
        if (!newSlotDate || !newSlotTime) return;
        await addDoc(collection(db, 'counselorSlots'), {
            date: newSlotDate,
            time: newSlotTime,
            createdAt: serverTimestamp()
        });
        setNewSlotDate('');
        setNewSlotTime('');
    };

    const handleDeleteSlot = async (slotId) => {
        await deleteDoc(doc(db, 'counselorSlots', slotId));
    };

    // Check if student has sent the last message (new message indicator)
    const checkHasNewMessage = (studentId) => {
        const chatEntry = allChats[studentId];
        if (!chatEntry) return false;
        
        // Use exact read-receipt driven flag if available, fallback otherwise to legacy behavior
        if (chatEntry.hasUnreadMessagesFromStudent !== undefined) {
            return chatEntry.hasUnreadMessagesFromStudent;
        }
        
        return chatEntry.lastSenderRole === 'student';
    };

    return (
        <div className="flex min-h-screen bg-background">
            <CounselorSidebar />
            <main className="flex-1 ml-64 p-8 flex flex-col h-screen overflow-hidden">
                <header className="mb-6 flex-shrink-0 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Chat with Students</h1>
                        <p className="text-gray-500 mt-2">Select a student to view messages and details.</p>
                    </div>
                    <button 
                        onClick={() => setShowSlotsManager(true)}
                        className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary hover:text-primary transition-colors shadow-sm"
                    >
                        <Calendar size={18} />
                        <span>Manage Slots</span>
                    </button>
                </header>

                <div className="flex-1 flex gap-6 overflow-hidden pb-8">
                    {/* Left: Student List */}
                    <div className="w-1/3 bg-card rounded-2xl p-4 shadow-md border border-gray-100 flex flex-col h-full overflow-hidden">
                        <h2 className="font-bold text-lg text-gray-800 mb-4 px-2">Active Conversations</h2>
                        {loading ? (
                            <div className="text-center text-gray-400 p-4">Loading students...</div>
                        ) : students.length === 0 ? (
                            <div className="text-center text-gray-400 p-4">No students registered yet.</div>
                        ) : (
                            <div className="overflow-y-auto flex-1 px-2 space-y-1">
                                {students.map(student => (
                                    <StudentCard
                                        key={student.id}
                                        student={student}
                                        isActive={selectedStudent?.id === student.id}
                                        hasNewMessage={checkHasNewMessage(student.id)}
                                        onClick={() => setSelectedStudent(student)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Chat Interface */}
                    <div className="flex-1 h-full">
                        {selectedStudent ? (
                            <ChatInterface student={selectedStudent} />
                        ) : (
                            <div className="bg-card rounded-2xl p-6 shadow-md border border-gray-100 h-full flex flex-col items-center justify-center text-center">
                                <div className="bg-primary/10 p-4 rounded-full text-primary mb-4">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18H3" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">No Student Selected</h3>
                                <p className="text-gray-500 max-w-sm">
                                    Select a student from the list on the left to view their details and start chatting.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Slot Manager Modal */}
            {showSlotsManager && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                <Calendar size={24} className="text-primary" />
                                Manage Slots
                            </h3>
                            <button onClick={() => setShowSlotsManager(false)} className="text-gray-400 hover:text-gray-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddSlot} className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h4 className="font-semibold text-sm text-gray-700 mb-3">Add New Slot</h4>
                            <div className="flex gap-3 mb-3">
                                <input 
                                    type="date" 
                                    value={newSlotDate}
                                    onChange={e => setNewSlotDate(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                                    required
                                />
                                <input 
                                    type="time" 
                                    value={newSlotTime}
                                    onChange={e => setNewSlotTime(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-secondary hover:text-primary transition-colors flex items-center justify-center gap-2">
                                <Plus size={16} /> Add Slot
                            </button>
                        </form>

                        <h4 className="font-semibold text-sm text-gray-700 mb-3">Current Slots</h4>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                            {slots.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No slots available</p>
                            ) : (
                                slots.map(slot => (
                                    <div key={slot.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-medium text-gray-800">{slot.date}</p>
                                            <p className="text-xs text-gray-500">{slot.time}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteSlot(slot.id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors"
                                            title="Delete Slot"
                                        >
                                            <Trash2 size={16} />
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

export default StudentChat;
