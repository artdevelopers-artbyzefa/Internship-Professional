import Notification from '../models/Notification.js';

/**
 * Create a notification for a user
 * @param {Object} options - Notification options
 * @param {string} options.recipient - ID of the user receiving the notification
 * @param {string} [options.sender] - ID of the user who triggered it
 * @param {string} options.type - enum: ['assignment_submission', 'phase_change', 'internship_request', 'evaluation_pending', 'system', 'announcement']
 * @param {string} options.title - Short title
 * @param {string} options.message - Detailed message
 * @param {string} [options.link] - Optional link within the frontend
 * @param {string} [options.relatedId] - Optional related object ID
 */
export const createNotification = async ({ recipient, sender, type, title, message, link, relatedId }) => {
    try {
        const notification = new Notification({
            recipient,
            sender,
            type,
            title,
            message,
            link,
            relatedId
        });
        await notification.save();
        return notification;
    } catch (err) {
        console.error('Error creating notification:', err);
    }
};

/**
 * Bulk create notifications (e.g., for phase changes to all students)
 */
export const createBulkNotifications = async (recipients, data) => {
    try {
        const notifications = recipients.map(recipientId => ({
            ...data,
            recipient: recipientId
        }));
        await Notification.insertMany(notifications);
    } catch (err) {
        console.error('Error creating bulk notifications:', err);
    }
};
