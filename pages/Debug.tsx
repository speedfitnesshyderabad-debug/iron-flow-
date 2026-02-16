import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

const DebugPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

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
    }, []);

    if (loading) {
        return <div className="p-8"><h1 className="text-2xl">Loading...</h1></div>;
    }

    return (
        <div className="p-8 bg-slate-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-4">🔍 Debug: Users Data</h1>

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
