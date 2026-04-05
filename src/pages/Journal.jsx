import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { PenLine, Calendar as CalendarIcon, Save, Clock, Loader2, Trash2 } from 'lucide-react';
import { analyzeMood } from '../utils/moodAnalyzer';

const Journal = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [entries, setEntries] = useState([]);
    const [todayEntry, setTodayEntry] = useState('');
    const [todayDocId, setTodayDocId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const todayDateStr = new Date().toLocaleDateString('en-US');

    useEffect(() => {
        const userStr = localStorage.getItem('counseling_currentUser');
        if (!userStr) {
            navigate('/');
            return;
        }
        const currentUser = JSON.parse(userStr);
        setUser(currentUser);

        fetchJournals(currentUser.uid);
    }, [navigate]);

    const fetchJournals = async (uid) => {
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'studentJournals'),
                where('studentId', '==', uid)
            );
            const querySnapshot = await getDocs(q);
            
            const fetchedEntries = [];
            let foundToday = false;

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const entryDateStr = new Date(data.date).toLocaleDateString('en-US');
                if (entryDateStr === todayDateStr) {
                    setTodayEntry(data.content);
                    setTodayDocId(docSnap.id);
                    foundToday = true;
                }
                
                fetchedEntries.push({
                    id: docSnap.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(data.date) 
                });
            });

            fetchedEntries.sort((a, b) => b.createdAt - a.createdAt);
            
            setEntries(fetchedEntries);
            if (!foundToday) {
                setTodayEntry('');
                setTodayDocId(null);
            }
        } catch (error) {
            console.error('Error fetching journals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!todayEntry.trim() || !user) return;
        setIsSaving(true);

        try {
            if (todayDocId) {
                const docRef = doc(db, 'studentJournals', todayDocId);
                await updateDoc(docRef, {
                    content: todayEntry,
                    updatedAt: serverTimestamp()
                });
            } else {
                const newDocRef = await addDoc(collection(db, 'studentJournals'), {
                    studentId: user.uid,
                    content: todayEntry,
                    date: new Date().toISOString(),
                    createdAt: serverTimestamp()
                });
                setTodayDocId(newDocRef.id);
            }
            
            // Extract sentiment and log it
            const mood = analyzeMood(todayEntry);
            await addDoc(collection(db, 'studentMoodLogs'), {
                studentId: user.uid,
                source: 'journal',
                text: todayEntry.length > 50 ? todayEntry.substring(0, 50) + '...' : todayEntry,
                score: mood.score,
                emotion: mood.emotion,
                dateStr: new Date().toLocaleDateString('en-US'),
                timestamp: serverTimestamp()
            });

            fetchJournals(user.uid);
            
        } catch (error) {
            console.error('Error saving journal:', error);
            alert('Failed to save journal entry.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this journal entry?")) return;
        try {
            await deleteDoc(doc(db, 'studentJournals', docId));
            setEntries(prev => prev.filter(entry => entry.id !== docId));
        } catch (error) {
            console.error('Error deleting journal:', error);
            alert('Failed to delete journal entry.');
        }
    };

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
                        <PenLine className="text-blue-600" size={32} />
                        <span>My Wellness Journal</span>
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">Reflection brings clarity. Write down your thoughts and feelings.</p>
                </header>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-blue-500" size={48} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Editor Section */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col h-full min-h-[400px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                        <CalendarIcon size={20} className="mr-2 text-blue-500" />
                                        Today's Entry
                                    </h2>
                                    <span className="text-sm font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                
                                <textarea
                                    value={todayEntry}
                                    onChange={(e) => setTodayEntry(e.target.value)}
                                    placeholder="How are you feeling today? What's on your mind? Did you learn anything new?..."
                                    className="flex-1 w-full bg-blue-50/30 border border-blue-100 rounded-xl p-4 text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none mb-4 shadow-inner min-h-[300px]"
                                />
                                
                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving || !todayEntry.trim()}
                                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-colors"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        <span>{isSaving ? "Saving..." : todayDocId ? "Update Entry" : "Save Entry"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* History Section */}
                        <div className="bg-card rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col max-h-[80vh] overflow-hidden">
                            <div className="flex items-center space-x-2 mb-6">
                                <Clock size={20} className="text-gray-500" />
                                <h2 className="text-xl font-semibold text-gray-800">Past Entries</h2>
                            </div>
                            
                            <div className="overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                                {entries.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8 italic">No entries yet. Start writing today!</p>
                                ) : (
                                    entries.filter(e => new Date(e.date).toLocaleDateString('en-US') !== todayDateStr).map((entry) => (
                                        <div key={entry.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-colors group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-gray-800">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
                                                <button 
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50"
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Journal;
