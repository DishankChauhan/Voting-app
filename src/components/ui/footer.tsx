"use client";

import { Moon, Sun, ArrowUp, Github, Twitter, BookText } from "lucide-react";
import Link from "next/link";

function handleScrollTop() {
  window.scroll({
    top: 0,
    behavior: "smooth",
  });
}

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900 py-10 text-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
                <span className="text-sm font-bold">DG</span>
              </div>
              <h2 className="text-xl font-bold">DAO Governance</h2>
            </div>
            <p className="mt-2 text-center text-sm text-gray-400 md:text-left">
              Empowering decentralized communities with transparent and secure governance solutions.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="grid grid-cols-2 gap-8 text-sm md:flex md:gap-6">
              <div className="flex flex-col items-center gap-2 md:items-start">
                <h3 className="font-medium text-gray-300">Platform</h3>
                <div className="flex flex-col items-center gap-2 md:items-start">
                  <Link href="/proposals" className="text-gray-400 hover:text-white">
                    Proposals
                  </Link>
                  <Link href="/delegates" className="text-gray-400 hover:text-white">
                    Delegates
                  </Link>
                  <Link href="/profile" className="text-gray-400 hover:text-white">
                    Profile
                  </Link>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 md:items-start">
                <h3 className="font-medium text-gray-300">Resources</h3>
                <div className="flex flex-col items-center gap-2 md:items-start">
                  <Link href="/docs" className="text-gray-400 hover:text-white">
                    Documentation
                  </Link>
                  <Link href="/faq" className="text-gray-400 hover:text-white">
                    FAQ
                  </Link>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 pt-8 text-sm md:flex-row">
          <p className="text-center text-gray-500 md:text-left">
            &copy; {new Date().getFullYear()} DAO Governance. All rights reserved.
          </p>

          <div className="flex items-center justify-center space-x-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </a>
            <a
              href="/docs"
              className="text-gray-400 hover:text-white"
            >
              <BookText className="h-5 w-5" />
              <span className="sr-only">Documentation</span>
            </a>
          </div>

          <div className="flex items-center rounded-full border border-gray-700 bg-gray-800 px-2 py-1">
            <button
              className="mx-1 rounded-full p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
              onClick={handleScrollTop}
            >
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only">Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
