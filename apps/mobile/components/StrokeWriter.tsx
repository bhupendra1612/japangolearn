import React, { useCallback, useState, useEffect, useRef } from "react";
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
}: StrokeWriterProps) {
  const [strokes, setStrokes] = useState<StrokePath[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // One dash-offset value per stroke, animated from its length down to zero so
  // the stroke is revealed from where the pen starts to where it lifts.
  const progress = useRef<Animated.Value[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!character) return;
      setLoading(true);
      setFailed(false);
      try {
        const data = await fetchStrokePaths(character);
        if (cancelled) return;
        if (data) {
          progress.current = data.map((stroke) => new Animated.Value(stroke.length));
          setStrokes(data);
        } else {
          // No stroke data published for this character.
          setStrokes(null);
          setFailed(true);
        }
      } catch (error) {
        // Usually offline. Fall back to the plain glyph rather than spinning
        // forever, and report it so the failure is not silent.
        if (!cancelled) setFailed(true);
        captureException(error, { character });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [character]);

  const animateStrokes = useCallback(() => {
    if (!strokes) return;

    // Every stroke starts hidden — dash offset equal to its own length.
    strokes.forEach((stroke, i) => progress.current[i]?.setValue(stroke.length));

    const sequence = strokes.map((stroke, i) =>
      Animated.sequence([
        Animated.timing(progress.current[i], {
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

    Animated.sequence(sequence).start();
  }, [strokes]);

  useEffect(() => {
    if (strokes && isDrawing) {
      animateStrokes();
    }
  }, [animateStrokes, strokes, isDrawing]);

  if (failed) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.6, color, textAlign: "center" }}>{character}</Text>
      </View>
    );
  }

  if (loading || !strokes) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <ActivityIndicator color={color} />
      </View>
    );
  }

  const scale = size / STROKE_VIEWBOX;

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
              stroke={color}
              strokeWidth={PEN_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${stroke.length} ${stroke.length}`}
              strokeDashoffset={progress.current[i] ?? 0}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
