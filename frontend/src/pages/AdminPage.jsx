import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../components/Admin/Dashboard';
import LeadsTable from '../components/Admin/LeadsTable';
import DocumentUpload from '../components/Admin/DocumentUpload';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { logout } = useAuth();

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard />;
            case 'leads': return <LeadsTable />;
            case 'upload': return <DocumentUpload />;
            default: return <Dashboard />;
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Sidebar */}
            <div style={{ width: '250px', background: '#343a40', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '40px', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>🤖 ChatAdmin</span>
                </div>

                <nav style={{ flex: 1 }}>
                    <NavItem
                        icon={<LayoutDashboard size={20} />}
                        label="Dashboard"
                        active={activeTab === 'dashboard'}
                        onClick={() => setActiveTab('dashboard')}
                    />
                    <NavItem
                        icon={<Users size={20} />}
                        label="Leads"
                        active={activeTab === 'leads'}
                        onClick={() => setActiveTab('leads')}
                    />
                    <NavItem
                        icon={<FileText size={20} />}
                        label="Knowledge Base"
                        active={activeTab === 'upload'}
                        onClick={() => setActiveTab('upload')}
                    />
                </nav>

                <button
                    onClick={logout}
                    style={{
                        marginTop: 'auto',
                        background: 'transparent',
                        border: '1px solid #6c757d',
                        color: '#ddd',
                        padding: '10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    <LogOut size={18} /> Logout
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, background: '#f0f2f5', padding: '30px', overflowY: 'auto' }}>
                <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    </h1>
                    <div style={{ color: '#666' }}>Admin Portal</div>
                </header>
                {renderContent()}
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 15px',
            background: active ? '#007bff' : 'transparent',
            border: 'none',
            color: active ? 'white' : '#adb5bd',
            textAlign: 'left',
            cursor: 'pointer',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '15px',
            transition: 'background 0.2s'
        }}
    >
        {icon}
        {label}
    </button>
);

export default AdminPage;
