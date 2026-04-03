import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

const formatTimestamp = (ts) => {
  if (!ts) return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (ts.toDate) return ts.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ChatAI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('counseling_currentUser');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    const q = query(
      collection(db, 'aiChats', user.uid, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const userStr = localStorage.getItem('counseling_currentUser');
    if (!input.trim() || !userStr || loading) return;
    const user = JSON.parse(userStr);

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    // Save user message to Firestore
    await addDoc(collection(db, 'aiChats', user.uid, 'messages'), {
      text: userMsg,
      sender: 'user',
      timestamp: serverTimestamp()
    });

    try {
      // Call Express backend with an AbortController to prevent infinite hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds max

      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'No text');
        throw new Error(`Server ${res.status}: ${errorText}`);
      }

      const result = await res.json();

      if (!result || !result.reply) {
         throw new Error('Invalid response format from server');
      }

      // Save bot reply to Firestore
      await addDoc(collection(db, 'aiChats', user.uid, 'messages'), {
        text: result.reply,
        sender: 'bot',
        timestamp: serverTimestamp()
      });

      // Write alert if negative sentiment detected (Fire and forget, do not await to prevent blocking UI)
      if (result.shouldAlert) {
        addDoc(collection(db, 'alerts'), {
          studentId: user.uid,
          studentName: user.name || user.email || 'Student',
          studentEmail: user.email || 'No Email',
          message: userMsg || '',
          emotion: result.emotion || 'unknown',
          severity: result.severity || 'unknown',
          timestamp: serverTimestamp(),
          read: false
        }).catch(e => console.error("Error logging alert:", e));

        // Send direct notification to Counselor Portal
        addDoc(collection(db, 'counselorNotifications'), {
          type: 'alert',
          text: `Urgent AI Alert: ${result.severity || 'unknown'} severity ${result.emotion || 'unknown'} detected from student ${user.name || user.email || 'Student'}.`,
          studentId: user.uid,
          read: false,
          createdAt: serverTimestamp()
        }).catch(e => console.error("Error logging notification:", e));
      }

    } catch (err) {
      console.error(err);
      await addDoc(collection(db, 'aiChats', user.uid, 'messages'), {
        text: `Error connecting to AI counselor: ${err.message}. Please restart backend or check api quota.`,
        sender: 'bot',
        timestamp: serverTimestamp()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center space-x-3">
        <Link to="/dashboard"><ArrowLeft size={20} /></Link>
        <Bot size={22} className="text-primary" />
        <span className="font-semibold text-lg">AI Counselor</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm flex flex-col ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
              <span>{msg.text}</span>
              <span className={`text-[10px] block mt-1 text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm text-sm text-gray-400 italic">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t px-4 py-3 flex space-x-2">
        <input
          className="flex-1 border rounded-xl px-4 py-2 text-sm outline-none"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-primary text-white p-2 rounded-xl disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatAI;