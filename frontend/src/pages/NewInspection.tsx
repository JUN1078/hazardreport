import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, X, CheckCircle2, AlertCircle, FileImage,
  MapPin, Calendar, User, Building2, ChevronRight, Brain,
  Navigation, RefreshCw, Crosshair
} from 'lucide-react';
import { inspectionApi } from '../lib/api';

type Step = 'form' | 'preview' | 'analyzing' | 'done' | 'error';
type GeoStatus = 'idle' | 'loading' | 'success' | 'denied' | 'unavailable' | 'error';
interface GeoState { status: GeoStatus; lat?: number; lng?: number; accuracy?: number; }

interface FormData {
  project_name: string;
  location: string;
  inspection_date: string;
  inspector_name: string;
  department: string;
  notes: string;
}

export default function NewInspection() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>({
    project_name: '',
    location: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspector_name: '',
    department: '',
    notes: '',
  });
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [error, setError] = useState('');
  const [resultId, setResultId] = useState<number | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      const file = accepted[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const setField = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const captureGPS = () => {
    if (!navigator.geolocation) { setGeo({ status: 'unavailable' }); return; }
    setGeo({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGeo({ status: 'success', lat, lng, accuracy });
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const d = await r.json();
          const addr = [
            d.address?.road,
            d.address?.suburb || d.address?.neighbourhood,
            d.address?.city || d.address?.town || d.address?.village || d.address?.county,
            d.address?.state,
          ].filter(Boolean).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setForm((f) => ({ ...f, location: addr }));
        } catch { /* no address — coordinates still stored */ }
      },
      (err) => setGeo({ status: err.code === 1 ? 'denied' : 'error' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async () => {
    if (!imageFile) { setError('Please upload an image'); return; }
    if (!form.project_name) { setError('Project name is required'); return; }
    if (!form.inspection_date) { setError('Inspection date is required'); return; }

    setStep('analyzing');
    setError('');

    const fd = new FormData();
    fd.append('image', imageFile);
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (geo.lat !== undefined && geo.lng !== undefined) {
      fd.append('latitude', String(geo.lat));
      fd.append('longitude', String(geo.lng));
      if (geo.accuracy !== undefined) fd.append('location_accuracy', String(geo.accuracy));
    }

    try {
      const res = await inspectionApi.analyze(fd);
      setResultId(res.data.inspection.id);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Analysis failed. Please try again.');
      setStep('error');
    }
  };

  // Step: Form
  if (step === 'form' || step === 'preview') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="page-title">New Inspection</h1>
          <p className="text-gray-500 text-sm mt-1">Upload a workplace photo to begin AI hazard analysis</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2">
          {['Inspection Details', 'Photo Upload', 'AI Analysis'].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i === 0 ? 'bg-brand-700 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm ${i === 0 ? 'font-medium text-brand-700' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Form card */}
        <div className="card p-6">
          <h2 className="section-title mb-5">Inspection Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">
                <span className="flex items-center gap-1.5"><Building2 size={13} /> Project Name <span className="text-red-500">*</span></span>
              </label>
              <input
                className="input"
                placeholder="e.g. Tower A Construction Site"
                value={form.project_name}
                onChange={setField('project_name')}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> Location
                  <span className="text-xs text-gray-400 font-normal ml-1">— type or capture GPS</span>
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="e.g. Level 5, Section B"
                  value={form.location}
                  onChange={setField('location')}
                />
                <button
                  type="button"
                  onClick={captureGPS}
                  disabled={geo.status === 'loading'}
                  title="Auto-capture GPS coordinates and address"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-shrink-0 ${
                    geo.status === 'success'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : geo.status === 'denied' || geo.status === 'error'
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700'
                  }`}
                >
                  {geo.status === 'loading'
                    ? <RefreshCw size={15} className="animate-spin" />
                    : geo.status === 'success'
                    ? <CheckCircle2 size={15} />
                    : <Crosshair size={15} />}
                  <span className="hidden sm:inline">
                    {geo.status === 'loading' ? 'Locating…' : geo.status === 'success' ? 'GPS On' : 'Get GPS'}
                  </span>
                </button>
              </div>
              {geo.status === 'success' && geo.lat !== undefined && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                  <Navigation size={12} className="flex-shrink-0" />
                  <span>
                    <span className="font-medium">GPS tagged:</span>{' '}
                    {geo.lat.toFixed(6)}, {geo.lng!.toFixed(6)}
                    {geo.accuracy !== undefined && <span className="text-green-600"> · ±{Math.round(geo.accuracy)}m</span>}
                  </span>
                </div>
              )}
              {geo.status === 'denied' && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> Location access denied — enable it in browser settings.
                </p>
              )}
              {(geo.status === 'error' || geo.status === 'unavailable') && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {geo.status === 'unavailable' ? 'Geolocation not supported by this browser.' : 'GPS failed — enter location manually or try again.'}
                </p>
              )}
            </div>

            <div>
              <label className="label">
                <span className="flex items-center gap-1.5"><Calendar size={13} /> Inspection Date <span className="text-red-500">*</span></span>
              </label>
              <input
                className="input"
                type="date"
                value={form.inspection_date}
                onChange={setField('inspection_date')}
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="flex items-center gap-1.5"><User size={13} /> Inspector Name</span>
              </label>
              <input
                className="input"
                placeholder="Full name"
                value={form.inspector_name}
                onChange={setField('inspector_name')}
              />
            </div>

            <div>
              <label className="label">Department / Work Area</label>
              <input
                className="input"
                placeholder="e.g. Civil Works"
                value={form.department}
                onChange={setField('department')}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Additional Notes</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Any observations or context..."
                value={form.notes}
                onChange={setField('notes')}
              />
            </div>
          </div>
        </div>

        {/* Photo upload card */}
        <div className="card p-6">
          <h2 className="section-title mb-5">Workplace Photograph</h2>

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded-lg object-contain max-h-64 bg-gray-900"
              />
              <button
                onClick={() => { setImageFile(null); setImagePreview(''); }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <FileImage size={14} />
                <span>{imageFile?.name}</span>
                <span className="text-gray-400">({((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isDragActive ? 'bg-brand-100' : 'bg-gray-100'
                }`}>
                  <Upload size={24} className={isDragActive ? 'text-brand-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="font-medium text-gray-700">
                    {isDragActive ? 'Drop your image here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Supports JPG, PNG, GIF, WebP · Max 10MB</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!imageFile || !form.project_name}
            className="btn-primary flex items-center gap-2"
          >
            <Brain size={16} />
            Analyze with AI
          </button>
        </div>
      </div>
    );
  }

  // Step: Analyzing
  if (step === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Brain size={40} className="text-brand-600 animate-pulse-slow" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">AI Analysis in Progress</h2>
        <p className="text-gray-500 mb-6">Analyzing workplace photograph for hazards...</p>

        <div className="space-y-3 text-left bg-gray-50 rounded-xl p-5">
          {[
            'Scanning image for workplace hazards...',
            'Applying HIRA classification framework...',
            'Calculating severity × likelihood scores...',
            'Generating corrective action recommendations...',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-5 h-5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin flex-shrink-0" />
              {step}
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-5">This may take up to 30 seconds depending on image complexity</p>
      </div>
    );
  }

  // Step: Done
  if (step === 'done' && resultId) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis Complete!</h2>
        <p className="text-gray-500 mb-6">Hazards have been identified and classified. Review the results below.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/inspections/${resultId}`)}
            className="btn-primary flex items-center gap-2"
          >
            View Results <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Step: Error
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={40} className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
      <p className="text-gray-500 mb-2 text-sm">{error}</p>
      <p className="text-xs text-gray-400 mb-6">Check that your ANTHROPIC_API_KEY is configured correctly.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate('/')} className="btn-secondary">Dashboard</button>
        <button onClick={() => setStep('form')} className="btn-primary">Try Again</button>
      </div>
    </div>
  );
}
