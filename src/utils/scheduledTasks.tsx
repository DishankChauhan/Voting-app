'use client';

import React, { useEffect, useRef } from 'react';
import { checkProposalsWithNoVotes } from '../services/contractService';
import { logger } from './logger';

// Function to run once a day
const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function useScheduledTasks() {
  const initialized = useRef(false);

  useEffect(() => {
    // Make sure this only runs once
    if (initialized.current) return;
    initialized.current = true;

    // Function to run all scheduled tasks
    const runScheduledTasks = async () => {
      try {
        logger.debug('Running scheduled tasks');
        await checkProposalsWithNoVotes();
        logger.debug('Scheduled tasks completed');
      } catch (error) {
        logger.error('Error running scheduled tasks:', error);
      }
    };

    // Run immediately on first load (but with a small delay)
    const initialTimeout = setTimeout(() => {
      runScheduledTasks();
    }, 5000); // 5 seconds delay for initial run

    // Set up daily interval
    const interval = setInterval(runScheduledTasks, ONE_DAY);

    // Cleanup on unmount
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);
}

// Component that can be added to _app.tsx or layout.tsx
export function ScheduledTasksProvider({ children }: { children: React.ReactNode }) {
  useScheduledTasks();
  return <>{children}</>;
}