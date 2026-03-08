import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import { apiRequest } from '../../utils/api.js';

export default function VerifyEmail({ onBack }) {
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'expired' | 'error'
  const [message, setMessage] = useState('');

  const hasRun = React.useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const verifyToken = async () => {
      // Robust token extraction: handle trailing slashes or extra path segments
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const token = pathParts[pathParts.length - 1];

      if (!token || token === 'verify-email') {
        setStatus('error');
        setMessage('Invalid or missing verification token.');
        return;
      }

      try {
        const data = await apiRequest(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(data.message);
      } catch (err) {
        setStatus('expired');
        setMessage(err.message);
      }
    };

    verifyToken();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-700 to-blue-400 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl text-center">
        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl text-primary animate-pulse">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Verifying Account...</h2>
            <p className="text-sm text-gray-400">Please wait while we confirm your institutional email.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl text-success">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Verification Successful!</h2>
            <p className="text-sm text-gray-400 mb-6">{message}</p>
            <Button variant="primary" block onClick={onBack}>
              <i className="fas fa-right-to-bracket mr-2"></i> Log In Now
            </Button>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl text-danger">
              <i className="fas fa-hourglass-end"></i>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Link Expired</h2>
            <p className="text-sm text-gray-400 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" block onClick={() => window._goSignup()}>
                Request New Verification Link
              </Button>
              <Button variant="outline" block onClick={onBack}>
                Back to Login
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl text-gray-400">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Something Went Wrong</h2>
            <p className="text-sm text-gray-400 mb-6">{message}</p>
            <Button variant="outline" block onClick={onBack}>
              Back to Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
