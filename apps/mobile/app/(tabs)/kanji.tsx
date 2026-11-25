import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { Kanji } from "@japangolearn/database";
import { useAuth } from "@/lib/auth";
import { loadKanji, rememberedKanji, type KanjiLoad } from "@/lib/kanji-loader";
import {
  buildKanjiReview,
  filterKanji,
  type KanjiCollection,
  type KanjiSort,
} from "@/lib/kanji-study";
import { useKanjiNotebook } from "@/lib/use-kanji-notebook";
import { describeAge } from "@/lib/offline-cache";
import { KanjiDetail } from "@/components/kanji/KanjiDetail";
import { KanjiReview } from "@/components/kanji/KanjiReview";
import {
  Action,
  ColorIcon,
  IconButton,
  K,
  topicStyle,
  u,
  type KanjiIcon,
} from "@/components/kanji/kanji-ui";

export default function KanjiScreen() {
  const { user } = useAuth();
  return <KanjiLibrary key={user?.id ?? "guest"} owner={user?.id ?? "guest"} />;
}

function KanjiLibrary({ owner }: { owner: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [content, setContent] = useState<KanjiLoad>(
    () => rememberedKanji() ?? { data: [], savedAt: 0, refreshing: true, error: false }
  );
  const request = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [collection, setCollection] = useState<KanjiCollection>("all");
  const [sort, setSort] = useState<KanjiSort>("course");
  const [selected, setSelected] = useState<Kanji | null>(null);
  const [review, setReview] = useState<Kanji[] | null>(null);
  const { notebook, ready, saveError, update, toggleSaved, setFamiliar } = useKanjiNotebook(owner);
  const [day] = useState(() => {
    const date = new Date();
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  });
  const { focusItemId, focusNonce } = useLocalSearchParams<{
    focusItemId?: string;
    focusNonce?: string;
  }>();
  const consumedFocus = useRef<string | null>(null);
  const reload = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    void loadKanji(setContent, controller.signal);
  }, []);
  useEffect(() => {
    reload();
    return () => request.current?.abort();
  }, [reload]);
  useFocusEffect(
    useCallback(() => {
      const key = focusNonce ?? focusItemId;
      if (!key || !focusItemId || consumedFocus.current === key) return;
      const found = content.data.find((item) => String(item.id) === focusItemId);
      if (found) {
        consumedFocus.current = key;
        setSelected(found);
      }
    }, [content.data, focusItemId, focusNonce])
  );
  useFocusEffect(
    useCallback(
      () => () => {
        setSelected(null);
        setReview(null);
      },
      []
    )
  );

  const items = filterKanji(content.data, { query, tag, collection, sort, notebook });
  const featuredTopics = [
    "basic",
    "nature",
    "time",
    "people",
    "number",
    "body",
    "food",
    "movement",
  ];
  const tags = [...new Set(content.data.flatMap((item) => item.tags))].sort((a, b) => {
    const rank = (value: string) =>
      featuredTopics.includes(value) ? featuredTopics.indexOf(value) : 99;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const savedCount = content.data.filter((item) => notebook.saved.includes(item.id)).length;
  const familiarCount = content.data.filter((item) => notebook.familiar.includes(item.id)).length;
  const daily = content.data.length ? content.data[day % content.data.length] : undefined;
  const sortLabels = { course: "Course order", strokes: "Fewest strokes", meaning: "Meaning A–Z" };
  const grid = notebook.layout === "grid";
  const cardWidth = (Math.min(width, 860) - 52) / 2;
  const reset = () => {
    setQuery("");
    setTag(null);
    setCollection("all");
  };
  const collections: {
    id: KanjiCollection;
    label: string;
    icon: KanjiIcon;
    color: string;
    count: number;
  }[] = [
    { id: "all", label: "All", icon: "grid", color: K.purple, count: content.data.length },
    { id: "saved", label: "Saved", icon: "bookmark", color: K.amber, count: savedCount },
    {
      id: "new",
      label: "Learning",
      icon: "leaf",
      color: K.blue,
      count: content.data.length - familiarCount,
    },
    {
      id: "familiar",
      label: "Familiar",
      icon: "checkmark-circle",
      color: K.green,
      count: familiarCount,
    },
  ];

  const header = (
    <View style={s.header}>
      <View style={u.between}>
        <View style={[u.row, { flex: 1, minWidth: 0 }]}>
          <IconButton
            name="arrow-back"
            label="Back to Home"
            onPress={() => router.navigate("/(tabs)")}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={u.eyebrow} numberOfLines={1}>
              YOUR JAPANESE JOURNEY
            </Text>
            <Text style={[u.title, { marginTop: 3 }]}>
              Kanji <Text style={{ color: K.purple }}>漢字</Text>
            </Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityLabel="Show Hindi meanings"
          accessibilityState={{ checked: notebook.showHindi, disabled: !ready }}
          disabled={!ready}
          onPress={() => update({ showHindi: !notebook.showHindi })}
          style={[
            s.hindiToggle,
            notebook.showHindi && { borderColor: K.amber + "70", backgroundColor: K.amber + "12" },
          ]}
        >
          <Text style={{ fontSize: 17, color: K.amber }}>अ</Text>
          <Text style={[s.smallLabel, { color: notebook.showHindi ? K.amber : K.muted }]}>
            Hindi
          </Text>
        </TouchableOpacity>
      </View>
      <LinearGradient
        colors={["#37305B", "#242A49", "#1B2C3D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={[u.row, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1, gap: 9 }}>
            <View style={[u.row, { gap: 6 }]}>
              <Ionicons name="sparkles" color={K.amber} size={15} />
              <Text style={[u.eyebrow, { color: K.amber, letterSpacing: 1 }]}>N5 · DISCOVER</Text>
            </View>
            <Text style={s.heroTitle}>Every kanji{`\n`}has a story.</Text>
            <Text style={[u.muted, { color: "#CFD1E4", fontSize: 11 }]}>
              Explore. Listen. Remember.
            </Text>
          </View>
          {daily && (
            <TouchableOpacity
              onPress={() => setSelected(daily)}
              accessibilityRole="button"
              accessibilityLabel={`Today's kanji: ${daily.character}, ${daily.meaning_en[0]}`}
              style={s.daily}
            >
              <Text style={s.dailyLabel}>TODAY’S KANJI</Text>
              <Text style={s.dailyChar}>{daily.character}</Text>
              <Text style={s.dailyMeaning} numberOfLines={1}>
                {daily.meaning_en[0]}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.heroFooter}>
          <View style={u.row}>
            <ColorIcon name="leaf" color={K.green} size={30} />
            <View>
              <Text style={s.progressText}>
                {familiarCount}
                <Text style={{ color: "#BFC4DE", fontWeight: "400" }}>
                  {" "}
                  / {content.data.length} familiar
                </Text>
              </Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${content.data.length ? (familiarCount / content.data.length) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </View>
      </LinearGradient>
      <TouchableOpacity
        disabled={!items.length || !ready}
        onPress={() => setReview(buildKanjiReview(items, notebook.familiar))}
        accessibilityRole="button"
        accessibilityLabel={`Start quick recall with up to ${Math.min(10, items.length)} filtered kanji`}
        accessibilityState={{ disabled: !items.length || !ready }}
        activeOpacity={0.8}
        style={[s.reviewBanner, (!items.length || !ready) && { opacity: 0.5 }]}
      >
        <ColorIcon name="flash" color={K.amber} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.reviewTitle}>A little practice goes a long way</Text>
          <Text style={s.reviewSubtitle}>Quick recall · up to 10 from your selection</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={29} color={K.amber} />
      </TouchableOpacity>
      {saveError && (
        <View style={u.notice}>
          <Ionicons name="alert-circle" color={K.amber} size={22} />
          <Text style={[u.muted, { flex: 1 }]}>
            Device storage is unavailable. Your latest bookmarks or familiarity may not be saved.
          </Text>
        </View>
      )}
      {content.error && (
        <View style={u.notice}>
          <Ionicons
            name={content.data.length ? "cloud-offline" : "alert-circle"}
            color={K.amber}
            size={22}
          />
          <View style={{ flex: 1 }}>
            <Text style={[u.text, { fontSize: 13 }]}>
              {content.data.length ? "You can keep learning offline" : "Couldn’t load your kanji"}
            </Text>
            <Text style={[u.muted, { fontSize: 11 }]}>
              {content.data.length
                ? `Showing content saved ${describeAge(content.savedAt)}.`
                : "Check your connection and try again."}
            </Text>
          </View>
          <IconButton name="refresh" label="Retry loading kanji" color={K.amber} onPress={reload} />
        </View>
      )}
      <View style={s.search}>
        <Ionicons name="search" size={20} color={K.purple} />
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Kanji, meaning, or reading…"
          placeholderTextColor="#909AB8"
          accessibilityLabel="Search kanji, meanings, readings, or radicals"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!query && (
          <IconButton name="close-circle" label="Clear search" onPress={() => setQuery("")} />
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
        keyboardShouldPersistTaps="handled"
      >
        {collections.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setCollection(option.id)}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}, ${option.count} kanji`}
            accessibilityState={{ selected: collection === option.id }}
            style={[
              s.collection,
              collection === option.id && {
                borderColor: option.color + "88",
                backgroundColor: option.color + "16",
              },
            ]}
          >
            <Ionicons name={option.icon} size={16} color={option.color} />
            <Text style={[s.smallLabel, { color: collection === option.id ? K.text : K.muted }]}>
              {option.label}
            </Text>
            <Text style={[s.count, { color: option.color }]}>{option.count}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {!!tags.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => setTag(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: tag === null }}
            style={[s.topic, tag === null && { backgroundColor: "#33334F" }]}
          >
            <Ionicons name="apps" size={14} color={K.purple} />
            <Text style={s.topicLabel}>All topics</Text>
          </TouchableOpacity>
          {tags.map((value) => {
            const theme = topicStyle(value);
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setTag(tag === value ? null : value)}
                accessibilityRole="button"
                accessibilityState={{ selected: tag === value }}
                style={[
                  s.topic,
                  tag === value && {
                    backgroundColor: theme.color + "18",
                    borderColor: theme.color + "70",
                  },
                ]}
              >
                <Ionicons name={theme.icon} size={14} color={theme.color} />
                <Text style={s.topicLabel}>{theme.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <View style={u.between}>
        <View style={{ flex: 1 }}>
          <Text style={s.smallLabel}>
            {items.length} {items.length === 1 ? "character" : "characters"}
          </Text>
          <Text style={s.localLabel}>On this device</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            const values: KanjiSort[] = ["course", "strokes", "meaning"];
            setSort(values[(values.indexOf(sort) + 1) % values.length]);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${sortLabels[sort]}. Tap to change sort order.`}
          style={[u.row, { minHeight: 44 }]}
        >
          <Ionicons name="swap-vertical" size={16} color={K.blue} />
          <Text style={s.sortLabel}>{sortLabels[sort]}</Text>
          <Ionicons name="chevron-down" size={12} color={K.muted} />
        </TouchableOpacity>
        <IconButton
          name={grid ? "list" : "grid"}
          label={grid ? "Switch to list view" : "Switch to grid view"}
          disabled={!ready}
          onPress={() => update({ layout: grid ? "list" : "grid" })}
          color={K.purple}
        />
      </View>
    </View>
  );

  return (
    <View style={[u.screen, { paddingTop: insets.top }]}>
      <FlatList
        key={notebook.layout}
        data={items}
        numColumns={grid ? 2 : 1}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        columnWrapperStyle={grid ? { gap: 12 } : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={content.refreshing && content.data.length > 0}
            onRefresh={reload}
            tintColor={K.purple}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const theme = topicStyle(item.tags[0]);
          const saved = notebook.saved.includes(item.id);
          const familiar = notebook.familiar.includes(item.id);
          return (
            <View style={[s.card, grid ? { width: cardWidth } : s.listCard]}>
              {grid ? (
                <>
                  <View style={u.between}>
                    <ColorIcon name={theme.icon} color={theme.color} size={30} />
                    <IconButton
                      name={saved ? "bookmark" : "bookmark-outline"}
                      label={saved ? `Unsave ${item.character}` : `Save ${item.character}`}
                      selected={saved}
                      disabled={!ready}
                      color={saved ? K.amber : K.muted}
                      onPress={() => toggleSaved(item.id)}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelected(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${item.character}, ${item.meaning_en.join(", ")}${familiar ? ", marked familiar" : ""}`}
                    style={s.cardBody}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.character, { color: theme.color }]}>{item.character}</Text>
                    <Text style={s.cardMeaning} numberOfLines={2}>
                      {item.meaning_en.join(" · ")}
                    </Text>
                    <Text style={s.cardReading} numberOfLines={1}>
                      {item.hiragana || item.kunyomi[0]?.reading}
                    </Text>
                    {hindiLine(notebook.showHindi, item)}
                    <View style={[u.between, { marginTop: 14 }]}>
                      <View style={[u.row, { gap: 5 }]}>
                        <Ionicons name="brush" size={12} color={K.pink} />
                        <Text style={s.localLabel}>{item.stroke_count} strokes</Text>
                      </View>
                      <Ionicons
                        name={familiar ? "checkmark-circle" : "arrow-forward"}
                        color={familiar ? K.green : K.muted}
                        size={17}
                      />
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setSelected(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${item.character}, ${item.meaning_en.join(", ")}`}
                    style={[u.row, { flex: 1, gap: 14 }]}
                  >
                    <View style={[s.listCharacter, { backgroundColor: theme.color + "13" }]}>
                      <Text style={{ fontSize: 37, color: theme.color }}>{item.character}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.cardMeaning}>{item.meaning_en.join(" · ")}</Text>
                      <Text style={s.cardReading}>
                        {item.hiragana} · {item.romaji}
                      </Text>
                      {hindiLine(notebook.showHindi, item)}
                      <View style={[u.row, { gap: 6 }]}>
                        <Ionicons
                          name={familiar ? "checkmark-circle" : theme.icon}
                          size={13}
                          color={familiar ? K.green : theme.color}
                        />
                        <Text style={s.localLabel}>
                          {familiar ? "Familiar" : theme.label} · {item.stroke_count} strokes
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <IconButton
                    name={saved ? "bookmark" : "bookmark-outline"}
                    label={saved ? `Unsave ${item.character}` : `Save ${item.character}`}
                    selected={saved}
                    disabled={!ready}
                    color={saved ? K.amber : K.muted}
                    onPress={() => toggleSaved(item.id)}
                  />
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            {content.refreshing && !content.data.length ? (
              <>
                <ActivityIndicator color={K.purple} size="large" />
                <Text style={u.muted}>Opening your kanji library…</Text>
              </>
            ) : (
              <>
                <ColorIcon
                  name={collection === "saved" ? "bookmark" : "search"}
                  color={K.amber}
                  size={58}
                />
                <Text style={u.sectionTitle}>
                  {content.error && !content.data.length
                    ? "Your library is taking a moment"
                    : collection === "saved" && !savedCount
                      ? "Keep a few favourites here"
                      : "No matching characters"}
                </Text>
                <Text style={[u.muted, { textAlign: "center" }]}>
                  {collection === "saved" && !savedCount
                    ? "Tap a bookmark on any kanji to build your own collection."
                    : "Try another reading, meaning, or topic."}
                </Text>
                <Action
                  label={content.error && !content.data.length ? "Try again" : "Explore all kanji"}
                  icon="refresh"
                  onPress={content.error && !content.data.length ? reload : reset}
                />
              </>
            )}
          </View>
        }
        ListFooterComponent={
          items.length ? (
            <Text style={s.footer}>One character at a time. You’re building something good.</Text>
          ) : null
        }
      />
      {selected && (
        <KanjiDetail
          key={selected.id}
          item={selected}
          all={content.data}
          saved={notebook.saved.includes(selected.id)}
          familiar={notebook.familiar.includes(selected.id)}
          ready={ready}
          showHindi={notebook.showHindi}
          onSave={() => toggleSaved(selected.id)}
          onFamiliar={() => setFamiliar(selected.id, !notebook.familiar.includes(selected.id))}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
      {review && (
        <KanjiReview
          items={review}
          showHindi={notebook.showHindi}
          onRate={setFamiliar}
          onClose={() => setReview(null)}
        />
      )}
    </View>
  );
}
function hindiLine(show: boolean, item: Kanji) {
  return show && !!item.meaning_hi.length ? (
    <Text style={s.cardHindi} numberOfLines={1}>
      {item.meaning_hi.join(" · ")}
    </Text>
  ) : null;
}
const s = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },
  header: { gap: 12, paddingTop: 8, paddingBottom: 10 },
  hindiToggle: {
    minWidth: 58,
    minHeight: 48,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  smallLabel: { fontSize: 12, fontWeight: "700", color: K.text },
  hero: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#4C456D",
    gap: 12,
    overflow: "hidden",
  },
  heroTitle: {
    color: K.text,
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 28,
    letterSpacing: -0.7,
  },
  daily: {
    width: 82,
    borderRadius: 17,
    backgroundColor: "#171B3099",
    borderWidth: 1,
    borderColor: "#666184",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 5,
    gap: 3,
  },
  dailyLabel: { color: K.purple, fontSize: 8, letterSpacing: 0.6, fontWeight: "800" },
  dailyChar: { color: "#F5EBD5", fontSize: 43, lineHeight: 57 },
  dailyMeaning: { color: K.text, fontSize: 11, fontWeight: "600" },
  heroFooter: {
    borderTopWidth: 1,
    borderColor: "#FFFFFF15",
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  progressText: { color: K.green, fontSize: 14, fontWeight: "800" },
  localLabel: { color: K.muted, fontSize: 10, lineHeight: 16 },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#FFFFFF15",
    overflow: "hidden",
  },
  progressFill: { backgroundColor: K.green, height: "100%", borderRadius: 5 },
  reviewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#292738",
    borderWidth: 1,
    borderColor: "#544733",
    borderRadius: 18,
    padding: 12,
  },
  reviewTitle: { color: "#FFE3B2", fontSize: 13, lineHeight: 19, fontWeight: "700" },
  reviewSubtitle: { color: "#C1B9AE", fontSize: 10, lineHeight: 17, marginTop: 2 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
  },
  input: { flex: 1, paddingVertical: 14, color: K.text, fontSize: 14, minWidth: 0 },
  chips: { gap: 8, alignItems: "center" },
  collection: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: K.border,
    backgroundColor: K.card,
    paddingHorizontal: 12,
  },
  count: { fontSize: 11, fontWeight: "700" },
  topic: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 11,
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: K.border,
  },
  topicLabel: { color: K.muted, fontSize: 11, fontWeight: "600" },
  sectionTitle: { color: K.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  sortLabel: { color: K.muted, fontSize: 11, fontWeight: "600" },
  card: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: 21,
    padding: 12,
  },
  cardBody: { paddingHorizontal: 3, paddingBottom: 3 },
  character: { fontSize: 53, lineHeight: 70, marginVertical: 4 },
  cardMeaning: { fontSize: 16, lineHeight: 22, color: K.text, fontWeight: "700" },
  cardReading: { color: K.purple, fontSize: 12, lineHeight: 19, marginTop: 4 },
  cardHindi: { color: K.amber, fontSize: 12, lineHeight: 21, marginTop: 3 },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
  },
  listCharacter: {
    width: 63,
    height: 73,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { paddingVertical: 32, alignItems: "center", gap: 16 },
  footer: {
    color: K.muted,
    fontSize: 11,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 24,
  },
});
