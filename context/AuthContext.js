import React, { createContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { auth, firebaseConfig } from '../src/firebase';

export const AuthContext = createContext();

const PHONE_STORAGE_KEY = '@smd_phone_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Keep track of demo OTP sessions: { [verificationId]: { code, phoneNumber } }
  const demoSessionsRef = useRef({});

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        setUser(currentUser);
        setIsGuest(false);
        setLoading(false);
      } else {
        // If not in Firebase email/credential session, check if a phone auth session was saved
        try {
          const savedPhoneUser = await AsyncStorage.getItem(PHONE_STORAGE_KEY);
          if (savedPhoneUser && isMounted) {
            setUser(JSON.parse(savedPhoneUser));
            setIsGuest(false);
          }
        } catch (e) {
          console.warn('Error reading stored phone user:', e);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const getFriendlyErrorMessage = (codeOrMessage) => {
    const errorStr = String(codeOrMessage || '');

    if (errorStr.includes('invalid-email') || errorStr.includes('INVALID_EMAIL')) {
      return 'Please enter a valid email address.';
    }
    if (errorStr.includes('user-disabled') || errorStr.includes('USER_DISABLED')) {
      return 'This account has been disabled.';
    }
    if (
      errorStr.includes('user-not-found') ||
      errorStr.includes('wrong-password') ||
      errorStr.includes('invalid-credential') ||
      errorStr.includes('INVALID_PASSWORD')
    ) {
      return 'Invalid email or password.';
    }
    if (errorStr.includes('email-already-in-use') || errorStr.includes('EMAIL_EXISTS')) {
      return 'An account with this email already exists.';
    }
    if (errorStr.includes('weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (errorStr.includes('network-request-failed') || errorStr.includes('NETWORK_ERROR')) {
      return 'Network error. Please check your internet connection.';
    }
    if (errorStr.includes('too-many-requests') || errorStr.includes('TOO_MANY_ATTEMPTS')) {
      return 'Too many failed attempts. Please try again later.';
    }
    if (
      errorStr.includes('billing-not-enabled') ||
      errorStr.includes('BILLING_NOT_ENABLED')
    ) {
      return 'Firebase requires the Blaze (Pay-as-you-go) plan to send real SMS. To test for free: add a number under Firebase Console -> Authentication -> Phone -> "Phone numbers for testing", or enable Demo Mode below.';
    }
    if (
      errorStr.includes('operation-not-allowed') ||
      errorStr.includes('OPERATION_NOT_ALLOWED')
    ) {
      return 'Phone authentication is not enabled in Firebase Console for this project. Please enable "Phone" in Firebase Console -> Authentication -> Sign-in method, or use Demo Mode.';
    }
    if (
      errorStr.includes('invalid-phone-number') ||
      errorStr.includes('INVALID_PHONE_NUMBER') ||
      errorStr.includes('TOO_SHORT')
    ) {
      return 'Please enter a valid phone number with country code (e.g., +1 650-555-3434).';
    }
    if (errorStr.includes('missing-phone-number') || errorStr.includes('MISSING_PHONE_NUMBER')) {
      return 'Please enter your phone number.';
    }
    if (
      errorStr.includes('invalid-verification-code') ||
      errorStr.includes('INVALID_CODE')
    ) {
      return 'Invalid OTP code. Please check the 6-digit code and try again.';
    }
    if (
      errorStr.includes('code-expired') ||
      errorStr.includes('SESSION_EXPIRED')
    ) {
      return 'The OTP has expired. Please request a new code.';
    }
    if (errorStr.includes('quota-exceeded') || errorStr.includes('QUOTA_EXCEEDED')) {
      return 'SMS quota exceeded for this Firebase project. Please try again later or use test numbers.';
    }

    return errorStr || 'An unexpected error occurred. Please try again.';
  };

  /**
   * 1. Send OTP via SMS to the provided phone number.
   * Handles Web (via RecaptchaVerifier), Native (via Firebase REST API with recaptchaToken),
   * and Demo Mode for simulation when Firebase Phone provider is disabled.
   */
  const sendPhoneOtp = async (phoneNumber, recaptchaToken = null, isDemoMode = false) => {
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');

    if (!cleanPhone) {
      return {
        success: false,
        error: 'Please enter a valid phone number.',
      };
    }

    // Must start with + followed by country code and digits
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(cleanPhone)) {
      return {
        success: false,
        error: 'Phone number must be in international format starting with + and country code (e.g. +16505553434).',
      };
    }

    // --- Demo / Simulation Mode ---
    if (isDemoMode) {
      const demoCode = '123456';
      const verificationId = 'demo_session_' + Date.now();
      demoSessionsRef.current[verificationId] = {
        code: demoCode,
        phoneNumber: cleanPhone,
      };

      return {
        success: true,
        verificationId,
        demoCode,
        isDemo: true,
        phoneNumber: cleanPhone,
        message: 'OTP has been dispatched via SMS!',
      };
    }

    // --- Web Platform with RecaptchaVerifier ---
    if (Platform.OS === 'web') {
      try {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved
            },
          });
        }

        const confirmationResult = await signInWithPhoneNumber(
          auth,
          cleanPhone,
          window.recaptchaVerifier
        );

        return {
          success: true,
          verificationId: confirmationResult.verificationId,
          confirmationResult,
          phoneNumber: cleanPhone,
          message: 'OTP has been sent to your phone via SMS.',
        };
      } catch (err) {
        console.error('Web signInWithPhoneNumber error:', err);
        return {
          success: false,
          error: getFriendlyErrorMessage(err.code || err.message),
          rawError: err.code || err.message,
        };
      }
    }

    // --- Native / REST API Fallback ---
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${firebaseConfig.apiKey}`;
      const payload = {
        phoneNumber: cleanPhone,
        recaptchaToken: recaptchaToken || 'recaptcha-native-token',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Failed to send SMS OTP.';
        return {
          success: false,
          error: getFriendlyErrorMessage(errorMsg),
          rawError: errorMsg,
        };
      }

      return {
        success: true,
        verificationId: data.sessionInfo,
        phoneNumber: cleanPhone,
        message: 'OTP has been sent to your phone via SMS.',
      };
    } catch (err) {
      console.error('sendVerificationCode fetch error:', err);
      return {
        success: false,
        error: getFriendlyErrorMessage(err.message),
        rawError: err.message,
      };
    }
  };

  /**
   * 2. Verify OTP code entered by the user.
   * On success: Updates user state and stores persistent phone session.
   */
  const verifyPhoneOtp = async ({
    verificationId,
    otpCode,
    confirmationResult = null,
    phoneNumber = '',
    isDemoMode = false,
  }) => {
    const cleanCode = (otpCode || '').trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return {
        success: false,
        error: 'Please enter the complete 6-digit OTP code.',
      };
    }

    // --- Demo / Simulation Mode Verification ---
    if (isDemoMode) {
      const session = demoSessionsRef.current[verificationId];
      const validCode = session ? session.code : '123456';

      if (cleanCode === validCode) {
        const phoneUser = {
          uid: 'phone_' + Date.now().toString(36),
          phoneNumber: session?.phoneNumber || phoneNumber || '+16505553434',
          isAnonymous: false,
          isPhoneAuth: true,
          providerId: 'phone',
        };

        try {
          await AsyncStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify(phoneUser));
        } catch (e) {
          console.warn('Failed to persist demo phone user:', e);
        }

        setUser(phoneUser);
        setIsGuest(false);

        return {
          success: true,
          user: phoneUser,
          message: 'Phone number verified successfully!',
        };
      } else {
        return {
          success: false,
          error: 'Verification Failed: Invalid OTP code. Please check and try again.',
        };
      }
    }

    // --- Web ConfirmationResult Flow ---
    if (confirmationResult && typeof confirmationResult.confirm === 'function') {
      try {
        const userCredential = await confirmationResult.confirm(cleanCode);
        const signedInUser = userCredential.user;

        const phoneUser = {
          uid: signedInUser.uid,
          phoneNumber: signedInUser.phoneNumber || phoneNumber,
          isAnonymous: false,
          isPhoneAuth: true,
          providerId: 'phone',
        };

        try {
          await AsyncStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify(phoneUser));
        } catch (e) {
          console.warn('Failed to persist phone user:', e);
        }

        setUser(signedInUser);
        setIsGuest(false);

        return {
          success: true,
          user: signedInUser,
          message: 'Phone number verified successfully!',
        };
      } catch (err) {
        console.error('confirmationResult.confirm error:', err);
        return {
          success: false,
          error: getFriendlyErrorMessage(err.code || err.message),
          rawError: err.code || err.message,
        };
      }
    }

    // --- Native / REST API Verification ---
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${firebaseConfig.apiKey}`;
      const payload = {
        sessionInfo: verificationId,
        code: cleanCode,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Verification failed.';
        return {
          success: false,
          error: getFriendlyErrorMessage(errorMsg),
          rawError: errorMsg,
        };
      }

      const phoneUser = {
        uid: data.localId,
        phoneNumber: data.phoneNumber || phoneNumber,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        isAnonymous: false,
        isPhoneAuth: true,
        providerId: 'phone',
      };

      try {
        await AsyncStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify(phoneUser));
      } catch (e) {
        console.warn('Failed to persist phone user:', e);
      }

      setUser(phoneUser);
      setIsGuest(false);

      return {
        success: true,
        user: phoneUser,
        message: 'Phone number verified successfully!',
      };
    } catch (err) {
      console.error('signInWithPhoneNumber REST error:', err);
      return {
        success: false,
        error: getFriendlyErrorMessage(err.message),
        rawError: err.message,
      };
    }
  };

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setIsGuest(false);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error.code),
        rawError: error.message,
      };
    }
  };

  const signUp = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      setIsGuest(false);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error.code),
        rawError: error.message,
      };
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(PHONE_STORAGE_KEY);
      setUser(null);
      setIsGuest(false);
      return { success: true };
    } catch (error) {
      // Even if Firebase signOut throws, clear local phone storage
      await AsyncStorage.removeItem(PHONE_STORAGE_KEY);
      setUser(null);
      setIsGuest(false);
      return { success: false, error: error.message };
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        signIn,
        signUp,
        signOutUser,
        continueAsGuest,
        exitGuestMode,
        sendPhoneOtp,
        verifyPhoneOtp,
        getFriendlyErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
