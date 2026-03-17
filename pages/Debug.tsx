import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

const DebugPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [permissions, setPermissions] = useState<any>({});

    const checkPermissions = async () => {
        try {
            const cam = await Camera.checkPermissions();
            const geo = await Geolocation.checkPermissions();
            const notif = await LocalNotifications.checkPermissions();
            setPermissions({
                camera: cam.camera,
                location: geo.location,
                notifications: notif.display
            });
        } catch (err) {
            console.error('Permission check failed:', err);
        }
    };

    useEffect(() => {
        async function fetchUsers() {
            try {
                console.log('Fetching users from Supabase...');
                const { data, error } = await supabase.from('users').select('*');

                if (error) {
                    console.error('Error:', error);
                    setError(error.message);
                } else {
                    console.log('Users fetched:', data);
                    setUsers(data || []);
                }
            } catch (err: any) {
                console.error('Exception:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchUsers();
        checkPermissions();
    }, []);

    if (loading) {
        return <div className="p-8"><h1 className="text-2xl">Loading...</h1></div>;
    }

    return (
        <div className="p-8 bg-slate-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-4">🔍 Debug: Users Data</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                        <i className="fas fa-shield-alt text-blue-500"></i> Permission Status
                    </h2>
                    <div className="space-y-4">
                        {Object.entries(permissions).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{key}</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    value === 'granted' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={checkPermissions}
                        className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                        Refresh Permissions
                    </button>
                </div>

                <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                        <i className="fas fa-info-circle text-blue-500"></i> Environment
                    </h2>
                    <div className="space-y-2 text-xs font-medium text-slate-400">
                        <p><strong>Platform:</strong> {(window as any).Capacitor?.getPlatform() || 'web'}</p>
                        <p><strong>Is Native:</strong> {(window as any).Capacitor?.isNativePlatform() ? 'Yes' : 'No'}</p>
                        <p><strong>Supabase:</strong> {import.meta.env.VITE_SUPABASE_URL ? 'Connected' : 'Missing URL'}</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 p-4 rounded mb-4">
                    <p className="text-red-500">Error: {error}</p>
                </div>
            )}

            <div className="bg-slate-800 p-6 rounded-lg">
                <h2 className="text-xl mb-4">Users Found: {users.length}</h2>

                {users.length === 0 ? (
                    <p className="text-yellow-400">⚠️ No users found in database!</p>
                ) : (
                    <div className="space-y-2">
                        {users.map(user => (
                            <div key={user.id} className="bg-slate-700 p-4 rounded">
                                <p><strong>Name:</strong> {user.name}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Role:</strong> {user.role}</p>
                                <p><strong>ID:</strong> {user.id}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6 bg-blue-500/10 border border-blue-500 p-4 rounded">
                <h3 className="font-bold mb-2">Environment Check:</h3>
                <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
                <p>Has Anon Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
            </div>
        </div>
    );
};

export default DebugPage;
