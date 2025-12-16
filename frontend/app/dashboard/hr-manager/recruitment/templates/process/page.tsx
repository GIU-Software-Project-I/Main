'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';

// ==================== INTERFACES ====================
interface Stage {
  id: string;
  name: string;
  percentage: number;
  order: number;
}

interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

// ==================== DEFAULT STAGES (BR-9) ====================
const defaultStages: Omit<Stage, 'id'>[] = [
  { name: 'Screening', percentage: 20, order: 1 },
  { name: 'Interview', percentage: 40, order: 2 },
  { name: 'Offer', percentage: 30, order: 3 },
  { name: 'Hired', percentage: 10, order: 4 },
];

// ==================== MOCK DATA ====================
const mockTemplates: ProcessTemplate[] = [
  {
    id: '1',
    name: 'Standard Hiring Process',
    description: 'Default hiring workflow for most positions',
    stages: [
      { id: '1', name: 'Screening', percentage: 20, order: 1 },
      { id: '2', name: 'Interview', percentage: 40, order: 2 },
      { id: '3', name: 'Offer', percentage: 30, order: 3 },
      { id: '4', name: 'Hired', percentage: 10, order: 4 },
    ],
    createdAt: '2025-10-01',
    updatedAt: '2025-11-15',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Technical Hiring Process',
    description: 'Extended process with technical assessment',
    stages: [
      { id: '1', name: 'Screening', percentage: 15, order: 1 },
      { id: '2', name: 'Technical Test', percentage: 25, order: 2 },
      { id: '3', name: 'Interview', percentage: 30, order: 3 },
      { id: '4', name: 'Offer', percentage: 20, order: 4 },
      { id: '5', name: 'Hired', percentage: 10, order: 5 },
    ],
    createdAt: '2025-10-15',
    updatedAt: '2025-12-01',
    isDefault: false,
  },
];

// ==================== MAIN COMPONENT ====================
export default function ProcessTemplatesPage() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [stages, setStages] = useState<Stage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTemplates(mockTemplates);
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  // ==================== VALIDATION ====================
  const getTotalPercentage = () => stages.reduce((sum, s) => sum + s.percentage, 0);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (stages.length < 2) {
      newErrors.stages = 'At least 2 stages are required';
    }
    if (getTotalPercentage() !== 100) {
      newErrors.percentage = 'Total percentage must equal 100%';
    }
    stages.forEach((stage, index) => {
      if (!stage.name.trim()) {
        newErrors[`stage_${index}`] = 'Stage name is required';
      }
      if (stage.percentage <= 0) {
        newErrors[`stage_percentage_${index}`] = 'Percentage must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', description: '' });
    setStages(
      defaultStages.map((s, i) => ({
        ...s,
        id: `new_${i}`,
      }))
    );
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (template: ProcessTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, description: template.description });
    setStages([...template.stages]);
    setErrors({});
    setShowModal(true);
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const now = new Date().toISOString().split('T')[0];

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, ...formData, stages, updatedAt: now }
            : t
        )
      );
    } else {
      const newTemplate: ProcessTemplate = {
        id: Date.now().toString(),
        ...formData,
        stages: stages.map((s, i) => ({ ...s, id: `${Date.now()}_${i}`, order: i + 1 })),
        createdAt: now,
        updatedAt: now,
        isDefault: false,
      };
      setTemplates((prev) => [newTemplate, ...prev]);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template?.isDefault) {
      alert('Cannot delete the default template');
      return;
    }
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleAddStage = () => {
    const newStage: Stage = {
      id: `new_${Date.now()}`,
      name: '',
      percentage: 0,
      order: stages.length + 1,
    };
    setStages((prev) => [...prev, newStage]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 2) {
      setErrors((prev) => ({ ...prev, stages: 'At least 2 stages are required' }));
      return;
    }
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStageChange = (index: number, field: 'name' | 'percentage', value: string | number) => {
    setStages((prev) =>
      prev.map((stage, i) =>
        i === index
          ? { ...stage, [field]: field === 'percentage' ? Number(value) : value }
          : stage
      )
    );
    // Clear errors
    if (errors[`stage_${index}`] || errors[`stage_percentage_${index}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`stage_${index}`];
        delete newErrors[`stage_percentage_${index}`];
        return newErrors;
      });
    }
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stages.length - 1)
    ) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newStages = [...stages];
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
    setStages(newStages.map((s, i) => ({ ...s, order: i + 1 })));
  };

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
            <span>Process Templates</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Hiring Process Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define hiring stages with progress tracking (BR-9)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </Button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500">No process templates found</p>
            <Button onClick={handleOpenCreate} className="mt-4">
              Create First Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {templates.map((template) => (
            <Card key={template.id}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                      {template.isDefault && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(template)}>
                      Edit
                    </Button>
                    {!template.isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stages Progress Visualization */}
                <div className="space-y-3">
                  <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                    {template.stages.map((stage, index) => {
                      const colors = [
                        'bg-blue-500',
                        'bg-emerald-500',
                        'bg-amber-500',
                        'bg-purple-500',
                        'bg-pink-500',
                        'bg-cyan-500',
                      ];
                      return (
                        <div
                          key={stage.id}
                          className={`${colors[index % colors.length]} first:rounded-l-full last:rounded-r-full relative group`}
                          style={{ width: `${stage.percentage}%` }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-white">{stage.percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stage Labels */}
                  <div className="flex flex-wrap gap-4">
                    {template.stages.map((stage, index) => {
                      const colors = [
                        'bg-blue-100 text-blue-700',
                        'bg-emerald-100 text-emerald-700',
                        'bg-amber-100 text-amber-700',
                        'bg-purple-100 text-purple-700',
                        'bg-pink-100 text-pink-700',
                        'bg-cyan-100 text-cyan-700',
                      ];
                      return (
                        <div key={stage.id} className="flex items-center gap-2">
                          <span
                            className={`w-3 h-3 rounded-full ${colors[index % colors.length].split(' ')[0]}`}
                          />
                          <span className="text-sm text-slate-600">
                            {stage.name} ({stage.percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span>{template.stages.length} stages</span>
                  <span>•</span>
                  <span>Updated: {template.updatedAt}</span>
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
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingTemplate ? 'Edit Process Template' : 'Create Process Template'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <Input
                      label="Template Name *"
                      placeholder="e.g., Standard Hiring Process"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      error={errors.name}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brief description of this hiring process"
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Stages */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700">
                        Hiring Stages
                      </label>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            getTotalPercentage() === 100 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          Total: {getTotalPercentage()}%
                        </span>
                        {getTotalPercentage() !== 100 && (
                          <span className="text-xs text-slate-400">(Must equal 100%)</span>
                        )}
                      </div>
                    </div>

                    {errors.stages && (
                      <p className="text-sm text-red-600 mb-2">{errors.stages}</p>
                    )}
                    {errors.percentage && (
                      <p className="text-sm text-red-600 mb-2">{errors.percentage}</p>
                    )}

                    <div className="space-y-3">
                      {stages.map((stage, index) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          {/* Reorder buttons */}
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveStage(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStage(index, 'down')}
                              disabled={index === stages.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          {/* Order number */}
                          <span className="w-8 h-8 flex items-center justify-center bg-slate-200 rounded-full text-sm font-medium text-slate-600">
                            {index + 1}
                          </span>

                          {/* Stage name */}
                          <div className="flex-1">
                            <input
                              type="text"
                              className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                errors[`stage_${index}`]
                                  ? 'border-red-300'
                                  : 'border-slate-200'
                              }`}
                              placeholder="Stage name"
                              value={stage.name}
                              onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                            />
                          </div>

                          {/* Percentage */}
                          <div className="w-24">
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                                  errors[`stage_percentage_${index}`]
                                    ? 'border-red-300'
                                    : 'border-slate-200'
                                }`}
                                value={stage.percentage}
                                onChange={(e) => handleStageChange(index, 'percentage', e.target.value)}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                %
                              </span>
                            </div>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveStage(index)}
                            className="p-2 text-slate-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={handleAddStage} className="mt-3">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Stage
                    </Button>
                  </div>

                  {/* Progress Preview */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Progress Preview
                    </label>
                    <div className="flex h-6 rounded-full overflow-hidden bg-slate-100">
                      {stages.map((stage, index) => {
                        const colors = [
                          'bg-blue-500',
                          'bg-emerald-500',
                          'bg-amber-500',
                          'bg-purple-500',
                          'bg-pink-500',
                          'bg-cyan-500',
                        ];
                        return (
                          <div
                            key={stage.id}
                            className={`${colors[index % colors.length]} first:rounded-l-full last:rounded-r-full flex items-center justify-center transition-all`}
                            style={{ width: `${stage.percentage}%` }}
                          >
                            {stage.percentage >= 10 && (
                              <span className="text-[10px] font-bold text-white truncate px-1">
                                {stage.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
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
                  disabled={!formData.name || getTotalPercentage() !== 100 || stages.length < 2}
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
