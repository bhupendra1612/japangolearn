import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile, ProfileUpdate } from "@japangolearn/database";

const GUEST_KEY = "@easyjapanese_guest_mode";

type ProfileUpdateData = Pick<ProfileUpdate, "display_name" | "current_jlpt_level">;

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: any; hasSession: boolean }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  exitGuestMode: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  uploadAvatar: (uri: string, base64Data: string) => Promise<{ error: any; avatarUrl?: string }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isGuest: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, hasSession: false }),
  signOut: async () => {},
  continueAsGuest: async () => {},
  exitGuestMode: () => {},
  refreshProfile: async () => {},
  updateProfile: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  uploadAvatar: async (uri: string, base64Data: string) => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, current_jlpt_level, xp, streak_days, onboarding_completed, role"
      )
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    const init = async () => {
      // Check auth session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setSession(session);
        fetchProfile(session.user.id);
        setLoading(false);
        return;
      }
      // Check guest mode
      const guestMode = await AsyncStorage.getItem(GUEST_KEY);
      if (guestMode === "true") {
        setIsGuest(true);
      }
      setLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setIsGuest(false);
        AsyncStorage.removeItem(GUEST_KEY);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_KEY);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return { error, hasSession: !!data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
  };

  const continueAsGuest = async () => {
    await AsyncStorage.setItem(GUEST_KEY, "true");
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    AsyncStorage.removeItem(GUEST_KEY);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    if (!session?.user) return { error: { message: "Not authenticated" } };
    const updates: Partial<ProfileUpdateData> = {};
    if (data.display_name !== undefined) {
      const trimmed = data.display_name.trim();
      if (trimmed.length < 2) return { error: { message: "Name must be at least 2 characters" } };
      if (trimmed.length > 50) return { error: { message: "Name must be under 50 characters" } };
      updates.display_name = trimmed;
    }
    if (data.current_jlpt_level !== undefined) {
      const valid = ["N5", "N4", "N3", "N2", "N1"];
      if (!valid.includes(data.current_jlpt_level))
        return { error: { message: "Invalid JLPT level" } };
      updates.current_jlpt_level = data.current_jlpt_level;
    }
    const { error } = await supabase.from("profiles").update(updates).eq("id", session.user.id);
    if (!error) await fetchProfile(session.user.id);
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!session?.user) return { error: { message: "Not authenticated" } };
    if (newPassword.length < 6)
      return { error: { message: "Password must be at least 6 characters" } };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const uploadAvatar = async (uri: string, base64Data: string) => {
    if (!session?.user) return { error: { message: "Not authenticated" } };
    try {
      const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `avatars/${session.user.id}/avatar.${ext}`;

      // Calculate size roughly (base64 length * 0.75)
      const sizeInBytes = base64Data.length * 0.75;

      // Validate size (2MB max)
      if (sizeInBytes > 2 * 1024 * 1024) {
        return { error: { message: "Image must be smaller than 2MB" } };
      }

      const { decode } = require("base64-arraybuffer");

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, decode(base64Data), {
          cacheControl: "3600",
          upsert: true,
          contentType: `image/${ext}`,
        });

      if (uploadError) return { error: uploadError };

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", session.user.id);

      if (updateError) return { error: updateError };

      await fetchProfile(session.user.id);
      return { error: null, avatarUrl };
    } catch (err: any) {
      return { error: { message: err.message || "Failed to upload avatar" } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        isGuest,
        signIn,
        signUp,
        signOut,
        continueAsGuest,
        exitGuestMode,
        refreshProfile,
        updateProfile,
        updatePassword,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
