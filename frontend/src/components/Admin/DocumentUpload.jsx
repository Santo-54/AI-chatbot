import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

const DocumentUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post('/admin/upload-doc', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus('success');
            setFile(null);
        } catch (err) {
            console.error("Upload failed", err);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Knowledge Base</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Upload PDF documents to train the chatbot.</p>

            <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '30px', textAlign: 'center' }}>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="file-upload"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{ marginBottom: '10px', color: '#007bff' }}>
                        <Upload size={40} />
                    </div>
                    {file ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#333', fontWeight: '500' }}>
                            <FileText size={20} />
                            {file.name}
                        </div>
                    ) : (
                        <span style={{ color: '#666' }}>Click to select PDF</span>
                    )}
                </label>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    style={{
                        padding: '10px 20px',
                        background: uploading || !file ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: uploading || !file ? 'not-allowed' : 'pointer',
                        fontWeight: '600'
                    }}
                >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                </button>

                {status === 'success' && (
                    <span style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle size={18} /> Uploaded successfully!
                    </span>
                )}
                {status === 'error' && (
                    <span style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertCircle size={18} /> Upload failed.
                    </span>
                )}
            </div>
        </div>
    );
};

export default DocumentUpload;
