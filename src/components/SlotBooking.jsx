import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, CheckCircle2 } from 'lucide-react';
import { db, auth } from '../firebaseConfig';
import {
    collection, query, onSnapshot,
    doc, updateDoc, addDoc, setDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore';

const SlotBooking = () => {
    const [availableSlots, setAvailableSlots] = useState([]);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [loading, setLoading] = useState(true);
    const [customRequest, setCustomRequest] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const navigate = useNavigate();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        const unsub = onSnapshot(collection(db, 'counselorSlots'), (snapshot) => {
            const allSlots = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            allSlots.forEach(slot => {
                if (slot.date && slot.date < todayStr) {
                    deleteDoc(doc(db, 'counselorSlots', slot.id)).catch(() => {});
                }
            });

            const currentSlots = allSlots.filter(s => !s.date || s.date >= todayStr);

            const filtered = currentSlots.filter(slot => {
                const isAvailable = slot.status === 'available';
                const isMyBooking = slot.bookedByUid === user.uid;
                // const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
                // const isValidFuture = slotDateTime >= now;
                // if (isAvailable && !isValidFuture) return false;
                return isAvailable || isMyBooking;
            });
            filtered.sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.startTime.localeCompare(b.startTime);
            });
            setAvailableSlots(filtered);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleBookSlot = async (slot) => {
        if (!user) return;

        let studentName = user.displayName;
        if (!studentName) {
            try {
                const localUser = JSON.parse(localStorage.getItem('counseling_currentUser') || '{}');
                studentName = localUser.fullName || localUser.name || user.email;
            } catch (e) {
                studentName = user.email;
            }
        }

        // Step 1 — Update the slot in counselorSlots
        await updateDoc(doc(db, 'counselorSlots', slot.id), {
            isBooked: true,
            status: 'booked',
            bookedBy: studentName,
            bookedByEmail: user.email,
            bookedByUid: user.uid
        });

        // Step 2 — Write to counselorChats so chat system knows about the slot request
        await setDoc(doc(db, 'counselorChats', user.uid), {
            studentId: user.uid,
            studentEmail: user.email,
            requestedSlot: {
                date: slot.date,
                time: slot.startTime,
                slotId: slot.id
            },
            slotStatus: 'requested'
        }, { merge: true });

        // Step 3 — Notify counselor
        await addDoc(collection(db, 'counselorNotifications'), {
            text: `${studentName} booked a slot on ${formatDate(slot.date)} at ${formatTime(slot.startTime)}`,
            type: 'slot',
            studentEmail: user.email,
            studentUid: user.uid,
            slotId: slot.id,
            read: false,
            createdAt: serverTimestamp()
        });

        // Step 4 — Post a message in the chat to seamlessly connect both UI flows
        await addDoc(collection(db, 'counselorChats', user.uid, 'messages'), {
            text: `You requested a slot on ${slot.date} at ${formatTime(slot.startTime)}. Please wait for counselor approval.`,
            sender: 'system',
            createdAt: serverTimestamp()
        });

        setBookingSuccess({ date: slot.date, time: slot.startTime });
    };

    const handleSendCustomRequest = async (e) => {
        e.preventDefault();
        if (!customRequest.trim() || !user) return;
        
        setIsSendingRequest(true);
        try {
            await addDoc(collection(db, 'counselorNotifications'), {
                text: `Student (${user.email}) requested a custom slot: "${customRequest}"`,
                type: 'custom_slot_request',
                studentEmail: user.email,
                studentUid: user.uid,
                read: false,
                createdAt: serverTimestamp()
            });

            await addDoc(collection(db, 'counselorChats', user.uid, 'messages'), {
                text: `[Custom Slot Request]: ${customRequest}`,
                sender: 'student',
                senderEmail: user.email,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, 'counselorChats', user.uid), {
                lastSenderRole: 'student',
                lastMessage: `[Custom Slot Request]: ${customRequest}`,
                lastMessageAt: serverTimestamp()
            }).catch(() => {});

            setCustomRequest('');
            setRequestSent(true);
            setTimeout(() => setRequestSent(false), 5000);
        } catch (error) {
            console.error("Error sending custom request:", error);
        } finally {
            setIsSendingRequest(false);
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    };

    const renderSlotAction = (slot) => {
        const status = slot.status || (slot.isBooked ? 'booked' : 'available');
        if (status === 'available') {
            return (
                <button
                    onClick={() => handleBookSlot(slot)}
                    className="w-full bg-primary hover:bg-secondary text-white hover:text-primary py-2 rounded-lg font-medium transition-colors text-sm">
                    Book Slot
                </button>
            );
        } else if (status === 'booked') {
            return (
                <button disabled className="w-full bg-amber-100 text-amber-700 py-2 rounded-lg font-medium text-sm cursor-not-allowed">
                    Booked (Pending)
                </button>
            );
        } else if (status === 'confirmed') {
            return (
                <button disabled className="w-full bg-green-100 text-green-700 py-2 rounded-lg font-medium text-sm cursor-not-allowed flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={16} /> Confirmed
                </button>
            );
        } else if (status === 'rejected') {
            return (
                <div className="w-full text-center">
                    <span className="block w-full bg-red-100 text-red-700 py-2 rounded-lg font-medium text-sm mb-1">Rejected</span>
                    {slot.remark && <span className="text-xs text-red-500 font-medium px-2 italic">{slot.remark}</span>}
                </div>
            );
        }
    };

    if (bookingSuccess) {
        return (
            <div className="bg-card rounded-2xl p-6 shadow-md border border-gray-100 text-center relative">
                <button
                    onClick={() => setBookingSuccess(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors text-sm font-medium underline">
                    Back to slots
                </button>
                <div className="bg-green-100 text-green-600 p-4 rounded-full inline-block mb-4 mt-2">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Booking Requested!</h3>
                <p className="text-gray-600 mb-6">
                    Your request for a session on <br />
                    <span className="font-semibold text-gray-800">
                        {formatDate(bookingSuccess.date)} at {formatTime(bookingSuccess.time)}
                    </span> is pending counselor approval.
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => navigate('/chat-counselor')}
                        className="bg-primary text-white hover:bg-secondary hover:text-primary px-6 py-2 rounded-lg font-medium transition-colors">
                        Go to Chat
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl p-6 shadow-md border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <CalendarDays className="mr-3 text-primary" size={24} />
                Counseling Slots
            </h3>

            {/* Custom Request Section (Moved to top) */}
            <div className="mb-8 bg-background p-5 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Want a slot?</h4>
                <p className="text-sm text-gray-500 mb-4">Send a direct message to your counselor to request a specific open slot.</p>
                <form onSubmit={handleSendCustomRequest} className="flex gap-2">
                    <input 
                        type="text" 
                        value={customRequest}
                        onChange={(e) => setCustomRequest(e.target.value)}
                        placeholder="e.g. Can we meet today at 4 PM instead?"
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button 
                        type="submit" 
                        disabled={isSendingRequest || !customRequest.trim()}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary hover:text-primary transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {isSendingRequest ? 'Sending...' : 'Send Request'}
                    </button>
                </form>
                {requestSent && <p className="text-green-600 text-sm mt-3 flex items-center"><CheckCircle2 size={16} className="mr-1.5"/> Request sent successfully.</p>}
            </div>

            {loading ? (
                <div className="text-center p-6 text-gray-400">Loading slots...</div>
            ) : availableSlots.length === 0 ? (
                <div className="text-center p-6 bg-background rounded-xl border border-gray-200">
                    <p className="text-gray-600 mb-4">No counseling slots available right now.</p>
                    <p className="text-gray-400 text-sm">Check back later or message your counselor.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {availableSlots.map(slot => (
                        <div key={slot.id} className="bg-background rounded-xl p-4 border border-gray-200 hover:border-secondary transition-colors flex flex-col justify-between h-full">
                            <div>
                                <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <CalendarDays size={14} />{formatDate(slot.date)}
                                </div>
                                <div className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-1.5">
                                    <Clock size={16} className="text-primary" />
                                    {slot.startTime} – {slot.endTime}
                                </div>
                            </div>
                            <div className="mt-2">{renderSlotAction(slot)}</div>
                        </div>
                    ))}
                </div>
            )}



            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                    onClick={() => navigate('/chat-counselor')}
                    className="text-gray-500 hover:text-primary text-sm font-medium transition-colors">
                    Or proceed directly to chat →
                </button>
            </div>
        </div>
    );
};

export default SlotBooking;