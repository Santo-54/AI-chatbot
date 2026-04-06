import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import ChatWidget from './components/Chat/ChatWidget';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Public Website Content / Chat Widget */}
          <Routes>
            {/* Public Route (Landing Page Mockup + Chat) */}
            <Route path="/" element={<Home />} />

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Simple Home mockup to demonstrate the ChatWidget
const Home = () => (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(to right, #ece9e6, #ffffff)', fontFamily: 'Inter, sans-serif' }}>
    <header style={{ padding: '20px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h1 style={{ margin: 0, color: '#007bff' }}>Morpheus AI</h1>
      <nav style={{ display: 'flex', gap: '20px' }}>
        <a href="#" style={{ textDecoration: 'none', color: '#333' }}>Services</a>
        <a href="#" style={{ textDecoration: 'none', color: '#333' }}>About</a>
        <a href="/login" style={{ textDecoration: 'none', color: '#007bff', fontWeight: '600' }}>Admin Login</a>
      </nav>
    </header>

    <main style={{ padding: '80px 50px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '48px', marginBottom: '20px', color: '#333' }}>Smart Solutions for Modern Business</h2>
      <p style={{ fontSize: '18px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
        Leverage the power of AI to streamline your operations. Chat with our assistant to learn more!
      </p>
      <div style={{ marginTop: '40px' }}>
        <button style={{ padding: '12px 30px', fontSize: '16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer' }}>
          Get Started
        </button>
      </div>
    </main>

    {/* Floating Chat Widget */}
    <ChatWidget />
  </div>
);

export default App;
