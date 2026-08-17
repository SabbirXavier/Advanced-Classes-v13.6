import React, { useState, useEffect } from "react";
import EnrollmentSection from "./EnrollmentSection";
import { firestoreService, handleFirestoreError } from "../services/firestoreService";
import MarkdownRenderer from "./MarkdownRenderer";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
import ProgressiveImage from "./ui/ProgressiveImage";
import {
  Lock,
  Calendar,
  ArrowRight,
  PlayCircle,
  BookOpen,
  Users,
  Tag,
  Star,
  Settings,
} from "lucide-react";
import { motion } from "motion/react";

export default function TabBatches({ isVerified, branding, isAdmin, onManage }: { isVerified?: boolean; branding?: any; isAdmin?: boolean; onManage?: (section: string) => void }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>("All");

  const [comboRules, setComboRules] = useState<any[]>([]);

  useEffect(() => {
    const unsubBatches = firestoreService.listenToCollection(
      "batches",
      (data) => {
        setBatches(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'batches');
      }
    );
    const unsubFees = firestoreService.listenToCollection("fees", (data) => {
      setFees(data);
      if (data.length > 0) setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fees');
    });
    const unsubCombo = firestoreService.listenToCollection(
      "pricing_rules",
      (data) => {
        setComboRules(
          data.filter((r: any) => r.type === "combo" && r.isActive !== false),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pricing_rules');
      }
    );

    return () => {
      unsubBatches();
      unsubFees();
      unsubCombo();
    };
  }, []);

  if (loading)
    return (
      <div className="text-center p-10 opacity-50 font-bold">
        Loading Programs...
      </div>
    );

  // Extract unique grades for filters from fees
  const feeGrades = new Set<string>();
  fees.forEach((fee) => {
    if (fee.grades && Array.isArray(fee.grades)) {
      fee.grades.forEach((g: string) => feeGrades.add(g));
    } else if (fee.grade) {
      feeGrades.add(fee.grade);
    }
  });
  const grades = Array.from(feeGrades).sort();

  const comboPrograms = comboRules.map((combo) => {
    const includedSubjects = combo.conditions?.includesAllSubjects || [];
    const subjectsFees = fees.filter((f) =>
      includedSubjects.includes(f.subject),
    );
    const totalOriginalPrice = subjectsFees.reduce(
      (sum, f) => sum + (Number(f.originalPrice) || 0),
      0,
    );
    const sumFeesDiscount = subjectsFees.reduce(
      (sum, f) => sum + (Number(f.discount) || 0),
      0,
    );
    const sumFeesAdvDiscount = subjectsFees.reduce(
      (sum, f) => sum + (Number(f.advancedPaymentDiscount) || 0),
      0,
    );
    const baseFinalAmount = totalOriginalPrice - sumFeesDiscount;
    const finalAmount = baseFinalAmount - (Number(combo.action?.value) || 0);

    return {
      id: combo.id,
      subject: combo.name || "Combo Package",
      originalPrice: totalOriginalPrice,
      discount: sumFeesDiscount + (Number(combo.action?.value) || 0),
      advancedPaymentDiscount: sumFeesAdvDiscount,
      finalPrice: finalAmount - sumFeesAdvDiscount,
      grade: combo.grade || subjectsFees[0]?.grade || "",
      grades:
        combo.grades ||
        Array.from(
          new Set(subjectsFees.flatMap((f) => f.grades || [f.grade])),
        ).filter(Boolean),
      imageUrl: combo.imageUrl || null,
      description:
        combo.description ||
        `Special bundle including: **${includedSubjects.join(", ")}**`,
      cardTag: combo.cardTag || "COMBO DEAL",
      premiumBadge: combo.premiumBadge || "MEGA SAVINGS",
      isCombo: true,
      includedSubjects: includedSubjects,
    };
  });

  const displayPrograms = (
    selectedGrade === "Combo Packages"
      ? comboPrograms
      : fees.filter((f) => {
          if (selectedGrade === "All") return true;
          if (f.grades && Array.isArray(f.grades))
            return f.grades.includes(selectedGrade);
          return f.grade === selectedGrade;
        })
  ).sort((a, b) => (a.order || 0) - (b.order || 0));

  const getSubjectImage = (subject: string) => {
    if (!subject)
      return "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop";
    const sub = subject.toLowerCase();
    if (sub.includes("math"))
      return "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?q=80&w=2071&auto=format&fit=crop";
    if (sub.includes("physic"))
      return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2070&auto=format&fit=crop";
    if (sub.includes("chemist"))
      return "https://images.unsplash.com/photo-1603126859-b1be4ba2f34e?q=80&w=2070&auto=format&fit=crop";
    if (sub.includes("bio"))
      return "https://images.unsplash.com/photo-1530213786676-4c721c28c6f3?q=80&w=2070&auto=format&fit=crop";
    if (sub.includes("computer") || sub.includes("cs"))
      return "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop";
    if (sub.includes("english"))
      return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1973&auto=format&fit=crop";
    return "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop";
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-8">
      <div className="bg-gradient-to-r from-[var(--primary)] to-indigo-900 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 text-white relative overflow-hidden shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl"></div>

        <h2 className="text-2xl md:text-3xl font-black mb-3 relative z-10 uppercase tracking-tighter drop-shadow-md">
          Explore Programs
        </h2>
        <p className="text-indigo-100 max-w-2xl text-sm md:text-base relative z-10 leading-relaxed font-medium">
          Comprehensive masterclass batches and dedicated subject-wise
          curriculums designed to elevate your understanding and boost your
          ranks.
        </p>
      </div>

      {/* Class Filters */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          onClick={() => setSelectedGrade("All")}
          className={`px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all whitespace-nowrap ${selectedGrade === "All" ? "bg-[var(--primary)] text-white shadow-md" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"}`}
        >
          All Classes
        </button>
        {grades.map((grade) => (
          <button
            key={grade}
            onClick={() => setSelectedGrade(grade as string)}
            className={`px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all whitespace-nowrap ${selectedGrade === grade ? "bg-[var(--primary)] text-white shadow-md" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"}`}
          >
            Class {grade}
          </button>
        ))}
        {comboRules.length > 0 && (
          <button
            onClick={() => setSelectedGrade("Combo Packages")}
            className={`px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all whitespace-nowrap ${selectedGrade === "Combo Packages" ? "bg-[var(--primary)] text-white shadow-md" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"}`}
          >
            Combo Packages ✨
          </button>
        )}
      </div>

      {displayPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayPrograms.map((program, index) => {
            const originalPriceNum = Number(program?.originalPrice || 0);
            const discountNum = Number(program?.discount || 0);
            const advDiscountNum = Number(program?.advancedPaymentDiscount || 0);
            
            const intermediatePriceNum = originalPriceNum - discountNum;
            const finalPriceNum = intermediatePriceNum - advDiscountNum;
            
            const price = finalPriceNum.toLocaleString("en-IN");
            const originalPrice = originalPriceNum.toLocaleString("en-IN");
            const intermediatePrice = intermediatePriceNum.toLocaleString("en-IN");
            
            const hasMultipleDiscounts = discountNum > 0 && advDiscountNum > 0;
            const totalSavings = discountNum + advDiscountNum;
            const savingsPercent = originalPriceNum > 0 ? Math.round((totalSavings / originalPriceNum) * 100) : 0;

            let gradeText = "All Grades";
            if (
              program.grades &&
              Array.isArray(program.grades) &&
              program.grades.length > 0
            ) {
              gradeText = `Class ${program.grades.join(", ")}`;
            } else if (program.grade) {
              gradeText = `Class ${program.grade}`;
            }

            const imageDisplay =
              program.imageUrl || getSubjectImage(program.subject);
            const descriptionDisplay =
              program.description ||
              `Dive deep into **${program.subject}** with interactive classes, rigorous problem solving, and comprehensive study materials designed for ${gradeText}.`;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={program.id}
                className="bg-white dark:bg-gray-900 rounded-[1.5rem] overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all group flex flex-col relative"
              >
                {/* Badge */}
                <div className="absolute top-0 left-0 z-30">
                  <div
                    className="px-4 py-1.5 pr-6 bg-gradient-to-r from-[#d94838] to-[#bf3c30] shadow-lg rounded-br-[1.5rem] flex items-center"
                  >
                    <span className="text-white text-[10px] font-black uppercase tracking-[0.1em] leading-none">
                      {program.cardTag || "OFFLINE + ONLINE ACCESS"}
                    </span>
                  </div>
                </div>

                {/* Image Section */}
                <div className="h-[180px] md:h-[220px] w-full bg-gray-100 dark:bg-gray-800 shrink-0 relative overflow-hidden">
                  <ProgressiveImage
                    src={imageDisplay}
                    alt={program.subject}
                    className="absolute inset-0 w-full h-full"
                    imgClassName="group-hover:scale-105 transition-transform duration-1000"
                    loading="lazy"
                  />
                  {/* Overlay for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Title Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                     <h4 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-[0.9] uppercase tracking-tighter drop-shadow-2xl mb-1">
                        {program.subject}
                     </h4>
                     <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg border border-white/20">
                           <BookOpen size={12} />
                        </div>
                        <span className="text-[10px] md:text-xs font-bold text-white/90 drop-shadow-md uppercase tracking-wider">
                           Concepts That Build Confidence
                        </span>
                     </div>
                  </div>

                  {/* Hinglish Tag */}
                  <div className="absolute top-12 left-0 z-20">
                    <div className="bg-gray-900/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-r-lg border-y border-r border-white/10 uppercase tracking-[0.1em]">
                      Hinglish
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4 md:p-5 flex-1 flex flex-col">
                  <div className="space-y-3 mb-4">
                    {/* Description */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded text-indigo-600 dark:text-indigo-400">
                          <Users size={14} />
                        </div>
                        <h5 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-[10px]">
                          FOR STUDENTS
                        </h5>
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed line-clamp-3">
                        <MarkdownRenderer content={descriptionDisplay} />
                      </div>
                    </div>

                    {/* Premium Features Compact Box */}
                    <div className="bg-gray-950 dark:bg-black rounded-xl p-3.5 border border-white/5 shadow-2xl relative overflow-hidden group/premium">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-[8px] font-black uppercase tracking-[0.1em] text-amber-400">
                          Premium Features
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {[
                          { icon: <PlayCircle size={10} />, label: "Live Classes" },
                          { icon: <BookOpen size={10} />, label: "Study Materials" },
                          { icon: <Calendar size={10} />, label: "Tests" }
                        ].map((feat, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-gray-300">
                            <span className="text-gray-400">{feat.icon}</span>
                            <span className="text-[9px] font-bold tracking-wide uppercase opacity-70">{feat.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Actions Area */}
                  <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-auto">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter leading-none">
                            ₹{price}
                          </span>
                          {savingsPercent > 0 && (
                            <div className="px-1.5 py-0.5 bg-green-500 rounded text-[9px] font-black text-white uppercase tracking-tighter leading-none whitespace-nowrap">
                              {savingsPercent}% OFF
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {hasMultipleDiscounts ? (
                            <>
                              <span className="text-[11px] text-gray-400 line-through font-bold opacity-60">
                                ₹{originalPrice}
                              </span>
                              <ArrowRight size={10} className="text-gray-300" />
                              <span className="text-[11px] text-gray-400 line-through font-bold opacity-80">
                                ₹{intermediatePrice}
                              </span>
                            </>
                          ) : (
                            discountNum > 0 && (
                              <span className="text-xs text-gray-400 line-through font-bold opacity-70">
                                ₹{originalPrice}
                              </span>
                            )
                          )}
                        </div>
                        
                        {totalSavings > 0 && (
                          <span className="text-[9px] text-green-500 dark:text-green-400 uppercase font-black tracking-[0.15em] block mt-1 animate-pulse">
                            YOU SAVE ₹{totalSavings.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (onManage) onManage('batches');
                            }}
                            className="px-4 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg font-black text-[10px] hover:bg-blue-500/20 transition-all tracking-widest uppercase flex items-center gap-1.5"
                          >
                            <Settings size={12} />
                            MANAGE
                          </button>
                        )}
                        <button
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("open-enrollment", {
                                detail: program.isCombo
                                  ? { subjects: program.includedSubjects }
                                  : {
                                      subject: program.subject,
                                      grade:
                                        selectedGrade !== "All"
                                          ? selectedGrade
                                          : undefined,
                                    },
                              }),
                            )
                          }
                          className="px-5 py-2.5 bg-indigo-600 text-white rounded-[1rem] font-black text-[10px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-400/30 tracking-widest uppercase flex items-center justify-center gap-2 group/btn"
                        >
                          ENROLL NOW
                          <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-200 dark:border-white/10">
          <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">
            No programs found for Class {selectedGrade}
          </h3>
          <p className="text-sm text-gray-400">
            Try selecting a different class filter or check back later.
          </p>
        </div>
      )}

      <div className="mt-12">
        <EnrollmentSection branding={branding} />
      </div>
    </div>
  );
}
