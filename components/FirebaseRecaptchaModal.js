import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (err) {
    console.warn('react-native-webview could not be imported:', err);
  }
}

export default function FirebaseRecaptchaModal({
  visible,
  onVerify,
  onCancel,
  firebaseConfig,
}) {
  if (Platform.OS === 'web') {
    return <div id="recaptcha-container" style={{ margin: '10px 0' }} />;
  }

  if (!visible) return null;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <title>Security Verification</title>
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #FFFDF5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 16px;
          }
          .card {
            background: #ffffff;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(217, 119, 6, 0.12);
            border: 1.5px solid #FDE68A;
            text-align: center;
            max-width: 340px;
            width: 100%;
          }
          h3 {
            margin-top: 0;
            margin-bottom: 8px;
            color: #78350F;
            font-size: 18px;
            font-weight: 700;
          }
          p {
            margin-top: 0;
            margin-bottom: 20px;
            color: #78716C;
            font-size: 13px;
            line-height: 18px;
          }
          #recaptcha-container {
            display: flex;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>Security Check</h3>
          <p>Please complete the verification below to receive your SMS code.</p>
          <div id="recaptcha-container"></div>
        </div>
        <script>
          try {
            var config = ${JSON.stringify(firebaseConfig)};
            firebase.initializeApp(config);
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
              size: 'normal',
              callback: function(token) {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
                }
              },
              'expired-callback': function() {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
                }
              }
            });
            window.recaptchaVerifier.render();
          } catch(err) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: err.message }));
            }
          }
        </script>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>SMS Security Check</Text>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {WebView ? (
          <WebView
            originWhitelist={['*']}
            source={{
              html,
              baseUrl: `https://${firebaseConfig.authDomain}`,
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'token') {
                  onVerify(data.token);
                } else if (data.type === 'error') {
                  console.warn('reCAPTCHA error in WebView:', data.error);
                }
              } catch (err) {
                console.error('Failed to parse WebView message:', err);
              }
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D97706" />
                <Text style={styles.loadingText}>Loading verification...</Text>
              </View>
            )}
            style={styles.webView}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>
              WebView is not available on this platform.
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#FEF3C7',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350F',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cancelText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '700',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackText: {
    fontSize: 15,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
