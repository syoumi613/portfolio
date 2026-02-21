'use client';

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Gallery from '@/components/Gallery';
import LoginModal from '@/components/LoginModal';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, setDoc, increment, serverTimestamp, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSlider from '@/components/HeroSlider';



export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("portrait");
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  const categories = [
    { id: 'portrait', label: 'ポートレート' },
    { id: 'architecture', label: '建築' },
    { id: 'event', label: 'イベント' },
    { id: 'food', label: '料理' },

  ];

  const isTracked = useRef(false);

  useEffect(() => {
    fetchPhotos();

    // Analytics Tracking (Run once per mount)
    if (!isTracked.current) {
      isTracked.current = true;
      trackMainPageVisit();
    }
  }, []);

  const trackMainPageVisit = async () => {
    // Exclude Admin Tracking
    if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
      console.log('Skipping main page tracking for Admin');
      return;
    }

    try {
      // 1. Increment Total Page Views
      const mainStatsRef = doc(db, 'siteStats', 'main');
      await setDoc(mainStatsRef, {
        pageViews: increment(1)
      }, { merge: true });

      // 2. Add Timeline Log
      await addDoc(collection(db, 'siteStats', 'main', 'logs'), {
        type: 'view',
        timestamp: serverTimestamp(),
      });
      console.log('Tracked main page visit.');
    } catch (error) {
      console.error("Failed to track main page visit:", error);
    }
  };

  const fetchPhotos = async () => {
    try {
      // Fetch public photos
      const q = query(
        collection(db, 'albums'),
        where('type', '==', 'public')
      );

      const querySnapshot = await getDocs(q);
      const fetchedPhotos: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPhotos.push({
          id: doc.id,
          ...data,
          // Ensure category exists, default to 'portrait' if missing
          category: data.category || 'portrait'
        });
      });

      // Sort by order ASC, then createdAt DESC as fallback
      fetchedPhotos.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });

      console.log("Fetched Photos:", fetchedPhotos);
      setPhotos(fetchedPhotos);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter photos based on selected category (Case Insensitive)
  const filteredPhotos = photos.filter(photo => {
    if (!photo.category) return false;
    // Admin saves as "portrait" (lowercase), Tabs are "Portrait" (Capitalized)
    return photo.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Cinematic Animation Settings (Slow & Premium)
  // Premium Animation Settings (Stable & Simple)
  // Premium Animation Settings (Stable & Simple)
  const appleEase = [0.16, 1, 0.3, 1] as const;
  const slowTransition = { duration: 1.8, ease: appleEase };

  // 1. Common animation for text/buttons
  const fadeInUpVariant = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: slowTransition
    }
  };

  // 2. Photo animation with slight zoom
  // 2. Photo animation with slight zoom
  const photoVariant = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1.0,
      transition: slowTransition
    }
  };


  // 3. Hero Container (Title)
  const heroContainerVariant = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.4
      }
    }
  };

  // 4. Gallery Container
  const galleryContainerVariant = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 1.2
      }
    }
  };



  // 4. Gallery Container
  // 4. Gallery Container


  return (
    <div className="min-h-screen flex flex-col">


      {/* Hero button needs this modal */}
      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />



      <div className="flex-1 flex flex-col">
        <motion.div
          variants={heroContainerVariant}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          className="w-full px-6 pb-8"
        >
          <div className="mt-28 md:mt-36 w-full px-4">
            <div className="w-full h-[300px] md:h-[500px]">
              <HeroSlider />
            </div>

            {/* Category Tabs */}
            <motion.div
              variants={fadeInUpVariant}
              className="mt-12 flex justify-center"
            >
              <div className="inline-flex bg-gray-100 p-1.5 rounded-full relative">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`relative px-8 py-3 rounded-full text-base font-medium transition-colors duration-200 ${selectedCategory === cat.id
                      ? 'text-white'
                      : 'text-gray-900 hover:text-black'
                      }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {selectedCategory === cat.id && (
                      <motion.span
                        layoutId="activeTab"
                        className="absolute inset-0 bg-black rounded-full shadow-sm"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{cat.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Gallery Section - Scroll Animation */}
        <section className="flex-1 px-6 pb-20 w-full">



          {/* Photo Grid */}
          <Gallery
            photos={filteredPhotos}
            loading={loading}
            categories={categories}
            emptyMessage="このカテゴリーにはまだ写真がありません。"
          />
        </section>
      </div>

      <footer className="py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Photographer Portfolio. All rights reserved.
      </footer>
    </div>
  );
}
