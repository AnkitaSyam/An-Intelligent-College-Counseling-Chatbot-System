import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, CalendarDays, Bot } from 'lucide-react';
import CounselorSidebar from '../components/CounselorSidebar';
import SlotCalendar from '../components/SlotCalendar';

const CounselorDashboard = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const user = localStorage.getItem('counselor_currentUser');
        if (!user) {
            navigate('/counselor-login');
        }
    }, [navigate]);

    const user = JSON.parse(localStorage.getItem('counselor_currentUser')) || {};

    const scrollToSlots = (e) => {
        e.preventDefault();
        document.getElementById('slot-management-section').scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="flex min-h-screen bg-background">
            <CounselorSidebar />

            <main className="flex-1 ml-64 p-8">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user.name || 'Counselor'}! 👋</h1>
                    <p className="text-gray-500 mt-2 text-lg">Manage your students and appointments.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Chat with Students */}
                    <Link to="/counselor-chat" className="block group">
                        <div className="bg-gradient-to-br from-secondary to-background rounded-2xl p-6 text-primary shadow-lg shadow-secondary/20 transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-secondary/40 border border-secondary/30 h-full flex flex-col">
                            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm text-primary">
                                <Users size={28} />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">Chat with Students</h2>
                            <p className="text-primary/80 mb-4 font-medium flex-1">View student requests and messages</p>
                            <div className="flex items-center text-sm font-bold bg-primary/10 inline-flex px-4 py-2 rounded-lg backdrop-blur-sm w-max">
                                View Chats <span className="ml-2">→</span>
                            </div>
                        </div>
                    </Link>

                    {/* Slot Management */}
                    <a href="#slot-management-section" onClick={scrollToSlots} className="block group cursor-pointer">
                        <div className="bg-gradient-to-br from-secondary to-background rounded-2xl p-6 text-primary shadow-lg shadow-secondary/20 transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-secondary/40 border border-secondary/30 h-full flex flex-col">
                            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm text-primary">
                                <CalendarDays size={28} />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">Slot Management</h2>
                            <p className="text-primary/80 mb-4 font-medium flex-1">Set your availability for students</p>
                            <div className="flex items-center text-sm font-bold bg-primary/10 inline-flex px-4 py-2 rounded-lg backdrop-blur-sm w-max">
                                Manage Slots <span className="ml-2">→</span>
                            </div>
                        </div>
                    </a>

                    {/* AI Chat Overview */}
                    <Link to="/ai-chat-summary" className="block group">
                        <div className="bg-gradient-to-br from-secondary to-background rounded-2xl p-6 text-primary shadow-lg shadow-secondary/20 transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-secondary/40 border border-secondary/30 h-full flex flex-col">
                            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm text-primary">
                                <Bot size={28} />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">AI Chat Summary</h2>
                            <p className="text-primary/80 mb-4 font-medium flex-1">Student AI conversations overview</p>
                            <div className="flex items-center text-sm font-bold bg-primary/10 inline-flex px-4 py-2 rounded-lg backdrop-blur-sm w-max">
                                View Summary <span className="ml-2">→</span>
                            </div>
                        </div>
                    </Link>
                </div>
                
                <div id="slot-management-section" className="mt-12 bg-card rounded-2xl p-6 shadow-md border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <CalendarDays className="mr-3 text-primary" size={24} />
                        Counselor Availability
                    </h3>
                    <SlotCalendar />
                </div>

            </main>
        </div>
    );
};

export default CounselorDashboard;
