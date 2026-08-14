import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import type { CourseRow } from "@japangolearn/database";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { featureFlags } from "@/lib/feature-flags";
import { supabase } from "@/lib/supabase";

function priceLabel(course: CourseRow) {
  if (course.pricing_type === "free") return "FREE";
  return `${course.currency} ${(course.price_minor / 100).toFixed(2)}`;
}

export default function CoursesScreen() {
  // The marketplace ships after v1. The tab is hidden, but a deep link could
  // still target this route, so send it home rather than expose a purchase flow
  // that violates App Store and Play payment policy.
  if (!featureFlags.courseCatalog) return <Redirect href="/(tabs)" />;

  return <CoursesScreenContent />;
}

function CoursesScreenContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, user } = useAuth();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [entitledCourseIds, setEntitledCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    setCourses(data ?? []);

    if (user) {
      const { data: entitlements } = await supabase
        .from("course_entitlements")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      setEntitledCourseIds(new Set((entitlements ?? []).map((item) => item.course_id)));
    } else {
      setEntitledCourseIds(new Set());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  async function selectCourse(course: CourseRow) {
    if (!session || !user) {
      Alert.alert("Sign in required", "Sign in to enroll in free courses or buy a paid course.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }

    if (entitledCourseIds.has(course.id)) {
      Alert.alert("Course available", "This course is already linked to your account.");
      return;
    }

    setBusyCourseId(course.id);
    if (course.pricing_type === "free") {
      const { error } = await supabase.rpc("enroll_free_course", {
        target_course_id: course.id,
      });
      setBusyCourseId(null);
      if (error) {
        Alert.alert("Could not enroll", error.message);
        return;
      }
      await loadCourses();
      Alert.alert("Enrolled", "The free course is now linked to your account.");
      return;
    }

    const { data, error } = await supabase.rpc("create_course_order", {
      target_course_id: course.id,
      request_idempotency_key: `${user.id}:${course.id}:${Date.now()}:${Math.random()}`,
    });
    setBusyCourseId(null);
    if (error) {
      Alert.alert("Could not create order", error.message);
      return;
    }
    Alert.alert(
      "Order created",
      `Order ${data.id.slice(0, 8)} is pending. Complete payment on the web checkout when the payment provider is connected.`
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 54 }]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>JAPANGOLEARN MARKETPLACE</Text>
        <Text style={styles.title}>Japanese courses</Text>
        <Text style={styles.subtitle}>
          Free learning material and complete courses from approved teachers.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[400]} />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(course) => course.id}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadCourses}
              tintColor={Colors.primary[400]}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item: course }) => {
            const entitled = entitledCourseIds.has(course.id);
            return (
              <View style={styles.card}>
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="play-circle" size={56} color={Colors.primary[300]} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.levelBadge}>{course.level}</Text>
                    <Text
                      style={[styles.price, course.pricing_type === "free" && styles.freePrice]}
                    >
                      {priceLabel(course)}
                    </Text>
                  </View>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.summary} numberOfLines={3}>
                    {course.summary || course.description}
                  </Text>
                  <TouchableOpacity
                    onPress={() => void selectCourse(course)}
                    disabled={busyCourseId === course.id}
                    style={[styles.action, entitled && styles.entitledAction]}
                  >
                    {busyCourseId === course.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name={entitled ? "checkmark-circle" : "school"}
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.actionText}>
                          {entitled
                            ? "In your account"
                            : course.pricing_type === "free"
                              ? "Enroll free"
                              : "Buy course"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="library-outline" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>Courses are being prepared</Text>
              <Text style={styles.subtitle}>
                Pull down to refresh after a teacher publishes one.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  eyebrow: {
    color: Colors.primary[300],
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  title: {
    color: Colors.dark.text,
    fontSize: FontSize["3xl"],
    fontWeight: FontWeight.black,
    marginTop: Spacing.xs,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.lg, paddingBottom: 120 },
  card: {
    overflow: "hidden",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  videoPlaceholder: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary[900] + "80",
  },
  cardBody: { padding: Spacing.lg },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadge: {
    color: Colors.primary[200],
    backgroundColor: Colors.primary[900],
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  price: { color: Colors.gold[300], fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  freePrice: { color: "#6EE7B7" },
  courseTitle: {
    color: Colors.dark.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
  },
  summary: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  action: {
    minHeight: 46,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[600],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  entitledAction: { backgroundColor: "#059669" },
  actionText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  empty: { alignItems: "center", paddingVertical: 80, paddingHorizontal: Spacing.xl },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.lg,
  },
});
