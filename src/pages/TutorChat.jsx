import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Info, AlertTriangle, MessageSquare } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';

const formatTimestamp = (ts) => {
    if (!ts) return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (ts.toDate) return ts.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const TutorChat = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const studentId = searchParams.get('studentId');
    
    const [messages, setMessages] = useState([]);
    const [studentData, setStudentData] = useState(null);
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cutoffTime, setCutoffTime] = useState(null);
    
    const messagesEndRef = useRef(null);

    // Check Auth & Access
    useEffect(() => {
        const user = localStorage.getItem('tutor_currentUser');
        if (!user) {
            navigate('/tutor-login');
            return;
        }

        if (!studentId) {
            setError('No student specified. Please select a student from your dashboard.');
            setLoading(false);
            return;
        }

        const parsedUser = JSON.parse(user);
        checkAccess(parsedUser.uid, studentId);
    }, [navigate, studentId]);

    const checkAccess = async (tutorUid, studentUid) => {
        try {
            // Verify APPROVED request exists (Avoid multi-field composite index errors)
            const q = query(
                collection(db, 'tutor_requests'),
                where('tutorId', '==', tutorUid)
            );
            
            const querySnapshot = await getDocs(q);
            
            const approvedReqs = querySnapshot.docs.filter(d => 
                d.data().studentId === studentUid && d.data().status === 'approved'
            );
            
            if (approvedReqs.length === 0) {
                setError('You do not have approved access to view this student\'s records.');
                setHasAccess(false);
            } else {
                setHasAccess(true);
                
                // If there are multiple requests, we find the one MOST RECENTLY approved
                approvedReqs.sort((a, b) => {
                    const timeA = a.data().updatedAt?.toMillis ? a.data().updatedAt.toMillis() : 0;
                    const timeB = b.data().updatedAt?.toMillis ? b.data().updatedAt.toMillis() : 0;
                    return timeB - timeA; // Descending
                });
                
                const latestApprovedReq = approvedReqs[0];
                // Limit scope to the time the request was MADE, not approved
                setCutoffTime(latestApprovedReq.data().timestamp || latestApprovedReq.data().updatedAt);
                
                // Load student details
                const studentDoc = await getDoc(doc(db, 'users', studentUid));
                if (studentDoc.exists()) {
                    setStudentData({ id: studentDoc.id, ...studentDoc.data() });
                }
            }
        } catch (err) {
            console.error("Error checking access permissions:", err);
            setError(`Failed to verify access permissions. ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Load messages if access granted
    useEffect(() => {
        if (!hasAccess || !studentId) return;

        // Listening to counselorChats which the student had with the counselor
        const q = query(
            collection(db, 'counselorChats', studentId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Filter messages to only show history from before the request was made
            if (cutoffTime) {
                const cutoff = cutoffTime.toMillis ? cutoffTime.toMillis() : Date.now();
                msgs = msgs.filter(m => {
                    const msgTime = m.createdAt?.toMillis ? m.createdAt.toMillis() : Date.now();
                    return msgTime <= cutoff;
                });
            }
            
            setMessages(msgs);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsubscribe();
    }, [hasAccess, studentId, cutoffTime]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">Verifying secure access...</p>
            </div>
        );
    }

    if (error || !hasAccess) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/tutor-dashboard')}
                        className="bg-primary text-white px-6 py-3 rounded-xl shadow-md hover:bg-secondary hover:text-primary transition-colors font-medium w-full flex items-center justify-center"
                    >
                        <ArrowLeft size={18} className="mr-2" />
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Navigation */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center">
                    <button 
                        onClick={() => navigate('/tutor-dashboard')}
                        className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center">
                            {studentData ? studentData.name : 'Student History'}
                            <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded flex items-center">
                                <Lock size={10} className="mr-1" /> SECURE
                            </span>
                        </h1>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {studentData ? studentData.collegeId : 'Loading...'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-3 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Info size={16} className="text-primary" />
                    <span>Read-only mode active</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-73px)]">
                
                <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-4 mb-6 text-sm flex items-start shadow-sm">
                    <Lock className="shrink-0 mr-3 mt-0.5 text-blue-500" size={18} />
                    <div>
                        <p className="font-semibold mb-1">Historical Record</p>
                        <p>You have been granted restricted, read-only access to this student's history up until the moment your request was made. Interaction is disabled to comply with privacy protocols.</p>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 p-4 text-center">
                        <h2 className="text-sm font-semibold text-gray-700 flex items-center justify-center">
                            <MessageSquare size={16} className="mr-2 text-primary" />
                            Counselor Conversations
                        </h2>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <MessageSquare size={40} className="mb-3 opacity-20" />
                                <p>No conversation history found for this student.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {messages.map((message) => {
                                    const isStudent = message.sender === 'student';
                                    const isSystem = message.sender === 'system';
                                    const isTutor = message.sender === 'tutor';
                                    
                                    return (
                                        <div key={message.id} className={`flex flex-col ${isSystem ? 'items-center' : isStudent ? 'items-start' : 'items-end'}`}>
                                            {!isSystem && (
                                                <span className="text-xs text-gray-400 mb-1 ml-2 mr-2 font-medium">
                                                    {isStudent ? (studentData?.name || 'Student') : isTutor ? 'You (Tutor)' : 'Counselor'}
                                                </span>
                                            )}
                                            <div className={`rounded-2xl p-4 shadow-sm ${
                                                isSystem ? 'bg-gray-100 text-gray-500 text-xs px-4 py-2 rounded-full max-w-[90%] text-center' :
                                                isStudent 
                                                    ? 'max-w-[80%] bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                                                    : 'max-w-[80%] bg-primary/10 border border-primary/20 text-gray-800 rounded-br-sm'
                                                }`}>
                                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
                                                {!isSystem && (
                                                    <span className={`text-[10px] block mt-2 ${isStudent ? 'text-gray-400 text-left' : 'text-gray-500 text-right'}`}>
                                                        {formatTimestamp(message.createdAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                    
                    {/* Read-only notification banner */}
                    <div className="bg-gray-100 p-4 text-center border-t border-gray-200">
                        <p className="text-xs text-gray-500 flex items-center justify-center font-medium">
                            <Lock size={12} className="mr-1.5" />
                            Messaging is disabled in historical mode
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TutorChat;
