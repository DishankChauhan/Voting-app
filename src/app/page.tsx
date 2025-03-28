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
import { WorldMap } from '@/components/ui/world-map';
import { GlowingEffect } from '@/components/ui/glowing-effect';

export default function Home() {
  const { user } = useAuth();

  // Tech stack icon slugs
  const techIcons = [
    'ethereum', 'solidity', 'javascript', 'typescript', 'react', 
    'nextdotjs', 'tailwindcss', 'vercel', 'firebase', 'web3dotjs',
    'nodedotjs', 'html5', 'css3', 'git', 'github'
  ];

  // Global DAO community connection points
  const globalConnections = [
    {
      start: { lat: 40.7128, lng: -74.0060, label: "New York" },  // New York
      end: { lat: 51.5074, lng: -0.1278, label: "London" }        // London
    },
    {
      start: { lat: 35.6762, lng: 139.6503, label: "Tokyo" },     // Tokyo
      end: { lat: 22.3193, lng: 114.1694, label: "Hong Kong" }    // Hong Kong
    },
    {
      start: { lat: 1.3521, lng: 103.8198, label: "Singapore" },  // Singapore
      end: { lat: -33.8688, lng: 151.2093, label: "Sydney" }      // Sydney
    },
    {
      start: { lat: 37.7749, lng: -122.4194, label: "San Francisco" }, // San Francisco
      end: { lat: 52.5200, lng: 13.4050, label: "Berlin" }        // Berlin
    },
    {
      start: { lat: 55.7558, lng: 37.6173, label: "Moscow" },     // Moscow
      end: { lat: 28.6139, lng: 77.2090, label: "New Delhi" }     // New Delhi
    },
    {
      start: { lat: 34.0522, lng: -118.2437, label: "Los Angeles" }, // Los Angeles
      end: { lat: -34.6037, lng: -58.3816, label: "Buenos Aires" } // Buenos Aires
    }
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
      
      {/* Global DAO Community Map */}
      <div className="relative z-10 py-12 mb-16 px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">Global DAO Governance</h2>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
            Our decentralized voting platform connects DAO communities from around the world,
            enabling truly global and transparent governance.
          </p>
        </div>
        <div className="mx-auto max-w-6xl rounded-xl overflow-hidden backdrop-blur-sm bg-black/20 p-4 border border-transparent relative">
          <WorldMap 
            dots={globalConnections} 
            lineColor="#8b5cf6" 
          />
          <GlowingEffect 
            disabled={false} 
            glow={true} 
            blur={15}
            spread={50}
            borderWidth={2}
            variant="default"
            proximity={10}
          />
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
} 