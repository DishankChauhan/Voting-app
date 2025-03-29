'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  Notification,
  NotificationType
} from '@/services/firebaseService';

const NotificationMenu = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Function to load notifications
  const loadNotifications = async () => {
    if (!user?.walletAddress) return;
    
    try {
      setLoading(true);
      const userNotifications = await getUserNotifications(user.walletAddress, 10);
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
    loadNotifications();
    
    // Set up a refresh interval (every 2 minutes)
    const interval = setInterval(loadNotifications, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user?.walletAddress]);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
      setIsOpen(false);
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
  
  // If no user, don't show anything
  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <h3 className="text-white font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 cursor-pointer border-b border-gray-800 last:border-b-0 transition-colors ${
                    notification.read 
                      ? 'bg-gray-900 hover:bg-gray-800/70'
                      : 'bg-gray-800/50 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0 mr-3 pt-1">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white mb-1">{notification.title}</h4>
                      <p className="text-xs text-gray-400 mb-1 line-clamp-2">{notification.message}</p>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 ml-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-gray-800 text-center">
            <Link
              href="/notifications"
              className="text-xs text-indigo-400 hover:text-indigo-300"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu; 