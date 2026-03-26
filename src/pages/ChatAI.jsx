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

function getBotReply(message, history = []) {
  const msg = message.toLowerCase();
  
  const positiveKeywords = ['okay', 'fine', 'good', 'happy', 'better', 'well', 'great', 'fantastic', 'awesome', 'nice', 'alright', 'cool', 'calm'];
  const negativeKeywords = ['sad', 'depressed', 'bad', 'anxious', 'awful', 'terrible', 'stressed', 'tired', 'lonely', 'upset', 'overwhelmed', 'not okay', 'horrible', 'crying', 'worried'];

  const isPositive = positiveKeywords.some(kw => msg.includes(kw));
  const isNegative = negativeKeywords.some(kw => msg.includes(kw));

  const recentUserMsgs = history.filter(m => m.sender === 'user').slice(-3);
  const wasNegative = recentUserMsgs.some(m => negativeKeywords.some(kw => m.text.toLowerCase().includes(kw)));
  
  const recentBotMsgs = history.filter(m => m.sender === 'bot').slice(-3);
  const lastBotMsg = recentBotMsgs.length > 0 ? recentBotMsgs[recentBotMsgs.length - 1].text : '';

  let reply = "";

  if (isPositive && wasNegative) {
    reply = "I'm so glad to hear you're feeling better now! What helped you improve your mood?";
  } else if (isPositive) {
    const options = [
      "That's great to hear! Tell me more about what's going well.",
      "I'm glad you're feeling positive today!",
      "Awesome! Keep that positive energy going."
    ];
    reply = options[Math.floor(Math.random() * options.length)];
  } else if (isNegative) {
    const options = [
      "I hear you, and it's completely okay to feel that way. Would you like to explore this more?",
      "I'm sorry you're feeling that way. Remember, I'm here to listen.",
      "That sounds really tough. Have you considered talking to one of our counselors to book a slot?"
    ];
    reply = options[Math.floor(Math.random() * options.length)];
  } else if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    reply = "Hello! How can I support you today?";
  } else if (msg.includes('slot') || msg.includes('book')) {
    reply = "You can book a slot with a counselor from the Slot Management section on your dashboard.";
  } else {
    const options = [
      "I'm here to support you. Could you share a bit more?",
      "I understand. What else is on your mind?",
      "Thanks for sharing. How does that make you feel overall?"
    ];
    reply = options[Math.floor(Math.random() * options.length)];
  }

  if (reply === lastBotMsg) {
    reply = "I see what you mean. We can explore that further whenever you're ready.";
  }

  return reply;
}

const ChatAI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

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
    const user = auth.currentUser;
    if (!input.trim() || !user) return;

    const userMsg = input.trim();
    setInput('');

    await addDoc(collection(db, 'aiChats', user.uid, 'messages'), {
      text: userMsg,
      sender: 'user',
      timestamp: serverTimestamp()
    });

    const botReply = getBotReply(userMsg, messages);
    await addDoc(collection(db, 'aiChats', user.uid, 'messages'), {
      text: botReply,
      sender: 'bot',
      timestamp: serverTimestamp()
    });

    // Save chat to localStorage for Counselor dashboard
    const localUser = JSON.parse(localStorage.getItem('counseling_currentUser'));
    if (localUser && localUser.email) {
      const allAiChats = JSON.parse(localStorage.getItem('counseling_all_ai_chats')) || {};
      if (!allAiChats[localUser.email]) {
        allAiChats[localUser.email] = {
          studentName: localUser.name || 'Student',
          studentEmail: localUser.email,
          messages: []
        };
      }
      allAiChats[localUser.email].messages.push(
        { text: userMsg, sender: 'user', timestamp: new Date().toISOString(), id: Date.now() + '-user' },
        { text: botReply, sender: 'bot', timestamp: new Date().toISOString(), id: Date.now() + '-bot' }
      );
      localStorage.setItem('counseling_all_ai_chats', JSON.stringify(allAiChats));
    }
  };


  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center space-x-3">
        <Link to="/student-dashboard"><ArrowLeft size={20} /></Link>
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
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t px-4 py-3 flex space-x-2">
        <input
          className="flex-1 border rounded-xl px-4 py-2 text-sm outline-none"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="bg-primary text-white p-2 rounded-xl">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatAI;