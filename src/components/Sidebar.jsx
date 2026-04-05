import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, CalendarDays, Bell, Settings as SettingsIcon, PenLine } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';

const Sidebar = () => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const userStr = localStorage.getItem('counseling_currentUser');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        if (!user || !user.uid) return;

        // Fetch all and filter locally to bypass Firebase composite index errors
        const q = query(collection(db, 'studentNotifications'));
        const unsub = onSnapshot(q, (snapshot) => {
            let count = 0;
            snapshot.docs.forEach(doc => {
                const d = doc.data();
                if ((d.studentId === user.uid || d.userId === user.uid) && d.read === false) {
                    count++;
                }
            });
            setUnreadCount(count);
        });
        return () => unsub();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('counseling_currentUser');
        navigate('/');
    };

    const navItemClass = ({ isActive }) =>
        `flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 ${isActive
            ? 'bg-secondary text-primary shadow-md'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`;

    return (
        <div className="w-64 h-screen bg-primary border-r border-primary/20 flex flex-col p-6 fixed left-0 top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40">
            <div className="flex items-center space-x-3 mb-10 pl-2">
                <span className="text-xl font-bold text-white leading-tight">
                    Intelligent College<br/>Counseling System
                </span>
            </div>

            <nav className="flex-1 space-y-2">
                <NavLink to="/dashboard" className={navItemClass}>
                    <LayoutDashboard size={20} />
                    <span className="font-medium">Dashboard</span>
                </NavLink>
                <NavLink to="/journal" className={navItemClass}>
                    <PenLine size={20} />
                    <span className="font-medium">Journal</span>
                </NavLink>
                <NavLink to="/slot-management" className={navItemClass}>
                    <CalendarDays size={20} />
                    <span className="font-medium">Slot Management</span>
                </NavLink>
                <NavLink to="/notifications" className={navItemClass}>
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
                <NavLink to="/profile" className={navItemClass}>
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

export default Sidebar;
