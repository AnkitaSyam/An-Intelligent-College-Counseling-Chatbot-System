import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bot, UserRound, PenLine, Headphones, Activity, Target, Sparkles, X, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ChevronDown } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import MoodChart from '../components/MoodChart';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Dashboard = () => {
    const navigate = useNavigate();
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTimeDisplay, setCurrentTimeDisplay] = useState('0:00');
    const [durationDisplay, setDurationDisplay] = useState('0:00');
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [todayJournal, setTodayJournal] = useState(null);
    const [isLoadingJournal, setIsLoadingJournal] = useState(true);
    const [chartLabels, setChartLabels] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const [chartData, setChartData] = useState([null, null, null, null, null, null, null]);
    const [averageMood, setAverageMood] = useState('-');
    const [stability, setStability] = useState('-');
    const [mainEmotion, setMainEmotion] = useState('-');

    const songs = [
        { title: "Listen & Find Calm", subtitle: "Guided Meditation", src: "/meditation1.mp3" },
        { title: "Deep Focus", subtitle: "Ambient Waves", src: "/meditation2.mp3" },
        { title: "Nature's Whisper", subtitle: "Forest Ambience", src: "/meditation3.mp3" },
        { title: "Peaceful Evening", subtitle: "Rain & Thunder", src: "/meditation4.mp3" },
        { title: "Morning Energy", subtitle: "Upbeat Lo-Fi", src: "/meditation5.mp3" },
        { title: "Mindful Breathing", subtitle: "Soft Piano", src: "/meditation6.mp3" }
    ];

    const currentSong = songs[currentSongIndex];

    useEffect(() => {
        const userStr = localStorage.getItem('counseling_currentUser');
        if (!userStr) {
            navigate('/');
        } else {
            const currentUser = JSON.parse(userStr);
            fetchTodayJournal(currentUser.uid);
            fetchMoodData(currentUser.uid);
        }
    }, [navigate]);

    const fetchTodayJournal = async (uid) => {
        try {
            const todayStr = new Date().toLocaleDateString('en-US');
            const q = query(collection(db, 'studentJournals'), where('studentId', '==', uid));
            const querySnapshot = await getDocs(q);
            let found = null;
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (new Date(data.date).toLocaleDateString('en-US') === todayStr) {
                    found = data.content;
                }
            });
            setTodayJournal(found);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingJournal(false);
        }
    };

    const fetchMoodData = async (uid) => {
        try {
            const q = query(collection(db, 'studentMoodLogs'), where('studentId', '==', uid));
            const snap = await getDocs(q);
            if (snap.empty) return; 

            let logs = snap.docs.map(d => d.data());
            
            const today = new Date();
            const last7DaysStrings = [];
            const labels = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                last7DaysStrings.push(d.toLocaleDateString('en-US'));
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
            
            const dailyScoresMap = {};
            last7DaysStrings.forEach(s => dailyScoresMap[s] = { total: 0, count: 0 });
            
            let allScores = [];
            let emotionCounts = {};

            logs.forEach(log => {
                if (dailyScoresMap[log.dateStr]) {
                    dailyScoresMap[log.dateStr].total += log.score;
                    dailyScoresMap[log.dateStr].count += 1;
                    allScores.push(log.score);
                    if (log.emotion) emotionCounts[log.emotion] = (emotionCounts[log.emotion] || 0) + 1;
                }
            });

            const dataPoints = last7DaysStrings.map(dateStr => {
                const dayData = dailyScoresMap[dateStr];
                return dayData.count > 0 ? (dayData.total / dayData.count) : null;
            });

            setChartLabels(labels);
            setChartData(dataPoints);

            if (allScores.length > 0) {
                const rawAvg = allScores.reduce((a,b) => a+b, 0) / allScores.length;
                const converted = ((rawAvg / 4) * 10).toFixed(1);
                setAverageMood(converted);

                const sqDiffs = allScores.map(v => Math.pow(v - rawAvg, 2));
                const variance = sqDiffs.reduce((a,b) => a+b, 0) / allScores.length;
                const stableScore = Math.max(0, 100 - (variance * 25));
                setStability(stableScore.toFixed(0));

                let maxE = 'Calm';
                let maxC = 0;
                for (let e in emotionCounts) {
                    if (emotionCounts[e] > maxC) {
                        maxC = emotionCounts[e]; maxE = e;
                    }
                }
                setMainEmotion(maxE.charAt(0).toUpperCase() + maxE.slice(1));
            }
        } catch (error) {
            console.error("Error fetching mood data:", error);
        }
    };

    useEffect(() => {
        setProgress(0);
        setCurrentTimeDisplay('0:00');
        setDurationDisplay('0:00');
        if (isPlaying && audioRef.current) {
            setTimeout(() => {
                const playPromise = audioRef.current?.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.log("Auto-play prevented", e));
                }
            }, 50);
        }
    }, [currentSongIndex]);

    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleNextSong = () => {
        if (isShuffle) {
            const randomIndex = Math.floor(Math.random() * songs.length);
            setCurrentSongIndex(randomIndex);
        } else {
            setCurrentSongIndex((prev) => (prev + 1) % songs.length);
        }
    };

    const handlePrevSong = () => {
        setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    };

    const user = JSON.parse(localStorage.getItem('counseling_currentUser')) || {};

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user.name || 'Student'}! 👋</h1>
                    <p className="text-gray-500 mt-2 text-lg">Here's your wellness overview for today.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link to="/chat-ai" className="block group">
                        <div className="bg-gradient-to-br from-secondary to-background rounded-2xl p-6 text-primary shadow-lg shadow-secondary/20 transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-secondary/40 border border-secondary/30 h-full flex flex-col justify-between">
                            <div>
                                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm text-primary">
                                    <Bot size={28} />
                                </div>
                                <h2 className="text-2xl font-bold mb-1">Chat with AI</h2>
                                <p className="text-primary/80 mb-4 font-medium">Start your conversation anytime</p>
                            </div>
                            <div className="flex items-center text-sm font-bold bg-primary/10 inline-flex px-4 py-2 rounded-lg backdrop-blur-sm w-max">
                                Open AI Chat <span className="ml-2">→</span>
                            </div>
                        </div>
                    </Link>

                    <Link to="/chat-counselor" className="block group">
                        <div className="bg-gradient-to-br from-secondary to-background rounded-2xl p-6 text-primary shadow-lg shadow-secondary/20 transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-secondary/40 border border-secondary/30 h-full flex flex-col justify-between">
                            <div>
                                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm text-primary">
                                    <UserRound size={28} />
                                </div>
                                <h2 className="text-2xl font-bold mb-1">Chat with Counselor</h2>
                                <p className="text-primary/80 mb-4 font-medium">Connect closely via secure messaging</p>
                            </div>
                            <div className="flex items-center text-sm font-bold bg-primary/10 inline-flex px-4 py-2 rounded-lg backdrop-blur-sm w-max">
                                Open Messaging <span className="ml-2">→</span>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-md border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Overall Mood Trend: Your Week in Review</h3>
                        <div className="h-64">
                            <MoodChart historicalLabels={chartLabels} historicalData={chartData} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-card p-5 rounded-2xl shadow-md border border-gray-100 flex items-center space-x-4">
                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Average Mood</p>
                                <p className="text-xl font-bold text-gray-800">{averageMood} / 10</p>
                            </div>
                        </div>

                        <div className="bg-card p-5 rounded-2xl shadow-md border border-gray-100 flex items-center space-x-4">
                            <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                                <Target size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Stability</p>
                                <p className="text-xl font-bold text-gray-800">{stability}%</p>
                            </div>
                        </div>

                        <div className="bg-card p-5 rounded-2xl shadow-md border border-gray-100 flex items-center space-x-4">
                            <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Main Emotion</p>
                                <p className="text-xl font-bold text-gray-800">{mainEmotion}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Wellness Tools</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Link to="/journal" className="block outline-none group">
                            <div className="bg-card p-6 rounded-2xl shadow-md border border-gray-100 group-hover:border-blue-200 transition-colors h-full flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                                            <PenLine size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Today's Journal Entry</h4>
                                            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-gray-50 p-4 rounded-xl group-hover:bg-blue-50/30 transition-colors flex items-center">
                                    {isLoadingJournal ? (
                                        <p className="text-gray-400 text-sm w-full text-center">Loading entry...</p>
                                    ) : todayJournal ? (
                                        <p className="text-gray-600 text-sm leading-relaxed italic line-clamp-3">
                                            "{todayJournal}"
                                        </p>
                                    ) : (
                                        <p className="text-gray-400 text-sm italic w-full text-center">
                                            No entry written today. Click here to reflect.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>

                        <div className="bg-card p-6 rounded-2xl shadow-md border border-gray-100 group hover:border-green-200 transition-colors">
                            <audio ref={audioRef} src={currentSong.src} loop={isLooping} onTimeUpdate={(e) => {
                                const { currentTime, duration } = e.target;
                                setProgress((currentTime / duration) * 100);
                                setCurrentTimeDisplay(`${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`);
                                setDurationDisplay(`${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`);
                            }} onEnded={handleNextSong} />
                            
                            <div className="flex justify-between items-start mb-6 relative">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                                        <Headphones size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{currentSong.title}</h4>
                                        <span className="text-xs text-gray-400">{currentSong.subtitle}</span>
                                    </div>
                                </div>
                                
                                <div className="relative">
                                    <div 
                                        className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md cursor-pointer flex items-center space-x-1 hover:bg-green-100 transition-colors"
                                        onClick={() => setShowPlaylist(!showPlaylist)}
                                    >
                                        <span>Track {currentSongIndex + 1}/{songs.length}</span>
                                        <ChevronDown size={14} className={`transform transition-transform ${showPlaylist ? 'rotate-180' : ''}`} />
                                    </div>

                                    {showPlaylist && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 shadow-xl rounded-xl p-2 z-10">
                                            {songs.map((song, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => {
                                                        setCurrentSongIndex(idx);
                                                        setShowPlaylist(false);
                                                        setIsPlaying(true);
                                                    }}
                                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${idx === currentSongIndex ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold truncate max-w-[150px]">{song.title}</span>
                                                        <span className="text-xs text-gray-400">{song.subtitle}</span>
                                                    </div>
                                                    {idx === currentSongIndex && <Headphones size={14} className="text-green-500" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-center space-x-6 mb-4">
                                <button onClick={() => setIsShuffle(!isShuffle)} className={`${isShuffle ? 'text-green-600' : 'text-gray-400'} hover:text-green-600 transition-colors`}>
                                    <Shuffle size={20} />
                                </button>
                                <button onClick={handlePrevSong} className="text-gray-400 hover:text-green-600 transition-colors">
                                    <SkipBack size={24} />
                                </button>
                                <button onClick={togglePlayPause} className="w-14 h-14 flex-shrink-0 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                                </button>
                                <button onClick={handleNextSong} className="text-gray-400 hover:text-green-600 transition-colors">
                                    <SkipForward size={24} />
                                </button>
                                <button onClick={() => setIsLooping(!isLooping)} className={`${isLooping ? 'text-green-600' : 'text-gray-400'} hover:text-green-600 transition-colors`}>
                                    <Repeat size={20} />
                                </button>
                            </div>

                            <div className="w-full">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative cursor-pointer" onClick={(e) => {
                                    const bounds = e.currentTarget.getBoundingClientRect();
                                    const percent = (e.clientX - bounds.left) / bounds.width;
                                    if (audioRef.current && audioRef.current.duration) {
                                        audioRef.current.currentTime = percent * audioRef.current.duration;
                                    }
                                }}>
                                    <div className="h-full bg-green-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                                    <span>{currentTimeDisplay}</span>
                                    <span>{durationDisplay}</span>
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
