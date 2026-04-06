import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    // Check if token exists in localStorage as a fallback if state reset on refresh
    const token = localStorage.getItem('token');

    return user || token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
