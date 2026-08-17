import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  Briefcase, GraduationCap, Award, BookOpen, Star, Mail, MapPin, 
  Phone, Globe, ChevronRight, ExternalLink, ArrowRight, Play, 
  Facebook, Twitter, Instagram, Linkedin, Code, Lightbulb, Users, Target
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';

export default function FacultyPortfolioPage({ slug }: { slug: string }) {
  const [faculty, setFaculty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const q = query(collection(db, 'faculty'));
        const querySnapshot = await getDocs(q);
        
        let foundFaculty = null;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const memberSlug = (data.name || '').toLowerCase().replace(/\s+/g, '-');
          if (memberSlug === slug) {
            foundFaculty = { id: doc.id, ...data };
          }
        });
        
        setFaculty(foundFaculty);
      } catch (error) {
        console.error("Error fetching faculty details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFaculty();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <span className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-10 rounded-[2rem] bg-indigo-900/10 border border-indigo-500/20 backdrop-blur-md">
           <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">Profile Not Found</h1>
           <p className="text-gray-400 mb-8 max-w-md mx-auto">The faculty member you're looking for doesn't exist or has been removed.</p>
           <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all">
             Return Home
           </a>
        </motion.div>
      </div>
    );
  }

  // Realistic placeholders where data is lacking
  const stats = [
    { label: "Students Mentored", value: faculty.studentsMentored || "2000+", icon: <Users size={24} /> },
    { label: "Years Experience", value: faculty.experience || "5+", icon: <Briefcase size={24} /> },
    { label: "Success Rate", value: faculty.successRate || "98%", icon: <Target size={24} /> },
    { label: "Courses Delivered", value: faculty.coursesDelivered || "15+", icon: <BookOpen size={24} /> },
  ];

  const showcaseProjects = [
    { title: "Advanced Concept Modules", category: "Curriculum Design", image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1000&auto=format&fit=crop" },
    { title: "Digital Exam Prep Hub", category: "Tech Integration", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&auto=format&fit=crop" },
    { title: "Student Performance Tracker", category: "Data Analytics", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop" }
  ];

  return (
    <div className="min-h-screen bg-[#030308] text-white overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <nav className="fixed top-0 inset-x-0 z-50 px-6 py-4 md:py-6 flex justify-between items-center bg-transparent backdrop-blur-[2px] transition-all">
        <a 
          href="/" 
          onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/'); window.dispatchEvent(new Event('popstate')); }}
          className="text-xl font-black tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50"
        >
          Advanced<br/><span className="text-indigo-400">Classes</span>
        </a>
        <a 
          href="/" 
          onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/'); window.dispatchEvent(new Event('popstate')); }}
          className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-widest backdrop-blur-md transition-colors flex items-center gap-2"
        >
          Close Profile
        </a>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center md:justify-start px-6 md:px-24 pt-32 pb-20 z-10 w-full overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-7xl mx-auto items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 text-center md:text-left z-20"
          >
            <div className="inline-block self-center md:self-start">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-[0.2em] uppercase"
              >
                {faculty.degree || faculty.role || "Expert Faculty"}
              </motion.span>
            </div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]"
            >
              {faculty.name.split(' ').map((word: string, i: number) => (
                <React.Fragment key={i}>
                  {word} <br />
                </React.Fragment>
              ))}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-gray-400 text-sm md:text-base lg:text-lg max-w-md mx-auto md:mx-0 leading-relaxed font-medium mt-2"
            >
              Transforming complex concepts into intuitive understanding. Empowering the next generation through digital education and structured practice.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6"
            >
              <a href="#about" className="px-8 py-4 rounded-full bg-white text-black font-black uppercase tracking-wider text-xs md:text-sm hover:scale-105 active:scale-95 transition-transform">
                Explore Journey
              </a>
              {faculty.portfolioUrl && (
                <a href={faculty.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-8 py-4 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-white font-bold uppercase tracking-wider text-xs md:text-sm hover:bg-indigo-600/40 hover:text-indigo-200 transition-colors">
                  View Full Portfolio <ExternalLink size={16} />
                </a>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden md:block w-full aspect-[4/5] max-w-lg mx-auto"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rotate-3 backdrop-blur-3xl z-0 pointer-events-none"></div>
            <div className="absolute inset-0 rounded-[2rem] border border-white/10 z-20 overflow-hidden bg-[#0c0c16] shadow-2xl">
              <img 
                src={faculty.photo || 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=800&auto=format&fit=crop'} 
                alt={faculty.name}
                className="w-full h-full object-cover object-top opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c16] via-transparent to-transparent opacity-80" />
            </div>
            
            {/* Floating Elements */}
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute -bottom-6 -left-6 px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl z-30 shadow-2xl">
               <div className="text-xl font-black">{faculty.experience || "5+"}</div>
               <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Years of Excellence</div>
            </motion.div>
          </motion.div>
          
        </div>
        
        {/* Mobile image version */}
        <div className="absolute inset-0 z-0 md:hidden opacity-10">
          <img 
            src={faculty.photo || 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=800&auto=format&fit=crop'} 
            alt={faculty.name}
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="relative z-20 py-8 border-y border-white/5 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="flex flex-wrap justify-between gap-8 md:gap-4 items-center">
             {stats.map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center md:items-start text-center md:text-left min-w-[120px]"
                >
                  <div className="text-indigo-400 mb-2 opacity-80">{stat.icon}</div>
                  <div className="text-3xl font-black mb-1">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{stat.label}</div>
                </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* About & Achievements */}
      <section id="about" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">The Philosophy</h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">Mastering The <br/><span className="text-gray-500">Fundamentals</span></h3>
            </div>
            
            <div className="prose prose-invert prose-lg max-w-none text-gray-400 leading-relaxed font-medium">
               <p>
                 Education isn't about memorization—it's about building a robust mental model of how the world works.
                 Through structured pedagogy, visual aids, and rigorous practice cycles, I aim to demystify complex subjects.
               </p>
               {faculty.achievement && (
                 <div className="pl-6 border-l-2 border-indigo-500/50 mt-8 text-gray-300 italic text-base bg-indigo-500/5 p-4 rounded-r-2xl">
                   "{faculty.achievement}"
                 </div>
               )}
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[
               { icon: <Lightbulb />, title: "Conceptual Clarity", desc: "Breaking down high-level theories into digestible daily models." },
               { icon: <Target />, title: "Exam Strategy", desc: "Data-driven approach to tackling competitive and board exams." },
               { icon: <Code />, title: "Practical Application", desc: "Connecting textbook theories with real-world technological use cases." },
               { icon: <Award />, title: "Result Oriented", desc: "Consistent track record of top-tier performance and improvement." }
             ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">{feature.desc}</p>
                </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* Showcase Grid */}
      <section className="relative z-10 py-32 bg-black/50 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">Showcase</h2>
             <h3 className="text-4xl md:text-5xl font-black tracking-tight">Featured Modules</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {showcaseProjects.map((project, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="group relative h-[400px] rounded-[2rem] overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-gray-900 z-0">
                  <img src={project.image} alt={project.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#030308] via-[#030308]/40 to-transparent z-10"></div>
                <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                   <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-widest text-white mb-3 w-fit border border-white/20">
                     {project.category}
                   </div>
                   <h4 className="text-2xl font-black mb-2">{project.title}</h4>
                   <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                     <p className="text-sm text-gray-300 font-medium pt-2 line-clamp-2">A comprehensive deep dive tailored for competitive readiness and skill mastery.</p>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-indigo-900/40 to-purple-900/20 border border-white/10 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1/2 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">Ready to Learn?</h2>
            <p className="text-gray-300 font-medium text-lg mb-10 max-w-lg mx-auto">Join my upcoming batches and experience a transformative approach to education.</p>
            
            <a 
              href="/?tab=programs" 
              onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/?tab=programs'); window.dispatchEvent(new Event('popstate')); window.dispatchEvent(new CustomEvent('navigate', { detail: 'programs' })); }}
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-transform"
            >
              Enroll Now <ArrowRight size={18} />
            </a>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
