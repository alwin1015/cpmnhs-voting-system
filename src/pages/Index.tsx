import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import schoolLogo from '@/assets/school-logo.png';
import {
  Vote,
  Users,
  BarChart3,
  Shield,
  CheckCircle,
  Clock,
  ArrowRight,
  Star
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { election, isLoggedIn, user } = useVoting();

  const features = [
    {
      icon: Vote,
      title: 'Secure Voting',
      description: 'Cast your vote securely with our encrypted voting system ensuring privacy and integrity.',
    },
    {
      icon: Users,
      title: 'Fair Elections',
      description: 'Every student gets one vote, ensuring a democratic and fair election process.',
    },
    {
      icon: BarChart3,
      title: 'Real-time Results',
      description: 'View live election results as votes are counted in real-time.',
    },
    {
      icon: Shield,
      title: 'Verified Voters',
      description: 'Only registered students can vote, preventing fraud and duplicate voting.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">


      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-[100dvh] flex items-center">
          {/* Professional Blue Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950" />
          {/* Subtle pattern overlay for texture */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Admin Access at Top Right */}
          <div className="absolute top-4 right-4 md:right-8 z-20">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin-login')} className="text-white/70 hover:text-white hover:bg-white/10">
              Admin Access
            </Button>
          </div>

          <div className="relative container mx-auto px-4 py-12 md:py-16 lg:py-24 w-full">
            <div className="flex flex-col lg:flex-row-reverse items-center justify-between gap-10 lg:gap-16">
              {/* Content */}
              <div className="flex-1 text-center lg:text-left animate-slide-up order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-medium mb-6">
                  <Star className="h-4 w-4" />
                  SSG Election {election?.schoolYear}
                </div>

                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-white mb-5 leading-[1.1] tracking-tight">
                  iVote: <span className="text-blue-300">Student Voting</span>
                  <span className="block text-lg md:text-2xl lg:text-3xl mt-3 text-blue-100 font-semibold tracking-normal">Congressman Pablo Malasarte National High School</span>
                </h1>

                <p className="text-base md:text-lg lg:text-xl text-blue-100/90 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                  Official Supreme Student Government Election Platform.
                  Exercise your right to vote and shape the future of our school community.
                </p>

                <div className="flex flex-col items-center sm:flex-row gap-4 justify-center lg:justify-start">
                  {isLoggedIn ? (
                    <Button
                      size="xl"
                      onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/vote')}
                      className="relative overflow-hidden backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] transition-all duration-300 ease-out transform hover:-translate-y-1 hover:shadow-[0_16px_40px_0_rgba(255,255,255,0.25)] rounded-full px-8 py-6 text-lg font-semibold tracking-wide"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:animate-[shimmer_2s_infinite]" />
                      <span className="relative z-10 flex items-center">
                        {user?.role === 'admin' ? 'Go to Admin Panel' : 'Cast Your Vote'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </span>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => navigate('/login')}
                      className="relative overflow-hidden bg-white hover:bg-blue-50 text-blue-700 shadow-xl transition-all duration-300 ease-out transform hover:-translate-y-1 hover:shadow-2xl rounded-full px-8 h-14 text-lg font-bold tracking-wide border-0"
                    >
                      <span className="relative z-10 flex items-center">
                        Vote Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Logo */}
              <div className="flex-shrink-0 order-1 lg:order-2 perspective-1000">
                <div className="relative transform-gpu transition-all duration-700 hover:scale-105 hover:rotate-2">
                  <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-3xl animate-pulse" />
                  <img
                    src={schoolLogo}
                    alt="CPMNHS Logo"
                    className="relative w-56 h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 rounded-full object-cover shadow-2xl border-[6px] border-white/10"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Features Section */}
        <section className="py-10 bg-white">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                Why Use Our Voting System?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
                Our platform ensures a fair, transparent, and efficient election process for all students.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-800 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Ready to Make Your Voice Heard?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mb-6">
                Your vote matters. Be part of the change you want to see in our school.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-600/20 transition-all duration-300 ease-out transform hover:-translate-y-1 rounded-full px-8 h-12 text-base font-bold tracking-wide border-0"
                >
                  <span className="relative z-10 flex items-center">
                    Cast Your Vote Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

