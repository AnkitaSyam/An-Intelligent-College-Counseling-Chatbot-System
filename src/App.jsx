import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ChatAI from "./pages/ChatAI";
import ChatCounselor from "./pages/ChatCounselor";
import Profile from "./pages/Profile";
import CounselorLogin from "./pages/CounselorLogin";
import CounselorDashboard from "./pages/CounselorDashboard";
import StudentChat from "./pages/StudentChat";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import StudentSlotManagement from "./pages/StudentSlotManagement";
import AIChatSummary from "./pages/AIChatSummary";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Routes>
          {/* Student Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat-ai" element={<ChatAI />} />
          <Route path="/chat-counselor" element={<ChatCounselor />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/slot-management" element={<StudentSlotManagement />} />
          
          {/* Counselor Routes */}
          <Route path="/counselor-login" element={<CounselorLogin />} />
          <Route path="/counselor-dashboard" element={<CounselorDashboard />} />
          <Route path="/counselor-chat" element={<StudentChat />} />
          <Route path="/counselor-notifications" element={<Notifications />} />
          <Route path="/counselor-settings" element={<Settings />} />
          <Route path="/ai-chat-summary" element={<AIChatSummary />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
