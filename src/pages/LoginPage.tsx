import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoting } from '@/contexts/VotingContext';
import { useToast } from '@/hooks/use-toast';
import schoolLogo from '@/assets/school-logo.png';
import { Eye, EyeOff, LogIn, User, Lock, UserPlus, BookOpen, GraduationCap, FileDigit } from 'lucide-react';

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotLrn, setForgotLrn] = useState('');

  // Login state
  const [lrn, setLrn] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register state
  const [regLrn, setRegLrn] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleInitial, setRegMiddleInitial] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regGradeLevel, setRegGradeLevel] = useState('');
  const [regSection, setRegSection] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const { login, register, sections, requestPasswordReset } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleForgotSubmit = async () => {
    if (!forgotLrn) {
      toast({ title: 'Error', description: 'Please enter your LRN.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { success, message } = await requestPasswordReset(forgotLrn);
    setIsLoading(false);
    setShowForgotDialog(false);
    toast({
      title: success ? "Request Sent" : "Request Failed",
      description: success ? "Your account has been flagged for password reset. Please inform an admin to approve it." : message,
      variant: success ? "default" : "destructive",
    });
    setForgotLrn('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lrn.trim() || !password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both LRN and Password.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(lrn, password);
      
      if (success) {
        toast({
          title: 'Login Successful',
          description: 'Welcome to the CPMNHS Voting System!',
        });
        navigate('/vote');
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid LRN or password, or your account is still pending approval.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regLrn || !regFirstName || !regLastName || !regGradeLevel || !regSection || !regPassword || !regConfirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (regPassword !== regConfirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (regPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(regLrn, regFirstName, regMiddleInitial, regLastName, regGradeLevel, regSection, regPassword);

      if (result.success) {
        toast({
          title: 'Registration Submitted',
          description: result.message,
        });
        // Reset register form and switch to login
        setRegLrn('');
        setRegFirstName('');
        setRegMiddleInitial('');
        setRegLastName('');
        setRegGradeLevel('');
        setRegSection('');
        setRegPassword('');
        setRegConfirmPassword('');
        setIsRegisterMode(false);
      } else {
        toast({
          title: 'Registration Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSections = sections.filter(s => s.gradeLevel === regGradeLevel);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4 py-12 relative overflow-x-hidden overflow-y-auto min-h-[min-content]">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="w-full max-w-md animate-slide-up relative z-10 transition-all duration-300">
          <Card className="border border-white/50 shadow-2xl backdrop-blur-2xl" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
                  <img 
                    src={schoolLogo} 
                    alt="CPMNHS Logo" 
                    className="relative w-20 h-20 rounded-full object-cover shadow-lg border-2 border-white"
                  />
                </div>
              </div>
              <CardTitle className="font-display text-2xl font-bold">
                {isRegisterMode ? 'Student Registration' : 'Student Login'}
              </CardTitle>
              <CardDescription>
                {isRegisterMode 
                  ? 'Create an account to vote in the SSG Election' 
                  : 'Enter your credentials to access the voting system'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRegisterMode ? (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2 max-w-sm mx-auto">
                    <Label htmlFor="reg-lrn">LRN</Label>
                    <div className="relative">
                      <FileDigit className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-lrn"
                        value={regLrn}
                        onChange={(e) => setRegLrn(e.target.value)}
                        className="pl-9 bg-white/50"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-first-name">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-first-name"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          className="pl-9 bg-white/50"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reg-last-name">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-last-name"
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          className="pl-9 bg-white/50"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-middle-initial">Middle Initial</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-middle-initial"
                        value={regMiddleInitial}
                        onChange={(e) => setRegMiddleInitial(e.target.value)}
                        className="pl-9 bg-white/50"
                        maxLength={5}
                        disabled={isLoading}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-grade">Grade Level</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                        <select
                          id="reg-grade"
                          value={regGradeLevel}
                          onChange={(e) => {
                            setRegGradeLevel(e.target.value);
                            setRegSection(''); // Reset section when grade changes
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-white/50 px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <option value="">Select Grade</option>
                          <option value="7">Grade 7</option>
                          <option value="8">Grade 8</option>
                          <option value="9">Grade 9</option>
                          <option value="10">Grade 10</option>
                          <option value="11">Grade 11</option>
                          <option value="12">Grade 12</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reg-section">Section</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                        <select
                          id="reg-section"
                          value={regSection}
                          onChange={(e) => setRegSection(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-white/50 px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLoading || !regGradeLevel}
                        >
                          <option value="">Select Section</option>
                          {filteredSections.map(section => (
                            <option key={section.id} value={section.name}>{section.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type={showRegPassword ? "text" : "password"}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="pl-9 pr-10 bg-white/50"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isLoading}
                        >
                          {showRegPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Recommended: At least 8 characters with a mix of letters and numbers.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-confirm-password"
                          type={showRegPassword ? "text" : "password"}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="pl-9 pr-10 bg-white/50"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-center">
                    <Button 
                      type="submit" 
                      className="w-48 text-white rounded-full shadow-lg hover:shadow-xl transition-all" 
                      size="lg"
                      disabled={isLoading}
                      style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                    >
                      {isLoading ? 'Submitting...' : 'Register'}
                      <UserPlus className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-id">LRN</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="student-id"
                        value={lrn}
                        onChange={(e) => setLrn(e.target.value)}
                        className="pl-9 bg-white/50"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" onClick={() => setShowForgotDialog(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Forgot Password?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10 bg-white/50"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-center">
                    <Button 
                      type="submit" 
                      className="w-48 text-white rounded-full shadow-lg hover:shadow-xl transition-all" 
                      size="lg"
                      disabled={isLoading}
                      style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                      <LogIn className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  {isRegisterMode ? "Already registered? " : "Don't have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  disabled={isLoading}
                >
                  {isRegisterMode ? 'Sign In' : 'Register Now'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <AlertDialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <AlertDialogContent className="bg-white max-w-sm rounded-2xl border-0 overflow-hidden">
          <AlertDialogHeader className="bg-slate-50 p-6 pb-4 border-b border-slate-100">
            <AlertDialogTitle className="text-xl font-display text-slate-800">Reset Password</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 mt-2">
              Enter your LRN to request a password reset. An admin will need to approve this request before you can register again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-6">
            <Label htmlFor="forgot-lrn">Your LRN</Label>
            <Input 
              id="forgot-lrn" 
              value={forgotLrn} 
              onChange={(e) => setForgotLrn(e.target.value)} 
              className="mt-2"
              placeholder="Enter LRN..."
            />
          </div>
          <AlertDialogFooter className="p-6 pt-0 bg-white">
            <AlertDialogCancel className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForgotSubmit} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Submit Request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}




