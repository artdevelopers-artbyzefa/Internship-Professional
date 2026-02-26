import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600 text-3xl">
              <i className="fas fa-bug"></i>
            </div>
            <h1 className="text-2xl font-bold text-primary mb-4">Something went wrong</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              We encountered an unexpected error. Our team has been notified. 
              Please try refreshing the page or contact support if the issue persists.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-800 transition-all shadow-lg active:scale-95"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Go to Homepage
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left bg-gray-50 p-4 rounded-xl text-xs overflow-auto max-h-40">
                <summary className="font-bold text-gray-400 cursor-pointer">Error Details (Dev Only)</summary>
                <pre className="mt-2 text-red-500 whitespace-pre-wrap">{this.state.error?.toString()}</pre>
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
