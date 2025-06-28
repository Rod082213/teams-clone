// pages/_app.js
import { SessionProvider } from "next-auth/react";
import '../styles/globals.css'; // Your global styles
import { useState, useEffect } from 'react'; // Import useState and useEffect

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // --- Theme Management State and Logic ---
  const [theme, setTheme] = useState('light'); // Default to light or load preference

  useEffect(() => {
    // This effect runs once on the client after initial hydration
    const storedTheme = localStorage.getItem('chat-app-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let initialTheme = 'light'; // Default
    if (storedTheme) {
      initialTheme = storedTheme;
    } else if (prefersDark) {
      initialTheme = 'dark';
    }
    setTheme(initialTheme); // Set state, which will trigger the next useEffect
  }, []); // Empty dependency array: runs once on client mount

  // This effect applies the data-theme attribute whenever `theme` state changes
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure this runs only on client
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('chat-app-theme', theme); // Save preference
    }
  }, [theme]); // Re-run when theme state changes

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  // --- End of Theme Management ---

  return (
    <SessionProvider session={session}>
      {/* Pass theme and toggleTheme down to all page components */}
      <Component {...pageProps} theme={theme} toggleTheme={toggleTheme} />
    </SessionProvider>
  );
}

export default MyApp;