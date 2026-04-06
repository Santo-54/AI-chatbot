import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

const LeadsTable = () => {
    const [leads, setLeads] = useState([]);

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const res = await api.get('/admin/leads');
                setLeads(res.data);
            } catch (err) {
                console.error("Failed to fetch leads", err);
            }
        };
        fetchLeads();
    }, []);

    return (
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Leads</h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', color: '#333' }}>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Source</th>
                            <th style={thStyle}>Session ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map((lead) => (
                            <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={tdStyle}>{new Date(lead.created_at).toLocaleDateString()}</td>
                                <td style={tdStyle}>{lead.name}</td>
                                <td style={tdStyle}>{lead.email}</td>
                                <td style={tdStyle}>{lead.source}</td>
                                <td style={tdStyle}>{lead.session_id.substring(0, 8)}...</td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No leads found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const thStyle = { padding: '12px', textAlign: 'left', fontWeight: '600' };
const tdStyle = { padding: '12px', color: '#555' };

export default LeadsTable;
