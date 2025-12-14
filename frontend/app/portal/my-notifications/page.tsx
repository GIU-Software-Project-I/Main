'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Notification {
  _id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'action';
  category: 'leave' | 'attendance' | 'payroll' | 'performance' | 'onboarding' | 'offboarding' | 'profile' | 'system';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

// Mock notifications for demo - in production these come from backend
const mockNotifications: Notification[] = [
  {
    _id: '1',
    type: 'success',
    category: 'leave',
    title: 'Leave Request Approved',
    message: 'Your annual leave request for Dec 20-24, 2025 has been approved by your manager.',
    read: false,
    actionUrl: '/portal/my-leaves',
    actionLabel: 'View Details',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
  },
  {
    _id: '2',
    type: 'action',
    category: 'onboarding',
    title: 'Onboarding Task Pending',
    message: 'You have 2 pending onboarding tasks that need to be completed by Dec 18, 2025.',
    read: false,
    actionUrl: '/portal/my-onboarding',
    actionLabel: 'Complete Tasks',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    _id: '3',
    type: 'info',
    category: 'payroll',
    title: 'Payslip Available',
    message: 'Your payslip for November 2025 is now available for viewing and download.',
    read: true,
    actionUrl: '/portal/my-payslips',
    actionLabel: 'View Payslip',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    _id: '4',
    type: 'warning',
    category: 'attendance',
    title: 'Missing Clock Out',
    message: 'You forgot to clock out yesterday. Please submit an attendance correction request.',
    read: true,
    actionUrl: '/portal/my-attendance/corrections',
    actionLabel: 'Submit Correction',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
  {
    _id: '5',
    type: 'info',
    category: 'performance',
    title: 'Performance Review Published',
    message: 'Your Q3 2025 performance review has been finalized and is available for viewing.',
    read: true,
    actionUrl: '/portal/my-performance',
    actionLabel: 'View Review',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
  },
  {
    _id: '6',
    type: 'success',
    category: 'profile',
    title: 'Profile Updated',
    message: 'Your contact information has been successfully updated.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
  },
];

export default function MyNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    // In production, fetch from API
    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500', iconBg: 'bg-green-100' };
      case 'warning':
        return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', iconBg: 'bg-amber-100' };
      case 'error':
        return { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', iconBg: 'bg-red-100' };
      case 'action':
        return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', iconBg: 'bg-blue-100' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-500', iconBg: 'bg-gray-100' };
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'action':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getCategoryLabel = (category: Notification['category']) => {
    const labels: Record<string, string> = {
      leave: 'Leave',
      attendance: 'Attendance',
      payroll: 'Payroll',
      performance: 'Performance',
      onboarding: 'Onboarding',
      offboarding: 'Offboarding',
      profile: 'Profile',
      system: 'System',
    };
    return labels[category] || category;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const categories = ['all', ...Array.from(new Set(notifications.map(n => n.category)))];

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Read/Unread Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  filter === 'unread'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    filter === 'unread' ? 'bg-white text-gray-900' : 'bg-blue-600 text-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex-1">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat as Notification['category'])}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-gray-500">No notifications to display</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const styles = getTypeStyles(notification.type);
              return (
                <div
                  key={notification._id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                    !notification.read ? `${styles.border} border-l-4` : 'border-gray-100'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
                        <span className={styles.icon}>{getTypeIcon(notification.type)}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.bg} ${styles.icon}`}>
                            {getCategoryLabel(notification.category)}
                          </span>
                          <div className="flex items-center gap-3">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification._id)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Mark as read
                              </button>
                            )}
                            {notification.actionUrl && (
                              <Link
                                href={notification.actionUrl}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                {notification.actionLabel || 'View'}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {filteredNotifications.length > 0 && (
          <div className="text-center">
            <button className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              Load more notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

