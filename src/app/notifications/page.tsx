'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  Notification,
  NotificationType
} from '@/services/firebaseService';
import { Check } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Function to load all notifications (more than in the menu)
  const loadNotifications = async () => {
    if (!user?.walletAddress) return;
    
    try {
      setLoading(true);
      const userNotifications = await getUserNotifications(user.walletAddress, 50);
      setNotifications(userNotifications);
      
      // Count unread notifications
      const unread = userNotifications.filter(notif => !notif.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      // Redirect to login if not authenticated
      router.push('/auth/login');
    }
  }, [user, router]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (notification.id && !notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        
        // Update local state
        setNotifications(prevState => 
          prevState.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Navigate if there's a link
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user?.walletAddress) return;
    
    try {
      await markAllNotificationsAsRead(user.walletAddress);
      
      // Update local state
      setNotifications(prevState => 
        prevState.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.PROPOSAL_CREATED:
        return '📝';
      case NotificationType.PROPOSAL_VOTE:
        return '🗳️';
      case NotificationType.PROPOSAL_EXECUTED:
        return '✅';
      case NotificationType.PROPOSAL_CANCELED:
        return '❌';
      case NotificationType.PROPOSAL_EXPIRED:
        return '⏰';
      case NotificationType.DELEGATION_RECEIVED:
        return '👥';
      case NotificationType.DELEGATION_REMOVED:
        return '🔙';
      case NotificationType.TOKEN_RECEIVED:
        return '💰';
      case NotificationType.PROPOSAL_NO_VOTES:
        return '⚠️';
      default:
        return '🔔';
    }
  };

  // If not authenticated, show minimal UI while redirecting
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p>Please login to view your notifications...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-gray-400 mt-4">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">You don't have any notifications yet.</p>
          <p className="text-gray-500 text-sm">
            Notifications will appear here when there are updates to proposals, 
            delegation activities, or other important events.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {notifications.map((notification, index) => (
            <div
              key={notification.id || index}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-gray-700 last:border-b-0 cursor-pointer transition-colors ${
                notification.read 
                  ? 'hover:bg-gray-700/50'
                  : 'bg-gray-700/30 hover:bg-gray-700/60'
              }`}
            >
              <div className="flex">
                <div className="flex-shrink-0 mr-4 pt-1">
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-md font-medium text-white mb-1">{notification.title}</h3>
                    {!notification.read && (
                      <div className="ml-2 flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500 text-white">
                          New
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{notification.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 