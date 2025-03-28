'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LampDemo } from '@/components/LampDemo';
import { TestimonialsSection } from '@/components/ui/testimonials-section';
import { testimonials } from '@/data/testimonials';
import { GlowCard } from '@/components/ui/glow-card';
import { Footer } from '@/components/ui/footer';
import { FileText, Users } from 'lucide-react';
import { Vote } from "@/components/ui/icons";
import { IconCloud } from '@/components/ui/icon-cloud';

export default function Home() {
  const { user } = useAuth();

  // Tech stack icon slugs
  const techIcons = [
    'ethereum', 'solidity', 'javascript', 'typescript', 'react', 
    'nextdotjs', 'tailwindcss', 'vercel', 'firebase', 'web3dotjs',
    'nodedotjs', 'html5', 'css3', 'git', 'github'
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero Section with Lamp Effect */}
      <LampDemo />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 -mt-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <GlowCard 
              title="Create Proposals" 
              description="Submit your ideas and initiatives for community voting and discussion."
              icon={<FileText className="h-6 w-6" />}
              glowProps={{
                colors: ['#6366f1', '#4f46e5', '#4338ca', '#3730a3'],
                mode: 'breathe',
                blur: 'stronger',
              }}
            />

            <GlowCard 
              title="Cast Votes" 
              description="Vote on active proposals and make your voice heard in the community."
              icon={<Vote className="h-6 w-6" />}
              glowProps={{
                colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'],
                mode: 'colorShift',
                blur: 'stronger',
              }}
            />

            <GlowCard 
              title="Delegate Power" 
              description="Delegate your voting power to trusted representatives in the ecosystem."
              icon={<Users className="h-6 w-6" />}
              glowProps={{
                colors: ['#ec4899', '#db2777', '#be185d', '#9d174d'],
                mode: 'flowHorizontal',
                blur: 'stronger',
              }}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-24">
            <Link
              href="/proposals"
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition transform hover:scale-105"
            >
              View Proposals
            </Link>
            
            <Link
              href="/delegates"
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition transform hover:scale-105"
            >
              Browse Delegates
            </Link>

            {user && (
              <Link
                href="/profile"
                className="px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition transform hover:scale-105"
              >
                My Profile
              </Link>
            )}
          </div>
        </div>

        {/* Testimonials Section */}
        <TestimonialsSection
          title="What Our Community Says"
          description="Join thousands of users who are already building better governance systems with our platform."
          testimonials={testimonials}
          className="mt-16"
        />
      </div>
      
      {/* Tech Stack Icon Cloud */}
      <div className="relative z-10 py-12 mb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">Built With Modern Technology</h2>
          <p className="text-gray-400 mt-2">Our platform utilizes industry-leading tools and frameworks</p>
        </div>
        <IconCloud iconSlugs={techIcons} />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
} 