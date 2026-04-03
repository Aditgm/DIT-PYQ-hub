import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePaperMetadata, approvePaper, rejectPaper } from '../api/papers';

const editSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  subject: z.string().min(2, 'Subject is required'),
  degree: z.enum(['BTech', 'BArch', 'BCA', 'MCA', 'MTech']),
  branch: z.string().min(2, 'Branch is required'),
  semester: z.number().int().min(1).max(8),
  year: z.number().int().min(2015).max(new Date().getFullYear()),
  exam_type: z.enum(['Mid Term', 'End Term', 'Supplementary']),
  description: z.string().max(500).optional(),
  edit_reason: z.string().min(10, 'Edit reason must be at least 10 characters').max(500)
});

const PaperMetadataEditor = ({ 
  paper, 
  mode = 'post_upload', // 'approval' | 'post_upload'
  onClose, 
  onSuccess,
  showStatusActions = false
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: paper.title,
      subject: paper.subject,
      degree: paper.degree,
      branch: paper.branch,
      semester: paper.semester,
      year: paper.year,
      exam_type: paper.exam_type,
      description: paper.description || '',
      edit_reason: ''
    },
    mode: 'onChange'
  });

  const formValues = watch();

  useEffect(() => {
    const changed = Object.keys(formValues).some(key => {
      if (key === 'edit_reason') return false;
      return JSON.stringify(formValues[key]) !== JSON.stringify(paper[key]);
    });
    setHasChanges(changed);
  }, [formValues, paper]);

  const onSaveMetadata = async (data) => {
    setIsSaving(true);
    setError(null);

    try {
      const metadata = {
        title: data.title,
        subject: data.subject,
        degree: data.degree,
        branch: data.branch,
        semester: data.semester,
        year: data.year,
        exam_type: data.exam_type,
        description: data.description
      };

      await updatePaperMetadata(paper.id, metadata, data.edit_reason, paper.record_version);
      onSuccess?.('Metadata updated successfully');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onApprove = async (data) => {
    setIsSaving(true);
    setError(null);

    try {
      const metadata = hasChanges ? {
        title: data.title,
        subject: data.subject,
        degree: data.degree,
        branch: data.branch,
        semester: data.semester,
        year: data.year,
        exam_type: data.exam_type,
        description: data.description
      } : {};

      await approvePaper(paper.id, metadata, '', data.edit_reason, paper.record_version);
      onSuccess?.('Paper approved successfully');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onReject = async (data) => {
    setIsSaving(true);
    setError(null);

    try {
      const metadata = hasChanges ? {
        title: data.title,
        subject: data.subject,
        degree: data.degree,
        branch: data.branch,
        semester: data.semester,
        year: data.year,
        exam_type: data.exam_type,
        description: data.description
      } : {};

      await rejectPaper(paper.id, data.edit_reason, metadata, paper.record_version);
      onSuccess?.('Paper rejected successfully');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
      <h3 className="text-xl font-bold mb-4">
        {mode === 'approval' ? 'Review & Edit Paper' : 'Edit Paper Metadata'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md" role="alert">
          {error}
        </div>
      )}

      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              type="text"
              {...register('title')}
              className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && <p id="title-error" className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="subject">
              Subject *
            </label>
            <input
              id="subject"
              type="text"
              {...register('subject')}
              className={`w-full px-3 py-2 border rounded-md ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="degree">
              Degree *
            </label>
            <select
              id="degree"
              {...register('degree')}
              className={`w-full px-3 py-2 border rounded-md ${errors.degree ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="BTech">BTech</option>
              <option value="BArch">BArch</option>
              <option value="BCA">BCA</option>
              <option value="MCA">MCA</option>
              <option value="MTech">MTech</option>
            </select>
            {errors.degree && <p className="text-red-500 text-sm mt-1">{errors.degree.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="branch">
              Branch *
            </label>
            <input
              id="branch"
              type="text"
              {...register('branch')}
              className={`w-full px-3 py-2 border rounded-md ${errors.branch ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.branch && <p className="text-red-500 text-sm mt-1">{errors.branch.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="semester">
              Semester *
            </label>
            <select
              id="semester"
              {...register('semester', { valueAsNumber: true })}
              className={`w-full px-3 py-2 border rounded-md ${errors.semester ? 'border-red-500' : 'border-gray-300'}`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
            {errors.semester && <p className="text-red-500 text-sm mt-1">{errors.semester.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="year">
              Year *
            </label>
            <input
              id="year"
              type="number"
              {...register('year', { valueAsNumber: true })}
              className={`w-full px-3 py-2 border rounded-md ${errors.year ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="exam_type">
              Exam Type *
            </label>
            <select
              id="exam_type"
              {...register('exam_type')}
              className={`w-full px-3 py-2 border rounded-md ${errors.exam_type ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="Mid Term">Mid Term</option>
              <option value="End Term">End Term</option>
              <option value="Supplementary">Supplementary</option>
            </select>
            {errors.exam_type && <p className="text-red-500 text-sm mt-1">{errors.exam_type.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={2}
              className={`w-full px-3 py-2 border rounded-md ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">File Information (Read-only)</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>File type: {paper.file_type}</div>
            <div>File size: {(paper.file_size / 1024 / 1024).toFixed(2)} MB</div>
            <div>Uploaded: {new Date(paper.created_at).toLocaleDateString()}</div>
            <div>Status: {paper.status}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit_reason">
            Edit Reason * {hasChanges && <span className="text-red-500">(Required when changes are made)</span>}
          </label>
          <textarea
            id="edit_reason"
            {...register('edit_reason')}
            rows={2}
            className={`w-full px-3 py-2 border rounded-md ${errors.edit_reason ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Explain why these changes are being made..."
            required={hasChanges}
          />
          {errors.edit_reason && <p className="text-red-500 text-sm mt-1">{errors.edit_reason.message}</p>}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          
          {mode === 'post_upload' && (
            <button
              type="button"
              onClick={handleSubmit(onSaveMetadata)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}

          {mode === 'approval' && showStatusActions && (
            <>
              <button
                type="button"
                onClick={handleSubmit(onReject)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Processing...' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={handleSubmit(onApprove)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Processing...' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default PaperMetadataEditor;