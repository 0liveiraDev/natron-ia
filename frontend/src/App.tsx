import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy loading feature pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Habits = lazy(() => import('./pages/Habits'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Finance = lazy(() => import('./pages/Finance'));
const Friday = lazy(() => import('./pages/Friday'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));

import { UIProvider } from './contexts/UIContext';

function App() {
    return (
        <AuthProvider>
            <UIProvider>
                <UserProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={
                                <Suspense fallback={<div className="h-screen bg-black" />}>
                                    <Login />
                                </Suspense>
                            } />
                            <Route path="/register" element={
                                <Suspense fallback={<div className="h-screen bg-black" />}>
                                    <Register />
                                </Suspense>
                            } />

                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <Layout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Navigate to="/dashboard" replace />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="friday" element={<Friday />} />
                                <Route path="tasks" element={<Tasks />} />
                                <Route path="habits" element={<Habits />} />
                                <Route path="finance" element={<Finance />} />
                                <Route path="profile" element={<Profile />} />
                                <Route path="admin/users" element={<AdminUsers />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </UserProvider>
            </UIProvider>
        </AuthProvider>
    );
}

export default App;
