import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Professional Toast Configuration (State-of-the-art replacement for Toastify)
const Toast = MySwal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    showCloseButton: true, // Enabled globally for all toasts
    timer: 4000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

/**
 * Designs based on the provided UI image:
 * Yellow background, amber icon, premium brown text
 */
const toastThemes = {
    error: {
        background: '#FEF9C3', // Light yellow as per image
        color: '#78350F',      // Amber-900 brown
        icon: 'warning',
        iconColor: '#92400E'   // Amber-800
    },
    success: {
        background: '#ECFDF5', // Emerald-50
        color: '#064E3B',      // Emerald-900
        icon: 'success',
        iconColor: '#059669'   // Emerald-600
    },
    warning: {
        background: '#FFFBEB', // Amber-50
        color: '#92400E',      // Amber-800
        icon: 'warning',
        iconColor: '#D97706'   // Amber-600
    },
    info: {
        background: '#EFF6FF', // Blue-50
        color: '#1E3A8A',      // Blue-900
        icon: 'info',
        iconColor: '#3B82F6'   // Blue-500
    }
};

const triggerToast = (msg, themeKey) => {
    const theme = toastThemes[themeKey];
    Toast.fire({
        icon: theme.icon,
        iconColor: theme.iconColor,
        background: theme.background,
        color: theme.color,
        title: msg,
        customClass: {
            popup: 'rounded-2xl border border-shadow-sm shadow-xl font-medium text-[13px] px-5 py-3 relative',
            timerProgressBar: 'bg-black/10',
            closeButton: 'toast-close-btn'
        }
    });
};

export const showToast = {
    success: (msg) => triggerToast(msg, 'success'),
    error: (msg) => triggerToast(msg, 'error'),
    info: (msg) => triggerToast(msg, 'info'),
    warning: (msg) => triggerToast(msg, 'warning'),
};

// Professional Modal Alerts
export const showAlert = {
    success: (title, text) => MySwal.fire({
        icon: 'success',
        title: <span className="text-secondary">{title}</span>,
        text: text,
        confirmButtonColor: '#1E3A8A', // primary color
        customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'rounded-xl px-8'
        }
    }),
    error: (title, text) => MySwal.fire({
        icon: 'error',
        title: <span className="text-danger">{title}</span>,
        html: `<p class="text-gray-500">${text}</p>`,
        confirmButtonColor: '#1E3A8A',
        customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'rounded-xl px-8'
        }
    }),
    confirm: async (title, text, confirmText = 'Yes, Proceed') => {
        const result = await MySwal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1E3A8A',
            cancelButtonColor: '#EF4444',
            confirmButtonText: confirmText,
            customClass: {
                popup: 'rounded-3xl',
                confirmButton: 'rounded-xl px-6 py-3',
                cancelButton: 'rounded-xl px-6 py-3'
            }
        });
        return result.isConfirmed;
    }
};
