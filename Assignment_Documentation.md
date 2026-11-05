# Authentication & Phone Verification App - Assignment Documentation

This application implements secure Authentication featuring Phone Number SMS OTP Verification and Email/Password Login, styled with an elegant light yellow theme.

---

## 1. Application Architecture

The application uses standard React Navigation with React Native Stack Navigator:

- **Unauthenticated Flow (`AuthStack`):**
  - `PhoneAuthScreen.js`: The default initial screen for Phone Number entry, SMS OTP request, code entry, and verification.
  - `SignInScreen.js`: Email and password login page with quick toggle to Phone OTP verification.
  - `SignUpScreen.js`: User registration screen.

- **Authenticated Flow (`MainStack`):**
  - `HomeScreen.js`: The user dashboard displaying authenticated status, verified phone number/email, UID, and sign-out controls.

---

## 2. Phone Number OTP Verification Implementation

The phone verification flow satisfies the required 4 steps:

1. **Enter Phone Number:**
   - Supports international E.164 phone numbers with country prefix chips (🇺🇸 `+1`, 🇵🇰 `+92`, 🇬🇧 `+44`, 🇮🇳 `+91`, etc.).
   - Includes real-time validation and a one-tap helper button: `🧪 Use Test Number (+1 650 555 3434)`.

2. **Request and Receive OTP via SMS:**
   - Initiates SMS delivery through Firebase Authentication (`sendPhoneOtp`).
   - Displays a loading indicator and initiates a 60-second countdown for resending codes.
   - On native mobile platforms, security verification is handled via `components/FirebaseRecaptchaModal.js`.
   - Includes a built-in **Demo Simulation Mode** switch allowing testing without Firebase SMS billing or before enabling the Phone provider in the Firebase Console.

3. **Enter Received OTP:**
   - Dedicated 6-digit verification code input with auto-formatting and numeric keyboard.
   - Includes quick "Change" option to return to Step 1 if the number was mistyped.

4. **Verify the OTP and Display Success or Failure Message:**
   - **Success:** Displays a green success banner, triggers an alert confirmation, stores the session in persistent storage, and automatically transitions the user to the authenticated app.
   - **Failure:** Displays a clear red error banner explaining why verification failed (e.g., invalid code, expired session, or console configuration needs) and allows retrying or resending.

---

## 3. Theme & Design

The app is styled with an **elegant light yellow palette**:
- **Background:** `#FFFDF5` (warm ivory cream)
- **Cards & Surfaces:** `#FFFFFF` with `#FEF3C7` border and soft amber shadow
- **Primary Color:** `#D97706` (warm golden amber for buttons and active states)
- **Accent Elements:** `#FEF3C7` / `#FDE68A` (light golden badges and chips)
- **Typography:** `#292524` (warm dark text for readability) and `#78716C` (refined secondary text)
