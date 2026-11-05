import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import FirebaseRecaptchaModal from '../components/FirebaseRecaptchaModal';
import { firebaseConfig } from '../src/firebase';

const COUNTRY_CODES = [
  { label: '🇺🇸 +1', code: '+1' },
  { label: '🇵🇰 +92', code: '+92' },
  { label: '🇬🇧 +44', code: '+44' },
  { label: '🇮🇳 +91', code: '+91' },
  { label: '🇦🇺 +61', code: '+61' },
  { label: '🇨🇦 +1', code: '+1' },
];

export default function PhoneAuthScreen({ navigation }) {
  const { sendPhoneOtp, verifyPhoneOtp } = useContext(AuthContext);

  // Flow step: 1 = Phone Number Entry, 2 = OTP Verification
  const [step, setStep] = useState(1);

  // Form states
  const [selectedCountry, setSelectedCountry] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [simulatedSms, setSimulatedSms] = useState(null);

  // Demo / Simulation Mode switch
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Recaptcha Modal state for native platforms
  const [recaptchaVisible, setRecaptchaVisible] = useState(false);

  // Countdown timer for OTP resend
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  // Construct complete E.164 phone number
  const getFullPhoneNumber = () => {
    let clean = phoneNumber.trim().replace(/[\s-]/g, '');
    if (clean.startsWith('+')) {
      return clean;
    }
    if (clean.startsWith('0')) {
      clean = clean.substring(1);
    }
    return `${selectedCountry}${clean}`;
  };

  /**
   * STEP 2: Request and receive OTP via SMS
   */
  const handleRequestOtp = async (token = null) => {
    setErrorMessage('');
    setSuccessMessage('');
    setSimulatedSms(null);

    const fullPhone = getFullPhoneNumber();

    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }

    if (Platform.OS !== 'web' && !isDemoMode && !token) {
      setRecaptchaVisible(true);
      return;
    }

    setLoading(true);

    try {
      const result = await sendPhoneOtp(fullPhone, token, isDemoMode);
      setLoading(false);

      if (result.success) {
        setVerificationId(result.verificationId);
        if (result.confirmationResult) {
          setConfirmationResult(result.confirmationResult);
        }

        if (result.demoCode) {
          setSimulatedSms(result.demoCode);
        }

        setStep(2);
        setCountdown(60);
        setSuccessMessage(`OTP code sent via SMS to ${fullPhone}`);
      } else {
        if (
          result.rawError === 'OPERATION_NOT_ALLOWED' ||
          (result.error && result.error.includes('Firebase Console'))
        ) {
          Alert.alert(
            'Firebase Phone Provider Notice',
            'Phone Authentication is not enabled yet in your Firebase Console for project "axeonic-be83b".\n\nWould you like to switch to Demo Mode to test the OTP flow right now?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Enable Demo Mode',
                onPress: () => {
                  setIsDemoMode(true);
                  setErrorMessage(
                    'Demo Mode enabled! Tap "Request OTP via SMS" to test with simulated SMS.'
                  );
                },
              },
            ]
          );
        }
        setErrorMessage(result.error);
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Failed to send OTP.');
    }
  };

  /**
   * STEP 4: Verify the OTP and display success or failure message
   */
  const handleVerifyOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);

    const fullPhone = getFullPhoneNumber();
    const result = await verifyPhoneOtp({
      verificationId,
      otpCode: otpCode.trim(),
      confirmationResult,
      phoneNumber: fullPhone,
      isDemoMode,
    });

    setLoading(false);

    if (result.success) {
      setSuccessMessage('🎉 Success! Phone number verified successfully.');
      Alert.alert(
        'Verification Successful',
        `Phone number ${fullPhone} has been verified successfully!`,
        [{ text: 'Continue', style: 'default' }]
      );
    } else {
      setErrorMessage(result.error || 'Verification Failed: Invalid OTP code.');
    }
  };

  const handleResendOtp = () => {
    if (countdown > 0) return;
    setOtpCode('');
    handleRequestOtp();
  };

  const handleEditPhoneNumber = () => {
    setStep(1);
    setOtpCode('');
    setErrorMessage('');
    setSuccessMessage('');
    setSimulatedSms(null);
  };

  const handleFillTestNumber = () => {
    setSelectedCountry('+1');
    setPhoneNumber('6505553434');
    setErrorMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconSymbol}>📱</Text>
          </View>
          <Text style={styles.title}>Phone Verification</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter your mobile number to receive an SMS verification code'
              : 'Enter the 6-digit verification code sent to your phone'}
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step === 2 && styles.stepDotTextActive]}>2</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>
            1. Enter Phone
          </Text>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>
            2. Verify OTP
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Success Banner */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Text style={styles.bannerIcon}>✅</Text>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.bannerIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Simulated SMS Badge */}
          {simulatedSms ? (
            <TouchableOpacity
              style={styles.smsBanner}
              onPress={() => setOtpCode(simulatedSms)}
              activeOpacity={0.8}
            >
              <View style={styles.smsHeader}>
                <Text style={styles.smsIcon}>💬</Text>
                <Text style={styles.smsTitle}>Simulated SMS Received</Text>
                <Text style={styles.smsTapToFill}>Tap to auto-fill</Text>
              </View>
              <Text style={styles.smsBody}>
                Verification Code: <Text style={styles.smsCode}>{simulatedSms}</Text>
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* STEP 1: Phone Number Input */}
          {step === 1 ? (
            <View>
              <Text style={styles.sectionHeading}>Step 1: Enter Phone Number</Text>

              {/* Country Code Selector */}
              <Text style={styles.label}>Country Prefix</Text>
              <View style={styles.countryRow}>
                {COUNTRY_CODES.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.countryChip,
                      selectedCountry === item.code && styles.countryChipSelected,
                    ]}
                    onPress={() => setSelectedCountry(item.code)}
                  >
                    <Text
                      style={[
                        styles.countryChipText,
                        selectedCountry === item.code && styles.countryChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Phone Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.prefixText}>{selectedCountry}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="650 555 3434"
                    placeholderTextColor="#A8A29E"
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                  {phoneNumber ? (
                    <TouchableOpacity
                      onPress={() => setPhoneNumber('')}
                      style={styles.clearBtn}
                    >
                      <Text style={styles.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.helperText}>
                  Formatted: <Text style={styles.helperPhone}>{getFullPhoneNumber()}</Text>
                </Text>
              </View>

              {/* Quick Fill Test Number */}
              <TouchableOpacity style={styles.testNumberBtn} onPress={handleFillTestNumber}>
                <Text style={styles.testNumberBtnText}>🧪 Use Test Number (+1 650 555 3434)</Text>
              </TouchableOpacity>

              {/* Request OTP Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={() => handleRequestOtp()}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.primaryButtonText}> Requesting SMS OTP...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Request OTP via SMS</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 3 & 4: OTP Input & Verification */
            <View>
              <View style={styles.phoneSummaryRow}>
                <View>
                  <Text style={styles.sectionHeading}>Step 2: Enter Received OTP</Text>
                  <Text style={styles.sentToText}>
                    Code sent to: <Text style={styles.sentToPhone}>{getFullPhoneNumber()}</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={handleEditPhoneNumber} style={styles.editPhoneBtn}>
                  <Text style={styles.editPhoneBtnText}>✏️ Change</Text>
                </TouchableOpacity>
              </View>

              {/* 6-Digit OTP Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>6-Digit OTP Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="• • • • • •"
                  placeholderTextColor="#D97706"
                  value={otpCode}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtpCode(cleaned);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <Text style={styles.helperText}>Enter the 6-digit code received via SMS</Text>
              </View>

              {/* Verify OTP Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (loading || otpCode.length !== 6) && styles.buttonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.primaryButtonText}> Verifying Code...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Verify OTP Code</Text>
                )}
              </TouchableOpacity>

              {/* Resend Row */}
              <View style={styles.resendRow}>
                <Text style={styles.resendPrompt}>Didn't receive the SMS? </Text>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>Resend in {countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {Platform.OS === 'web' ? <div id="recaptcha-container" /> : null}

          {/* Demo Mode Toggle */}
          <View style={styles.modeCard}>
            <View style={styles.modeRow}>
              <View style={styles.modeTextContainer}>
                <Text style={styles.modeTitle}>Demo Simulation Mode</Text>
                <Text style={styles.modeDescription}>
                  {isDemoMode
                    ? 'Simulates SMS locally (Code: 123456)'
                    : 'Real Firebase SMS (requires Phone provider enabled)'}
                </Text>
              </View>
              <Switch
                value={isDemoMode}
                onValueChange={(val) => {
                  setIsDemoMode(val);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
                thumbColor={isDemoMode ? '#D97706' : '#F5F5F4'}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Navigate to Login Page */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.secondaryButtonText}>✉️ Go to Email Login</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Need an email account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.linkText}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Recaptcha Modal */}
      <FirebaseRecaptchaModal
        visible={recaptchaVisible}
        firebaseConfig={firebaseConfig}
        onVerify={(token) => {
          setRecaptchaVisible(false);
          handleRequestOtp(token);
        }}
        onCancel={() => {
          setRecaptchaVisible(false);
          setLoading(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconSymbol: {
    fontSize: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#292524',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F4',
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A8A29E',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: '#E7E5E4',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#D97706',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8A29E',
  },
  stepLabelActive: {
    color: '#B45309',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#292524',
    marginBottom: 14,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  successText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  smsBanner: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  smsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  smsIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  smsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
    flex: 1,
  },
  smsTapToFill: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
  smsBody: {
    fontSize: 13,
    color: '#713F12',
  },
  smsCode: {
    fontWeight: '800',
    letterSpacing: 2,
    color: '#B45309',
  },
  countryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  countryChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  countryChipSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  countryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  countryChipTextSelected: {
    color: '#92400E',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#44403C',
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 12,
  },
  prefixBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1.5,
    borderRightColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1917',
    fontWeight: '500',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#A8A29E',
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 6,
  },
  helperPhone: {
    fontWeight: '700',
    color: '#D97706',
  },
  testNumberBtn: {
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  testNumberBtnText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  phoneSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  sentToText: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 2,
  },
  sentToPhone: {
    fontWeight: '700',
    color: '#292524',
  },
  editPhoneBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  editPhoneBtnText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  otpInput: {
    backgroundColor: '#FFFDF5',
    borderWidth: 2,
    borderColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
    color: '#78350F',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#78716C',
  },
  countdownText: {
    fontSize: 13,
    color: '#A8A29E',
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modeCard: {
    backgroundColor: '#FFFDF5',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  modeDescription: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FEF3C7',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#A8A29E',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
  },
  secondaryButtonText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#78716C',
    fontSize: 14,
  },
  linkText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '700',
  },
});
