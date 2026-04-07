import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  BookOpen, 
  ClipboardCheck, 
  FileText, 
  Users, 
  Bell, 
  Mail, 
  Phone, 
  ChevronRight,
  ExternalLink,
  GraduationCap,
  MapPin
} from 'lucide-react';
import { apiRequest } from '../utils/api.js';

const HomePage = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicNotices = async () => {
      try {
        const data = await apiRequest('/notices/public', { silent: true });
        setNotices(data || []);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => fetchPublicNotices());
    } else {
      setTimeout(fetchPublicNotices, 0);
    }
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-lightbg font-poppins selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/cuilogo.png" alt="University Logo" className="h-12 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-black text-primary leading-tight">CUI Abbottabad</h1>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Internship Portal</p>
            </div>
          </a>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection('about')} className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">About Program</button>
            <button onClick={() => scrollToSection('process')} className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Guidelines/Process</button>
            <button onClick={() => scrollToSection('announcements')} className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Announcements</button>
            <button onClick={() => scrollToSection('contact')} className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Contact</button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-blue-800 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center gap-2"
            >
              Portal Login
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <section className="relative pt-36 pb-24 md:pb-48 overflow-hidden min-h-[85vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <picture>
            <source srcSet="/hero.webp" type="image/webp" />
            <img 
              src="/hero.png" 
              alt="Aerial view of COMSATS University Islamabad Abbottabad Campus" 
              width={1920}
              height={1080}
              fetchpriority="high"
              loading="eager"
              decoding="sync"
              className="w-full h-full object-cover opacity-20 scale-105"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-[#fafafa] via-transparent to-[#fafafa]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-black uppercase tracking-widest animate-bounce-slow">
              <GraduationCap className="w-4 h-4" />
              Bridging Education & Industry
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-[1.05] tracking-tight">
            Professionalizing Your <br />
            <span className="text-[#1e3a8a] italic">Internship Experience</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg text-gray-500 mb-12 leading-relaxed">
            Welcome to COMSATS University Islamabad, Abbottabad Campus's Digital Internship Management System (DIMS). 
            Elevating industry standards through structured academic oversight and professional guidance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <a 
              href="/login"
              onClick={(e) => { e.preventDefault(); navigate('/login'); }}
              className="w-full sm:w-auto px-12 py-5 bg-[#1e3a8a] text-white text-lg font-black rounded-2xl hover:bg-blue-900 transition-all shadow-2xl shadow-blue-900/20 flex items-center justify-center gap-3 group decoration-0"
            >
              Access Portal
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#about"
              onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}
              className="w-full sm:w-auto px-12 py-5 bg-white text-gray-700 text-lg font-black rounded-2xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm flex items-center justify-center decoration-0"
            >
              Learn More About Program
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="py-24 bg-white border-y border-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-sm font-black text-blue-500 uppercase tracking-[0.3em] mb-4">The Program Purpose</h2>
              <h3 className="text-4xl font-black text-gray-900 mb-6 leading-tight">Empowering Students Through Real-World Engagement</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                The University Internship Program is a cornerstone of our academic curriculum, designed to provide students with 
                critical hands-on experience. We believe that professional growth occurs at the intersection of academic theory 
                and industrial practice.
              </p>
              
              <div className="space-y-8">
                {[
                  { title: "Industry Connections", desc: "Forging paths between top-tier organizations and talented students." },
                  { title: "Skill Development", desc: "Focused mentorship to bridge the gap between classroom and workplace." },
                  { title: "Academic Oversight", desc: "Rigorous evaluation and guidance from experienced faculty supervisors." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#1e3a8a] animate-pulse"></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-lightbg rounded-[3rem] p-8 relative">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl"></div>
              
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50 transform hover:-translate-y-2 transition-all">
                  <BookOpen className="w-8 h-8 text-indigo-500 mb-6" />
                  <h4 className="text-3xl font-black text-primary mb-1">400+</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Interns</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50 mt-8 transform hover:-translate-y-2 transition-all">
                  <Users className="w-8 h-8 text-emerald-500 mb-6" />
                  <h4 className="text-3xl font-black text-emerald-600 mb-1">150+</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partner Firms</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50 transform hover:-translate-y-2 transition-all">
                  <FileText className="w-8 h-8 text-amber-500 mb-6" />
                  <h4 className="text-3xl font-black text-amber-600 mb-1">100%</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Digital Reports</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50 mt-8 transform hover:-translate-y-2 transition-all">
                  <ClipboardCheck className="w-8 h-8 text-rose-500 mb-6" />
                  <h4 className="text-3xl font-black text-rose-600 mb-1">Top</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Accreditations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-sm font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Operational Guidelines</h2>
            <h3 className="text-4xl font-black text-gray-900">Understanding the Internship Lifecycle</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Proposal Submission", desc: "Submit your internship offer and details for departmental approval.", icon: <FileText /> },
              { step: "02", title: "Weekly Reporting", desc: "Maintain a digital log of activities verified by your site supervisor.", icon: <ClipboardCheck /> },
              { step: "03", title: "Faculty Evaluation", desc: "Mid-term and final assessments conducted by assigned faculty.", icon: <Users /> },
              { step: "04", title: "Certification", desc: "Final completion certificate issued upon successful evaluation.", icon: <GraduationCap /> }
            ].map((item, i) => (
              <div key={i} className="group bg-white p-10 rounded-[2.5rem] border border-blue-50 hover:border-primary transition-all relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                <div className="text-6xl font-black text-gray-100 mb-6 group-hover:text-primary/10 transition-colors uppercase tracking-tighter">{item.step}</div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                  {item.icon}
                </div>
                <h4 className="text-xl font-black text-gray-900 mb-3">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="announcements" className="py-24 bg-gray-900 text-white selection:bg-white/20 selection:text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[100px] rounded-full"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Latest Updates</h2>
              <h3 className="text-4xl font-black leading-tight">University Announcements <br /> & Program News</h3>
            </div>
            <button className="text-sm font-black bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all flex items-center gap-2">
              View All News <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse"></div>)
            ) : notices.length > 0 ? (
              notices.map((notice, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3 mb-6 text-blue-400">
                    <Bell className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {new Date(notice.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold mb-4 line-clamp-2 group-hover:text-blue-400 transition-colors">{notice.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed mb-8 line-clamp-3">{notice.content}</p>
                  <button 
                    className="flex items-center gap-2 text-sm font-bold text-white group-hover:gap-4 transition-all focus:outline-none focus:underline"
                    aria-label={`Read full notice: ${notice.title}`}
                  >
                    Read Full Notice <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center mx-auto w-full">
                <p className="text-gray-400 font-bold">No active announcements at this moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-primary rounded-[3rem] overflow-hidden flex flex-col lg:flex-row">
            <div className="p-12 lg:p-20 lg:w-3/5">
              <h2 className="text-sm font-black text-blue-300 uppercase tracking-[0.3em] mb-4">Contact Us</h2>
              <h3 className="text-4xl lg:text-5xl font-black text-white mb-12 leading-tight">Need Assistance? <br /> We're here to help.</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-1">Email Us</h5>
                    <p className="text-blue-200 text-sm">internship.office@cuiatd.edu.pk</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-1">Call Us</h5>
                    <p className="text-blue-200 text-sm">+92-992-383591-6</p>
                  </div>
                </div>
                <div className="flex gap-4 sm:col-span-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-1">Our Location</h5>
                    <p className="text-blue-200 text-sm">COMSATS University Islamabad, Abbottabad Campus, <br />University Road, Tobe Camp, Abbottabad, Pakistan.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-2/5 relative min-h-[400px]">
              <div className="absolute inset-0 bg-blue-800/50 backdrop-blur-3xl p-12 flex flex-col justify-center">
                <div className="bg-white rounded-3xl p-10 shadow-2xl">
                  <h4 className="text-gray-900 font-black text-xl mb-2 text-center">Internship Office</h4>
                  <p className="text-gray-500 text-sm text-center mb-8 font-medium italic">Monday - Friday: 08:30 AM - 04:30 PM</p>
                  
                  <div className="space-y-4">
                    <button className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2">
                      Submit Query <ArrowRight className="w-4 h-4" />
                    </button>
                    <button className="w-full py-4 bg-gray-50 text-gray-700 font-black rounded-xl hover:bg-gray-100 transition-all">
                      Offical Website
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-gray-100" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3 opacity-50">
              <img src="/cuilogo.png" alt="COMSATS University Islamabad Logo" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-auto grayscale" />
              <div className="text-[10px] font-black text-gray-400 tracking-widest">CUI Internship System</div>
            </div>
            
            <div className="flex gap-8 text-sm font-bold text-gray-400">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Accessibility</a>
            </div>
            
            <div className="text-sm font-bold text-gray-300">
              © 2026 CUI Abbottabad. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5px); }
          50% { transform: translateY(0); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }
      ` }} />
    </>
  );
};

export default HomePage;
