import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { User, Mail, Hash } from 'lucide-react';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({});

    useEffect(() => {
        const currentUser = localStorage.getItem('counseling_currentUser');
        if (!currentUser) {
            navigate('/');
        } else {
            setUser(JSON.parse(currentUser));
        }
    }, [navigate]);

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>
                    <p className="text-gray-500 mt-2 text-lg">Manage your personal information.</p>
                </header>

                <div className="max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-inner">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{user.name || 'Student Name'}</h2>
                            <p className="text-gray-500">Student</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gray-50 rounded-xl text-gray-400">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Username</p>
                                <p className="text-lg text-gray-800 font-medium">{user.username}</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gray-50 rounded-xl text-gray-400">
                                <Mail size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Email Address</p>
                                <p className="text-lg text-gray-800 font-medium">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gray-50 rounded-xl text-gray-400">
                                <Hash size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">College ID</p>
                                <p className="text-lg text-gray-800 font-medium">{user.collegeId}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
