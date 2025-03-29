'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, limit, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification, NotificationType, deleteNotification } from '@/services/firebaseService';
import { Trash2, RefreshCw, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20;

  // Only allow admin access
  useEffect(() => {
    if (user && !user.isAdmin) {
      router.push('/');
    }
  }, [user, router]);

  // Function to load all notifications for admin
  const loadAllNotifications = async () => {
    if (!user?.isAdmin) return;

    try {
      setLoading(true);
      const notificationsCollection = collection(db, 'notifications');
      
      // Build query based on filters
      let baseQuery = query(
        notificationsCollection,
        orderBy('timestamp', 'desc'),
        limit(itemsPerPage * page)
      );
      
      // Add type filter if not 'all'
      if (filterType !== 'all') {
        baseQuery = query(
          notificationsCollection,
          where('type', '==', filterType),
          orderBy('timestamp', 'desc'),
          limit(itemsPerPage * page)
        );
      }
      
      const querySnapshot = await getDocs(baseQuery);
      const allNotifications: Notification[] = [];
      
      querySnapshot.forEach((doc) => {
        allNotifications.push({
          id: doc.id,
          ...doc.data() as Omit<Notification, 'id'>
        });
      });
      
      // Apply search filter client-side
      let filteredNotifications = allNotifications;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredNotifications = allNotifications.filter(
          n => n.title.toLowerCase().includes(searchLower) || 
               n.message.toLowerCase().includes(searchLower) ||
               n.userId.toLowerCase().includes(searchLower)
        );
      }
      
      setNotifications(filteredNotifications);
      setHasMore(querySnapshot.size >= itemsPerPage * page);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications when filters change
  useEffect(() => {
    if (user?.isAdmin) {
      loadAllNotifications();
    }
  }, [user, page, filterType]); // Don't include searchTerm to avoid too many queries

  // Handle search with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      loadAllNotifications();
    }, 500);
    
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Handle notification deletion
  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get notification type label
  const getNotificationTypeLabel = (type: NotificationType) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // If not admin, show access denied
  if (user && !user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between mb-6 items-start md:items-center gap-4">
        <div className="flex items-center">
          <Link 
            href="/admin" 
            className="mr-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Admin Notifications</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search notifications..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <select
            className="bg-gray-800 rounded-md border border-gray-700 px-3 py-2 focus:outline-none focus:border-indigo-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {Object.values(NotificationType).map(type => (
              <option key={type} value={type}>
                {getNotificationTypeLabel(type)}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => loadAllNotifications()}
            className="px-4 py-2 bg-gray-800 rounded-md border border-gray-700 hover:bg-gray-700 transition flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {loading && page === 1 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-gray-400 mt-4">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">No notifications found.</p>
          <p className="text-gray-500 text-sm">
            Try adjusting your filters or search criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-900 text-indigo-300">
                        {getNotificationTypeLabel(notification.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {notification.userId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {notification.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-md truncate">
                      {notification.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(notification.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {notification.read ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                          Read
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900 text-yellow-300">
                          Unread
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => notification.id && handleDeleteNotification(notification.id)}
                        className="text-red-400 hover:text-red-300 transition p-1"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {loading && page > 1 && (
            <div className="flex justify-center mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          )}
          
          {hasMore && !loading && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm transition"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 