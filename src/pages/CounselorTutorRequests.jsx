import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, Check, X, Clock, AlertCircle } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import CounselorSidebar from '../components/CounselorSidebar';

const CounselorTutorRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'

    useEffect(() => {
        const user = localStorage.getItem('counselor_currentUser');
        if (!user) {
            navigate('/counselor-login');
        }
    }, [navigate]);

    useEffect(() => {
        const q = query(
            collection(db, 'tutor_requests'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (requestId, newStatus) => {
        try {
            const requestRef = doc(db, 'tutor_requests', requestId);
            await updateDoc(requestRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating request status:", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesFilter = filter === 'all' || req.status === filter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            (req.tutorName && req.tutorName.toLowerCase().includes(searchLower)) ||
            (req.tutorEmail && req.tutorEmail.toLowerCase().includes(searchLower)) ||
            (req.studentName && req.studentName.toLowerCase().includes(searchLower)) ||
            (req.collegeId && req.collegeId.toLowerCase().includes(searchLower));
        
        return matchesFilter && matchesSearch;
    });

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'pending':
                return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center w-max"><Clock size={12} className="mr-1" /> Pending</span>;
            case 'approved':
                return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center w-max"><Check size={12} className="mr-1" /> Approved</span>;
            case 'rejected':
                return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center w-max"><X size={12} className="mr-1" /> Rejected</span>;
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-background">
            <CounselorSidebar />

            <main className="flex-1 ml-64 p-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                            <Shield className="mr-3 text-primary" size={32} />
                            Tutor Access Requests
                        </h1>
                        <p className="text-gray-500 mt-2">Manage tutor requests to view student chat histories.</p>
                    </div>
                </header>

                <div className="bg-card rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                    {/* Controls */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="flex space-x-2">
                            {['pending', 'approved', 'rejected', 'all'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                        filter === f 
                                            ? 'bg-primary text-white shadow-md' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {f}
                                    {f === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
                                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${filter === f ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                                            {requests.filter(r => r.status === 'pending').length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search tutor or student..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm bg-white"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">TutorInfo</th>
                                    <th className="px-6 py-4 font-medium">Student Requested</th>
                                    <th className="px-6 py-4 font-medium">Date Applied</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            Loading requests...
                                        </td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <AlertCircle size={32} className="text-gray-300 mb-3" />
                                                <p>No requests found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-800">{req.tutorName}</div>
                                                <div className="text-xs text-gray-500">{req.tutorEmail}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-800 flex items-center">
                                                    {req.studentName}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono mt-0.5">{req.collegeId}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600">
                                                    {req.timestamp ? new Date(req.timestamp.toDate()).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {req.status === 'pending' ? (
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, 'approved')}
                                                            className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors border border-green-200"
                                                            title="Approve access"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200"
                                                            title="Reject access"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-400">
                                                        {req.status === 'approved' ? (
                                                            <button 
                                                                onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                                                className="text-red-500 hover:text-red-700 hover:underline"
                                                            >
                                                                Revoke Access
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 cursor-not-allowed">Resolved</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CounselorTutorRequests;
