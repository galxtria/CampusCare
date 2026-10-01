import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import MyReports from './components/MyReports';
import AdminDashboard from './components/AdminDashboard';
import RoomManagement from './components/RoomManagement';
import ExportReport from './components/ExportReport';
import QRGenerator from './components/QRGenerator';
import UserManagement from './components/UserManagement';
import Profile from './components/Profile';
import Login from './components/Login';
import AppLayout from './components/layout/AppLayout';
import { ToastProvider } from './components/ui/Toast';
import Spinner from './components/ui/Spinner';
import ChatBot from './components/ChatBot';
import { auth } from './api';
import './App.css';

/** Menampung ruangan dari QR bila pemindai belum login, lalu lempar ke login. */
function QRRedirect() {
  const [params] = useSearchParams();
  const room = params.get('room');
  if (room) localStorage.setItem('pendingRoom', room);
  return <Navigate to={room ? `/login?room=${encodeURIComponent(room)}` : '/login'} replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    try { await auth.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-gray-100 text-gray-500">
        <Spinner size={24} />
        <span className="text-sm font-medium">Memuat CampusCare...</span>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router>
        {!user ? (
          <Routes>
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/report/new" element={<QRRedirect />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <>
            <AppLayout user={user} onLogout={handleLogout}>
              <Routes>
                {user.role === 'user' ? (
                  <>
                    <Route path="/" element={<Dashboard user={user} />} />
                    <Route path="/report/new" element={<ReportForm />} />
                    <Route path="/my-reports" element={<MyReports />} />
                    <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                ) : (
                  <>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/rooms" element={<RoomManagement />} />
                    <Route path="/admin/export" element={<ExportReport />} />
                    <Route path="/admin/qr" element={<QRGenerator />} />
                    <Route path="/admin/users" element={<UserManagement currentUser={user} />} />
                    <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
                    <Route path="/login" element={<Navigate to="/admin" replace />} />
                    <Route path="/" element={<Navigate to="/admin" replace />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </>
                )}
              </Routes>
            </AppLayout>
            <ChatBot />
          </>
        )}
      </Router>
    </ToastProvider>
  );
}

export default App;
