import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Easing, ActivityIndicator } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { Colors } from "@/constants/theme";
import { captureException } from "@/lib/monitoring";
import { fetchStrokePaths, STROKE_VIEWBOX, type StrokePath } from "@/lib/stroke-paths";

interface StrokeWriterProps {
  character: string;
  size?: number;
  color?: string;
  outlineColor?: string;
  isDrawing?: boolean;
  showUnavailableMessage?: boolean;
  onLoad?: (strokeCount: number | null) => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Pen width in KanjiVG's 109-unit space. Matches the published glyph weight. */
const PEN_WIDTH = 5.5;

const MIN_STROKE_MS = 280;
const MAX_STROKE_MS = 900;
/** Beat between strokes, so the eye can follow the stroke order. */
const STROKE_GAP_MS = 90;

export default function StrokeWriter({
  character,
  size = 150,
  color = Colors.primary[400],
  outlineColor = Colors.dark.surface,
  isDrawing = true,
  showUnavailableMessage = false,
  onLoad,
}: StrokeWriterProps) {
  const [drawing, setDrawing] = useState<{
    character: string;
    strokes: StrokePath[] | null;
    progress: Animated.Value[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchStrokePaths(character);
        if (cancelled) return;
        setDrawing({
          character,
          strokes: data,
          progress: data?.map((stroke) => new Animated.Value(stroke.length)) ?? [],
        });
        onLoad?.(data?.length ?? null);
      } catch (error) {
        // Usually offline. Fall back to the plain glyph rather than spinning
        // forever, and report it so the failure is not silent.
        if (!cancelled) {
          setDrawing({ character, strokes: null, progress: [] });
          onLoad?.(null);
          captureException(error, { character });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [character, onLoad]);

  useEffect(() => {
    if (!drawing?.strokes || drawing.character !== character) return;
    const { strokes, progress } = drawing;
    if (!isDrawing) {
      progress.forEach((value) => value.setValue(0));
      return;
    }

    // Every stroke starts hidden — dash offset equal to its own length.
    strokes.forEach((stroke, i) => progress[i].setValue(stroke.length));

    const sequence = strokes.map((stroke, i) =>
      Animated.sequence([
        Animated.timing(progress[i], {
          toValue: 0,
          // Longer strokes take proportionally longer, which is what makes it
          // read as handwriting rather than a uniform reveal.
          duration: Math.min(MAX_STROKE_MS, Math.max(MIN_STROKE_MS, stroke.length * 9)),
          easing: Easing.inOut(Easing.ease),
          // Must stay false. This drives `strokeDashoffset` on an SVG Path, and
          // the native driver only handles transform and view opacity — it
          // cannot write SVG props. With it enabled the value is owned by the
          // native side, the JS prop never updates, and nothing animates.
          useNativeDriver: false,
        }),
        Animated.delay(STROKE_GAP_MS),
      ])
    );

    const animation = Animated.sequence(sequence);
    animation.start();
    // Replay and fast next/previous taps must stop the old animation first.
    return () => animation.stop();
  }, [drawing, character, isDrawing]);

  if (drawing?.character === character && !drawing.strokes) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.6, color, textAlign: "center" }}>{character}</Text>
        {showUnavailableMessage && (
          <Text style={styles.unavailable}>Animation unavailable. Tap Replay to retry.</Text>
        )}
      </View>
    );
  }

  if (drawing?.character !== character || !drawing.strokes) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <ActivityIndicator color={color} />
      </View>
    );
  }

  const scale = size / STROKE_VIEWBOX;
  const { strokes, progress } = drawing;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`scale(${scale})`}>
          {/* Ghost of the finished character, visible from the start so the
              learner can see where the stroke is heading. */}
          {strokes.map((stroke, i) => (
            <Path
              key={`ghost-${i}`}
              d={stroke.d}
              transform={stroke.transform}
              stroke={outlineColor}
              strokeWidth={PEN_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}

          {/* The pen. Each stroke is revealed along its own length, in order. */}
          {strokes.map((stroke, i) => (
            <AnimatedPath
              key={`ink-${i}`}
              d={stroke.d}
              transform={stroke.transform}
              stroke={color}
              strokeWidth={PEN_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${stroke.length} ${stroke.length}`}
              strokeDashoffset={progress[i]}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  unavailable: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
