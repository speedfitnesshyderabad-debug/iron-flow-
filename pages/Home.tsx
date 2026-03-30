
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { UserRole } from '../types';
import { loadHomeSettings } from './LandingSettings';

const Home: React.FC = () => {
    const { currentUser, branches, offers, plans, siteSettings } = useAppContext();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState('hero');
    const heroSettings = siteSettings.home_hero || {
        heroType: 'image',
        heroImageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2070',
        heroVideoUrl: '',
        heroTitle: 'Elite Workout Experience',
        heroSubtitle: 'Access premium facilities, expert trainers, and a community dedicated to your transformation. Find your nearest IronFlow branch today.',
        heroTagline: 'The Future of Fitness is Here',
    };

    // Handle Navbar scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const filteredBranches = useMemo(() => {
        if (!searchQuery) return branches;
        return branches.filter(b => 
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            b.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [branches, searchQuery]);

    const activeOffers = useMemo(() => offers.filter(o => o.isActive), [offers]);

    return (
        <div className="min-h-screen bg-slate-950 text-white font-['Outfit'] selection:bg-blue-500/30 overflow-x-hidden">
            {/* 1. STICKY NAVBAR — only shown to guests (logged-in users have the Layout header) */}
            {!currentUser && (
            <nav className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-500 px-6 md:px-12 py-4 flex items-center justify-between ${isScrolled ? 'bg-slate-950/80 backdrop-blur-2xl border-b border-white/5 py-3' : 'bg-transparent'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <i className="fas fa-bolt text-white text-xl"></i>
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase hidden sm:block">Iron<span className="text-blue-500">Flow</span></span>
                </div>

                <div className="hidden md:flex items-center gap-10">
                    <a href="#branches" className="text-[11px] font-black uppercase tracking-[0.2em] hover:text-blue-400 transition-colors">Branches</a>
                    <a href="#offers" className="text-[11px] font-black uppercase tracking-[0.2em] hover:text-blue-400 transition-colors">Offers</a>
                    <a href="#elite" className="text-[11px] font-black uppercase tracking-[0.2em] hover:text-blue-400 transition-colors">Elite Experience</a>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/login" className="text-[11px] font-black uppercase tracking-widest hover:text-blue-400 transition-colors px-4">Login</Link>
                    <Link 
                        to="/register" 
                        className="bg-white text-slate-950 hover:bg-blue-50 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                    >
                        Join Now
                    </Link>
                </div>
            </nav>
            )}


            {/* 2. HERO SECTION */}
            <section id="hero" className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
                {/* Background Media */}
                <div className="absolute inset-0 z-0">
                    {heroSettings.heroType === 'video' && heroSettings.heroVideoUrl ? (
                        <video
                            src={heroSettings.heroVideoUrl}
                            autoPlay muted loop playsInline
                            className="w-full h-full object-cover scale-105"
                        />
                    ) : (
                        <img 
                            src={heroSettings.heroImageUrl}
                            alt="IronFlow Elite Gym" 
                            className="w-full h-full object-cover scale-105 animate-[slowZoom_20s_infinite_alternate]"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/70 to-slate-950"></div>
                </div>

                <div className="relative z-10 max-w-4xl space-y-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-4">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">{heroSettings.heroTagline}</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase italic">
                        {heroSettings.heroTitle.split(' ').slice(0, -1).join(' ')} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
                            {heroSettings.heroTitle.split(' ').slice(-1)[0]}
                        </span>
                    </h1>
                    
                    <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        {heroSettings.heroSubtitle}
                    </p>

                    {/* Branch Finder Search */}
                    <div className="w-full max-w-xl mx-auto pt-8">
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-2 rounded-[2.5rem] flex items-center group focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-2xl">
                            <div className="w-12 h-12 flex items-center justify-center text-slate-500 ml-2">
                                <i className="fas fa-location-dot text-xl group-focus-within:text-blue-500 transition-colors"></i>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search by Branch Name or Location..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 flex-1 px-4 py-3 font-bold text-lg placeholder:text-slate-600 outline-none"
                            />
                            <button className="bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/20 transition-all active:scale-90">
                                <i className="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 pt-6">
                        <div className="flex -space-x-3">
                            {[1,2,3,4].map(i => (
                                <img key={i} src={`https://i.pravatar.cc/100?u=${i*10}`} className="w-10 h-10 rounded-full border-2 border-slate-900 shadow-xl" alt="" />
                            ))}
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">10,000+ Active Members</p>
                    </div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-40 cursor-pointer" onClick={() => document.getElementById('branches')?.scrollIntoView({ behavior: 'smooth' })}>
                    <i className="fas fa-chevron-down text-2xl"></i>
                </div>
            </section>

            {/* 3. OFFERS SECTION (Horizontal Scroll) */}
            <section id="offers" className="py-24 bg-slate-950 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-2 italic">Active <span className="text-blue-500">Deals</span></h2>
                        <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Exclusive Benefits for a Limited Time</p>
                    </div>
                    <Link to="/register" className="text-blue-500 text-xs font-black uppercase tracking-widest hover:translate-x-2 transition-transform hidden sm:flex items-center gap-2">
                        View All Benefits <i className="fas fa-chevron-right text-[10px]"></i>
                    </Link>
                </div>

                <div className="flex gap-6 overflow-x-auto scrollbar-hide px-6 md:px-12 pb-12 cursor-grab select-none">
                    {activeOffers.length > 0 ? activeOffers.map((offer, idx) => (
                        <div key={idx} className="min-w-[320px] md:min-w-[400px] bg-gradient-to-br from-white/10 to-transparent p-1 rounded-[3rem] backdrop-blur-3xl border border-white/5 relative group shrink-0">
                            <div className="bg-slate-900/50 rounded-[2.8rem] p-10 h-full flex flex-col">
                                <span className="bg-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full w-fit mb-6 tracking-widest uppercase">Special Promo</span>
                                <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 leading-none italic">{offer.title}</h3>
                                <p className="text-slate-400 font-medium mb-8 leading-relaxed flex-1">{offer.description}</p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Code</p>
                                        <p className="text-xl font-bold font-mono tracking-widest text-blue-400">{offer.id.split('-')[0].toUpperCase()}</p>
                                    </div>
                                    <button className="bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110">
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="w-full text-center py-20 text-slate-700 italic font-black uppercase tracking-widest opacity-20 text-4xl">
                            Loading Season Specials...
                        </div>
                    )}
                </div>
            </section>

            {/* 4. BRANCH SHOWCASE GRID */}
            <section id="branches" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16 px-6">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 italic">IronFlow <span className="text-blue-500">Nodes</span></h2>
                    <p className="text-slate-500 max-w-lg mx-auto font-medium">Explore our network of ultra-premium fitness hubs designed to push your limits.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredBranches.map((branch, idx) => {
                        const [videoActive, setVideoActive] = useState(false);
                        const cardBg = branch.imageUrl || `https://images.unsplash.com/photo-${1571902943202 + idx % 10}?auto=format&fit=crop&q=80&w=800`;
                        return (
                        <div
                            key={idx}
                            className="group relative rounded-[2.5rem] overflow-hidden aspect-[4/5] bg-slate-900/50 border border-white/5 shadow-2xl animate-[fadeIn_0.5s_ease-out]"
                            onMouseEnter={() => branch.videoUrl && setVideoActive(true)}
                            onMouseLeave={() => setVideoActive(false)}
                        >
                            {branch.videoUrl && videoActive ? (
                                <video
                                    src={branch.videoUrl}
                                    autoPlay muted loop playsInline
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <img 
                                    src={cardBg}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-90"
                                    alt={branch.name}
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                            
                            <div className="absolute inset-0 p-10 flex flex-col justify-end bg-black/40 group-hover:bg-transparent transition-colors">
                                <div className="space-y-3 translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-blue-600 w-1.5 h-1.5 rounded-full flex-shrink-0"></span>
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{branch.videoUrl ? 'Video Tour' : 'Elite Studio'}</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white hover:text-blue-400 transition-colors uppercase italic leading-none">{branch.name}</h3>
                                    <p className="text-slate-400 text-sm font-medium line-clamp-2">{branch.address}</p>
                                    
                                    <div className="pt-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Trainers</p>
                                                <p className="text-sm font-bold text-white">12+</p>
                                            </div>
                                            <div className="w-px h-6 bg-white/10 mt-2"></div>
                                            <div className="text-center">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Machines</p>
                                                <p className="text-sm font-bold text-white">45+</p>
                                            </div>
                                        </div>
                                        <button className="bg-white text-slate-950 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                            EXPLORE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </section>

            {/* 5. ELITE EXPERIENCE / PLANS */}
            <section id="elite" className="py-24 bg-slate-950 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full -ml-32 -mb-32 pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-10">
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] italic">
                            Unmatched <br />
                            <span className="text-blue-500">Elite</span> Standard
                        </h2>
                        <ul className="space-y-8">
                            {[
                                { t: '24/7 Access', d: 'Workout on your schedule at any branch worldwide.' },
                                { t: 'AI Progress Tracking', d: 'Smart diagnostics and machine integration for real results.' },
                                { t: 'World-Class Staff', d: 'Certified elite trainers and wellness nutritionists on site.' }
                            ].map((item, i) => (
                                <li key={i} className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:bg-blue-600 transition-colors">
                                        <i className="fas fa-check text-blue-500 group-hover:text-white transition-colors"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black uppercase tracking-tight mb-1 italic">{item.t}</h4>
                                        <p className="text-slate-500 font-medium leading-relaxed">{item.d}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <button className="bg-blue-600 hover:bg-blue-500 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 active:scale-95 transition-all">
                            Start My Transformation
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-10 rounded-full"></div>
                        <img 
                            src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=2070" 
                            className="rounded-[3rem] shadow-2xl relative z-10 border border-white/5 animate-[float_6s_infinite_ease-in-out]"
                            alt="Elite Training"
                        />
                        <div className="absolute -bottom-10 -right-10 md:right-10 bg-slate-900/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 z-20 shadow-2xl max-w-[240px]">
                            <p className="text-4xl font-black text-blue-500 mb-2 leading-none uppercase italic">98%</p>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">Member satisfaction & progress retention</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. FOOTER */}
            <footer className="bg-slate-950 py-24 border-t border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16">
                    <div className="col-span-1 md:col-span-2 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                <i className="fas fa-bolt text-white text-2xl"></i>
                            </div>
                            <span className="text-3xl font-black tracking-tighter uppercase italic">Iron<span className="text-blue-500">Flow</span></span>
                        </div>
                        <p className="text-slate-500 max-w-sm text-lg font-medium leading-relaxed">
                            Pioneering the next generation of boutique fitness. Innovation, community, and results in every heartbeat.
                        </p>
                        <div className="flex gap-4">
                            {['facebook', 'instagram', 'twitter', 'youtube'].map(s => (
                                <a key={s} href="#" className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all">
                                    <i className={`fab fa-${s} text-xl`}></i>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-8">Navigation</h5>
                        <ul className="space-y-4">
                            <li><a href="#hero" className="text-slate-500 hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">Home</a></li>
                            <li><a href="#branches" className="text-slate-500 hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">Branches</a></li>
                            <li><a href="#offers" className="text-slate-500 hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">Offers</a></li>
                            <li><Link to="/login" className="text-slate-500 hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">IronFlow Login</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-8">Support</h5>
                        <ul className="space-y-4">
                            <li><Link to="/privacy-policy" className="text-slate-500 hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">Privacy Policy</Link></li>
                            <li><Link to="/terms-of-service" className="text-slate-500 hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">Terms of Service</Link></li>
                            <li><a href="mailto:support@ironflow.fit" className="text-slate-500 hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">Contact Support</a></li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 pt-24 mt-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">© 2026 IRONFLOW GLOBAL LTD. ALL RIGHTS RESERVED.</p>
                    <div className="flex items-center gap-6">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/App_Store_Badge.svg" className="h-10 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" alt="App Store" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" className="h-10 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" alt="Play Store" />
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.1); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default Home;
