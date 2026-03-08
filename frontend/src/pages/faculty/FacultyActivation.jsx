import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';

export default function FacultyActivation() {
    // Manually extract token from URL since we don't use react-router-dom
    const token = window.location.pathname.split('/').filter(Boolean).pop();

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [facultyData, setFacultyData] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (token) {
            checkToken();
        } else {
            setError('Invalid activation link.');
            setLoading(false);
        }
    }, [token]);

    const checkToken = async () => {
        try {
            const data = await apiRequest(`/auth/faculty-activate-check/${token}`);
            setFacultyData(data);
        } catch (err) {
            setError(err.message || 'Activation link expired or invalid.');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }
        if (password.length < 8) {
            return setError('Password must be at least 8 characters.');
        }

        setVerifying(true);
        setError('');
        try {
            await apiRequest('/auth/faculty-set-password', {
                method: 'POST',
                body: { token, password }
            });
            setSuccess(true);
            // Redirect after 3 seconds
            setTimeout(() => {
                window.history.pushState({}, '', '/');
                window.location.reload(); // Force reload to go back to login screen
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    const goBack = () => {
        window.history.pushState({}, '', '/');
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center">
                    <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Account Activated!</h2>
                    <p className="text-gray-500 mb-6">Your account is now active. Redirecting you to login...</p>
                    <Button variant="primary" block onClick={goBack}>Go to Login Now</Button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Activation Failed</h2>
                    <p className="text-gray-500 mb-8">{error}</p>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-8">
                        <p className="text-xs text-gray-400 italic">Please contact the Internship Office to receive a new activation link.</p>
                    </div>
                    <Button variant="outline" block onClick={goBack}>Back to Login</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-primary p-10 text-white text-center">
                    <h2 className="text-2xl font-black tracking-tight">Supervisor Activation</h2>
                    <p className="text-white/70 text-sm mt-1">Nomination accepted for {facultyData?.name}</p>
                </div>
                <div className="p-10">
                    <form onSubmit={handleActivate} className="space-y-6">
                        <Alert type="info">
                            Please set a strong password to activate your academic supervisor account.
                        </Alert>

                        <FormGroup label="New Password">
                            <TextInput
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                iconLeft="fa-lock"
                                iconRight={showPassword ? "fa-eye-slash" : "fa-eye"}
                                onToggleRight={() => setShowPassword(!showPassword)}
                                placeholder="Min 8 characters"
                            />
                        </FormGroup>

                        <FormGroup label="Confirm Password">
                            <TextInput
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                iconLeft="fa-shield-halved"
                                iconRight={showConfirmPassword ? "fa-eye-slash" : "fa-eye"}
                                onToggleRight={() => setShowConfirmPassword(!showConfirmPassword)}
                                placeholder="Repeat password"
                            />
                        </FormGroup>

                        <Button variant="primary" block type="submit" loading={verifying}>
                            Activate Account & Login
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
