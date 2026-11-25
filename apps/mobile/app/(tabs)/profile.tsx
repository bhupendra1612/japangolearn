import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
  Modal,
  BackHandler,
  AppState,
  type ScrollViewInstance,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { captureException } from "@/lib/monitoring";
import { router, useFocusEffect } from "expo-router";
import { Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from "@japangolearn/content";
import { JLPT_SIGNUP_LEVELS } from "@/constants/jlpt";
import { TERMS_URL, SUPPORT_EMAIL } from "@/constants/links";
import {
  ProfileOverview,
  profilePalette as palette,
  type ProfileAction,
} from "@/components/ProfileOverview";
import { loadProfileProgress, saveDailyGoal, type ProfileProgress } from "@/lib/profile-progress";

const LEVEL_BLURB: Record<string, string> = {
  N5: "Beginner",
  N4: "Elementary",
  N3: "Intermediate",
  N2: "Upper-Intermediate",
  N1: "Advanced",
};
const JLPT_LEVELS = JLPT_SIGNUP_LEVELS.map((level) => ({
  value: level.value,
  label: level.value,
  desc: LEVEL_BLURB[level.value] ?? level.desc,
  available: level.available,
}));
type Section = "view" | "edit-profile" | "change-password";

export default function ProfileScreen() {
  const { user } = useAuth();
  // Reset private UI and pending forms when the signed-in account changes.
  return <ProfileContent key={user?.id ?? "guest"} />;
}

function ProfileContent() {
  const insets = useSafeAreaInsets();
  const {
    user,
    profile,
    signOut,
    deleteAccount,
    updateProfile,
    updatePassword,
    uploadAvatar,
    refreshProfile,
  } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("view");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [editName, setEditName] = useState("");
  const [editJlpt, setEditJlpt] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [progress, setProgress] = useState<ProfileProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [confirmation, setConfirmation] = useState<"sign-out" | "delete" | "delete-final" | null>(
    null
  );
  const [signingOut, setSigningOut] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const refreshAuthRef = useRef(refreshProfile);
  const progressRequest = useRef<AbortController | null>(null);
  const userId = user?.id;
  useEffect(() => {
    refreshAuthRef.current = refreshProfile;
  }, [refreshProfile]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeSection]);

  const fetchProgress = useCallback(async () => {
    progressRequest.current?.abort();
    const request = new AbortController();
    progressRequest.current = request;
    if (!userId) {
      setProgressLoading(false);
      return;
    }
    setProgressLoading(true);
    setProgressError(false);
    const timeout = setTimeout(() => {
      if (progressRequest.current === request && !request.signal.aborted) {
        request.abort();
        setProgressError(true);
        setProgressLoading(false);
      }
    }, 15000);
    try {
      const result = await loadProfileProgress(supabase, userId, new Date(), request.signal);
      if (!request.signal.aborted) setProgress(result);
    } catch (error) {
      if (!request.signal.aborted) {
        setProgressError(true);
        captureException(error, { screen: "profile", action: "progress" });
      }
    } finally {
      clearTimeout(timeout);
      if (!request.signal.aborted) setProgressLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void fetchProgress();
      void refreshAuthRef.current();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          void fetchProgress();
          void refreshAuthRef.current();
        }
      });
      return () => {
        subscription.remove();
        progressRequest.current?.abort();
      };
    }, [fetchProgress])
  );

  const closeForm = useCallback(() => {
    if (saving) return;
    setActiveSection("view");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg("");
  }, [saving]);
  useFocusEffect(
    useCallback(() => {
      if (activeSection === "view" || Platform.OS !== "android") return;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        closeForm();
        return true;
      });
      return () => subscription.remove();
    }, [activeSection, closeForm])
  );

  const showFeedback = useCallback((message: string, error: boolean) => {
    setErrorMsg(error ? message : "");
    setSuccessMsg(error ? "" : message);
  }, []);
  const handleSaveGoal = async (goal: number) => {
    if (!userId || savingGoal) return false;
    setSavingGoal(true);
    // A previous read must not overwrite the newly saved target.
    progressRequest.current?.abort();
    try {
      await saveDailyGoal(supabase, goal);
      await refreshAuthRef.current();
      setProgress((current) => (current ? { ...current, dailyTarget: goal } : current));
      showFeedback("Daily goal updated.", false);
      await fetchProgress();
      return true;
    } catch (error) {
      captureException(error, { screen: "profile", action: "save-goal" });
      showFeedback("Could not save your goal. Check your connection and try again.", true);
      return false;
    } finally {
      setSavingGoal(false);
      setProgressLoading(false);
    }
  };
  // --- Avatar upload ---
  const handlePickAvatar = async () => {
    if (uploadingAvatar) return;
    try {
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
    } catch (error) {
      captureException(error, { screen: "profile", action: "avatar" });
      showFeedback("Could not open or upload that photo. Please try again.", true);
    } finally {
      setUploadingAvatar(false);
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
    if (editName.trim().length < 2) {
      showFeedback("Use at least 2 characters for your name", true);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await updateProfile({
        display_name: editName.trim(),
        current_jlpt_level: editJlpt,
      });
      if (error) throw error;
      showFeedback("Profile updated!", false);
      setActiveSection("view");
    } catch (error) {
      captureException(error, { screen: "profile", action: "edit" });
      showFeedback(
        error instanceof Error ? error.message : "Could not update your profile. Please retry.",
        true
      );
    } finally {
      setSaving(false);
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
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showFeedback(PASSWORD_TOO_SHORT_MESSAGE, true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback("Passwords do not match", true);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      showFeedback("Password changed successfully!", false);
      setNewPassword("");
      setConfirmPassword("");
      setActiveSection("view");
    } catch (error) {
      captureException(error, { screen: "profile", action: "password" });
      showFeedback(
        error instanceof Error ? error.message : "Could not change your password. Please retry.",
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const onAction = (action: ProfileAction) => {
    switch (action) {
      case "edit":
        openEditProfile();
        break;
      case "password":
        openChangePassword();
        break;
      case "avatar":
        void handlePickAvatar();
        break;
      case "practice":
        router.push("/(tabs)/practice");
        break;
      case "achievements":
        router.push("/(tabs)/achievements");
        break;
      case "history":
        router.push("/exam/history");
        break;
      case "downloads":
        router.push("/exam/downloads");
        break;
      case "about":
        router.push("/about");
        break;
      case "privacy":
        router.push("/privacy");
        break;
      case "sign-out":
        setConfirmation("sign-out");
        break;
      case "delete":
        setConfirmation("delete");
        break;
      default: {
        const url = action === "terms" ? TERMS_URL : `mailto:${SUPPORT_EMAIL}`;
        void Linking.openURL(url).catch(() =>
          showFeedback(
            action === "support"
              ? `Please email ${SUPPORT_EMAIL}.`
              : "Could not open the page. Please try again.",
            true
          )
        );
      }
    }
  };
  const confirmAccountAction = async () => {
    if (deletingAccount || signingOut) return;
    if (confirmation === "delete") {
      setConfirmation("delete-final");
      return;
    }
    try {
      if (confirmation === "delete-final") {
        setDeletingAccount(true);
        const { error } = await deleteAccount();
        if (error) throw error;
      } else if (confirmation === "sign-out") {
        setSigningOut(true);
        await signOut();
      } else return;
      setConfirmation(null);
      router.replace("/");
    } catch (error) {
      captureException(error, { screen: "profile", action: confirmation });
      setConfirmation(null);
      showFeedback("Could not complete that action. Please try again.", true);
    } finally {
      setDeletingAccount(false);
      setSigningOut(false);
    }
  };

  const renderFeedback = () =>
    !successMsg && !errorMsg ? null : (
      <View
        style={[s.feedbackBox, errorMsg ? s.feedbackError : s.feedbackSuccess]}
        accessibilityLiveRegion="polite"
      >
        <Ionicons
          name={errorMsg ? "alert-circle-outline" : "checkmark-circle"}
          size={18}
          color={errorMsg ? palette.danger : palette.teal}
        />
        <Text style={[s.feedbackText, { color: errorMsg ? palette.danger : palette.teal }]}>
          {errorMsg || successMsg}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          style={s.dismissFeedback}
          onPress={() => {
            setErrorMsg("");
            setSuccessMsg("");
          }}
        >
          <Ionicons name="close" color={palette.muted} size={18} />
        </TouchableOpacity>
      </View>
    );
  // --- EDIT PROFILE FORM ---
  const renderEditProfile = () => (
    <View style={s.formContainer}>
      <View style={s.formHeader}>
        <TouchableOpacity
          onPress={closeForm}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color={palette.text} />
        </TouchableOpacity>
        <Text style={s.formTitle}>Edit Profile</Text>
        <View style={{ width: 44 }} />
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
            accessibilityLabel="Display name"
            editable={!saving}
            placeholder="Your display name"
            placeholderTextColor={palette.muted}
            maxLength={50}
          />
          <Text style={s.fieldHint}>{editName.length}/50 characters</Text>
        </View>

        {/* JLPT Level Selector */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>JLPT Level</Text>
          <Text style={s.fieldHint}>
            JapanGoLearn currently covers N5. Later levels are listed so you can see what is coming,
            and unlock as their content is published.
          </Text>
          <View style={s.jlptRow}>
            {JLPT_LEVELS.map((lvl) => {
              const isActive = editJlpt === lvl.value;
              // Selecting a level with no content would change nothing a learner
              // can see, so it is shown but not choosable.
              const locked = !lvl.available;
              return (
                <TouchableOpacity
                  key={lvl.value}
                  style={[s.jlptBtn, isActive && s.jlptBtnActive, locked && s.jlptBtnLocked]}
                  onPress={() => {
                    if (!locked) setEditJlpt(lvl.value);
                  }}
                  disabled={locked}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  aria-checked={isActive}
                  accessibilityState={{ checked: isActive, disabled: locked }}
                  accessibilityLabel={
                    locked ? `${lvl.label}, coming soon, not yet available` : lvl.label
                  }
                >
                  <Text style={[s.jlptBtnLabel, isActive && s.jlptBtnLabelActive]}>
                    {lvl.label}
                  </Text>
                  <Text style={[s.jlptBtnDesc, isActive && s.jlptBtnDescActive]}>
                    {locked ? "Coming soon" : lvl.desc}
                  </Text>
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
          onPress={closeForm}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
          activeOpacity={0.7}
        >
          <Text style={s.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.primaryBtn, saving && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Save profile changes"
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
        <TouchableOpacity
          onPress={closeForm}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color={palette.text} />
        </TouchableOpacity>
        <Text style={s.formTitle}>Change Password</Text>
        <View style={{ width: 44 }} />
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
              placeholderTextColor={palette.muted}
              accessibilityLabel="New password"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              secureTextEntry={!showNewPass}
              autoFocus
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showNewPass ? "Hide new password" : "Show new password"}
              onPress={() => setShowNewPass(!showNewPass)}
              style={s.eyeBtn}
            >
              <Ionicons
                name={showNewPass ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={palette.muted}
              />
            </TouchableOpacity>
          </View>
          <Text style={s.fieldHint}>Minimum {MIN_PASSWORD_LENGTH} characters</Text>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Confirm Password</Text>
          <View style={s.passwordWrap}>
            <TextInput
              style={s.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={palette.muted}
              accessibilityLabel="Confirm new password"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              secureTextEntry={!showConfirmPass}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPass ? "Hide confirmation password" : "Show confirmation password"
              }
              onPress={() => setShowConfirmPass(!showConfirmPass)}
              style={s.eyeBtn}
            >
              <Ionicons
                name={showConfirmPass ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={palette.muted}
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

      <View style={s.formActions}>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={closeForm}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
          activeOpacity={0.7}
        >
          <Text style={s.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.primaryBtn, saving && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Update password"
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
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={s.container}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: activeSection === "view" ? 0 : insets.top + 50 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeSection === "view" ? (
            <RefreshControl
              refreshing={progressLoading && !!progress}
              onRefresh={() => {
                void fetchProgress();
                void refreshAuthRef.current();
              }}
              tintColor={palette.teal}
              colors={[palette.teal]}
              progressViewOffset={insets.top + 50}
            />
          ) : undefined
        }
      >
        {activeSection === "view" && (
          <ProfileOverview
            name={profile?.display_name || user?.email?.split("@")[0] || "Learner"}
            email={user?.email ?? ""}
            avatarUrl={profile?.avatar_url}
            memberSince={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : ""
            }
            xp={profile?.xp ?? 0}
            streak={profile?.streak_days ?? 0}
            jlptLevel={profile?.current_jlpt_level ?? "N5"}
            topInset={insets.top}
            version={Constants.expoConfig?.version ?? "—"}
            progress={progress}
            progressLoading={progressLoading}
            progressError={progressError}
            uploadingAvatar={uploadingAvatar}
            deletingAccount={deletingAccount}
            savingGoal={savingGoal}
            onAction={onAction}
            onRetry={() => void fetchProgress()}
            onSaveGoal={handleSaveGoal}
          />
        )}
        {activeSection === "edit-profile" && renderEditProfile()}
        {activeSection === "change-password" && renderChangePassword()}
      </ScrollView>
      {activeSection === "view" && (successMsg || errorMsg) ? (
        <View style={s.feedbackFloating}>{renderFeedback()}</View>
      ) : null}
      <Modal
        visible={confirmation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingAccount && !signingOut) setConfirmation(null);
        }}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard} accessibilityViewIsModal>
            <Ionicons
              name={confirmation === "sign-out" ? "log-out-outline" : "warning-outline"}
              size={28}
              color={palette.danger}
            />
            <Text style={s.formTitle}>
              {confirmation === "sign-out"
                ? "Sign out?"
                : confirmation === "delete"
                  ? "Delete your account?"
                  : "Permanently delete account?"}
            </Text>
            <Text style={s.modalBody}>
              {confirmation === "sign-out"
                ? "Your saved progress will be here when you return."
                : "This permanently deletes your account, learning progress and personal data. This cannot be undone."}
            </Text>
            <TouchableOpacity
              style={s.dangerBtn}
              disabled={deletingAccount || signingOut}
              accessibilityRole="button"
              accessibilityLabel={
                confirmation === "sign-out"
                  ? "Confirm sign out"
                  : confirmation === "delete"
                    ? "Continue to delete confirmation"
                    : "Delete forever"
              }
              onPress={() => void confirmAccountAction()}
            >
              {deletingAccount || signingOut ? (
                <ActivityIndicator color={palette.bg} />
              ) : (
                <Text style={s.primaryBtnText}>
                  {confirmation === "sign-out"
                    ? "Sign out"
                    : confirmation === "delete"
                      ? "Continue"
                      : "Delete forever"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelModal}
              disabled={deletingAccount || signingOut}
              accessibilityRole="button"
              accessibilityLabel="Cancel account action"
              onPress={() => setConfirmation(null)}
            >
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scrollContent: { paddingBottom: 30 },
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  feedbackFloating: { position: "absolute", bottom: 8, left: 0, right: 0 },
  dismissFeedback: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#050B18CC" },
  modalCard: {
    padding: 24,
    gap: 18,
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  modalBody: { fontSize: 14, lineHeight: 22, color: palette.muted },
  dangerBtn: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.danger,
  },
  cancelModal: { minHeight: 44, alignItems: "center", justifyContent: "center" },
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
    backgroundColor: "#1B3A3D",
    borderColor: "rgba(16,185,129,0.25)",
  },
  feedbackError: {
    backgroundColor: "#452C3B",
    borderColor: "rgba(239,68,68,0.25)",
  },
  feedbackText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    flex: 1,
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
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: palette.text,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: palette.muted,
    marginBottom: Spacing.sm,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: palette.muted,
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
    backgroundColor: palette.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.base,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.border,
  },

  // Password
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.base,
    color: palette.text,
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
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  jlptBtn: {
    width: "30%",
    minHeight: 62,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: palette.surface,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  jlptBtnActive: {
    backgroundColor: "#C4B8F018",
    borderColor: palette.lavender,
  },
  jlptBtnLocked: {
    opacity: 0.4,
  },
  jlptBtnLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: palette.muted,
  },
  jlptBtnLabelActive: {
    color: palette.lavender,
  },
  jlptBtnDesc: {
    fontSize: 9,
    color: palette.muted,
    marginTop: 2,
  },
  jlptBtnDescActive: {
    color: palette.lavender,
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
    backgroundColor: palette.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryBtnText: {
    color: palette.muted,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: palette.lavender,
    alignItems: "center",
    shadowColor: palette.lavender,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: palette.bg,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
});
