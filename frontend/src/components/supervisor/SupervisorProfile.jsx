import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import { FormGroup, TextInput } from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';
import { showToast } from '../../utils/notifications.jsx';

export default function SupervisorProfile({ user, onUpdate }) {
    const [form, setForm] = useState({
        name: user.name || '',
        whatsappNumber: user.whatsappNumber || '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (form.newPassword && form.newPassword !== form.confirmPassword) {
            showToast.error('Passwords do not match!');
            return;
        }

        setLoading(true);
        try {
            const data = await apiRequest('/auth/update-profile', {
                method: 'PUT',
                body: {
                    name: form.name,
                    whatsappNumber: form.whatsappNumber,
                    password: form.newPassword || undefined
                }
            });
            showToast.success('Profile updated successfully');
            setForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
            if (onUpdate) onUpdate(data.user);
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <Card title="Supervisor Profile" subtitle="Update your personal identification and contact details">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormGroup label="Full Name">
                            <TextInput
                                iconLeft="fa-user-tie"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup label="WhatsApp Number">
                            <TextInput
                                iconLeft="fa-phone"
                                placeholder="+92..."
                                value={form.whatsappNumber}
                                onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                            />
                        </FormGroup>
                    </div>

                    <div className="pt-6 border-t mt-4">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Account Security</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormGroup label="Change Password">
                                <TextInput
                                    type={showNew ? "text" : "password"}
                                    iconLeft="fa-lock"
                                    iconRight={showNew ? "fa-eye-slash" : "fa-eye"}
                                    onToggleRight={() => setShowNew(!showNew)}
                                    placeholder="New Password"
                                    value={form.newPassword}
                                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                                />
                            </FormGroup>
                            <FormGroup label="Confirm New Password">
                                <TextInput
                                    type={showConfirm ? "text" : "password"}
                                    iconLeft="fa-shield"
                                    iconRight={showConfirm ? "fa-eye-slash" : "fa-eye"}
                                    onToggleRight={() => setShowConfirm(!showConfirm)}
                                    placeholder="Confirm Password"
                                    value={form.confirmPassword}
                                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                />
                            </FormGroup>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                        <Button variant="primary" onClick={handleSave} disabled={loading} className="rounded-xl px-10 font-black uppercase tracking-widest text-xs h-12 shadow-xl shadow-primary/20">
                            {loading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Saving...</> : <><i className="fas fa-save mr-2"></i> Save Profile</>}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
