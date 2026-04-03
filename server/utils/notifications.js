/**
 * @fileoverview System Notification Dispatcher.
 * This module handles the creation of persistent in-app notifications
 * for both individual users and bulk groups.
 */

import Notification from '../models/Notification.js';
import { logError } from './logger.js';

/**
 * Dispatches a single in-app notification.
 * 
 * @param {Object} options - Notification details.
 * @param {string} options.recipient - ID of the target user.
 * @param {string} options.sender - ID of the originating user/system.
 * @param {string} options.type - Category of notification.
 * @param {string} options.title - Short, descriptive title.
 * @param {string} options.message - Full notification body content.
 * @param {string} [options.link] - Optional URL for the notification target.
 * @param {string} [options.relatedId] - Associated entity ID for referencing.
 * @returns {Promise<Object>} The saved notification document.
 */
export const createNotification = async ({ recipient, sender, type, title, message, link, relatedId }) => {
    try {
        const notification = new Notification({ recipient, sender, type, title, message, link, relatedId });
        await notification.save();
        return notification;
    } catch (err) {
        await logError(err, null, 'NOTIFICATION_CREATE_ERROR');
    }
};

/**
 * Efficiently dispatches high-volume notifications to multiple recipients.
 * Uses MongoDB batch operations for optimized throughput.
 * 
 * @param {string[]} recipients - List of user IDs.
 * @param {Object} data - Shared metadata for all notifications.
 * @returns {Promise<void>}
 */
export const createBulkNotifications = async (recipients, data) => {
    try {
        const notifications = recipients.map(recipientId => ({ ...data, recipient: recipientId }));
        await Notification.insertMany(notifications);
    } catch (err) {
        await logError(err, null, 'BULK_NOTIFICATION_CREATE_ERROR');
    }
};

