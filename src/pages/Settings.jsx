import React, { useState } from 'react';
import CounselorSidebar from '../components/CounselorSidebar';
import { ShieldCheck, UserPlus, CheckCircle2 } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Settings = () => {
    const [tutorEmail, setTutorEmail] = useState('');
    const [studentName, setStudentName] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGrantAccess = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Save tutor access to Firestore
            await addDoc(collection(db, 'tutorAccess'), {
                tutorEmail,
                studentName,
                dateGranted: serverTimestamp(),
                grantedBy: 'counselor'
            });

            setSuccessMsg(`Access successfully granted to ${tutorEmail} for student ${studentName}.`);
            setTutorEmail('');
            setStudentName('');

            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Error granting access:', error);
            alert('Failed to grant access. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background">
            <CounselorSidebar />
            <main className="flex-1 ml-64 p-8 max-w-4xl">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
                    <p className="text-gray-500 mt-2">Manage portal settings and access control.</p>
                </header>

                <div className="bg-card rounded-2xl p-6 shadow-md border border-gray-100 mb-8">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <ShieldCheck size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Tutor Access Control</h2>
                    </div>

                    <p className="text-gray-600 mb-6">
                        Grant a tutor access to a specific student's details and chat history.
                        The tutor will only be able to view information related to the assigned student.
                    </p>

                    {successMsg && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 flex items-start space-x-3 border border-green-100">
                            <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" />
                            <p className="font-medium">{successMsg}</p>
                        </div>
                    )}

                    <form onSubmit={handleGrantAccess} className="space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tutor Email</label>
                            <input
                                type="email"
                                required
                                value={tutorEmail}
                                onChange={(e) => setTutorEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white/50"
                                placeholder="Enter tutor's email address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Student Name (or ID)</label>
                            <input
                                type="text"
                                required
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white/50"
                                placeholder="E.g., Sarah Williams OR CS2024-001"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-secondary text-white hover:text-primary font-medium py-3 px-6 rounded-lg transition-colors shadow-lg shadow-primary/30 flex items-center space-x-2 disabled:opacity-60"
                        >
                            <UserPlus size={20} />
                            <span>{loading ? 'Saving...' : 'Grant Tutor Access'}</span>
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Settings;
