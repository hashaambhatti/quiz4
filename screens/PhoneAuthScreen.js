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
  Modal,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import FirebaseRecaptchaModal from '../components/FirebaseRecaptchaModal';
import { firebaseConfig } from '../src/firebase';

const COUNTRY_LIST = [
  { flag: '🇺🇸', name: 'United States', code: '+1' },
  { flag: '🇵🇰', name: 'Pakistan', code: '+92' },
  { flag: '🇬🇧', name: 'United Kingdom', code: '+44' },
  { flag: '🇮🇳', name: 'India', code: '+91' },
  { flag: '🇦🇺', name: 'Australia', code: '+61' },
  { flag: '🇨🇦', name: 'Canada', code: '+1' },
  { flag: '🇦🇪', name: 'UAE', code: '+971' },
  { flag: '🇸🇦', name: 'Saudi Arabia', code: '+966' },
  { flag: '🇩🇪', name: 'Germany', code: '+49' },
];

export default function PhoneAuthScreen({ navigation }) {
  const { sendPhoneOtp, verifyPhoneOtp } = useContext(AuthContext);

  // Step 1: Phone input, Step 2: OTP verification
  const [step, setStep] = useState(1);

  // State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_LIST[0]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [simulatedSms, setSimulatedSms] = useState(null);

  // Demo simulation mode
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ReCAPTCHA modal for native
  const [recaptchaVisible, setRecaptchaVisible] = useState(false);

  // Resend timer
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const getFullPhoneNumber = () => {
    let clean = phoneNumber.trim().replace(/[\s-]/g, '');
    if (clean.startsWith('+')) {
      return clean;
    }
    if (clean.startsWith('0')) {
      clean = clean.substring(1);
    }
    return `${selectedCountry.code}${clean}`;
  };

  /**
   * STEP 2: Request & Receive OTP
   */
  const handleRequestOtp = async (token = null) => {
    setErrorMessage('');
    setSuccessMessage('');
    setSimulatedSms(null);

    const fullPhone = getFullPhoneNumber();

    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter your phone number to continue.');
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
        setSuccessMessage(`OTP code has been sent via SMS to ${fullPhone}`);
      } else {
        if (
          result.rawError === 'BILLING_NOT_ENABLED' ||
          (result.error && result.error.includes('Blaze'))
        ) {
          Alert.alert(
            'Firebase SMS Billing Required',
            'Phone Provider is ENABLED! However, Firebase requires the Blaze (Pay-as-you-go) plan to send real SMS.\n\nTo test for free:\n• Turn on Demo Mode below (Recommended)\n• Or add your number in Firebase Console -> Authentication -> Phone -> "Phone numbers for testing".',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Switch to Demo Mode',
                onPress: () => {
                  setIsDemoMode(true);
                  setErrorMessage(
                    'Demo Mode enabled! Tap "Send Verification SMS" to test the full OTP flow.'
                  );
                },
              },
            ]
          );
        } else if (
          result.rawError === 'OPERATION_NOT_ALLOWED' ||
          (result.error && result.error.includes('Firebase Console'))
        ) {
          Alert.alert(
            'Firebase Console Setup',
            'Phone Provider is not enabled yet in your Firebase Console.\n\nSwitch to Demo Mode to test the verification flow right now?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Switch to Demo Mode',
                onPress: () => {
                  setIsDemoMode(true);
                  setErrorMessage(
                    'Demo Mode active! Tap "Send Verification SMS" to test with simulated SMS.'
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
      setErrorMessage(err.message || 'Failed to dispatch verification SMS.');
    }
  };

  /**
   * STEP 4: Verify OTP & Feedback
   */
  const handleVerifyOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
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
      setSuccessMessage('🎉 Verified! Phone authentication succeeded.');
      Alert.alert(
        'Success',
        `Phone number ${fullPhone} has been verified successfully!`,
        [{ text: 'Continue to App', style: 'default' }]
      );
    } else {
      setErrorMessage(result.error || 'Verification Failed: Invalid OTP code.');
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setOtpCode('');
    handleRequestOtp();
  };

  const handleQuickTest = () => {
    setSelectedCountry(COUNTRY_LIST[0]);
    setPhoneNumber('6505553434');
    setErrorMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Segmented Navigation Tab */}
        <View style={styles.topSegmentedBar}>
          <TouchableOpacity style={[styles.segmentTab, styles.segmentTabActive]}>
            <Text style={[styles.segmentTabText, styles.segmentTabTextActive]}>
              📱 Phone OTP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.segmentTab}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.segmentTabText}>✉️ Email Login</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeDot}>●</Text>
            <Text style={styles.heroBadgeText}>SMS VERIFICATION</Text>
          </View>
          <Text style={styles.heroTitle}>
            {step === 1 ? 'Enter Phone Number' : 'Enter 6-Digit OTP'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {step === 1
              ? 'We will send a 6-digit one-time code to verify your mobile device.'
              : `Verification code sent to ${getFullPhoneNumber()}`}
          </Text>
        </View>

        {/* Sleek Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, step === 1 ? styles.progressHalf : styles.progressFull]} />
        </View>

        {/* Main Card */}
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

          {/* Simulated SMS Notification Popup */}
          {simulatedSms ? (
            <TouchableOpacity
              style={styles.smsToast}
              onPress={() => setOtpCode(simulatedSms)}
              activeOpacity={0.85}
            >
              <View style={styles.smsToastHeader}>
                <Text style={styles.smsToastIcon}>💬</Text>
                <Text style={styles.smsToastTitle}>Incoming SMS Code</Text>
                <View style={styles.tapPill}>
                  <Text style={styles.tapPillText}>Auto-Fill</Text>
                </View>
              </View>
              <Text style={styles.smsToastBody}>
                Your code is <Text style={styles.smsToastCode}>{simulatedSms}</Text>
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* STEP 1: Phone Input Layout */}
          {step === 1 ? (
            <View>
              <Text style={styles.inputSectionLabel}>Mobile Number</Text>

              {/* Integrated Phone Input Box */}
              <View style={styles.integratedPhoneBox}>
                <TouchableOpacity
                  style={styles.countryPickerTrigger}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                  <Text style={styles.countryDropdownArrow}>▾</Text>
                </TouchableOpacity>

                <View style={styles.verticalDivider} />

                <TextInput
                  style={styles.phoneNumberInput}
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
                    style={styles.clearInputBtn}
                  >
                    <Text style={styles.clearInputText}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.quickHelperRow}>
                <TouchableOpacity style={styles.quickHelperPill} onPress={handleQuickTest}>
                  <Text style={styles.quickHelperText}>🧪 Use Test Number (+1 650 555 3434)</Text>
                </TouchableOpacity>
              </View>

              {/* Request OTP Button */}
              <TouchableOpacity
                style={[styles.primaryActionBtn, loading && styles.btnDisabled]}
                onPress={() => handleRequestOtp()}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.primaryActionText}> Sending SMS...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryActionText}>Send Verification SMS →</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: 6-Cell Modern OTP Input Layout */
            <View>
              <View style={styles.otpHeaderRow}>
                <Text style={styles.inputSectionLabel}>6-Digit Verification Code</Text>
                <TouchableOpacity
                  onPress={() => {
                    setStep(1);
                    setOtpCode('');
                    setErrorMessage('');
                  }}
                  style={styles.changeNumberLink}
                >
                  <Text style={styles.changeNumberText}>Change Number</Text>
                </TouchableOpacity>
              </View>

              {/* 6 Individual Digit Cells */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
                style={styles.otpCellsContainer}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = otpCode[index] || '';
                  const isCurrent = otpCode.length === index;
                  const isFilled = Boolean(digit);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpCell,
                        isCurrent && styles.otpCellCurrent,
                        isFilled && styles.otpCellFilled,
                      ]}
                    >
                      <Text style={styles.otpCellDigit}>
                        {digit ? digit : isCurrent ? '│' : '·'}
                      </Text>
                    </View>
                  );
                })}
              </TouchableOpacity>

              {/* Hidden text input for native keyboard handling */}
              <TextInput
                ref={otpInputRef}
                style={styles.hiddenOtpInput}
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

              {/* Verify OTP Button */}
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  (loading || otpCode.length !== 6) && styles.btnDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.primaryActionText}> Verifying Code...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryActionText}>Verify & Sign In ✓</Text>
                )}
              </TouchableOpacity>

              {/* Resend Row */}
              <View style={styles.resendRow}>
                <Text style={styles.resendPrompt}>Didn't receive code? </Text>
                {countdown > 0 ? (
                  <Text style={styles.countdownBadge}>Resend in {countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} disabled={loading}>
                    <Text style={styles.resendActiveText}>Resend SMS</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {Platform.OS === 'web' ? <div id="recaptcha-container" /> : null}

          {/* Demo Mode Toggle Card */}
          <View style={styles.modeCard}>
            <View style={styles.modeRow}>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>⚡ Demo Simulation Mode</Text>
                <Text style={styles.modeDesc}>
                  {isDemoMode
                    ? 'Simulates SMS locally (Default Code: 123456)'
                    : 'Dispatches real SMS via Firebase Phone Auth'}
                </Text>
              </View>
              <Switch
                value={isDemoMode}
                onValueChange={(val) => {
                  setIsDemoMode(val);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                trackColor={{ false: '#E7E5E4', true: '#FDE68A' }}
                thumbColor={isDemoMode ? '#D97706' : '#FAFAF9'}
              />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>Have an email account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.footerLink}>Go to Email Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Country Code Picker Modal */}
      <Modal
        visible={countryPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCountryPickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Select Country Prefix</Text>
            {COUNTRY_LIST.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.countryItem,
                  selectedCountry.code === c.code && selectedCountry.name === c.name && styles.countryItemActive,
                ]}
                onPress={() => {
                  setSelectedCountry(c);
                  setCountryPickerVisible(false);
                }}
              >
                <Text style={styles.countryItemFlag}>{c.flag}</Text>
                <Text style={styles.countryItemName}>{c.name}</Text>
                <Text style={styles.countryItemCode}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ReCAPTCHA Modal for Native Mobile */}
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 55 : 35,
    paddingBottom: 30,
  },
  topSegmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  segmentTabTextActive: {
    color: '#92400E',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  heroBadgeDot: {
    fontSize: 9,
    color: '#D97706',
    marginRight: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#292524',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressTrack: {
    height: '100%',
    backgroundColor: '#D97706',
    borderRadius: 2,
  },
  progressHalf: {
    width: '50%',
  },
  progressFull: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
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
  smsToast: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  smsToastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  smsToastIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  smsToastTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854D0E',
    flex: 1,
  },
  tapPill: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tapPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  smsToastBody: {
    fontSize: 13,
    color: '#713F12',
  },
  smsToastCode: {
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 2,
  },
  inputSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#44403C',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  integratedPhoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 16,
    height: 54,
  },
  countryPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
    marginRight: 4,
  },
  countryDropdownArrow: {
    fontSize: 10,
    color: '#B45309',
  },
  verticalDivider: {
    width: 1.5,
    height: 28,
    backgroundColor: '#FDE68A',
  },
  phoneNumberInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1C1917',
    fontWeight: '600',
  },
  clearInputBtn: {
    paddingHorizontal: 12,
  },
  clearInputText: {
    fontSize: 14,
    color: '#A8A29E',
    fontWeight: '700',
  },
  quickHelperRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
  },
  quickHelperPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quickHelperText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  primaryActionBtn: {
    backgroundColor: '#D97706',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  changeNumberLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  changeNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  otpCellsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpCell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFDF5',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpCellCurrent: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  otpCellFilled: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  otpCellDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: '#78350F',
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#78716C',
  },
  countdownBadge: {
    fontSize: 13,
    color: '#A8A29E',
    fontWeight: '600',
  },
  resendActiveText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '800',
  },
  modeCard: {
    backgroundColor: '#FFFDF5',
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeInfo: {
    flex: 1,
    paddingRight: 10,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#44403C',
  },
  modeDesc: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerMuted: {
    color: '#78716C',
    fontSize: 14,
  },
  footerLink: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#292524',
    marginBottom: 12,
    textAlign: 'center',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  countryItemActive: {
    backgroundColor: '#FEF3C7',
  },
  countryItemFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
  },
  countryItemCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
  },
});
