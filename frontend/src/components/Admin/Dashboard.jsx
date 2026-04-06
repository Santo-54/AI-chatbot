import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import api from '../../api/axios';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Dashboard = () => {
    const [stats, setStats] = useState({ total_views: 0, total_chats: 0, total_leads: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/analytics');
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            }
        };
        fetchStats();
    }, []);

    const data = {
        labels: ['Views', 'Chats', 'Leads'],
        datasets: [
            {
                label: 'System Metrics',
                data: [stats.total_views, stats.total_chats, stats.total_leads],
                backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(75, 192, 192, 0.5)', 'rgba(255, 99, 132, 0.5)'],
                borderColor: ['rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Chatbot Performance' },
        },
    };

    return (
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                <div style={cardStyle}>
                    <h3>Total Views</h3>
                    <p style={statStyle}>{stats.total_views}</p>
                </div>
                <div style={cardStyle}>
                    <h3>Total Chats</h3>
                    <p style={statStyle}>{stats.total_chats}</p>
                </div>
                <div style={cardStyle}>
                    <h3>Leads Captured</h3>
                    <p style={statStyle}>{stats.total_leads}</p>
                </div>
            </div>
            <div style={{ height: '300px' }}>
                <Bar options={options} data={data} />
            </div>
        </div>
    );
};

const cardStyle = {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    textAlign: 'center'
};

const statStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '10px 0 0 0'
};

export default Dashboard;
