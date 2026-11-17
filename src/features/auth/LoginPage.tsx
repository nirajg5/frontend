import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Shield, AlertCircle, ArrowRight, FlaskConical, Server } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, enterDemoSession } = useAuth();
  const { addToast, apiUrl, backendReachable, setDemoMode } = useConfig();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Ensure live API mode when signing in with real credentials
      setDemoMode(false);
      await login(username.trim(), password);
      addToast({
        type: 'success',
        title: 'Authentication Successful',
        message: `Signed in as ${username.trim()}.`,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterDemoMode = () => {
    enterDemoSession('ADMIN');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">DataSentinel</h2>
          <p className="text-xs text-slate-400">
            Intelligent Data Reliability &amp; Observability Platform
          </p>
        </div>

        <Card className="shadow-2xl border-slate-800">
          <CardHeader>
            <div>
              <CardTitle>Sign in to Control Plane</CardTitle>
              <p className="text-xs text-slate-500">OAuth2 password login (POST /auth/login)</p>
            </div>
            <Badge variant={backendReachable ? 'healthy' : 'failing'} size="sm" dot>
              {backendReachable ? 'API Online' : 'API Offline'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" /> Target: {apiUrl}
                </span>
                <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
                  Create Account
                </Link>
              </div>

              <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-900 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                    Demonstration Mode
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-200 text-purple-900">
                    No Backend Needed
                  </span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Preview the UI with isolated demo fixtures when the local FastAPI backend is not running.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEnterDemoMode}
                  className="w-full border-purple-300 text-purple-800 hover:bg-purple-100"
                >
                  Open Interactive Demo Mode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
