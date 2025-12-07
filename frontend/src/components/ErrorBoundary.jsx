import React from 'react';

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state to show fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console (can be sent to error tracking service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({ errorInfo });

        // TODO: Send to error tracking service like Sentry
        // if (window.Sentry) {
        //     window.Sentry.captureException(error, { extra: errorInfo });
        // }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '40px 20px',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                    <div style={{
                        maxWidth: '500px',
                        textAlign: 'center',
                        background: 'white',
                        borderRadius: '16px',
                        padding: '48px 40px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    }}>
                        <div style={{
                            fontSize: '64px',
                            marginBottom: '16px',
                        }}>
                            😵
                        </div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '12px',
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#64748b',
                            marginBottom: '32px',
                            lineHeight: '1.6',
                        }}>
                            An unexpected error occurred. Don't worry, your data is safe.
                            Try refreshing the page or going back to the dashboard.
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                        }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '12px 24px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'white',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                🔄 Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '12px 24px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    background: 'white',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.borderColor = '#cbd5e1';
                                    e.target.style.background = '#f8fafc';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.background = 'white';
                                }}
                            >
                                🏠 Go to Dashboard
                            </button>
                        </div>

                        {/* Show error details in development */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{
                                marginTop: '32px',
                                textAlign: 'left',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '16px',
                            }}>
                                <summary style={{
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    color: '#dc2626',
                                    fontSize: '13px',
                                }}>
                                    🐛 Developer Error Details
                                </summary>
                                <pre style={{
                                    marginTop: '12px',
                                    fontSize: '12px',
                                    color: '#7f1d1d',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
