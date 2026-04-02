import Notification from '../models/Notification.js';
import { logError } from './logger.js';

/**
 * Create a notification for a user
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
 * Bulk create notifications
 */
export const createBulkNotifications = async (recipients, data) => {
    try {
        const notifications = recipients.map(recipientId => ({ ...data, recipient: recipientId }));
        await Notification.insertMany(notifications);
    } catch (err) {
        await logError(err, null, 'BULK_NOTIFICATION_CREATE_ERROR');
    }
};
