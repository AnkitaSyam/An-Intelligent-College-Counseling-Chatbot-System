import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import CounselorSidebar from '../components/CounselorSidebar';

const AIChatSummary = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load all students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const studentList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === 'student');
      setStudents(studentList);
    };
    fetchStudents();
  }, []);

  // Load chat sessions for selected student
  const loadChat = async (student) => {
    setSelectedStudent(student);
    setSelectedSession(null);
    setLoading(true);
    setChatSessions([]);
    try {
      const sessionsSnap = await getDocs(collection(db, 'aiChats', student.id, 'sessions'));
      let sessionsList = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'session' }));

      const legacySnap = await getDocs(collection(db, 'aiChats', student.id, 'messages'));
      if (!legacySnap.empty) {
         sessionsList.push({ id: 'legacy', title: 'Legacy Chat Archive', type: 'legacy', updatedAt: null });
      }

      sessionsList.sort((a, b) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return tB - tA;
      });

      setChatSessions(sessionsList);
    } catch (err) {
      console.error('Error loading chat:', err);
    }
    setLoading(false);
  };

  const loadSessionMessages = async (session) => {
      setSelectedSession(session);
      setLoading(true);
      try {
          if (session.type === 'legacy') {
              const legacySnap = await getDocs(collection(db, 'aiChats', selectedStudent.id, 'messages'));
              const msgs = legacySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              msgs.sort((a, b) => {
                  const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (new Date(a.timestamp).getTime() || 0);
                  const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (new Date(b.timestamp).getTime() || 0);
                  return tA - tB;
              });
              setSessionMessages(msgs);
          } else {
              const msgSnap = await getDocs(collection(db, 'aiChats', selectedStudent.id, 'sessions', session.id, 'messages'));
              const msgs = msgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              msgs.sort((a, b) => {
                  const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (new Date(a.timestamp).getTime() || 0);
                  const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (new Date(b.timestamp).getTime() || 0);
                  return tA - tB;
              });
              setSessionMessages(msgs);
          }
      } catch (err) {
          console.error('Error loading messages:', err);
      }
      setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <CounselorSidebar />
      <main className="flex-1 ml-64 p-8 flex flex-col h-screen overflow-hidden">
        <header className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-800">AI Chat Summary</h1>
          <p className="text-gray-500 mt-2">View student conversations with the AI Counselor.</p>
        </header>

        <div className="flex-1 flex gap-6 overflow-hidden pb-8">

          {/* Left: Student List */}
          <div className="w-1/3 bg-card rounded-2xl p-4 shadow-md border border-gray-100 flex flex-col h-full overflow-hidden">
            <h2 className="font-bold text-lg text-gray-800 mb-4 px-2">Students</h2>
            {students.length === 0 ? (
              <div className="text-center text-gray-400 p-4">No students found.</div>
            ) : (
              <div className="overflow-y-auto flex-1 px-2 space-y-2">
                {students.map(student => (
                  <div
                    key={student.id}
                    onClick={() => loadChat(student)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      selectedStudent?.id === student.id
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                        {(student.name || student.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">{student.name || 'Unknown'}</h3>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Chat View */}
          <div className="flex-1 h-full bg-card rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden">
            {selectedStudent ? (
              <>
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedSession && (
                        <button onClick={() => setSelectedSession(null)} className="mr-2 p-1 bg-white rounded-full text-gray-500 hover:text-gray-800 shadow-sm border border-gray-200">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      {(selectedStudent.name || selectedStudent.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{selectedStudent.name || 'Unknown'}</h3>
                      <p className="text-xs text-gray-500">{selectedSession ? (selectedSession.title || 'Chat Thread') : 'AI Chat History'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                  {loading && <p className="text-center text-gray-400 mt-10">Loading...</p>}

                  {!loading && !selectedSession && (
                      <div className="space-y-3 max-w-2xl mx-auto">
                          <h4 className="font-semibold text-gray-700 mb-4 px-2">Select a Chat Session</h4>
                          {chatSessions.length === 0 ? (
                              <div className="text-center text-gray-400 mt-10">No sessions found.</div>
                          ) : (
                              chatSessions.map(session => (
                                  <div 
                                      key={session.id} 
                                      onClick={() => loadSessionMessages(session)}
                                      className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all flex items-center justify-between"
                                  >
                                      <div>
                                          <h5 className="font-semibold text-gray-800">{session.title || 'Chat Session'}</h5>
                                          <p className="text-sm text-gray-500 mt-1 flex flex-col">
                                              <span>{session.firstMessage || 'No preview available'}</span>
                                              {session.updatedAt && (
                                                <span className="text-xs text-gray-400 mt-1">
                                                    Last active: {session.updatedAt.toDate ? session.updatedAt.toDate().toLocaleString() : new Date(session.updatedAt).toLocaleString()}
                                                </span>
                                              )}
                                          </p>
                                      </div>
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M9 18l6-6-6-6"/></svg>
                                  </div>
                              ))
                          )}
                      </div>
                  )}

                  {!loading && selectedSession && (
                      <div className="space-y-4">
                          {sessionMessages.length === 0 ? (
                            <div className="text-center text-gray-400 mt-10">No messages in this session.</div>
                          ) : (
                              sessionMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-[15px] ${
                                    msg.sender === 'user'
                                      ? 'bg-primary text-white rounded-tr-none'
                                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                                  }`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    <span className={`text-[10px] block mt-2 text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                                      {msg.timestamp?.toDate
                                        ? msg.timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : (typeof msg.timestamp === 'string' || typeof msg.timestamp === 'number'
                                           ? new Date(msg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                           : '')}
                                    </span>
                                  </div>
                                </div>
                              ))
                          )}
                      </div>
                  )}

                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="bg-primary/10 p-4 rounded-full text-primary mb-4">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18H3" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Student Selected</h3>
                <p className="text-gray-500 max-w-sm">Select a student from the list to view their AI chat history.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default AIChatSummary;