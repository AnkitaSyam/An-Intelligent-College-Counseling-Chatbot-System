import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bot, UserRound, PenLine, Headphones, Activity, Target, Sparkles } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import MoodChart from '../components/MoodChart';

const Dashboard = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const user = localStorage.getItem('counseling_currentUser');
        if (!user) {
            navigate('/');
        }
    }, [navigate]);

    const user = JSON.parse(localStorage.getItem('counseling_currentUser')) || {};

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user.name || 'Student'}! 👋</h1>
                    <p className="text-gray-500 mt-2 text-lg">Here's your wellness overview for today.</p>
                </header>

                {/* Top Cards: Chat Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link to="/chat-ai" className="block group">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-blue-500/40">
                            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                <Bot size={28} />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">Chat with AI</h2>
                            <p className="text-blue-100 mb-4 opacity-90">Start your conversation anytime</p>
                            <div className="flex items-center text-sm font-medium bg-white/20 inline-flex px-4 py-2 rounded-lg backdrop-blur-sm">
                                Open AI Chat <span className="ml-2">→</span>
                            </div>
                        </div>
                    </Link>

                    <Link to="/chat-counselor" className="block group">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/20 transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-green-500/40">
                            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                <UserRound size={28} />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">Chat with Counselor</h2>
                            <p className="text-green-100 mb-4 opacity-90">Connect with a professional</p>
                            <div className="flex items-center text-sm font-medium bg-white/20 inline-flex px-4 py-2 rounded-lg backdrop-blur-sm">
                                Book / Chat <span className="ml-2">→</span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Mood Analysis Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Overall Mood Trend: Your Week in Review</h3>
                        <div className="h-64">
                            <MoodChart />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Average Mood</p>
                                <p className="text-xl font-bold text-gray-800">7.4 / 10</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                                <Target size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Stability</p>
                                <p className="text-xl font-bold text-gray-800">85%</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Main Emotion</p>
                                <p className="text-xl font-bold text-gray-800">Calm</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wellness Tools */}
                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Wellness Tools</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Journal */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-blue-200 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                        <PenLine size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">Today's Journal Entry</h4>
                                        <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-blue-600 transition-colors">
                                    <PenLine size={18} />
                                </button>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed italic bg-gray-50 p-4 rounded-xl">
                                "Today was a productive day. I felt a bit stressed during the morning lecture, but deep breathing helped me regain focus. Looking forward to the weekend."
                            </p>
                        </div>

                        {/* Meditation */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-green-200 transition-colors">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                                        <Headphones size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">Listen & Find Calm</h4>
                                        <span className="text-xs text-gray-400">5 Min Guided Meditation</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl flex items-center space-x-4">
                                <button className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                                    <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <div className="flex-1">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-1/3 rounded-full"></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                                        <span>1:40</span>
                                        <span>5:00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
