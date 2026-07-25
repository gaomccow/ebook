import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  userRole: 'student' | 'teacher' | 'individual' | null;
  requiredRole?: 'teacher' | 'student' | 'individual';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  userRole,
  requiredRole,
  children,
  fallback
}) => {
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="max-w-md bg-slate-800 border-2 border-slate-700 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-black">Authentication Required</h2>
          <p className="text-xs text-slate-400 font-medium">
            You must be logged in to access this page. Please sign in with your account to proceed.
          </p>
        </div>
      </div>
    );
  }

  if (requiredRole && userRole !== requiredRole) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="max-w-md bg-slate-800 border-2 border-slate-700 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-black">Access Restricted</h2>
          <p className="text-xs text-slate-400 font-medium">
            This area requires a <span className="font-bold text-amber-400 uppercase">{requiredRole}</span> account role.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
