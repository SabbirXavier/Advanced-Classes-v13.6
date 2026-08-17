import { ArrowLeft, CheckCircle2, ChevronRight, Route, Compass, Lightbulb, GraduationCap, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export default function TabAbout({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-12 pb-24 relative"
    >
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase inline-flex items-center gap-3">
          <Compass className="text-indigo-600 dark:text-indigo-400" /> Core Philosophy
        </h2>
        <button 
          onClick={() => onNavigate('home')}
          className="bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all uppercase tracking-wider text-xs shadow-sm"
        >
          <ArrowLeft size={16} /> Retreat
        </button>
      </div>

      <div className="relative rounded-[2rem] overflow-hidden bg-gray-900 min-h-[400px] flex items-center shadow-2xl">
        <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2072&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" alt="Background" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 to-transparent"></div>
        <div className="relative z-10 p-8 md:p-12 max-w-2xl border-l-[3px] border-indigo-500 ml-8">
          <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-lg">The Narrative</h3>
          <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed">
            Advanced Classes, Sonai is not just an institute; it's an academically driven initiative aimed at redefining how Mathematics and Science are perceived and practiced.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-xl hover:shadow-2xl transition-shadow cursor-default">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 border border-emerald-500/20">
            <Route size={24} />
          </div>
          <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">The Pre-Origin Paradigm</h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">Prior to our inception, ambitious students faced the gruelling necessity of traversing to Silchar. This resulted in cramped batches of 60-80, consuming 1.5 hours in transit, resulting in immense physical fatigue and lost prime study hours.</p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-xl hover:shadow-2xl transition-shadow cursor-default">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 border border-indigo-500/20">
            <Lightbulb size={24} />
          </div>
          <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">The Modern Execution</h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">Our countermeasure is Advanced Classes. We enforce tightly isolated small batch environments, infuse high-end smart boards for visual complex modeling, and completely eradicate travel fatigue. The result? Asymptotic growth in performance.</p>
        </div>
      </div>

      <div className="p-10 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-black border border-gray-300 dark:border-gray-800 shadow-xl relative overflow-hidden">
        <GraduationCap className="absolute -right-10 -bottom-10 w-64 h-64 text-gray-300/50 dark:text-white/5 -rotate-12" />
        <div className="relative z-10">
          <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-8 tracking-tight uppercase flex items-center gap-3">
             <CheckCircle2 className="text-indigo-500" /> Operational Matrix
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              "Atomic breakdown of complex concepts",
              "74-Inch Interactive Displays for visual cognition",
              "Strict algorithmic discipline & routines",
              "Direct 1:1 attention loops per student"
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{i + 1}</span>
                </div>
                <span className="text-gray-800 dark:text-gray-200 font-medium leading-tight">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-center pt-8">
        <button 
          onClick={() => onNavigate('batches')}
          className="group px-8 py-4 bg-indigo-600 text-white rounded-full font-bold uppercase tracking-wider text-sm hover:scale-105 hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
        >
          View Formatted Batches <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
