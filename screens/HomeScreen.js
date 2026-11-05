import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, signOutUser } = useContext(AuthContext);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOutUser() },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.phoneNumber ? '📱' : user?.email ? user.email.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
          </View>
        </View>

        <Text style={styles.welcomeTitle}>Authentication Successful</Text>
        <Text style={styles.welcomeSubtitle}>
          You have successfully verified and logged into your account.
        </Text>

        <View style={styles.profileCard}>
          <Text style={styles.cardHeader}>Account Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>Authenticated</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {user?.phoneNumber ? 'Verified Phone' : 'Email Address'}
            </Text>
            <Text style={styles.infoValue}>
              {user?.phoneNumber || user?.email || 'N/A'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Auth Method</Text>
            <Text style={styles.infoValue}>
              {user?.phoneNumber ? 'Phone OTP (SMS)' : 'Email & Password'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>User UID</Text>
            <Text style={styles.uidText}>{user?.uid}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    borderWidth: 2.5,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#78350F',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: -10,
  },
  verifiedBadgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#292524',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  profileCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoColumn: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#1C1917',
    fontWeight: '700',
  },
  uidText: {
    fontSize: 12,
    color: '#A8A29E',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#FEF3C7',
    marginVertical: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D97706',
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  signOutButton: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
