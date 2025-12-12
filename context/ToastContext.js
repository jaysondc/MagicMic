import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState({
        visible: false,
        message: '',
        type: 'info',
        actionLabel: null,
        onAction: null,
    });

    const timeoutRef = useRef(null);

    const showToast = useCallback(({ message, type = 'info', actionLabel, onAction, duration = 4000 }) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setToast({
            visible: true,
            message,
            type,
            actionLabel,
            onAction: () => {
                if (onAction) onAction();
                hideToast();
            },
        });

        if (duration > 0) {
            timeoutRef.current = setTimeout(() => {
                hideToast();
            }, duration);
        }
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, visible: false }));
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                actionLabel={toast.actionLabel}
                onAction={toast.onAction}
                onDismiss={hideToast}
            />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
