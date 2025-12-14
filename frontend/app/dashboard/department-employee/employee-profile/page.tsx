'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';

/**
 * Employee Profile Page - Department Employee
 * US-E2-04: View my full profile
 * US-E2-12: View bio and photo
 */
export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'documents'>('personal');

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await employeeProfileService.getMyProfile();
        setProfile(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Load documents when documents tab is active
  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab]);

  const loadDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await employeeProfileService.getMyDocuments();
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleUploadDocument = async (file: File, documentType: string, description: string) => {
    try {
      setUploadingDocument(true);

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const fileData = reader.result as string;

          await employeeProfileService.uploadDocument({
            fileName: file.name,
            documentType,
            description,
            fileData,
            mimeType: file.type,
          });

          alert('Document uploaded successfully!');
          loadDocuments(); // Refresh the list
        } catch (err: any) {
          alert(err.message || 'Failed to upload document');
        } finally {
          setUploadingDocument(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await employeeProfileService.deleteDocument(documentId);
      alert('Document deleted successfully!');
      loadDocuments(); // Refresh the list
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await employeeProfileService.getDocument(documentId);
      const doc = response.data as any;

      // Create download link
      const link = window.document.createElement('a');
      link.href = doc.fileData;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to download document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading profile</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800 font-medium">No profile data found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-600 mt-2">View and manage your personal information</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/department-employee/employee-profile/emergency-contacts">
            <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
              Emergency Contacts
            </button>
          </Link>
          <Link href="/dashboard/department-employee/employee-profile/edit">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Edit Profile
            </button>
          </Link>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex items-center gap-6">
          {/* Profile Picture */}
          <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
            {profile.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-6xl">👤</div>
            )}
            {!profile.profilePictureUrl && (
              <div className="text-6xl">👤</div>
            )}
          </div>

          <div>
            <h2 className="text-3xl font-bold">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-blue-100 mt-2">{profile.position || 'N/A'}</p>
            <p className="text-blue-100">{profile.department || 'N/A'}</p>
            <div className="mt-4 inline-block px-3 py-1 bg-blue-500 rounded-full text-sm font-medium">
              {profile.status || 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-3 font-medium transition-colors ${activeTab === 'personal'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab('employment')}
          className={`px-4 py-3 font-medium transition-colors ${activeTab === 'employment'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Employment Details
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-3 font-medium transition-colors ${activeTab === 'documents'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Documents
        </button>
      </div>

      {/* Personal Information Tab */}
      {activeTab === 'personal' && (
        <>
          {/* Personal Information Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700">Work Email</label>
                  <p className="text-slate-900 mt-2 text-lg">{profile.workEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Personal Email</label>
                  <p className="text-slate-900 mt-2 text-lg">{profile.personalEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Mobile Phone</label>
                  <p className="text-slate-900 mt-2 text-lg">{profile.mobilePhone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Address</label>
                  <p className="text-slate-900 mt-2">
                    {profile.address ? (
                      <>
                        {profile.address.streetAddress && <>{profile.address.streetAddress}<br /></>}
                        {profile.address.city && <>{profile.address.city}, </>}
                        {profile.address.country}
                      </>
                    ) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Personal Details</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                    <p className="text-slate-900 mt-2">
                      {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Gender</label>
                    <p className="text-slate-900 mt-2">{profile.gender || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Marital Status</label>
                    <p className="text-slate-900 mt-2">{profile.maritalStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Nationality</label>
                    <p className="text-slate-900 mt-2">{profile.nationality || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {profile.biography && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">About Me</h3>
              <p className="text-slate-700 leading-relaxed">{profile.biography}</p>
            </div>
          )}
        </>
      )}

      {/* Employment Details Tab */}
      {activeTab === 'employment' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employment Details */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Employment Details</h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700">Employee ID</label>
                <p className="text-slate-900 mt-2 font-mono text-lg">{profile.employeeNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Date of Hire</label>
                <p className="text-slate-900 mt-2">
                  {profile.dateOfHire ? new Date(profile.dateOfHire).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Contract Type</label>
                <p className="text-slate-900 mt-2">{profile.contractType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Employment Status</label>
                <p className="text-slate-900 mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${profile.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {profile.status || 'N/A'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Position & Management */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Position & Management</h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700">Department</label>
                <p className="text-slate-900 mt-2">{profile.department || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Position</label>
                <p className="text-slate-900 mt-2">{profile.position || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Direct Manager</label>
                <p className="text-slate-900 mt-2">{profile.manager || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Pay Grade</label>
                <p className="text-slate-900 mt-2">{profile.payGrade || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Upload New Document</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0];
                const documentType = formData.get('documentType') as string;
                const description = formData.get('description') as string;

                if (file) {
                  handleUploadDocument(file, documentType, description);
                  e.currentTarget.reset();
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="documentType"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  >
                    <option value="" className="text-slate-500">Select type...</option>
                    <option value="ID_CARD">ID Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                    <option value="EDUCATION_CERTIFICATE">Education Certificate</option>
                    <option value="PROFESSIONAL_CERTIFICATION">Professional Certification</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="OFFER_LETTER">Offer Letter</option>
                    <option value="MEDICAL_RECORD">Medical Record</option>
                    <option value="BACKGROUND_CHECK">Background Check</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Choose File <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="file"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Optional description..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-900 placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={uploadingDocument}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingDocument ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">My Documents ({documents.length})</h3>

            {loadingDocuments ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-slate-600 text-lg mb-2">No documents uploaded yet</p>
                <p className="text-slate-500 text-sm">Upload your first document using the form above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-slate-600">
                          {doc.mimeType?.startsWith('image/') ? 'IMG' :
                            doc.mimeType?.includes('pdf') ? 'PDF' :
                              doc.mimeType?.includes('word') ? 'DOC' :
                                'FILE'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{doc.fileName}</h4>
                        <div className="flex gap-4 mt-1 text-sm text-slate-500">
                          <span>{doc.documentType.replace(/_/g, ' ')}</span>
                          <span>•</span>
                          <span>{doc.fileSizeKB} KB</span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mt-1">{doc.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadDocument(doc._id, doc.fileName)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc._id, doc.fileName)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Link href="/dashboard/department-employee/employee-profile/edit">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Edit Profile
          </button>
        </Link>
        <Link href="/dashboard/department-employee">
          <button className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
            Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}

