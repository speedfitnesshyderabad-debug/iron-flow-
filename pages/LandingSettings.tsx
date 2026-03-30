
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HomePageSettings {
  heroType: 'image' | 'video';
  heroImageUrl: string;
  heroVideoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
}

const DEFAULT_SETTINGS: HomePageSettings = {
  heroType: 'image',
  heroImageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2070',
  heroVideoUrl: '',
  heroTitle: 'Elite Workout Experience',
  heroSubtitle: 'Access premium facilities, expert trainers, and a community dedicated to your transformation. Find your nearest IronFlow branch today.',
  heroTagline: 'The Future of Fitness is Here',
};

const STORAGE_KEY = 'ironflow_home_settings';

export function loadHomeSettings(): HomePageSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

// ─── Component ────────────────────────────────────────────────────────────────
const LandingSettings: React.FC = () => {
  const { currentUser, branches, updateBranch, siteSettings, updateSiteSetting, showToast } = useAppContext();
  const [settings, setSettings] = useState<HomePageSettings>(siteSettings.home_hero);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'hero' | 'branches'>('hero');
  const [branchImages, setBranchImages] = useState<Record<string, { imageUrl: string; videoUrl: string }>>({});

  // Sync settings if they change in context
  useEffect(() => {
    if (siteSettings.home_hero) {
      setSettings(siteSettings.home_hero);
    }
  }, [siteSettings.home_hero]);

  // Only Super Admin can access this page
  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="text-sm font-bold uppercase tracking-widest">Access Denied — Super Admin Only</p>
      </div>
    );
  }

  // Load branch image overrides from local state
  useEffect(() => {
    const init: Record<string, { imageUrl: string; videoUrl: string }> = {};
    branches.forEach(b => {
      init[b.id] = { imageUrl: b.imageUrl || '', videoUrl: b.videoUrl || '' };
    });
    setBranchImages(init);
  }, [branches]);

  const handleSaveHero = async () => {
    try {
      await updateSiteSetting('home_hero', settings);
      setSaved(true);
      showToast?.('Landing page hero saved!', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      showToast?.('Failed to save hero settings.', 'error');
    }
  };

  const handleSaveBranchMedia = async (branchId: string) => {
    const data = branchImages[branchId];
    if (!data) return;
    try {
      await updateBranch(branchId, { imageUrl: data.imageUrl, videoUrl: data.videoUrl });
      showToast?.('Branch media updated!', 'success');
    } catch {
      showToast?.('Failed to save branch media.', 'error');
    }
  };

  const heroPreviewUrl = settings.heroType === 'video' ? settings.heroVideoUrl : settings.heroImageUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
          <i className="fas fa-paint-brush text-white text-xl"></i>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Landing Page Settings</h1>
          <p className="text-sm text-slate-500 font-medium">Customise what visitors see on the public-facing home page</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'hero', label: 'Hero Section', icon: 'fa-image' },
          { id: 'branches', label: 'Branch Cards', icon: 'fa-building' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'hero' | 'branches')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className={`fas ${tab.icon} text-xs`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Hero Tab ── */}
      {activeTab === 'hero' && (
        <div className="space-y-6">

          {/* Live Preview */}
          <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl relative bg-slate-950" style={{ height: 280 }}>
            {settings.heroType === 'video' && settings.heroVideoUrl ? (
              <video
                key={settings.heroVideoUrl}
                src={settings.heroVideoUrl}
                autoPlay muted loop playsInline
                className="w-full h-full object-cover opacity-60"
              />
            ) : settings.heroImageUrl ? (
              <img
                src={settings.heroImageUrl}
                alt="Hero preview"
                className="w-full h-full object-cover opacity-60"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                <i className="fas fa-image text-4xl text-slate-700"></i>
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-3 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                {settings.heroTagline || 'Tagline here...'}
              </span>
              <h2 className="text-4xl font-black text-white uppercase italic leading-none tracking-tighter">
                {settings.heroTitle || 'Hero Title'}
              </h2>
              <p className="text-slate-400 text-xs mt-3 max-w-md leading-relaxed font-medium">
                {settings.heroSubtitle || 'Subtitle text...'}
              </p>
            </div>
            <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full backdrop-blur-sm">
              Live Preview
            </div>
          </div>

          {/* Media Type Toggle */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-film text-blue-500"></i> Background Media
            </h3>

            <div className="flex gap-3">
              {['image', 'video'].map(type => (
                <button
                  key={type}
                  onClick={() => setSettings(s => ({ ...s, heroType: type as 'image' | 'video' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black uppercase tracking-widest border-2 transition-all ${
                    settings.heroType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <i className={`fas ${type === 'image' ? 'fa-image' : 'fa-video'}`}></i>
                  {type}
                </button>
              ))}
            </div>

            {settings.heroType === 'image' ? (
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Hero Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={settings.heroImageUrl}
                  onChange={e => setSettings(s => ({ ...s, heroImageUrl: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <p className="text-[11px] text-slate-400">Paste any public image URL (Unsplash, your CDN, etc.)</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Hero Video URL</label>
                <input
                  type="url"
                  placeholder="https://cdn.example.com/promo.mp4"
                  value={settings.heroVideoUrl}
                  onChange={e => setSettings(s => ({ ...s, heroVideoUrl: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <p className="text-[11px] text-slate-400">Must be a direct MP4/WebM link. YouTube embeds are not supported as background.</p>
              </div>
            )}
          </div>

          {/* Copy Settings */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-pencil-alt text-blue-500"></i> Hero Copy
            </h3>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tagline (small badge text)</label>
              <input
                type="text"
                maxLength={60}
                value={settings.heroTagline}
                onChange={e => setSettings(s => ({ ...s, heroTagline: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Main Title</label>
              <input
                type="text"
                maxLength={80}
                value={settings.heroTitle}
                onChange={e => setSettings(s => ({ ...s, heroTitle: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Subtitle / Description</label>
              <textarea
                rows={3}
                maxLength={200}
                value={settings.heroSubtitle}
                onChange={e => setSettings(s => ({ ...s, heroSubtitle: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveHero}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
              saved
                ? 'bg-green-500 shadow-green-200 text-white'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-200 text-white'
            }`}
          >
            {saved ? (
              <><i className="fas fa-check mr-2"></i>Saved! Refresh Home Page to Preview</>
            ) : (
              <><i className="fas fa-save mr-2"></i>Save Hero Settings</>
            )}
          </button>
        </div>
      )}

      {/* ── Branch Cards Tab ── */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-medium">
            Set a custom image or video for each branch card on the landing page. Leave blank to use the default Unsplash placeholder.
          </p>

          {branches.map(branch => (
            <div key={branch.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Branch preview strip */}
              <div
                className="h-28 relative bg-slate-900"
                style={{
                  backgroundImage: branchImages[branch.id]?.imageUrl
                    ? `url(${branchImages[branch.id].imageUrl})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-4">
                  <div>
                    <p className="text-white font-black uppercase tracking-tight text-lg leading-none">{branch.name}</p>
                    <p className="text-slate-400 text-xs mt-1">{branch.address}</p>
                  </div>
                </div>
                {branchImages[branch.id]?.videoUrl && (
                  <div className="absolute top-3 right-3 bg-blue-600/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1">
                    <i className="fas fa-video text-[9px]"></i> Video set
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Card Image URL</label>
                  <input
                    type="url"
                    placeholder="https://your-cdn.com/gym-branch.jpg"
                    value={branchImages[branch.id]?.imageUrl || ''}
                    onChange={e => setBranchImages(prev => ({
                      ...prev,
                      [branch.id]: { ...prev[branch.id], imageUrl: e.target.value }
                    }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Card Video URL <span className="text-slate-300">(optional, plays on hover)</span></label>
                  <input
                    type="url"
                    placeholder="https://your-cdn.com/branch-tour.mp4"
                    value={branchImages[branch.id]?.videoUrl || ''}
                    onChange={e => setBranchImages(prev => ({
                      ...prev,
                      [branch.id]: { ...prev[branch.id], videoUrl: e.target.value }
                    }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <button
                  onClick={() => handleSaveBranchMedia(branch.id)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                >
                  <i className="fas fa-save mr-2"></i>Save {branch.name.split(' ').pop()} Media
                </button>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <i className="fas fa-building text-4xl mb-4 opacity-20"></i>
              <p className="text-sm font-black uppercase tracking-widest">No branches found</p>
            </div>
          )}

          {/* SQL Reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
            <i className="fas fa-database text-amber-500 mt-0.5"></i>
            <div>
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">SQL Required for Branch Images</p>
              <p className="text-xs text-amber-600 font-medium leading-relaxed">
                Run this in Supabase SQL Editor to persist branch media:
              </p>
              <pre className="text-[11px] bg-amber-100 text-amber-800 p-3 rounded-xl mt-2 font-mono overflow-x-auto">{`ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingSettings;
