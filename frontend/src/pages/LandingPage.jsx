import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Shield, Zap } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              DIMS.
            </span>
          </div>
          
          <div className="flex items-center gap-8">
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
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Next-Gen Internship Management
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1] text-gray-900">
              Professionalizing <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Internship Experience
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-2xl">
              Elevate your internship journey with CUI Abbottabad's Digital Internship Management System. Streamlined workflows for students, coordinators, and supervisors.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="group bg-indigo-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-indigo-700 transition-all hover:shadow-xl hover:shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Launch Portal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 rounded-2xl text-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all border border-gray-200">
                Learn more
              </button>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
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
              <div key={i} className="p-8 rounded-3xl bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-50/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm text-gray-500">
            © 2024 CUI Internship System. All rights reserved.
          </div>
          <div className="flex gap-8 text-sm font-medium text-gray-600">
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
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      ` }} />
    </div>
  );
};

export default LandingPage;
