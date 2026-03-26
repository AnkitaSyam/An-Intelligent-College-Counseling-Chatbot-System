import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import CounselorSidebar from '../components/CounselorSidebar';

const AIChatSummary = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
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

  // Load chat history for selected student
  const loadChat = async (student) => {
    setSelectedStudent(student);
    setLoading(true);
    setChatHistory([]);
    try {
      const q = query(
        collection(db, 'aiChats', student.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      setChatHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading chat:', err);
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
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                    {(selectedStudent.name || selectedStudent.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedStudent.name || 'Unknown'}</h3>
                    <p className="text-xs text-gray-500">AI Chat History</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {loading && <p className="text-center text-gray-400">Loading chat...</p>}

                  {!loading && chatHistory.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                      No messages yet for this student.
                    </div>
                  )}

                  {chatHistory.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                        msg.sender === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        <p>{msg.text}</p>
                        <span className={`text-[10px] block mt-1 text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                          {msg.timestamp?.toDate
                            ? msg.timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : (typeof msg.timestamp === 'string' || typeof msg.timestamp === 'number'
                               ? new Date(msg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                               : '')}
                        </span>
                      </div>
                    </div>
                  ))}
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