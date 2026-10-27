import React, { useState } from 'react';
import { Quote, Bookmark, Share2, RefreshCw } from 'lucide-react';
import { QuoteShareModal } from './QuoteShareModal';

// Some sample Quranic verses to display
const QUOTES = [
  {
    arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    english: "Indeed, with hardship [will be] ease.",
    sourceArabic: "سورة الشرح ٦",
    sourceEnglish: "Surah Ash-Sharh 6",
    tags: ["Quran", "Hope", "Patience"]
  },
  {
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    english: "Allah does not burden a soul beyond that it can bear.",
    sourceArabic: "سورة البقرة ٢٨٦",
    sourceEnglish: "Surah Al-Baqarah 286",
    tags: ["Quran", "Comfort", "Strength"]
  },
  {
    arabic: "وَاصْبِرْ لِحُكْمِ رَبِّكَ فَإِنَّكَ بِأَعْيُنِنَا",
    english: "And be patient for the decision of your Lord, for indeed, you are in Our eyes.",
    sourceArabic: "سورة الطور ٤٨",
    sourceEnglish: "Surah At-Tur 48",
    tags: ["Quran", "Patience", "Protection"]
  },
  {
    arabic: "فَاسْتَجَابَ لَهُمْ رَبُّهُمْ",
    english: "And their Lord responded to them.",
    sourceArabic: "سورة آل عمران ١٩٥",
    sourceEnglish: "Surah Ali 'Imran 195",
    tags: ["Quran", "Prayer", "Hope"]
  },
  {
    arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ",
    english: "So remember Me; I will remember you.",
    sourceArabic: "سورة البقرة ١٥٢",
    sourceEnglish: "Surah Al-Baqarah 152",
    tags: ["Quran", "Remembrance", "Peace"]
  },
  {
    arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ",
    english: "And He is with you wherever you are.",
    sourceArabic: "سورة الحديد ٤",
    sourceEnglish: "Surah Al-Hadid 4",
    tags: ["Quran", "Faith", "Companionship"]
  },
  {
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    english: "Sufficient for us is Allah, and [He is] the best Disposer of affairs.",
    sourceArabic: "سورة آل عمران ١٧٣",
    sourceEnglish: "Surah Ali 'Imran 173",
    tags: ["Quran", "Trust", "Strength"]
  },
  {
    arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    english: "Indeed, Allah is with the patient.",
    sourceArabic: "سورة البقرة ١٥٣",
    sourceEnglish: "Surah Al-Baqarah 153",
    tags: ["Quran", "Patience", "Support"]
  },
  {
    arabic: "لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا",
    english: "Do not grieve; indeed Allah is with us.",
    sourceArabic: "سورة التوبة ٤٠",
    sourceEnglish: "Surah At-Tawbah 40",
    tags: ["Quran", "Comfort", "Hope"]
  },
  {
    arabic: "وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ",
    english: "And We are closer to him than [his] jugular vein.",
    sourceArabic: "سورة ق ١٦",
    sourceEnglish: "Surah Qaf 16",
    tags: ["Quran", "Nearness", "Love"]
  },
  {
    arabic: "وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ",
    english: "But My mercy encompasses all things.",
    sourceArabic: "سورة الأعراف ١٥٦",
    sourceEnglish: "Surah Al-A'raf 156",
    tags: ["Quran", "Mercy", "Forgiveness"]
  },
  {
    arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    english: "Unquestionably, by the remembrance of Allah hearts are assured.",
    sourceArabic: "سورة الرعد ٢٨",
    sourceEnglish: "Surah Ar-Ra'd 28",
    tags: ["Quran", "Peace", "Hearts"]
  },
  {
    arabic: "إِنْ يَنْصُرْكُمُ اللَّهُ فَلَا غَالِبَ لَكُمْ",
    english: "If Allah should aid you, no one can overcome you.",
    sourceArabic: "سورة آل عمران ١٦٠",
    sourceEnglish: "Surah Ali 'Imran 160",
    tags: ["Quran", "Victory", "Support"]
  },
  {
    arabic: "لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ",
    english: "Do not despair of the mercy of Allah.",
    sourceArabic: "سورة الزمر ٥٣",
    sourceEnglish: "Surah Az-Zumar 53",
    tags: ["Quran", "Mercy", "Hope"]
  },
  {
    arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ",
    english: "And when My servants ask you concerning Me - indeed I am near.",
    sourceArabic: "سورة البقرة ١٨٦",
    sourceEnglish: "Surah Al-Baqarah 186",
    tags: ["Quran", "Prayer", "Nearness"]
  },
  {
    arabic: "عَسَى أَنْ تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَكُمْ",
    english: "But perhaps you hate a thing and it is good for you.",
    sourceArabic: "سورة البقرة ٢١٦",
    sourceEnglish: "Surah Al-Baqarah 216",
    tags: ["Quran", "Wisdom", "Trust"]
  },
  {
    arabic: "سَيَجْعَلُ اللَّهُ بَعْدَ عُسْرٍ يُسْرًا",
    english: "Allah will bring about, after hardship, ease.",
    sourceArabic: "سورة الطلاق ٧",
    sourceEnglish: "Surah At-Talaq 7",
    tags: ["Quran", "Relief", "Hope"]
  },
  {
    arabic: "وَاللَّهُ يَعْلَمُ وَأَنْتُمْ لَا تَعْلَمُونَ",
    english: "And Allah knows, while you know not.",
    sourceArabic: "سورة البقرة ٢١٦",
    sourceEnglish: "Surah Al-Baqarah 216",
    tags: ["Quran", "Wisdom", "Trust"]
  },
  {
    arabic: "وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا",
    english: "And whoever fears Allah - He will make for him a way out.",
    sourceArabic: "سورة الطلاق ٢",
    sourceEnglish: "Surah At-Talaq 2",
    tags: ["Quran", "Provision", "Piety"]
  },
  {
    arabic: "وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ",
    english: "And will provide for him from where he does not expect.",
    sourceArabic: "سورة الطلاق ٣",
    sourceEnglish: "Surah At-Talaq 3",
    tags: ["Quran", "Provision", "Miracles"]
  },
  {
    arabic: "إِنَّ رَبِّي لَسَمِيعُ الدُّعَاءِ",
    english: "Indeed, my Lord is the Hearer of supplication.",
    sourceArabic: "سورة إبراهيم ٣٩",
    sourceEnglish: "Surah Ibrahim 39",
    tags: ["Quran", "Prayer", "Hearing"]
  },
  {
    arabic: "وَكَفَى بِاللَّهِ وَكِيلًا",
    english: "And sufficient is Allah as Disposer of affairs.",
    sourceArabic: "سورة النساء ٨١",
    sourceEnglish: "Surah An-Nisa 81",
    tags: ["Quran", "Trust", "Sufficiency"]
  },
  {
    arabic: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ",
    english: "And my success is not but through Allah.",
    sourceArabic: "سورة هود ٨٨",
    sourceEnglish: "Surah Hud 88",
    tags: ["Quran", "Success", "Reliance"]
  },
  {
    arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا",
    english: "Our Lord, pour upon us patience.",
    sourceArabic: "سورة البقرة ٢٥٠",
    sourceEnglish: "Surah Al-Baqarah 250",
    tags: ["Quran", "Patience", "Prayer"]
  },
  {
    arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
    english: "And say, 'My Lord, increase me in knowledge.'",
    sourceArabic: "سورة طه ١١٤",
    sourceEnglish: "Surah Taha 114",
    tags: ["Quran", "Knowledge", "Prayer"]
  }
];

export const DailyQuoteBanner = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const currentQuote = QUOTES[quoteIndex];

  const handleRefresh = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    setIsBookmarked(false);
  };

  return (
    <>
      <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/50 to-indigo-950/40 border border-zinc-800/60 p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Left Side: Tags and Icon */}
        <div className="flex flex-col gap-4 self-start">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl flex items-center justify-center">
              <Quote className="w-5 h-5" />
            </div>
            {currentQuote.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-white/5 text-zinc-300 rounded-full text-xs font-medium border border-white/5">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="mt-2 text-left space-y-1">
             <p className="text-zinc-400 italic text-sm md:text-base max-w-md">
              "{currentQuote.english}"
            </p>
          </div>
        </div>

        {/* Right Side / Middle: Arabic Text and Controls */}
        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
          {/* Controls */}
          <div className="flex items-center gap-3 text-zinc-400">
            <button 
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${isBookmarked ? 'text-emerald-400' : 'hover:text-white'}`}
              aria-label="Bookmark"
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors hover:text-white"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors hover:text-white"
              aria-label="New Quote"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Arabic Text */}
          <div className="text-right mt-2 space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight font-serif" dir="rtl">
              "{currentQuote.arabic}"
            </h2>
            <p className="text-sm text-zinc-500 font-medium" dir="rtl">
              — {currentQuote.sourceArabic}
            </p>
          </div>
        </div>
      </div>

      <QuoteShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)}
        quoteArabic={currentQuote.arabic}
        quoteEnglish={currentQuote.english}
        source={currentQuote.sourceArabic}
      />
    </>
  );
};
