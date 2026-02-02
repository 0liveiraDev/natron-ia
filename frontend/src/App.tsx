import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import Tasks from './pages/Tasks';
import Finance from './pages/Finance';
import Atlas from './pages/Atlas';

function App() {
    return (
        <AuthProvider>
            <UserProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

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
                            <Route path="atlas" element={<Atlas />} />
                            <Route path="tasks" element={<Tasks />} />
                            <Route path="habits" element={<Habits />} />
                            <Route path="finance" element={<Finance />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </UserProvider>
        </AuthProvider>
    );
}

export default App;
