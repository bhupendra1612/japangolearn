import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getXpLevelProgress } from "@japangolearn/content";

const AVATAR_SIZE = 100;

const JLPT_LEVELS = [
  { value: "N5", label: "N5", desc: "Beginner" },
  { value: "N4", label: "N4", desc: "Elementary" },
  { value: "N3", label: "N3", desc: "Intermediate" },
  { value: "N2", label: "N2", desc: "Advanced" },
  { value: "N1", label: "N1", desc: "Expert" },
] as const;

type Section = "view" | "edit-profile" | "change-password";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut, updateProfile, updatePassword, uploadAvatar } = useAuth();

  // UI state
  const [activeSection, setActiveSection] = useState<Section>("view");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editJlpt, setEditJlpt] = useState("");

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Computed profile data
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_days ?? 0;
  const jlptLevel = profile?.current_jlpt_level ?? "N5";
  const name = profile?.display_name || user?.email?.split("@")[0] || "Learner";
  const initial = name[0]?.toUpperCase() || "?";
  const avatarUrl = profile?.avatar_url;

  const xpLevel = getXpLevelProgress(xp);

  // Member since
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  const showFeedback = useCallback((msg: string, isError: boolean) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg("");
    } else {
      setSuccessMsg(msg);
      setErrorMsg("");
    }
    setTimeout(() => {
      setSuccessMsg("");
      setErrorMsg("");
    }, 3000);
  }, []);

  // --- Avatar upload ---
  const handlePickAvatar = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to upload an avatar."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    if (!result.assets[0].base64) {
      showFeedback("Could not read image data", true);
      return;
    }

    setUploadingAvatar(true);
    const { error } = await uploadAvatar(result.assets[0].uri, result.assets[0].base64);
    setUploadingAvatar(false);

    if (error) {
      showFeedback(error.message || "Failed to upload avatar", true);
    } else {
      showFeedback("Avatar updated!", false);
    }
  };

  // --- Edit profile ---
  const openEditProfile = () => {
    setEditName(profile?.display_name || "");
    setEditJlpt(profile?.current_jlpt_level || "N5");
    setErrorMsg("");
    setSuccessMsg("");
    setActiveSection("edit-profile");
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showFeedback("Display name cannot be empty", true);
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      display_name: editName,
      current_jlpt_level: editJlpt,
    });
    setSaving(false);

    if (error) {
      showFeedback(error.message || "Failed to update profile", true);
    } else {
      showFeedback("Profile updated!", false);
      setActiveSection("view");
    }
  };

  // --- Change password ---
  const openChangePassword = () => {
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPass(false);
    setShowConfirmPass(false);
    setErrorMsg("");
    setSuccessMsg("");
    setActiveSection("change-password");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showFeedback("Password must be at least 6 characters", true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback("Passwords do not match", true);
      return;
    }
    setSaving(true);
    const { error } = await updatePassword(newPassword);
    setSaving(false);

    if (error) {
      showFeedback(error.message || "Failed to change password", true);
    } else {
      showFeedback("Password changed successfully!", false);
      setActiveSection("view");
    }
  };

  // --- Sign out ---
  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  // =================== RENDER ===================

  const renderAvatar = () => (
    <TouchableOpacity
      style={s.avatarTouchable}
      onPress={handlePickAvatar}
      activeOpacity={0.8}
      disabled={uploadingAvatar}
    >
      <View style={s.avatarOuter}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
        ) : (
          <LinearGradient
            colors={[Colors.primary[500], Colors.primary[700]]}
            style={s.avatarFallback}
          >
            <Text style={s.avatarInitial}>{initial}</Text>
          </LinearGradient>
        )}
        {uploadingAvatar ? (
          <View style={s.avatarOverlay}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        ) : (
          <View style={s.cameraIcon}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        )}
      </View>
      <View style={s.levelBadge}>
        <Text style={s.levelBadgeText}>Lv.{xpLevel.level}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFeedback = () => {
    if (!successMsg && !errorMsg) return null;
    return (
      <View style={[s.feedbackBox, errorMsg ? s.feedbackError : s.feedbackSuccess]}>
        <Ionicons
          name={errorMsg ? "alert-circle" : "checkmark-circle"}
          size={16}
          color={errorMsg ? "#EF4444" : "#10B981"}
        />
        <Text style={[s.feedbackText, { color: errorMsg ? "#EF4444" : "#10B981" }]}>
          {errorMsg || successMsg}
        </Text>
      </View>
    );
  };

  // --- VIEW MODE ---
  const renderViewMode = () => (
    <>
      {/* Header card with gradient */}
      <View style={[s.headerCard, { marginTop: -insets.top }]}>
        <LinearGradient
          colors={[Colors.primary[700], Colors.primary[900], Colors.dark.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.headerGradient, { height: 140 + insets.top }]}
        >
          {/* Decorative kanji */}
          <Text style={[s.decorativeKanji, { top: insets.top + 10 }]}>学</Text>
          <Text style={s.decorativeKanji2}>道</Text>
        </LinearGradient>

        <View style={s.headerContent}>
          {renderAvatar()}
          <Text style={s.profileName}>{name}</Text>
          <Text style={s.profileEmail}>{user?.email}</Text>
          {memberSince ? (
            <View style={s.memberRow}>
              <Ionicons name="calendar-outline" size={12} color={Colors.dark.textMuted} />
              <Text style={s.memberText}>Joined {memberSince}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {renderFeedback()}

      {/* XP Progress Card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardTitleRow}>
            <Ionicons name="star" size={18} color={Colors.gold[400]} />
            <Text style={s.cardTitle}>Experience</Text>
          </View>
          <Text style={s.xpBadge}>{xp.toLocaleString()} XP</Text>
        </View>
        <View style={s.xpBarOuter}>
          <LinearGradient
            colors={[Colors.primary[500], Colors.accent[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.xpBarFill, { width: `${Math.round(xpLevel.progress * 100)}%` as any }]}
          />
        </View>
        <View style={s.xpLabelRow}>
          <Text style={s.xpLabel}>Level {xpLevel.level}</Text>
          <Text style={s.xpLabel}>
            {xpLevel.current} / {xpLevel.needed} XP
          </Text>
          <Text style={s.xpLabel}>Level {xpLevel.level + 1}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderColor: "#F9731630" }]}>
          <View style={[s.statIconBg, { backgroundColor: "#F9731618" }]}>
            <Ionicons name="flame" size={22} color="#F97316" />
          </View>
          <Text style={[s.statValue, { color: "#F97316" }]}>{streak}</Text>
          <Text style={s.statLabel}>Day Streak</Text>
        </View>
        <View style={[s.statCard, { borderColor: Colors.primary[400] + "30" }]}>
          <View style={[s.statIconBg, { backgroundColor: Colors.primary[400] + "18" }]}>
            <Ionicons name="flag" size={22} color={Colors.primary[400]} />
          </View>
          <Text style={[s.statValue, { color: Colors.primary[400] }]}>{jlptLevel}</Text>
          <Text style={s.statLabel}>JLPT Level</Text>
        </View>
        <View style={[s.statCard, { borderColor: Colors.gold[400] + "30" }]}>
          <View style={[s.statIconBg, { backgroundColor: Colors.gold[400] + "18" }]}>
            <Ionicons name="trophy" size={22} color={Colors.gold[400]} />
          </View>
          <Text style={[s.statValue, { color: Colors.gold[400] }]}>Lv.{xpLevel.level}</Text>
          <Text style={s.statLabel}>Player</Text>
        </View>
      </View>

      {/* Actions List */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Account</Text>

        <TouchableOpacity style={s.actionItem} onPress={openEditProfile} activeOpacity={0.7}>
          <View style={[s.actionIconBg, { backgroundColor: Colors.primary[600] + "20" }]}>
            <Ionicons name="person-outline" size={18} color={Colors.primary[400]} />
          </View>
          <View style={s.actionTextWrap}>
            <Text style={s.actionLabel}>Edit Profile</Text>
            <Text style={s.actionDesc}>Name, JLPT level</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.actionItem} onPress={openChangePassword} activeOpacity={0.7}>
          <View style={[s.actionIconBg, { backgroundColor: Colors.accent[600] + "20" }]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.accent[400]} />
          </View>
          <View style={s.actionTextWrap}>
            <Text style={s.actionLabel}>Change Password</Text>
            <Text style={s.actionDesc}>Update your password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.actionItem} onPress={handlePickAvatar} activeOpacity={0.7}>
          <View style={[s.actionIconBg, { backgroundColor: Colors.sakura[500] + "20" }]}>
            <Ionicons name="image-outline" size={18} color={Colors.sakura[400]} />
          </View>
          <View style={s.actionTextWrap}>
            <Text style={s.actionLabel}>Change Avatar</Text>
            <Text style={s.actionDesc}>Upload a profile picture</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Settings */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Settings</Text>

        {[
          {
            icon: "notifications-outline" as const,
            label: "Notifications",
            detail: "Not available yet",
            color: Colors.gold[400],
            route: null,
          },
          {
            icon: "language-outline" as const,
            label: "App Language",
            detail: "English UI only",
            color: Colors.accent[400],
            route: null,
          },
          {
            icon: "information-circle-outline" as const,
            label: "About",
            detail: "v1.0.0",
            color: Colors.dark.textSecondary,
            route: "/about",
          },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.label}
            style={[s.actionItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}
            activeOpacity={item.route ? 0.7 : 1}
            disabled={!item.route}
            accessibilityState={{ disabled: !item.route }}
            onPress={() => {
              if (item.route) router.push(item.route as any);
            }}
          >
            <View style={[s.actionIconBg, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={s.actionLabelFull}>{item.label}</Text>
            <Text style={s.actionDetail}>{item.detail}</Text>
            {item.route && (
              <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Account Info */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Account Details</Text>
        {[
          { label: "Email", value: user?.email || "-" },
          { label: "Display Name", value: name },
          { label: "JLPT Level", value: jlptLevel },
          { label: "Total XP", value: `${xp.toLocaleString()} XP` },
          { label: "Player Level", value: `Level ${xpLevel.level}` },
          { label: "Role", value: profile?.role || "user" },
          ...(memberSince ? [{ label: "Member Since", value: memberSince }] : []),
        ].map((item, i, arr) => (
          <View
            key={item.label}
            style={[s.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={s.infoLabel}>{item.label}</Text>
            <Text style={s.infoValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={s.footer}>{"一歩一歩、前へ進もう\nStep by step, move forward"}</Text>
    </>
  );

  // --- EDIT PROFILE FORM ---
  const renderEditProfile = () => (
    <View style={s.formContainer}>
      <View style={s.formHeader}>
        <TouchableOpacity onPress={() => setActiveSection("view")} style={s.backBtn}>
          <Ionicons name="arrow-back" size={26} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={s.formTitle}>Edit Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      {renderFeedback()}

      <View style={s.card}>
        {/* Display Name */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Display Name</Text>
          <TextInput
            style={s.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Your display name"
            placeholderTextColor={Colors.dark.textMuted}
            maxLength={50}
          />
          <Text style={s.fieldHint}>{editName.length}/50 characters</Text>
        </View>

        {/* JLPT Level Selector */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>JLPT Level</Text>
          <Text style={s.fieldHint}>Select your current Japanese proficiency level</Text>
          <View style={s.jlptRow}>
            {JLPT_LEVELS.map((lvl) => {
              const isActive = editJlpt === lvl.value;
              return (
                <TouchableOpacity
                  key={lvl.value}
                  style={[s.jlptBtn, isActive && s.jlptBtnActive]}
                  onPress={() => setEditJlpt(lvl.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.jlptBtnLabel, isActive && s.jlptBtnLabelActive]}>
                    {lvl.label}
                  </Text>
                  <Text style={[s.jlptBtnDesc, isActive && s.jlptBtnDescActive]}>{lvl.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Save / Cancel buttons */}
      <View style={s.formActions}>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => setActiveSection("view")}
          activeOpacity={0.7}
        >
          <Text style={s.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.primaryBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- CHANGE PASSWORD FORM ---
  const renderChangePassword = () => (
    <View style={s.formContainer}>
      <View style={s.formHeader}>
        <TouchableOpacity onPress={() => setActiveSection("view")} style={s.backBtn}>
          <Ionicons name="arrow-back" size={26} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={s.formTitle}>Change Password</Text>
        <View style={{ width: 30 }} />
      </View>

      {renderFeedback()}

      <View style={s.card}>
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>New Password</Text>
          <View style={s.passwordWrap}>
            <TextInput
              style={s.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={Colors.dark.textMuted}
              secureTextEntry={!showNewPass}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={s.eyeBtn}>
              <Ionicons
                name={showNewPass ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.dark.textMuted}
              />
            </TouchableOpacity>
          </View>
          <Text style={s.fieldHint}>Minimum 6 characters</Text>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Confirm Password</Text>
          <View style={s.passwordWrap}>
            <TextInput
              style={s.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.dark.textMuted}
              secureTextEntry={!showConfirmPass}
            />
            <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={s.eyeBtn}>
              <Ionicons
                name={showConfirmPass ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.dark.textMuted}
              />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <Text style={s.fieldError}>Passwords do not match</Text>
          )}
          {confirmPassword.length > 0 && newPassword === confirmPassword && (
            <Text style={s.fieldSuccess}>Passwords match</Text>
          )}
        </View>
      </View>

      {/* Strength indicator */}
      {newPassword.length > 0 && (
        <View style={s.card}>
          <Text style={s.fieldLabel}>Password Strength</Text>
          <View style={s.strengthRow}>
            {[1, 2, 3, 4].map((level) => {
              const strength =
                newPassword.length >= 12 &&
                /[A-Z]/.test(newPassword) &&
                /[0-9]/.test(newPassword) &&
                /[^A-Za-z0-9]/.test(newPassword)
                  ? 4
                  : newPassword.length >= 8 &&
                      /[A-Z]/.test(newPassword) &&
                      /[0-9]/.test(newPassword)
                    ? 3
                    : newPassword.length >= 6
                      ? 2
                      : 1;
              const active = level <= strength;
              const color =
                strength <= 1
                  ? "#EF4444"
                  : strength === 2
                    ? "#F97316"
                    : strength === 3
                      ? "#FBBF24"
                      : "#10B981";
              return (
                <View
                  key={level}
                  style={[s.strengthBar, { backgroundColor: active ? color : Colors.dark.surface }]}
                />
              );
            })}
          </View>
          <Text style={s.fieldHint}>
            {newPassword.length < 6
              ? "Too short"
              : newPassword.length < 8
                ? "Fair"
                : newPassword.length < 12 ||
                    !/[A-Z]/.test(newPassword) ||
                    !/[0-9]/.test(newPassword)
                  ? "Good"
                  : "Strong"}
          </Text>
        </View>
      )}

      <View style={s.formActions}>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => setActiveSection("view")}
          activeOpacity={0.7}
        >
          <Text style={s.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={handleChangePassword}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.primaryBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.dark.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={s.container}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: activeSection === "view" ? 0 : insets.top + 50 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeSection === "view" && renderViewMode()}
        {activeSection === "edit-profile" && renderEditProfile()}
        {activeSection === "change-password" && renderChangePassword()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ======================== STYLES ========================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // --- Header Card ---
  headerCard: {
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  headerGradient: {
    height: 140,
    position: "relative",
    overflow: "hidden",
  },
  decorativeKanji: {
    position: "absolute",
    top: 10,
    right: 20,
    fontSize: 80,
    color: "rgba(255,255,255,0.06)",
    fontWeight: FontWeight.bold,
  },
  decorativeKanji2: {
    position: "absolute",
    bottom: -10,
    left: 16,
    fontSize: 64,
    color: "rgba(255,255,255,0.04)",
    fontWeight: FontWeight.bold,
  },
  headerContent: {
    alignItems: "center",
    marginTop: -(AVATAR_SIZE / 2),
    paddingBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },

  // --- Avatar ---
  avatarTouchable: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.dark.bg,
    overflow: "hidden",
    backgroundColor: Colors.dark.card,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
    color: "#fff",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: AVATAR_SIZE / 2,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: Colors.primary[500],
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.dark.bg,
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    left: -2,
    backgroundColor: Colors.gold[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.dark.bg,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: "#000",
  },

  // --- Profile Info ---
  profileName: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    marginBottom: Spacing.xs,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberText: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
  },

  // --- Feedback ---
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  feedbackError: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.25)",
  },
  feedbackText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    flex: 1,
  },

  // --- Cards ---
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.dark.text,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },

  // --- XP Bar ---
  xpBadge: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold[400],
  },
  xpBarOuter: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.surface,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  xpLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  xpLabel: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
  },

  // --- Stats ---
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    textAlign: "center",
    fontWeight: FontWeight.medium,
  },

  // --- Action Items ---
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    color: Colors.dark.text,
    fontWeight: FontWeight.semibold,
  },
  actionLabelFull: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.dark.text,
    fontWeight: FontWeight.medium,
  },
  actionDesc: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  actionDetail: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginRight: Spacing.xs,
  },

  // --- Info Rows ---
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.medium,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.dark.text,
    fontWeight: FontWeight.semibold,
    maxWidth: "60%",
    textAlign: "right",
  },

  // --- Sign Out ---
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.18)",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  signOutText: {
    color: "#EF4444",
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },

  // --- Footer ---
  footer: {
    textAlign: "center",
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    lineHeight: 20,
    paddingBottom: Spacing.xl,
  },

  // ======== FORMS ========
  formContainer: {
    paddingTop: Spacing.lg,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginTop: Spacing.xs,
  },
  fieldError: {
    fontSize: FontSize.xs,
    color: "#EF4444",
    marginTop: Spacing.xs,
  },
  fieldSuccess: {
    fontSize: FontSize.xs,
    color: "#10B981",
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.base,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  // Password
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.base,
    color: Colors.dark.text,
  },
  eyeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },

  // Strength
  strengthRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },

  // JLPT Selector
  jlptRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  jlptBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  jlptBtnActive: {
    backgroundColor: Colors.primary[600] + "30",
    borderColor: Colors.primary[500],
  },
  jlptBtnLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark.textSecondary,
  },
  jlptBtnLabelActive: {
    color: Colors.primary[300],
  },
  jlptBtnDesc: {
    fontSize: 9,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  jlptBtnDescActive: {
    color: Colors.primary[400],
  },

  // Form Actions
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  secondaryBtnText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[600],
    alignItems: "center",
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
});
