'use client';

import { useEffect } from 'react';

export default function GoogleCallbackPage() {
  useEffect(() => {
    // Parse the hash fragment from the URL
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const idToken = params.get('id_token');
    const state = params.get('state');
    const error = params.get('error');

    // Verify state matches
    const storedState = sessionStorage.getItem('google_oauth_state');
    
    if (error) {
      // Send error to parent window
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error
      }, window.location.origin);
      window.close();
      return;
    }

    if (!idToken) {
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'No ID token received'
      }, window.location.origin);
      window.close();
      return;
    }

    if (state !== storedState) {
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'State mismatch - possible CSRF attack'
      }, window.location.origin);
      window.close();
      return;
    }

    // Send token to parent window
    window.opener?.postMessage({
      type: 'GOOGLE_AUTH_SUCCESS',
      idToken: idToken
    }, window.location.origin);

    // Close the popup
    window.close();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري إكمال تسجيل الدخول...</p>
      </div>
    </div>
  );
}
