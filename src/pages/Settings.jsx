import React, { useState, useEffect } from 'react';
import CounselorSidebar from '../components/CounselorSidebar';
import { User, Phone, Lock, Save, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, onAuthStateChanged } from 'firebase/auth';

const Settings = () => {
    const [counselorData, setCounselorData] = useState({ name: '', email: '', phone: '' });
    const [phone, setPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const localUserStr = localStorage.getItem('counselor_currentUser');
        if (localUserStr) {
            const localUser = JSON.parse(localUserStr);
            setCounselorData({
                uid: localUser.uid,
                name: localUser.name || localUser.fullName || 'Counselor',
                email: localUser.email,
                phone: localUser.phone || ''
            });
            setPhone(localUser.phone || '');
        }
        setLoading(false);
    }, []);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        
        if (newPassword && newPassword !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        setSaving(true);

        try {
            // Update Phone in Firestore and LocalStorage
            if (phone !== counselorData.phone) {
                await updateDoc(doc(db, 'users', counselorData.uid), { phone });
                
                const localUserStr = localStorage.getItem('counselor_currentUser');
                if (localUserStr) {
                    const localUser = JSON.parse(localUserStr);
                    localUser.phone = phone;
                    localStorage.setItem('counselor_currentUser', JSON.stringify(localUser));
                }
                
                setCounselorData(prev => ({ ...prev, phone }));
            }

            // Update Password in Firebase Auth
            if (newPassword) {
                const user = auth.currentUser;
                // Verify the globally authenticated user matches the counselor session
                if (!user || user.uid !== counselorData.uid) {
                    throw new Error("Session conflict (you might be logged in as a student in another tab). Please fully log out and log back in to change your password.");
                }
                await updatePassword(user, newPassword);
                setNewPassword('');
                setConfirmPassword('');
            }

            setSuccessMsg("Profile settings updated successfully.");
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.code === 'auth/requires-recent-login') {
                setErrorMsg("For security reasons, please log out and log back in to change your password.");
            } else {
                setErrorMsg(error.message || 'Failed to update profile.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background">
                <CounselorSidebar />
                <main className="flex-1 ml-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            <CounselorSidebar />
            <main className="flex-1 ml-64 p-8 max-w-4xl">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Account Settings</h1>
                    <p className="text-gray-500 mt-2">Manage your personal profile and security configurations.</p>
                </header>

                <div className="bg-card rounded-2xl p-6 shadow-md border border-gray-100 mb-8">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <User size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Profile Details</h2>
                    </div>

                    {successMsg && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 flex items-start space-x-3 border border-green-100">
                            <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" />
                            <p className="font-medium">{successMsg}</p>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 text-sm">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={counselorData.name}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    readOnly
                                    value={counselorData.email}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Phone size={16} className="mr-2 text-gray-400" /> Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white/50"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div className="pt-4 pb-2 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <Lock size={20} className="mr-2 text-primary" /> Security
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Leave blank if you do not wish to change your password.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white/50"
                                placeholder="Enter new password (min. 6 characters)"
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white/50"
                                placeholder="Confirm new password"
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary hover:bg-secondary text-white hover:text-primary font-medium py-3 px-6 rounded-lg transition-colors shadow-lg shadow-primary/30 flex items-center space-x-2 disabled:opacity-60 mt-4"
                        >
                            <Save size={20} />
                            <span>{saving ? 'Saving Changes...' : 'Save Profile Settings'}</span>
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Settings;
