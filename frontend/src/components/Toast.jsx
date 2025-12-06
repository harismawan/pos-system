import React, { useEffect } from 'react';
import { useUiStore } from '../store/uiStore.js';

function Toast() {
    const notification = useUiStore((state) => state.notification);
    const clearNotification = useUiStore((state) => state.clearNotification);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                clearNotification();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification, clearNotification]);

    if (!notification) return null;

    const typeStyles = {
        success: {
            background: 'linear-gradient(135deg, var(--success-500), var(--success-600))',
            icon: '✓',
        },
        error: {
            background: 'linear-gradient(135deg, var(--error-500), var(--error-600))',
            icon: '✕',
        },
        warning: {
            background: 'linear-gradient(135deg, var(--warning-500), var(--warning-600))',
            icon: '⚠',
        },
        info: {
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
            icon: 'ℹ',
        },
    };

    const style = typeStyles[notification.type] || typeStyles.info;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                animation: 'toastSlideIn 0.3s ease-out',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: style.background,
                    color: 'white',
                    padding: '14px 20px',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                    minWidth: '280px',
                    maxWidth: '400px',
                }}
            >
                <div
                    style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                    }}
                >
                    {style.icon}
                </div>
                <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                    {notification.message}
                </div>
                <button
                    onClick={clearNotification}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flexShrink: 0,
                        padding: 0,
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
}

export default Toast;
