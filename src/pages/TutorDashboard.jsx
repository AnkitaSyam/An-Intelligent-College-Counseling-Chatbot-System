import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, CheckCircle, XCircle, MessageSquare, LogOut, ArrowRight } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';

const TutorDashboard = () => {
    const [collegeId, setCollegeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [requests, setRequests] = useState([]);
    
    const navigate = useNavigate();
    
    // Auth check
    useEffect(() => {
        const user = localStorage.getItem('tutor_currentUser');
        if (!user) {
            navigate('/tutor-login');
        }
    }, [navigate]);

    const user = JSON.parse(localStorage.getItem('tutor_currentUser')) || {};

    useEffect(() => {
        if (!user.uid) return;

        const q = query(
            collection(db, 'tutor_requests'),
            where('tutorId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqData);
        });

        return () => unsubscribe();
    }, [user.uid]);

    const handleRequestAccess = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        
        if (!collegeId.trim()) {
            setMessage({ type: 'error', text: 'Please enter a Student College ID.' });
            return;
        }

        setLoading(true);

        try {
            // Find student by college ID
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('collegeId', '==', collegeId.trim().toUpperCase()), where('role', '==', 'student'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Try case insensitive or exact as entered, just in case
                const q2 = query(usersRef, where('collegeId', '==', collegeId.trim()), where('role', '==', 'student'));
                const querySnapshot2 = await getDocs(q2);
                
                if (querySnapshot2.empty) {
                     setMessage({ type: 'error', text: 'No student found with that College ID.' });
                     setLoading(false);
                     return;
                } else {
                    await processRequest(querySnapshot2.docs[0]);
                }
            } else {
                await processRequest(querySnapshot.docs[0]);
            }

        } catch (error) {
            console.error("Error requesting access:", error);
            setMessage({ type: 'error', text: 'An error occurred while requesting access.' });
        } finally {
            setLoading(false);
        }
    };

    const processRequest = async (studentDoc) => {
        const studentData = studentDoc.data();
        const studentId = studentDoc.id;

        // Check if request already exists
        const existingReqs = requests.filter(r => r.studentId === studentId);
        if (existingReqs.length > 0) {
            const latest = existingReqs[0];
            if (latest.status === 'pending') {
                setMessage({ type: 'error', text: 'You already have a pending request for this student.' });
                return;
            } else if (latest.status === 'approved') {
                setMessage({ type: 'error', text: 'You already have approved access to this student.' });
                return;
            }
            // If rejected, allow re-requesting
        }

        // Create new request
        await addDoc(collection(db, 'tutor_requests'), {
            tutorId: user.uid,
            tutorName: user.name || 'Tutor',
            tutorEmail: user.email,
            studentId: studentId,
            studentName: studentData.name,
            collegeId: studentData.collegeId,
            status: 'pending',
            timestamp: serverTimestamp()
        });

        setMessage({ type: 'success', text: `Access request sent for ${studentData.name} (${studentData.collegeId}).` });
        setCollegeId('');
    };

    const handleLogout = () => {
        localStorage.removeItem('tutor_currentUser');
        navigate('/tutor-login');
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'pending': return <Clock className="text-yellow-500" size={20} />;
            case 'approved': return <CheckCircle className="text-green-500" size={20} />;
            case 'rejected': return <XCircle className="text-red-500" size={20} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-card border-b md:border-r border-gray-200 p-6 flex flex-col">
                <div className="flex items-center mb-10">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mr-3">
                        <span className="font-bold text-xl">T</span>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Tutor Portal
                    </span>
                </div>

                <nav className="flex-1 space-y-2">
                    <div className="flex items-center px-4 py-3 bg-primary/10 text-primary rounded-xl font-medium">
                        <MessageSquare className="mr-3" size={20} />
                        Dashboard
                    </div>
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-100">
                    <div className="mb-4 px-4">
                        <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                    >
                        <LogOut className="mr-3" size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Tutor Dashboard</h1>
                    <p className="text-gray-500 mt-2">Request access to student chats and view your approvals.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Request Access Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-2xl p-6 shadow-md border border-gray-100 sticky top-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <Search className="mr-2 text-primary" size={20} />
                                Request Student Access
                            </h2>
                            
                            <form onSubmit={handleRequestAccess} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Student College ID
                                    </label>
                                    <input
                                        type="text"
                                        value={collegeId}
                                        onChange={(e) => setCollegeId(e.target.value)}
                                        placeholder="Enter College ID"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-background"
                                    />
                                </div>
                                
                                {message.text && (
                                    <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-secondary text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-primary/30 flex items-center justify-center disabled:opacity-70"
                                >
                                    {loading ? 'Processing...' : 'Request Access'}
                                </button>
                            </form>
                            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm">
                                <p><strong>Note:</strong> All access requests must be approved by a Counselor. Once approved, you will have read-only access to the student's chat history.</p>
                            </div>
                        </div>
                    </div>

                    {/* Requests List */}
                    <div className="lg:col-span-2">
                        <div className="bg-card rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-xl font-bold text-gray-800">Your Access Requests</h2>
                            </div>
                            
                            <div className="p-0">
                                {requests.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MessageSquare className="text-gray-400" size={24} />
                                        </div>
                                        <p>You haven't requested access to any students yet.</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {requests.map((req) => (
                                            <li key={req.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg">{req.studentName}</h3>
                                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono mr-3">
                                                            {req.collegeId}
                                                        </span>
                                                        <span>
                                                            Requested on {req.timestamp ? new Date(req.timestamp.toDate()).toLocaleDateString() : 'Just now'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                                    <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                                                        req.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                        <StatusIcon status={req.status} />
                                                        <span className="ml-2 capitalize">{req.status}</span>
                                                    </div>
                                                    
                                                    {req.status === 'approved' && (
                                                        <button 
                                                            onClick={() => navigate(`/tutor-chat?studentId=${req.studentId}`)}
                                                            className="flex items-center justify-center px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                                                        >
                                                            View Chat <ArrowRight size={16} className="ml-1" />
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TutorDashboard;
