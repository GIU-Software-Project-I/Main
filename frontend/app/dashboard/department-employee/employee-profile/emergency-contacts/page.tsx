'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';

export default function EmergencyContactsPage() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        isPrimary: false
    });

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            setLoading(true);
            const response = await employeeProfileService.getEmergencyContacts();
            setContacts(Array.isArray(response.data) ? response.data : []);
        } catch (err: any) {
            console.error('Failed to load emergency contacts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingIndex !== null) {
                await employeeProfileService.updateEmergencyContact(editingIndex, formData);
            } else {
                await employeeProfileService.addEmergencyContact(formData);
            }

            setFormData({ name: '', relationship: '', phone: '', email: '', isPrimary: false });
            setShowForm(false);
            setEditingIndex(null);
            loadContacts();
            alert(editingIndex !== null ? 'Contact updated successfully!' : 'Contact added successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to save contact');
        }
    };

    const handleEdit = (contact: any, index: number) => {
        setFormData({
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            email: contact.email || '',
            isPrimary: contact.isPrimary || false
        });
        setEditingIndex(index);
        setShowForm(true);
    };

    const handleDelete = async (index: number) => {
        if (!confirm('Are you sure you want to delete this emergency contact?')) {
            return;
        }

        try {
            await employeeProfileService.deleteEmergencyContact(index);
            loadContacts();
            alert('Contact deleted successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to delete contact');
        }
    };

    const handleCancel = () => {
        setFormData({ name: '', relationship: '', phone: '', email: '', isPrimary: false });
        setShowForm(false);
        setEditingIndex(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading emergency contacts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Emergency Contacts</h1>
                    <p className="text-slate-600 mt-2">Manage your emergency contact information</p>
                </div>
                <div className="flex gap-3">
                    {!showForm && (
                        <Button onClick={() => setShowForm(true)}>
                            + Add Emergency Contact
                        </Button>
                    )}
                    <Link href="/dashboard/department-employee/employee-profile">
                        <Button variant="outline">
                            Back to Profile
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">
                        {editingIndex !== null ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="John Doe"
                            />
                            <Input
                                label="Relationship"
                                value={formData.relationship}
                                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                                required
                                placeholder="Spouse, Parent, Sibling, etc."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Phone Number"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                                placeholder="+1 (555) 123-4567"
                            />
                            <Input
                                label="Email (Optional)"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contact@example.com"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isPrimary"
                                checked={formData.isPrimary}
                                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isPrimary" className="text-sm font-medium text-slate-700">
                                Set as primary contact
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="submit">
                                {editingIndex !== null ? 'Update Contact' : 'Add Contact'}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Contacts List */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">
                    My Emergency Contacts ({contacts.length})
                </h3>

                {contacts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">👥</div>
                        <p className="text-slate-600 text-lg mb-2">No emergency contacts added</p>
                        <p className="text-slate-500 text-sm">Add your first emergency contact using the button above</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {contacts.map((contact, index) => (
                            <div
                                key={index}
                                className="p-5 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-lg font-semibold text-slate-900">{contact.name}</h4>
                                            {contact.isPrimary && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-600 mt-1">{contact.relationship}</p>

                                        <div className="mt-3 space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-500">Phone:</span>
                                                <span className="text-slate-900 font-medium">{contact.phone}</span>
                                            </div>
                                            {contact.email && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-500">Email:</span>
                                                    <span className="text-slate-900">{contact.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit(contact, index)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleDelete(index)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
