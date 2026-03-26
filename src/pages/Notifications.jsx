import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CounselorSidebar from '../components/CounselorSidebar';
import { Bell, MessageSquare, CalendarCheck, Info } from 'lucide-react';
import { db } from '../firebaseConfig';
import {
    collection, query, orderBy, onSnapshot,
    writeBatch, getDocs, doc
} from 'firebase/firestore';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // ── Real-time listener for counselor notifications ──
    useEffect(() => {
        const q = query(
            collection(db, 'counselorNotifications'),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotifications(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // ── Clear all notifications ──
    const clearNotifications = async () => {
        const snapshot = await getDocs(collection(db, 'counselorNotifications'));
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(doc(db, 'counselorNotifications', d.id)));
        await batch.commit();
    };

    const getIcon = (type) => {
        switch (type) {
            case 'message': return <MessageSquare size={20} className="text-blue-500" />;
            case 'slot': return <CalendarCheck size={20} className="text-green-500" />;
            case 'request': return <Info size={20} className="text-amber-500" />;
            default: return <Bell size={20} className="text-primary" />;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    };

    return (
        <div className="flex min-h-screen bg-background">
            <CounselorSidebar />
            <main className="flex-1 ml-64 p-8 max-w-5xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
                        <p className="text-gray-500 mt-2">Stay updated on student requests and messages.</p>
                    </div>
                    {notifications.length > 0 && (
                        <button
                            onClick={clearNotifications}
                            className="bg-card hover:bg-white text-gray-600 px-4 py-2 border border-gray-200 rounded-lg shadow-sm transition-colors text-sm font-medium"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center p-8 text-gray-400">Loading notifications...</div>
                ) : (
                    <div className="space-y-4">
                        {notifications.length === 0 ? (
                            <div className="bg-card rounded-2xl p-8 border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="bg-primary/5 p-4 rounded-full mb-4">
                                    <Bell size={32} className="text-gray-400" />
                                </div>
                                <h3 className="font-bold text-gray-800 text-lg mb-1">All caught up!</h3>
                                <p className="text-gray-500">You don't have any new notifications.</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const isMessage = notif.type === 'message';
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => isMessage ? navigate('/counselor-chat') : null}
                                        className={`bg-card rounded-2xl p-5 border shadow-sm flex items-start space-x-4 transition-all ${isMessage ? 'cursor-pointer hover:border-blue-400 hover:shadow-md border-blue-100' : 'border-gray-100 hover:border-secondary'}`}
                                    >
                                        <div className="bg-white p-3 rounded-full shadow-sm">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800 text-lg">{notif.text}</p>
                                            <p className="text-sm text-gray-400 mt-1">{formatTime(notif.createdAt)}</p>
                                        </div>
                                        {isMessage && (
                                            <div className="text-blue-500 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg self-center border border-blue-100">
                                                Open Chat →
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;
