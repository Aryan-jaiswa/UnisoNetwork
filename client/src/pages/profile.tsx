import React from 'react';
import { useAuth } from '../hooks/AuthContext';
import { Link } from 'wouter';

const Profile: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Not Logged In</h2>
          <p className="text-gray-500 mb-6">Please log in to view your profile.</p>
          <Link href="/login" className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold shadow hover:opacity-90 transition">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <img
          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6C63FF&color=fff&size=128`}
          alt="Avatar"
          className="w-24 h-24 mx-auto rounded-full mb-4 shadow-lg border-4 border-blue-100"
        />
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{user.name}</h2>
        <p className="text-gray-500 mb-2">{user.email}</p>
        <p className="text-gray-400 text-xs mb-4">
          Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <button className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold shadow hover:opacity-90 transition">
            Edit Profile
          </button>
          <button className="px-6 py-2 rounded-full bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 transition">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
