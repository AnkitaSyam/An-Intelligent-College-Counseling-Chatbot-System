import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, LogOut, HeartPulse } from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('counseling_currentUser');
        navigate('/');
    };

    const navItemClass = ({ isActive }) =>
        `flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 ${isActive
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
        }`;

    return (
        <div className="w-64 h-screen bg-white/80 backdrop-blur-md border-r border-gray-100 flex flex-col p-6 fixed left-0 top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="flex items-center space-x-3 mb-10 pl-2">
                <div className="bg-gradient-to-br from-blue-500 to-green-400 p-2 rounded-xl text-white">
                    <HeartPulse size={24} />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-green-600">
                    MindCare
                </span>
            </div>

            <nav className="flex-1 space-y-2">
                <NavLink to="/dashboard" className={navItemClass}>
                    <LayoutDashboard size={20} />
                    <span className="font-medium">Dashboard</span>
                </NavLink>
                <NavLink to="/profile" className={navItemClass}>
                    <User size={20} />
                    <span className="font-medium">Profile</span>
                </NavLink>
            </nav>

            <div className="mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full p-3 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
