import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Shield, Zap, Menu, X } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] selection:bg-indigo-100 selection:text-indigo-900 font-sans overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              DIMS.
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              Get Started
            </button>
          </div>

          <button 
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 p-4 absolute top-18 left-0 right-0 shadow-lg animate-fade-in-down">
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                className="text-left py-2 text-gray-600 font-medium border-b border-gray-50"
              >
                Log in
              </button>
              <button 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-center font-semibold shadow-md"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-24 md:pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-semibold mb-6 sm:mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Next-Gen Internship Management
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 sm:mb-8 leading-[1.1] text-gray-900">
              Professionalizing <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Internship Experience
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-12 leading-relaxed max-w-2xl">
              Elevate your internship journey with CUI Abbottabad's Digital Internship Management System. Streamlined workflows for students, coordinators, and supervisors.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="group bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold hover:bg-indigo-700 transition-all hover:shadow-xl hover:shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Launch Portal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all border border-gray-200">
                Learn more
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-20 sm:mt-32">
            {[
              {
                icon: <Zap className="w-6 h-6 text-amber-500" />,
                title: "Real-time Tracking",
                description: "Monitor progress and milestones with live updates and automated reporting."
              },
              {
                icon: <Shield className="w-6 h-6 text-emerald-500" />,
                title: "Secure Verification",
                description: "Built-in digital verification for documents and performance evaluations."
              },
              {
                icon: <BookOpen className="w-6 h-6 text-indigo-500" />,
                title: "Unified Portal",
                description: "A single workspace for all stakeholders to collaborate effectively."
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-50/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-12 px-4 sm:px-6 border-t border-gray-100 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
          <div className="text-sm text-gray-500 text-center md:text-left">
            © 2026 CUI Internship System. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Security</a>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
      ` }} />
    </div>
  );
};

export default LandingPage;

