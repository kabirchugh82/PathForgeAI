import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Cpu,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { UserProfile, ResumeMeta } from '../types/profile.ts';
import { StorageService } from '../services/storageService.ts';

interface OnboardingPageProps {
  onProfileExtracted: (profile: UserProfile, meta?: ResumeMeta) => void;
  onNavigate: (route: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  onProfileExtracted,
  onNavigate
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsingStep, setParsingStep] = useState<'idle' | 'parsing_doc' | 'gemini_extract' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [extractedRawText, setExtractedRawText] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'docx', 'txt', 'md'];

    if (!ext || !allowed.includes(ext)) {
      setErrorMessage(`Unsupported file format (.${ext}). Please upload a PDF, DOCX, or TXT document.`);
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15MB limit.');
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    setErrorDetails(null);
  };

  const handleProcessResume = async () => {
    if (!file) return;

    setParsingStep('gemini_extract');
    setErrorMessage(null);
    setErrorDetails(null);

    try {
      // Send the uploaded document file directly to the backend
      // Backend passes the PDF bytes as application/pdf inlineData directly to Gemini 3.8 Flash
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resume/upload-and-extract', {
        method: 'POST',
        body: formData
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        console.warn('[Server returned non-JSON body]:', rawText.slice(0, 150));
        throw new Error(`Server returned non-JSON response (${response.status}). You can use the local Fallback Parser to extract skills immediately.`);
      }

      if (!response.ok || !data) {
        const technicalMsg = data?.message || data?.error || `AI Extraction failed with status ${response.status}`;
        throw new Error(technicalMsg);
      }

      if (!data.success || !data.profile) {
        throw new Error('AI extraction returned invalid profile payload.');
      }

      setParsingStep('complete');
      if (data.meta) {
        StorageService.saveResumeMeta(data.meta);
      }
      onProfileExtracted(data.profile, data.meta);
      onNavigate('/profile');
    } catch (err: any) {
      console.error('[Onboarding Extraction Error]:', err);
      setParsingStep('error');
      setErrorMessage(err.message || 'An unexpected error occurred during resume processing.');
      setErrorDetails(err.stack || null);
    }
  };

  const handleFallbackExtraction = async () => {
    if (!file) return;

    try {
      setParsingStep('parsing_doc');
      const formData = new FormData();
      formData.append('resume', file);

      const fallbackRes = await fetch('/api/resume/fallback', {
        method: 'POST',
        body: formData
      });

      const rawText = await fallbackRes.text();
      let fallbackData: any = null;

      try {
        fallbackData = JSON.parse(rawText);
      } catch {
        throw new Error(`Fallback parser returned non-JSON response (${fallbackRes.status}).`);
      }

      if (!fallbackRes.ok || !fallbackData) {
        throw new Error(fallbackData?.message || `Fallback parser failed with status ${fallbackRes.status}`);
      }

      if (fallbackData.profile) {
        setIsFallbackMode(true);
        setParsingStep('complete');
        onProfileExtracted(fallbackData.profile);
        onNavigate('/profile');
      } else {
        throw new Error('Fallback parser could not extract a valid profile.');
      }
    } catch (err: any) {
      setErrorMessage(`Fallback parser error: ${err.message}`);
      setParsingStep('error');
    }
  };

  const handleCreateBlankProfile = () => {
    const blankProfile: UserProfile = {
      id: `profile-${Date.now()}`,
      fullName: '',
      email: '',
      phone: '',
      currentRole: '',
      yearsOfExperience: null,
      location: '',
      education: [],
      skills: [],
      technicalSkills: [],
      softSkills: [],
      projects: [],
      certifications: [],
      workExperience: [],
      careerInterests: [],
      domains: [],
      tools: [],
      languages: [],
      achievements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      extractionSource: 'manual',
      extractionConfidence: 1.0
    };
    onProfileExtracted(blankProfile);
    onNavigate('/profile');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real User Mode • Arbitrary Resume Parser</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Upload Your Career Resume
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
          PathForge accepts any real PDF, DOCX, or TXT resume. Information is extracted with 100% fidelity without fabricated placeholder values.
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
            : 'border-slate-750 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 shadow-inner">
            <FileText className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Drag & Drop your resume here, or <span className="text-cyan-400 underline decoration-cyan-500/50">browse files</span>
            </h3>
            <p className="text-xs text-slate-400">
              Supports PDF, DOCX, TXT documents up to 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Selected File Details */}
      {file && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-950 border border-cyan-800/50 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">{file.name}</h4>
              <p className="text-xs text-slate-400 font-mono">
                {(file.size / 1024).toFixed(1)} KB • {file.name.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFile(null); setParsingStep('idle'); setErrorMessage(null); }}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              onClick={handleProcessResume}
              disabled={parsingStep === 'parsing_doc' || parsingStep === 'gemini_extract'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition disabled:opacity-60"
            >
              {parsingStep === 'parsing_doc' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading Document...
                </>
              )}
              {parsingStep === 'gemini_extract' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI Extracting Skills...
                </>
              )}
              {(parsingStep === 'idle' || parsingStep === 'error' || parsingStep === 'complete') && (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract & Verify Profile
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress Status Bar */}
      {(parsingStep === 'parsing_doc' || parsingStep === 'gemini_extract') && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              {parsingStep === 'parsing_doc'
                ? 'Preparing document stream for fallback parser...'
                : 'Passing document bytes to Gemini 3.8 Flash for structured candidate extraction...'}
            </span>
            <span className="text-cyan-400 font-mono">
              Processing
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 animate-pulse"
              style={{ width: '85%' }}
            />
          </div>
        </div>
      )}

      {/* Error Message & Fallback Option */}
      {parsingStep === 'error' && errorMessage && (
        <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-200">Extraction Error</h4>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-rose-900/40">
            <button
              onClick={handleProcessResume}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-900/60 hover:bg-rose-800/80 text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry AI Extraction
            </button>

            <button
              onClick={handleFallbackExtraction}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-yellow-300 border border-yellow-700/50 transition"
              title="Runs local deterministic skill dictionary parser"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
              Use Fallback Skill Parser
            </button>

            <button
              onClick={handleCreateBlankProfile}
              className="text-xs text-slate-400 hover:text-slate-200 underline ml-auto"
            >
              Or enter profile manually →
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Fallback Link */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          Don't have a resume file on hand?{' '}
          <button
            onClick={handleCreateBlankProfile}
            className="text-cyan-400 hover:underline font-semibold"
          >
            Create or paste your profile manually
          </button>
        </p>
      </div>
    </div>
  );
};
