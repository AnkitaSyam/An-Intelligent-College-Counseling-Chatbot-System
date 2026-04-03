import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, LogOut, Settings as SettingsIcon, Bell } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const TutorSidebar = () => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const userStr = localStorage.getItem('tutor_currentUser');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        if (!user || !user.uid) return;

        const q = query(
            collection(db, 'tutorNotifications'),
            where('tutorId', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            let count = 0;
            snapshot.docs.forEach((doc) => {
                if (doc.data().read === false) count++;
            });
            setUnreadCount(count);
        });
        return () => unsub();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('tutor_currentUser');
        navigate('/tutor-login');
    };

    const navItemClass = ({ isActive }) =>
        `flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 ${isActive
            ? 'bg-secondary text-primary shadow-md'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`;

    return (
        <div className="w-64 h-screen bg-primary border-r border-primary/20 flex flex-col p-6 fixed left-0 top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50">
            <div className="flex items-center space-x-3 mb-10 pl-2">
                <span className="text-xl font-bold text-white">Tutor Portal</span>
            </div>

            <nav className="flex-1 space-y-2">
                <NavLink to="/tutor-dashboard" className={navItemClass}>
                    <MessageSquare size={20} />
                    <span className="font-medium">Dashboard</span>
                </NavLink>

                <NavLink to="/tutor-notifications" className={navItemClass}>
                    <div className="relative">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </div>
                    <span className="font-medium">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="ml-auto bg-red-400 text-white py-0.5 px-2 rounded-full text-xs font-bold shadow-sm">
                            {unreadCount}
                        </span>
                    )}
                </NavLink>

                <NavLink to="/tutor-settings" className={navItemClass}>
                    <SettingsIcon size={20} />
                    <span className="font-medium">Settings</span>
                </NavLink>
            </nav>

            <div className="mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full p-3 text-red-300 hover:bg-red-500/10 hover:text-red-200 rounded-xl transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default TutorSidebar;
