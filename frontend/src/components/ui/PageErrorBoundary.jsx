import React from 'react';

/**
 * PageErrorBoundary
 * Wraps any page component. If it crashes during render,
 * this catches it and shows a recovery screen instead of a white page.
 * The user can click "Try Again" to reset the boundary and retry.
 */
export default class PageErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[PAGE CRASH CAUGHT BY BOUNDARY]', error, info?.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        const msg = this.state.error?.message || 'Unknown error';

        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white rounded-[32px] border border-rose-100 shadow-2xl shadow-rose-50 p-12 max-w-lg w-full space-y-6">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-rose-50 rounded-[28px] flex items-center justify-center mx-auto border border-rose-100">
                        <i className="fas fa-triangle-exclamation text-rose-400 text-3xl"></i>
                    </div>

                    {/* Title */}
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Page Encountered an Error</h3>
                        <p className="text-sm text-slate-400 font-medium mt-2">
                            Something went wrong rendering this section. The rest of the app is still working.
                        </p>
                    </div>

                    {/* Error detail (collapsed) */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Error Detail</p>
                        <p className="text-xs text-rose-600 font-mono break-all">{msg}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={this.handleReset}
                            className="px-8 py-3 bg-primary text-white text-xs font-black rounded-2xl hover:bg-blue-800 transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            <i className="fas fa-rotate-right mr-2"></i>Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 border border-slate-200 text-slate-500 text-xs font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
