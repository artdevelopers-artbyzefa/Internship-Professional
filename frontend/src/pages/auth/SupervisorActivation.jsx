import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import Button from '../../components/ui/Button.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';

export default function SupervisorActivation() {
    // Manually extract token from URL 
    const token = window.location.pathname.split('/').filter(Boolean).pop();

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [supervisorData, setSupervisorData] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (token) {
            checkToken();
        } else {
            setError('Invalid or missing activation link.');
            setLoading(false);
        }
    }, [token]);

    const checkToken = async () => {
        try {
            const data = await apiRequest(`/auth/supervisor-activate-check/${token}`);
            setSupervisorData(data);
        } catch (err) {
            setError(err.message || 'The activation link has expired or is invalid.');
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
            return setError('Password must be at least 8 characters long for security.');
        }

        setVerifying(true);
        setError('');
        try {
            await apiRequest('/auth/supervisor-set-password', {
                method: 'POST',
                body: { token, password }
            });
            setSuccess(true);
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    const goBack = () => {
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Verifying Partner Invitation...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
                <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 text-center border border-sky-100">
                    <div className="w-24 h-24 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner">
                        <i className="fas fa-handshake"></i>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-3">Partner Verified!</h2>
                    <p className="text-slate-500 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
                        Your supervisor account for <strong>{supervisorData?.email}</strong> is now active. You are being redirected to the login portal.
                    </p>
                    <Button variant="primary" block onClick={() => window.location.href = '/login'} className="py-4 rounded-2xl shadow-lg shadow-sky-200">
                        Proceed to Login
                    </Button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
                <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 text-center border border-red-50">
                    <div className="w-24 h-24 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner">
                        <i className="fas fa-link-slash"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3">Link Expired</h2>
                    <p className="text-slate-400 mb-10 text-sm leading-relaxed">{error}</p>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mb-10">
                        <p className="text-xs text-slate-400 font-medium italic">Please contact the CUI Abbottabad Internship Office to request a fresh onboarding link.</p>
                    </div>
                    <Button variant="outline" block onClick={goBack} className="py-4 rounded-2xl font-bold border-slate-200 text-slate-500">
                        Back to Mainland
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
            <div className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-sky-100/50">
                <div className="bg-gradient-to-br from-sky-600 to-blue-700 p-12 text-white text-center relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-black tracking-tight mb-2">Partner Onboarding</h2>
                        <p className="text-sky-100 text-sm font-medium tracking-wide">Nomination for {supervisorData?.name}</p>
                    </div>
                </div>

                <div className="p-12">
                    <form onSubmit={handleActivate} className="space-y-8">
                        <div className="flex items-start gap-4 p-5 bg-sky-50 rounded-2xl border border-sky-100/50">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-sky-600 flex-shrink-0">
                                <i className="fas fa-info-circle"></i>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sky-900 text-sm font-bold">Secure Setup Required</p>
                                <p className="text-sky-700/70 text-xs leading-relaxed">
                                    As an institutional partner, please establish your security credentials. Your email <strong>{supervisorData?.email}</strong> is verified.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <FormGroup label="Designated Partner Email">
                                <TextInput
                                    type="email"
                                    value={supervisorData?.email}
                                    disabled={true}
                                    iconLeft="fa-envelope"
                                    className="bg-slate-50 opacity-100 border-dashed border-slate-300 pointer-events-none grayscale"
                                />
                                <p className="text-[10px] text-slate-400 mt-2 ml-1 font-medium">Institutional affiliation is locked to this address.</p>
                            </FormGroup>

                            <FormGroup label="Establish Secure Password">
                                <TextInput
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    iconLeft="fa-key"
                                    placeholder="Enter secure password"
                                    className="py-4 rounded-xl border-slate-200 focus:ring-sky-500/20"
                                />
                            </FormGroup>

                            <FormGroup label="Confirm Secure Password">
                                <TextInput
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    iconLeft="fa-shield-halved"
                                    placeholder="Verify password"
                                    className="py-4 rounded-xl border-slate-200 focus:ring-sky-500/20"
                                />
                            </FormGroup>
                        </div>

                        <Button
                            variant="primary"
                            block
                            type="submit"
                            loading={verifying}
                            className="py-4 rounded-2xl font-black tracking-wide bg-gradient-to-r from-sky-600 to-blue-600 shadow-xl shadow-sky-200 transition-all hover:scale-[1.02] hover:shadow-2xl"
                        >
                            Complete Registration
                        </Button>

                        <p className="text-center text-[10px] text-slate-400 font-medium">
                            By activating, you agree to comply with the University's Internship Supervision policies.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
