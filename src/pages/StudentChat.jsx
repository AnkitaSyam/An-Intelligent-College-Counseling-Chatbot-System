import React, { useState, useEffect } from 'react';
import CounselorSidebar from '../components/CounselorSidebar';
import StudentCard from '../components/StudentCard';
import ChatInterface from '../components/ChatInterface';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

const StudentChat = () => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [students, setStudents] = useState([]);
    const [allChats, setAllChats] = useState({});
    const [loading, setLoading] = useState(true);

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
        return () => unsub();
    }, []);

    // Check if student has sent the last message (new message indicator)
    const checkHasNewMessage = (studentId) => {
        // We'll use a separate state per ChatInterface; this is a basic indicator
        return allChats[studentId]?.lastSenderRole === 'student';
    };

    return (
        <div className="flex min-h-screen bg-background">
            <CounselorSidebar />
            <main className="flex-1 ml-64 p-8 flex flex-col h-screen overflow-hidden">
                <header className="mb-6 flex-shrink-0">
                    <h1 className="text-3xl font-bold text-gray-800">Chat with Students</h1>
                    <p className="text-gray-500 mt-2">Select a student to view messages and details.</p>
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
        </div>
    );
};

export default StudentChat;
