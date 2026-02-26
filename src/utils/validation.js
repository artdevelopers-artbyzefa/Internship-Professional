/**
 * Centralized Validation Patterns for DIMS
 */

export const validate = {
    required: (val) => val && val.toString().trim() !== '',

    email: (val) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(val);
    },

    institutionalEmail: (val) => {
        return val.toLowerCase().endsWith('@cuiatd.edu.pk');
    },

    phone: (val) => {
        const re = /^\d{10,15}$/;
        return re.test(val);
    },

    cgpa: (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 4.0;
    },

    marks: (val, max = 100) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= max;
    },

    dateNotPast: (val) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(val) >= today;
    },

    dateAfter: (start, end) => {
        return new Date(end) > new Date(start);
    },

    password: (val) => {
        // Min 8 + 1 Upper + 1 Lower + 1 Num + 1 Special
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        return re.test(val);
    }
};

export const getFormErrors = (form, rules) => {
    const errors = {};
    Object.keys(rules).forEach(field => {
        const fieldRules = rules[field];
        for (const rule of fieldRules) {
            if (!rule.test(form[field])) {
                errors[field] = rule.message;
                break;
            }
        }
    });
    return errors;
};
