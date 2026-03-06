import React, { useState, useRef, useEffect } from 'react';
import { Send, UserRound, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ChatCounselor = () => {
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello! I'm Dr. Smith, your assigned counselor. How can I support you today?", sender: 'counselor' }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMsg = { id: Date.now(), text: input, sender: 'student' };
        setMessages(prev => [...prev, newMsg]);
        setInput('');

        // Simulate Counselor response
        setTimeout(() => {
            const counselorResponses = [
                "Thank you for sharing that with me. It takes courage to open up.",
                "I understand. Let's explore that feeling a bit more. What do you think is the root cause?",
                "That's a very valid perspective. We can work on some strategies to manage this together.",
                "How has this been affecting your daily routine and sleep?",
            ];
            const randomResponse = counselorResponses[Math.floor(Math.random() * counselorResponses.length)];
            setMessages(prev => [...prev, { id: Date.now(), text: randomResponse, sender: 'counselor' }]);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-4">
                    <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div className="flex items-center space-x-3">
                        <div className="bg-green-100 text-green-600 p-2 rounded-full">
                            <UserRound size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-800">Dr. Smith</h1>
                            <p className="text-xs text-green-500 font-medium flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Available
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 overflow-y-auto max-w-4xl w-full mx-auto" style={{ height: 'calc(100vh - 140px)' }}>
                <div className="space-y-6">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex flex-col ${message.sender === 'student' ? 'items-end' : 'items-start'}`}
                        >
                            <span className="text-xs text-gray-400 mb-1 ml-1 mr-1">
                                {message.sender === 'student' ? 'You' : 'Counselor'}
                            </span>
                            <div
                                className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${message.sender === 'student'
                                        ? 'bg-green-600 text-white rounded-br-sm'
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}
                            >
                                <p className="text-[15px] leading-relaxed">{message.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="bg-white border-t border-gray-100 p-4 sticky bottom-0">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Message your counselor..."
                        className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-[15px]"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-500/20 flex-shrink-0"
                    >
                        <Send size={20} className="ml-1" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatCounselor;
