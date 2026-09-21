import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoting } from '@/contexts/VotingContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Shield, User, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Force password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { adminLogin, adminChangePassword } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both username and password.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await adminLogin(username, password);
      
      if (result.success) {
        if (result.mustChangePassword) {
          // Store the current password for the change flow
          setCurrentPassword(password);
          setShowChangePassword(true);
          toast({
            title: 'Password Update Recommended',
            description: 'You can update your password now or skip for later.',
          });
        } else {
          toast({
            title: 'Admin Login Successful',
            description: 'Welcome to the Admin Panel!',
          });
          navigate('/admin');
        }
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid admin credentials.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid admin credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'New password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword === currentPassword) {
      toast({
        title: 'Error',
        description: 'New password must be different from the current password.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await adminChangePassword(currentPassword, newPassword);

      if (result.success) {
        toast({
          title: 'Password Changed',
          description: 'Your password has been updated successfully!',
        });
        navigate('/admin');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSkipPasswordChange = () => {
    toast({
      title: 'Admin Login Successful',
      description: 'Welcome to the Admin Panel!',
    });
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
<main className="flex-1 flex items-center justify-center p-4 py-12 relative overflow-x-hidden overflow-y-auto min-h-[min-content]">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="w-full max-w-md animate-slide-up relative z-10">
          <Card className="border border-white/50 shadow-2xl backdrop-blur-2xl" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                    <Shield className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="font-display text-2xl text-gray-900">
                {showChangePassword ? 'Change Password' : 'Admin Login'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {showChangePassword
                  ? 'Update your password now or choose "Not now" to skip'
                  : 'Enter your admin credentials to access the control panel'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              {!showChangePassword ? (
                /* ====== LOGIN FORM ====== */
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-800">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 h-12 bg-white/70 border-white/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-800">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 bg-white/70 border-white/50 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 mr-2" />
                        Access Admin Panel
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                /* ====== CHANGE PASSWORD FORM ====== */
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-800">
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="pl-10 pr-10 h-12 bg-white/70 border-white/50 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword" className="text-sm font-medium text-gray-800">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <Input
                        id="confirmNewPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="pl-10 h-12 bg-white/70 border-white/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Updating Password...
                        </span>
                      ) : (
                        <>
                          <Lock className="h-5 w-5 mr-2" />
                          Set New Password
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      className="w-full text-gray-600 hover:text-gray-900 hover:bg-black/5 font-medium"
                      onClick={handleSkipPasswordChange}
                      disabled={isChangingPassword}
                    >
                      Not now
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
