'use client';

/**
 * Hiring Process Templates Page (BR-9)
 * 
 * This page implements the BR-9 requirement:
 * "HR Manager establishes hiring process templates for stages and progress updates"
 * "Each application must be tracked through defined stages (e.g., Screening, Shortlisting, Interview, Offer, Hired)"
 * 
 * Architecture Note:
 * - Process templates define the hiring workflow stages and progress percentages
 * - Templates are stored in localStorage until backend API is available
 * - Applications inherit their process from their linked Job Requisition
 * - Stage transitions drive the progress percentage displayed to candidates
 * 
 * When backend API becomes available, replace localStorage calls with API calls:
 * - GET /recruitment/process-templates
 * - POST /recruitment/process-templates
 * - PUT /recruitment/process-templates/:id
 * - DELETE /recruitment/process-templates/:id
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';

// =====================================================
// Types
// =====================================================

interface HiringStage {
  id: string;
  name: string;
  order: number;
  percentage: number;
  description?: string;
}

interface ProcessTemplate {
  id: string;
  name: string;
  description?: string;
  stages: HiringStage[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// LocalStorage Key
// =====================================================

const STORAGE_KEY = 'hr_process_templates';

// =====================================================
// Default Template (matches backend ApplicationStage enum)
// =====================================================

const DEFAULT_TEMPLATE: ProcessTemplate = {
  id: 'default-template',
  name: 'Standard Hiring Process',
  description: 'Default hiring workflow aligned with backend ApplicationStage enum',
  stages: [
    { id: 'stage-screening', name: 'Screening', order: 1, percentage: 25, description: 'Initial application review' },
    { id: 'stage-dept-interview', name: 'Department Interview', order: 2, percentage: 25, description: 'Technical/Department interview' },
    { id: 'stage-hr-interview', name: 'HR Interview', order: 3, percentage: 25, description: 'HR interview for culture fit' },
    { id: 'stage-offer', name: 'Offer', order: 4, percentage: 25, description: 'Offer preparation and extension' },
  ],
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// =====================================================
// Storage Helper Functions (Replace with API calls when backend is ready)
// =====================================================

function loadTemplatesFromStorage(): ProcessTemplate[] {
  if (typeof window === 'undefined') return [DEFAULT_TEMPLATE];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Initialize with default template
    localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_TEMPLATE]));
    return [DEFAULT_TEMPLATE];
  }
  
  try {
    const templates = JSON.parse(stored);
    // Ensure default template always exists
    if (!templates.find((t: ProcessTemplate) => t.id === 'default-template')) {
      templates.unshift(DEFAULT_TEMPLATE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
    return templates;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_TEMPLATE]));
    return [DEFAULT_TEMPLATE];
  }
}

function saveTemplatesToStorage(templates: ProcessTemplate[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// =====================================================
// Progress Bar Colors
// =====================================================

const STAGE_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-rose-500',
];

// =====================================================
// Helper Functions (Exported for use in other components)
// =====================================================

export function getStageProgress(templateId: string, currentStageId: string): number {
  const templates = loadTemplatesFromStorage();
  const template = templates.find(t => t.id === templateId) || templates.find(t => t.isDefault);
  if (!template) return 0;
  
  const stageIndex = template.stages.findIndex(s => s.id === currentStageId);
  if (stageIndex === -1) return 0;
  
  // Sum percentages up to and including current stage
  return template.stages.slice(0, stageIndex + 1).reduce((sum, s) => sum + s.percentage, 0);
}

export function getTemplateStages(templateId?: string): HiringStage[] {
  const templates = loadTemplatesFromStorage();
  const template = templateId 
    ? templates.find(t => t.id === templateId) 
    : templates.find(t => t.isDefault);
  return template?.stages || [];
}

// =====================================================
// Main Component
// =====================================================

export default function ProcessTemplatesPage() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [stages, setStages] = useState<HiringStage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load templates
  const loadTemplates = useCallback(() => {
    setLoading(true);
    // Simulate async load (replace with API call when backend is ready)
    setTimeout(() => {
      setTemplates(loadTemplatesFromStorage());
      setLoading(false);
    }, 100);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // =====================================================
  // Validation
  // =====================================================

  const getTotalPercentage = () => stages.reduce((sum, s) => sum + s.percentage, 0);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (stages.length < 1) {
      newErrors.stages = 'At least 1 stage is required';
    }

    const total = getTotalPercentage();
    if (total !== 100) {
      newErrors.percentage = `Total percentage must equal 100% (currently ${total}%)`;
    }

    stages.forEach((stage, index) => {
      if (!stage.name.trim()) {
        newErrors[`stage_name_${index}`] = 'Stage name is required';
      }
      if (stage.percentage <= 0) {
        newErrors[`stage_percentage_${index}`] = 'Percentage must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =====================================================
  // Handlers
  // =====================================================

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', description: '' });
    setStages([
      { id: `new_${Date.now()}_1`, name: 'Screening', order: 1, percentage: 25 },
      { id: `new_${Date.now()}_2`, name: 'Interview', order: 2, percentage: 50 },
      { id: `new_${Date.now()}_3`, name: 'Offer', order: 3, percentage: 25 },
    ]);
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (template: ProcessTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, description: template.description || '' });
    setStages([...template.stages]);
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Prepare stages with updated order
      const updatedStages = stages.map((s, i) => ({
        ...s,
        id: s.id.startsWith('new_') ? `stage_${Date.now()}_${i}` : s.id,
        order: i + 1,
      }));

      if (editingTemplate) {
        // Update existing template
        const updatedTemplates = templates.map(t =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: formData.name,
                description: formData.description,
                stages: updatedStages,
                updatedAt: new Date().toISOString(),
              }
            : t
        );
        saveTemplatesToStorage(updatedTemplates);
        setTemplates(updatedTemplates);
      } else {
        // Create new template
        const newTemplate: ProcessTemplate = {
          id: `template_${Date.now()}`,
          name: formData.name,
          description: formData.description,
          stages: updatedStages,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updatedTemplates = [...templates, newTemplate];
        saveTemplatesToStorage(updatedTemplates);
        setTemplates(updatedTemplates);
      }

      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.isDefault) {
      alert('Cannot delete the default template');
      return;
    }

    if (confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter(t => t.id !== id);
      saveTemplatesToStorage(updatedTemplates);
      setTemplates(updatedTemplates);
    }
  };

  const handleSetDefault = (id: string) => {
    const updatedTemplates = templates.map(t => ({
      ...t,
      isDefault: t.id === id,
      updatedAt: t.id === id ? new Date().toISOString() : t.updatedAt,
    }));
    saveTemplatesToStorage(updatedTemplates);
    setTemplates(updatedTemplates);
  };

  // =====================================================
  // Stage Management
  // =====================================================

  const handleAddStage = () => {
    const newStage: HiringStage = {
      id: `new_${Date.now()}`,
      name: '',
      order: stages.length + 1,
      percentage: 0,
    };
    setStages([...stages, newStage]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      setErrors(prev => ({ ...prev, stages: 'At least 1 stage is required' }));
      return;
    }
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleStageChange = (index: number, field: keyof HiringStage, value: string | number) => {
    setStages(prev =>
      prev.map((stage, i) =>
        i === index
          ? { ...stage, [field]: field === 'percentage' ? Number(value) : value }
          : stage
      )
    );
    // Clear related errors
    if (errors[`stage_name_${index}`] || errors[`stage_percentage_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`stage_name_${index}`];
        delete newErrors[`stage_percentage_${index}`];
        delete newErrors.percentage;
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

  // =====================================================
  // Render
  // =====================================================

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

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-blue-800 font-medium">Hiring Process Configuration</p>
          <p className="text-blue-700 text-sm mt-1">
            Process templates define the stages candidates progress through during recruitment.
            Each stage has a progress percentage. The total must equal 100%.
            The default template is used when no specific template is assigned to a job requisition.
          </p>
        </div>
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
                    {template.description && (
                      <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!template.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                        title="Set as default"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(template)}>
                      Edit
                    </Button>
                    {!template.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Visual Progress Stepper */}
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="flex h-6 rounded-full overflow-hidden bg-slate-100">
                    {template.stages.map((stage, index) => (
                      <div
                        key={stage.id}
                        className={`${STAGE_COLORS[index % STAGE_COLORS.length]} first:rounded-l-full last:rounded-r-full flex items-center justify-center transition-all relative group`}
                        style={{ width: `${stage.percentage}%` }}
                      >
                        {stage.percentage >= 10 && (
                          <span className="text-[10px] font-bold text-white truncate px-1">
                            {stage.name}
                          </span>
                        )}
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {stage.name}: {stage.percentage}%
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stage Labels */}
                  <div className="flex flex-wrap gap-4">
                    {template.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${STAGE_COLORS[index % STAGE_COLORS.length]}`}
                        />
                        <span className="text-sm text-slate-600">
                          {stage.name} ({stage.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span>{template.stages.length} stages</span>
                  <span>•</span>
                  <span>Updated: {new Date(template.updatedAt).toLocaleDateString()}</span>
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
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
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
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Stages */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700">
                        Hiring Stages *
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
                          <span className="text-xs text-red-500">(Must equal 100%)</span>
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
                              title="Move up"
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
                              title="Move down"
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
                                errors[`stage_name_${index}`]
                                  ? 'border-red-300 focus:ring-red-500'
                                  : 'border-slate-200 focus:ring-blue-500'
                              } focus:outline-none focus:ring-2`}
                              placeholder="Stage name"
                              value={stage.name}
                              onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                            />
                            {errors[`stage_name_${index}`] && (
                              <p className="text-xs text-red-500 mt-1">{errors[`stage_name_${index}`]}</p>
                            )}
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
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-slate-200 focus:ring-blue-500'
                                } focus:outline-none focus:ring-2`}
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
                            className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30"
                            disabled={stages.length <= 1}
                            title="Remove stage"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddStage}
                      className="mt-3"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Stage
                    </Button>
                  </div>

                  {/* Visual Preview */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Progress Preview
                    </label>
                    <div className="flex h-8 rounded-full overflow-hidden bg-slate-100">
                      {stages.map((stage, index) => (
                        <div
                          key={stage.id}
                          className={`${STAGE_COLORS[index % STAGE_COLORS.length]} first:rounded-l-full last:rounded-r-full flex items-center justify-center transition-all`}
                          style={{ width: `${stage.percentage}%` }}
                        >
                          {stage.percentage >= 15 && stage.name && (
                            <span className="text-xs font-bold text-white truncate px-1">
                              {stage.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name || getTotalPercentage() !== 100 || stages.length < 1}
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 pt-4">
        <Link
          href="/dashboard/hr-manager/recruitment/applications"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Manage Applications
        </Link>
        <Link
          href="/dashboard/hr-manager/recruitment/templates/jobs"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Job Templates
        </Link>
      </div>
    </div>
  );
}
