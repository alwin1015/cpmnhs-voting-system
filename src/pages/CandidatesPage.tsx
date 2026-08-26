import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useRef, useMemo, useCallback } from 'react';
import { User, Plus, Pencil, Trash2, X, Upload, Save, Building2, Crop } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage';

interface CandidateForm {
  name: string;
  party: string;
  position: string;
  gradeLevel: string;
  section: string;
  motto: string;
  photo: string;
}

const emptyForm: CandidateForm = {
  name: '',
  party: '',
  position: '',
  gradeLevel: '',
  section: '',
  motto: '',
  photo: '',
};

export default function CandidatesPage() {
  const { candidates, positions, addCandidate, updateCandidate, deleteCandidate, user, isLoggedIn, activeSession } = useVoting();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CandidateForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const isAdmin = isLoggedIn && user?.role === 'admin';

  const positionOrder = useMemo(() => {
    return positions.reduce((acc, p) => ({ ...acc, [p.id]: p.order }), {} as Record<string, number>);
  }, [positions]);

  const getPositionName = (id: string) => {
    return positions.find(p => p.id === id)?.name || id;
  };

  // We will directly iterate over `positions` in the render to group by position.
  
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    // Clear input so selecting the same file again works
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveCrop = async () => {
    try {
      if (!imageToCrop || !croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      setForm(prev => ({ ...prev, photo: croppedImage }));
      setCropModalOpen(false);
      setImageToCrop(null);
    } catch (e) {
      console.error('Error cropping image:', e);
      alert('Failed to crop image');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.position || !form.gradeLevel.trim() || !form.section.trim()) {
      alert('Please fill in all required fields: Name, Position, Grade Level, and Section.');
      return;
    }

    const partyValue = form.party.trim() || 'Independent';
    
    // Capture data for background saving
    const isEdit = !!editingId;
    const currentEditingId = editingId;
    const payload = {
      name: form.name.trim(),
      party: partyValue,
      position: form.position,
      gradeLevel: form.gradeLevel.trim(),
      section: form.section.trim(),
      motto: form.motto.trim(),
      photo: form.photo,
    };

    // Instant UI dismissal
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setIsSaving(false);

    // Background save
    try {
      if (isEdit && currentEditingId) {
        updateCandidate(currentEditingId, payload).catch(err => {
          console.error('Save candidate error:', err);
          alert('Failed to update candidate: ' + (err?.message || 'Please check your database connection or try again.'));
        });
      } else {
        addCandidate(payload).catch(err => {
          console.error('Save candidate error:', err);
          alert('Failed to add candidate: ' + (err?.message || 'Please check your database connection or try again.'));
        });
      }
    } catch (err: any) {
      console.error('Sync execution error:', err);
    }
  };

  const handleEdit = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (candidate) {
      setForm({
        name: candidate.name,
        party: candidate.party,
        position: candidate.position,
        gradeLevel: candidate.gradeLevel,
        section: candidate.section,
        motto: candidate.motto,
        photo: candidate.photo,
      });
      setEditingId(candidateId);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = (id: string) => {
    deleteCandidate(id);
    setDeleteConfirm(null);
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 animate-slide-up">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Candidates</h1>
              <p className="text-gray-500">Manage candidates for <span className="font-semibold text-blue-600">{activeSession?.name || 'Session 1'}</span></p>
            </div>
            
            {isAdmin && !showForm && (
              <Button
                onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
                className="gap-2 text-white shadow-lg hover:shadow-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                <Plus className="h-5 w-5" />
                Add Candidate
              </Button>
            )}
          </div>

          {/* Add/Edit Form */}
          {showForm && isAdmin && (
            <Card className="mb-10 shadow-xl border-blue-100 animate-in zoom-in-95 duration-300 max-w-3xl mx-auto">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-t-xl text-white flex justify-between items-center">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingId ? 'Edit Candidate' : 'Add New Candidate'}
                </h3>
                <button onClick={handleCancel} className="p-1 text-blue-100 hover:text-white bg-blue-700/50 hover:bg-blue-700 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <CardContent className="p-6 bg-[#f8faff] rounded-b-xl">
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Photo Upload */}
                  <div className="md:col-span-2 flex items-center gap-5 bg-white p-4 rounded-xl border border-blue-50 shadow-sm">
                    <div 
                      className="w-32 h-32 rounded-full border-2 border-dashed border-blue-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all flex-shrink-0 relative group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {form.photo ? (
                        <>
                          <img src={form.photo} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-10 w-10 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-blue-400 group-hover:text-blue-600 transition-colors">
                          <Upload className="h-8 w-8 mx-auto mb-1" />
                          <span className="text-xs uppercase font-bold">Upload</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1">Candidate Photo</h4>
                      <p className="text-xs text-gray-500 mb-2">Upload a professional, clear photo (max 5MB, JPG/PNG).</p>
                      {form.photo && (
                        <button 
                          onClick={() => setForm(prev => ({ ...prev, photo: '' }))} 
                          className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoSelect} 
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="e.g. Juan Dela Cruz"
                    />
                  </div>
                  
                  {/* Position */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Position *</label>
                    <select
                      value={form.position}
                      onChange={e => setForm(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select a position...</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Party */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Partylist (Optional)</label>
                    <input
                      type="text"
                      value={form.party}
                      onChange={e => setForm(prev => ({ ...prev, party: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="e.g. PROGRESS Partylist"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Grade Level */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Grade *</label>
                      <select
                        value={form.gradeLevel}
                        onChange={e => setForm(prev => ({ ...prev, gradeLevel: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">Select grade</option>
                        <option value="7">Grade 7</option>
                        <option value="8">Grade 8</option>
                        <option value="9">Grade 9</option>
                        <option value="10">Grade 10</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Section *</label>
                      <input
                        type="text"
                        value={form.section}
                        onChange={e => setForm(prev => ({ ...prev, section: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="e.g. Rizal"
                      />
                    </div>
                  </div>

                  {/* Motto */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Motto / Slogan</label>
                    <input
                      type="text"
                      value={form.motto}
                      onChange={e => setForm(prev => ({ ...prev, motto: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="e.g. Leadership with Integrity"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200/50">
                  <Button variant="outline" onClick={handleCancel} className="px-6">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="gap-2 text-white px-8 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : editingId ? 'Update Candidate' : 'Save Candidate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grouped Candidates by Position */}
          {candidates.length > 0 ? (
            <div className="space-y-10">
              {positions.filter(pos => candidates.some(c => c.position === pos.id)).map(pos => {
                const posCandidates = candidates.filter(c => c.position === pos.id);
                
                return (
                  <div key={pos.id} className="animate-fade-in">
                    <div className="flex items-center justify-between mb-4 pl-2 border-l-4 border-blue-500">
                      <div className="flex items-center gap-3">
                        <User className="h-6 w-6 text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-900">{pos.name}</h2>
                        <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                          {posCandidates.length} Candidates
                        </Badge>
                      </div>
                    </div>
                    
                    <Card className="border border-gray-100 shadow-lg overflow-hidden bg-white/95">
                      <div className="flex flex-col divide-y divide-gray-100/60">
                        {posCandidates.map((candidate) => (
                          <div key={candidate.id} className="group flex items-center px-5 py-3 hover:bg-slate-50/80 transition-colors">
                            <div className="flex-shrink-0 mr-4">
                              {candidate.photo ? (
                                <img src={candidate.photo} alt={candidate.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-100 shadow-inner">
                                  <User className="h-8 w-8 text-slate-400" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900 truncate">{candidate.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {candidate.party && candidate.party !== 'Independent' && (
                                    <>
                                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">{candidate.party}</span>
                                      <span className="text-gray-300 text-[10px]">�</span>
                                    </>
                                  )}
                                  <span className="text-[11px] font-medium text-gray-500">Grade {candidate.gradeLevel} - {candidate.section}</span>
                                  {candidate.motto && (
                                    <>
                                      <span className="text-gray-300 text-[10px]">�</span>
                                      <span className="text-[11px] text-gray-400 italic truncate max-w-xs">"{candidate.motto}"</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {isAdmin && (
                              <div className="flex-shrink-0 flex items-center justify-end gap-1.5 opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEdit(candidate.id)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {deleteConfirm === candidate.id ? (
                                  <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-100 shadow-sm animate-in fade-in slide-in-from-right-2">
                                    <button
                                      onClick={() => handleDelete(candidate.id)}
                                      className="px-2.5 py-1 text-[10px] font-bold text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="px-2.5 py-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(candidate.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <User className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Candidates Found</h3>
              <p className="text-gray-400 mb-6">There are no candidates registered in the system yet.</p>
              {isAdmin && (
                <Button
                  onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
                  className="gap-2 text-white shadow-md hover:shadow-lg transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                >
                  <Plus className="h-5 w-5" />
                  Add First Candidate
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Image Cropper Modal */}
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden m-4">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Crop className="w-5 h-5 text-blue-600" />
                Crop Photo
              </h3>
              <button 
                onClick={() => { setCropModalOpen(false); setImageToCrop(null); }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative w-full h-80 bg-black">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-6 bg-gray-50 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setCropModalOpen(false); setImageToCrop(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCrop} className="bg-blue-600 text-white hover:bg-blue-700">
                  Save Crop
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}




