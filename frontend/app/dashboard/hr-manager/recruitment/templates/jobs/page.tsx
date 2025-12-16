'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';

// ==================== INTERFACES ====================
interface JobTemplate {
  id: string;
  title: string;
  department: string;
  location: string;
  qualifications: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'active';
}

interface FormData {
  title: string;
  department: string;
  location: string;
  qualifications: string;
}

interface FormErrors {
  title?: string;
  department?: string;
  location?: string;
  qualifications?: string;
}

// ==================== MOCK DATA ====================
const mockTemplates: JobTemplate[] = [
  {
    id: '1',
    title: 'Software Engineer',
    department: 'Engineering',
    location: 'Cairo, Egypt',
    qualifications: '• 3+ years of experience in software development\n• Proficiency in TypeScript, React, Node.js\n• Bachelor\'s degree in Computer Science or related field\n• Strong problem-solving skills',
    createdAt: '2025-11-15',
    updatedAt: '2025-12-01',
    status: 'active',
  },
  {
    id: '2',
    title: 'Product Manager',
    department: 'Product',
    location: 'Cairo, Egypt',
    qualifications: '• 5+ years of product management experience\n• Experience with agile methodologies\n• Strong analytical and communication skills\n• MBA preferred',
    createdAt: '2025-11-20',
    updatedAt: '2025-11-25',
    status: 'active',
  },
  {
    id: '3',
    title: 'HR Coordinator',
    department: 'Human Resources',
    location: 'Alexandria, Egypt',
    qualifications: '• 2+ years HR experience\n• Knowledge of Egyptian labor law\n• Excellent communication skills\n• HR certification preferred',
    createdAt: '2025-12-01',
    updatedAt: '2025-12-10',
    status: 'draft',
  },
];

const departments = ['Engineering', 'Product', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Operations'];
const locations = ['Cairo, Egypt', 'Alexandria, Egypt', 'Giza, Egypt', 'Remote'];

// ==================== MAIN COMPONENT ====================
export default function JobTemplatesPage() {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobTemplate | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    department: '',
    location: '',
    qualifications: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulate API call
    const fetchTemplates = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTemplates(mockTemplates);
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  // ==================== VALIDATION (BR-2) ====================
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.qualifications.trim()) {
      newErrors.qualifications = 'Qualifications & skills are required';
    } else if (formData.qualifications.trim().length < 20) {
      newErrors.qualifications = 'Please provide more detailed qualifications (min 20 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ title: '', department: '', location: '', qualifications: '' });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (template: JobTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      department: template.department,
      location: template.location,
      qualifications: template.qualifications,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (editingTemplate) {
      // Update existing
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, ...formData, updatedAt: new Date().toISOString().split('T')[0] }
            : t
        )
      );
    } else {
      // Create new
      const newTemplate: JobTemplate = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        status: 'draft',
      };
      setTemplates((prev) => [newTemplate, ...prev]);
    }

    setShowModal(false);
    setShowPreview(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ==================== FILTERED TEMPLATES ====================
  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/dashboard/hr-manager/recruitment" className="hover:text-slate-700">
              Recruitment
            </Link>
            <span>/</span>
            <span>Job Templates</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Job Description Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage standardized job descriptions (BR-2)</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500">No templates found</p>
            <Button onClick={handleOpenCreate} className="mt-4">
              Create First Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{template.title}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        template.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {template.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {template.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {template.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Updated: {template.updatedAt}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(template)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingTemplate ? 'Edit Job Template' : 'Create Job Template'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-col lg:flex-row max-h-[calc(90vh-130px)] overflow-hidden">
                {/* Form Section */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200">
                  <div className="space-y-5">
                    <Input
                      label="Job Title *"
                      placeholder="e.g., Software Engineer"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      error={errors.title}
                    />

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Department *
                      </label>
                      <select
                        className={`w-full px-4 py-3 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                          errors.department
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                      >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {errors.department && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.department}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Location *
                      </label>
                      <select
                        className={`w-full px-4 py-3 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                          errors.location
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      >
                        <option value="">Select location</option>
                        {locations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                      {errors.location && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.location}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Qualifications & Skills *
                      </label>
                      <textarea
                        className={`w-full px-4 py-3 border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all min-h-[150px] ${
                          errors.qualifications
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        placeholder="• Required experience&#10;• Technical skills&#10;• Education requirements&#10;• Soft skills"
                        value={formData.qualifications}
                        onChange={(e) => handleInputChange('qualifications', e.target.value)}
                      />
                      {errors.qualifications && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.qualifications}</p>
                      )}
                      <p className="mt-1.5 text-xs text-slate-400">
                        Use bullet points (•) for better readability
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-700">Preview</h3>
                    <span className="text-xs text-slate-500">Live preview</span>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <h4 className="text-xl font-bold text-slate-900">
                      {formData.title || 'Job Title'}
                    </h4>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {formData.department || 'Department'}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {formData.location || 'Location'}
                      </span>
                    </div>
                    <hr className="my-4" />
                    <h5 className="font-semibold text-slate-800 mb-2">Qualifications & Skills</h5>
                    <div className="text-sm text-slate-600 whitespace-pre-line">
                      {formData.qualifications || 'No qualifications specified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.title || !formData.department || !formData.location || !formData.qualifications}
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
