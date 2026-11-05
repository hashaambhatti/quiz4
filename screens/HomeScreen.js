import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, signOutUser } = useContext(AuthContext);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOutUser() },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top Status Header */}
        <View style={styles.statusPillTop}>
          <Text style={styles.statusDotTop}>●</Text>
          <Text style={styles.statusTextTop}>AUTHENTICATED SESSION</Text>
        </View>

        {/* Avatar Hero */}
        <View style={styles.avatarHero}>
          <View style={styles.avatarGlowRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>
                {user?.phoneNumber ? '📱' : user?.email ? user.email.charAt(0).toUpperCase() : '👤'}
              </Text>
            </View>
          </View>
          <View style={styles.verifiedFloatingBadge}>
            <Text style={styles.verifiedFloatingText}>✓ Verified</Text>
          </View>
        </View>

        <Text style={styles.userNameTitle}>
          {user?.phoneNumber || user?.email || 'User'}
        </Text>
        <Text style={styles.userSubtitle}>
          Authentication completed via {user?.phoneNumber ? 'SMS OTP' : 'Email credentials'}.
        </Text>

        {/* Modern Detail Card */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardHeader}>Session Identity</Text>

          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Auth Provider</Text>
              <Text style={styles.tileValue}>
                {user?.phoneNumber ? 'Phone SMS' : 'Email'}
              </Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Status</Text>
              <Text style={[styles.tileValue, { color: '#059669' }]}>Active ✓</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.fullRow}>
            <Text style={styles.fullRowLabel}>
              {user?.phoneNumber ? 'Verified Phone' : 'Email Address'}
            </Text>
            <Text style={styles.fullRowValue}>
              {user?.phoneNumber || user?.email}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.fullRow}>
            <Text style={styles.fullRowLabel}>Firebase UID</Text>
            <Text style={styles.uidMonospace}>{user?.uid}</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>Log Out from Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusDotTop: {
    color: '#059669',
    fontSize: 10,
    marginRight: 6,
  },
  statusTextTop: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.8,
  },
  avatarHero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarGlowRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF3C7',
    borderWidth: 3,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  verifiedFloatingBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: -14,
  },
  verifiedFloatingText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '800',
  },
  userNameTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#292524',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  userSubtitle: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 26,
    paddingHorizontal: 20,
  },
  detailCard: {
    width: '100%',
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
    marginBottom: 24,
  },
  detailCardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  tile: {
    flex: 1,
    backgroundColor: '#FFFDF5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    marginBottom: 4,
  },
  tileValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#FEF3C7',
    marginVertical: 10,
  },
  fullRow: {
    paddingVertical: 6,
  },
  fullRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    marginBottom: 4,
  },
  fullRowValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
  },
  uidMonospace: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8A29E',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  signOutBtn: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
});
