import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  type LayoutChangeEvent,
  type ScrollViewInstance,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { PRIVACY_POLICY, privacyDiagnostics, getPrivacySections } from "@/lib/privacy-policy";

const c = {
  bg: "#0C1423",
  card: "#152237",
  surface: "#1D2D44",
  border: "#2B405A",
  text: "#F3F6FD",
  muted: "#A7B7CD",
  teal: "#8CDECF",
  lavender: "#C4B8F0",
  blue: "#99C7FA",
  gold: "#EAC88F",
};
type Icon = React.ComponentProps<typeof Ionicons>["name"];
const icons: Record<string, Icon> = {
  about: "business-outline",
  data: "document-text-outline",
  use: "school-outline",
  permissions: "image-outline",
  storage: "cloud-outline",
  diagnostics: "pulse-outline",
  device: "phone-portrait-outline",
  retention: "time-outline",
  choices: "options-outline",
  age: "people-outline",
  updates: "mail-outline",
};
const sections = getPrivacySections(privacyDiagnostics);
const allIds = sections.map((section) => section.id);

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const scroll = useRef<ScrollViewInstance>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const pendingJump = useRef<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [linkError, setLinkError] = useState("");
  const allExpanded = expanded.length === sections.length;

  function toggle(id: string) {
    setExpanded((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }
  function jumpTo(id: string) {
    if (!expanded.includes(id)) {
      // Wait for the expanded content to be laid out; otherwise scrolling is
      // clamped to the shorter, collapsed page's scroll range.
      pendingJump.current = id;
      setExpanded((current) => (current.includes(id) ? current : [...current, id]));
      return;
    }
    scrollToSection(id);
  }
  function scrollToSection(id: string) {
    const y = sectionPositions.current[id];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }
  function rememberPosition(id: string, event: LayoutChangeEvent) {
    sectionPositions.current[id] = event.nativeEvent.layout.y;
  }
  async function openLink(url: string) {
    setLinkError("");
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError(`Could not open that link. You can contact ${PRIVACY_POLICY.email}.`);
    }
  }
  const contact = () =>
    openLink(
      `mailto:${PRIVACY_POLICY.email}?subject=${encodeURIComponent("JapanGoLearn privacy request")}`
    );

  return (
    <View style={s.screen}>
      <View style={[s.nav, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          style={s.navButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        >
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Privacy policy</Text>
        <View style={s.navIcon}>
          <Ionicons name="shield-checkmark-outline" size={19} color={c.teal} />
        </View>
      </View>

      <ScrollView
        ref={scroll}
        onContentSizeChange={() => {
          if (pendingJump.current) {
            scrollToSection(pendingJump.current);
            pendingJump.current = null;
          }
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
      >
        <LinearGradient
          colors={["#243A53", "#192A42", c.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Ionicons name="shield-checkmark" size={27} color={c.teal} />
            </View>
            <View style={s.flex}>
              <Text style={s.eyebrow}>DIGITAL RISE 24 · INDIA</Text>
              <Text style={s.title}>Privacy, made clear.</Text>
            </View>
          </View>
          <Text style={s.intro}>What we collect, why we need it, and the choices you have.</Text>
          <View style={s.meta}>
            <Ionicons name="calendar-outline" size={13} color={c.muted} />
            <Text style={s.metaText}>Updated {PRIVACY_POLICY.updated}</Text>
            <View style={s.metaDot} />
            <Text style={s.metaText}>English</Text>
          </View>
          <View style={s.promises}>
            {(
              [
                { icon: "megaphone-outline", label: "No ads", color: c.teal },
                { icon: "card-outline", label: "No payments", color: c.blue },
                { icon: "hand-left-outline", label: "Data not sold", color: c.lavender },
              ] satisfies { icon: Icon; label: string; color: string }[]
            ).map((item) => (
              <View key={item.label} style={s.promise} accessible accessibilityLabel={item.label}>
                <Ionicons name={item.icon} size={19} color={item.color} />
                <Text style={s.promiseText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={s.introCard}>
          <View style={s.cardHeading}>
            <View style={[s.smallIcon, { backgroundColor: "#8CDECF13" }]}>
              <Ionicons name="cloud-outline" size={21} color={c.teal} />
            </View>
            <View style={s.flex}>
              <Text style={s.cardTitle}>Saved for your learning</Text>
              <Text style={s.bodySmall}>
                Account and study data in our company’s Supabase account.
              </Text>
            </View>
          </View>
          <Text style={s.body}>
            Your progress helps you pick up where you left off. A profile photo is optional, and
            this app is intended for learners aged 13+.
          </Text>
        </View>

        <View style={s.jumpRow}>
          {[
            { id: "data", label: "Your data" },
            { id: "choices", label: "Your choices" },
            { id: "retention", label: "Deletion" },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.jumpButton}
              onPress={() => jumpTo(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Read about ${item.label.toLowerCase()}`}
            >
              <Text style={s.jumpText}>{item.label}</Text>
              <Ionicons name="arrow-down" size={13} color={c.teal} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.sectionHeading}>
          <Text style={s.sectionLabel}>THE FULL POLICY</Text>
          <TouchableOpacity
            style={s.expandButton}
            accessibilityRole="button"
            accessibilityLabel={
              allExpanded ? "Collapse all policy sections" : "Expand all policy sections"
            }
            onPress={() => setExpanded(allExpanded ? [] : allIds)}
          >
            <Text style={s.linkText}>{allExpanded ? "Collapse all" : "Read all"}</Text>
            <Ionicons name={allExpanded ? "remove" : "add"} size={16} color={c.teal} />
          </TouchableOpacity>
        </View>

        {sections.map((section, index) => {
          const open = expanded.includes(section.id);
          return (
            <View
              key={section.id}
              style={[s.section, open && s.sectionOpen]}
              onLayout={(event) => rememberPosition(section.id, event)}
            >
              <TouchableOpacity
                style={s.sectionButton}
                onPress={() => toggle(section.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={section.title}
                accessibilityState={{ expanded: open }}
                aria-expanded={open}
              >
                <View style={s.sectionIcon}>
                  <Ionicons name={icons[section.id]} size={20} color={open ? c.teal : c.lavender} />
                </View>
                <View style={s.flex}>
                  <Text style={s.sectionTitle}>{section.title}</Text>
                  <Text style={s.summary}>{section.summary}</Text>
                </View>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={c.muted} />
              </TouchableOpacity>
              {open && (
                <View style={s.sectionContent}>
                  <Text style={s.sectionNumber}>SECTION {String(index + 1).padStart(2, "0")}</Text>
                  {section.id === "diagnostics" && (
                    <View style={s.diagnostics}>
                      <View style={s.diagnosticRow}>
                        <Text style={s.bodySmall}>Sentry crash reporting</Text>
                        <Text style={s.status}>
                          {privacyDiagnostics.crashReports ? "Enabled" : "Not enabled"}
                        </Text>
                      </View>
                      <View style={s.diagnosticRow}>
                        <Text style={s.bodySmall}>Usage analytics</Text>
                        <Text style={s.status}>
                          {privacyDiagnostics.usageAnalytics ? "Enabled" : "Not enabled"}
                        </Text>
                      </View>
                    </View>
                  )}
                  {section.paragraphs.map((paragraph) => (
                    <Text key={paragraph} style={s.paragraph} selectable>
                      {paragraph}
                    </Text>
                  ))}
                  {section.bullets?.map((bullet) => (
                    <View key={bullet} style={s.bulletRow}>
                      <View style={s.bullet} />
                      <Text style={[s.paragraph, s.flex]} selectable>
                        {bullet}
                      </Text>
                    </View>
                  ))}
                  {section.id === "storage" && (
                    <View style={s.providerLinks}>
                      <ProviderLink
                        label="Supabase privacy"
                        onPress={() => void openLink("https://supabase.com/privacy")}
                      />
                      <ProviderLink
                        label="Expo privacy"
                        onPress={() => void openLink("https://expo.dev/privacy")}
                      />
                    </View>
                  )}
                  {section.id === "diagnostics" && (
                    <View style={s.providerLinks}>
                      {privacyDiagnostics.crashReports && (
                        <ProviderLink
                          label="Sentry privacy"
                          onPress={() => void openLink("https://sentry.io/privacy/")}
                        />
                      )}
                      <ProviderLink
                        label="Google privacy"
                        onPress={() => void openLink("https://policies.google.com/privacy")}
                      />
                    </View>
                  )}
                  {section.id === "retention" && (
                    <TouchableOpacity
                      style={s.inlineAction}
                      accessibilityRole="button"
                      accessibilityLabel={
                        session
                          ? "Open Profile to manage your account"
                          : "Email a data deletion request"
                      }
                      onPress={() => (session ? router.push("/(tabs)/profile") : void contact())}
                    >
                      <Ionicons
                        name={session ? "person-outline" : "mail-outline"}
                        size={18}
                        color={c.teal}
                      />
                      <Text style={s.linkText}>
                        {session ? "Manage my account" : "Request deletion by email"}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={c.teal} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <View style={s.contactCard}>
          <View style={s.cardHeading}>
            <View style={[s.smallIcon, { backgroundColor: "#C4B8F016" }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={21} color={c.lavender} />
            </View>
            <View style={s.flex}>
              <Text style={s.cardTitle}>A privacy question?</Text>
              <Text style={s.bodySmall}>Contact Digital Rise 24 directly.</Text>
            </View>
          </View>
          <Text selectable style={s.email}>
            {PRIVACY_POLICY.email}
          </Text>
          <TouchableOpacity
            style={s.contactButton}
            accessibilityRole="button"
            accessibilityLabel="Email the privacy team"
            onPress={() => void contact()}
          >
            <Ionicons name="mail-outline" size={19} color={c.bg} />
            <Text style={s.contactButtonText}>Contact privacy team</Text>
            <Ionicons name="arrow-forward" size={17} color={c.bg} />
          </TouchableOpacity>
          <Text style={s.contactHint}>Please never send passwords or verification codes.</Text>
        </View>
        {linkError ? (
          <Text
            style={s.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            selectable
          >
            {linkError}
          </Text>
        ) : null}
        <Text style={s.footer}>
          Digital Rise 24 · India{`\n`}Policy version {PRIVACY_POLICY.version} · Available offline
        </Text>
      </ScrollView>
    </View>
  );
}

function ProviderLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={s.providerLink}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${label}, opens an external website`}
    >
      <Text style={s.linkText}>{label}</Text>
      <Ionicons name="open-outline" size={13} color={c.teal} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1, minWidth: 0 },
  nav: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    backgroundColor: "#192A42",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2B405A80",
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF06",
  },
  navTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: c.text },
  navIcon: { width: 36, alignItems: "center" },
  hero: { padding: 20, paddingTop: 28, paddingBottom: 24 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: {
    width: 54,
    height: 58,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#8CDECF40",
    backgroundColor: "#8CDECF12",
    justifyContent: "center",
    alignItems: "center",
  },
  eyebrow: { color: c.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginBottom: 7 },
  title: { fontSize: 27, lineHeight: 32, color: c.text, fontWeight: "700" },
  intro: { marginTop: 17, fontSize: 14, lineHeight: 22, color: c.muted },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 15 },
  metaText: { color: c.muted, fontSize: 10 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: c.muted, marginHorizontal: 2 },
  promises: { flexDirection: "row", marginTop: 23, gap: 8 },
  promise: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#FFFFFF04",
    paddingHorizontal: 4,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#A7B7CD1C",
    borderRadius: 14,
  },
  promiseText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    color: c.text,
    fontWeight: "600",
  },
  introCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
  },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  smallIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: c.text, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  bodySmall: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 2 },
  body: { color: c.muted, fontSize: 12, lineHeight: 20, marginTop: 13 },
  jumpRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  jumpButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#8CDECF09",
    borderWidth: 1,
    borderColor: "#8CDECF22",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  jumpText: { fontSize: 11, color: c.teal, fontWeight: "600" },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 7,
  },
  sectionLabel: { color: c.muted, letterSpacing: 1.7, fontSize: 10, fontWeight: "700" },
  expandButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7 },
  linkText: { fontSize: 12, fontWeight: "600", color: c.teal },
  section: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  sectionOpen: { borderColor: "#48726F" },
  sectionButton: {
    padding: 14,
    minHeight: 79,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 38,
    backgroundColor: "#C4B8F00B",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: c.text, lineHeight: 19 },
  summary: { fontSize: 10, lineHeight: 16, color: c.muted, marginTop: 3 },
  sectionContent: { padding: 17, paddingTop: 4 },
  sectionNumber: {
    color: c.teal,
    letterSpacing: 1.3,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 14,
  },
  paragraph: { fontSize: 13, lineHeight: 22, color: "#C2CFE0", marginBottom: 13 },
  bulletRow: { flexDirection: "row", gap: 10 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.teal, marginTop: 9 },
  diagnostics: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  diagnosticRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  status: { fontSize: 10, color: c.teal, fontWeight: "600" },
  providerLinks: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  providerLink: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 },
  inlineAction: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  contactCard: {
    margin: 16,
    marginTop: 10,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#1B2940",
    borderWidth: 1,
    borderColor: "#C4B8F036",
  },
  email: { fontSize: 14, lineHeight: 22, color: c.lavender, marginVertical: 17, fontWeight: "600" },
  contactButton: {
    minHeight: 49,
    paddingHorizontal: 14,
    gap: 10,
    backgroundColor: c.teal,
    borderRadius: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  contactButtonText: { color: c.bg, fontWeight: "700", fontSize: 12 },
  contactHint: { fontSize: 10, lineHeight: 16, color: c.muted, textAlign: "center", marginTop: 12 },
  error: { marginHorizontal: 20, marginBottom: 15, color: c.gold, lineHeight: 20, fontSize: 12 },
  footer: {
    fontSize: 10,
    lineHeight: 18,
    color: c.muted,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
