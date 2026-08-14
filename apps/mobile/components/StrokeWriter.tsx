import React, { useCallback, useState, useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, ActivityIndicator } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface StrokeWriterProps {
  character: string;
  size?: number;
  color?: string;
  outlineColor?: string;
  isDrawing?: boolean;
}

// HanziWriter character data format
interface CharData {
  strokes: string[];
  medians: number[][][];
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function StrokeWriter({
  character,
  size = 150,
  color = Colors.primary[400],
  outlineColor = Colors.dark.surface,
  isDrawing = true,
}: StrokeWriterProps) {
  const [charData, setCharData] = useState<CharData | null>(null);
  const [loading, setLoading] = useState(false);

  // Animation refs for each stroke
  const strokeProgress = useRef<Animated.Value[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCharacterData() {
      if (!character) return;
      setLoading(true);
      try {
        const response = await fetch(
          `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${character}.json`
        );
        if (response.ok && !cancelled) {
          const data: CharData = await response.json();
          setCharData(data);
          strokeProgress.current = data.strokes.map(() => new Animated.Value(0));
        }
      } catch {
        console.log("Failed to load stroke data for", character);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCharacterData();
    return () => {
      cancelled = true;
    };
  }, [character]);

  const animateStrokes = useCallback(() => {
    if (!charData) return;

    // Reset all
    strokeProgress.current.forEach((v) => v.setValue(0));

    // Create sequence of animations matching stroke order
    const animations = charData.strokes.map((_, i) => {
      return Animated.timing(strokeProgress.current[i], {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    });

    Animated.sequence(animations).start();
  }, [charData]);

  useEffect(() => {
    if (charData && isDrawing) {
      animateStrokes();
    }
  }, [animateStrokes, charData, isDrawing]);

  if (loading || !charData) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <ActivityIndicator color={color} />
      </View>
    );
  }

  // HanziWriter coordinates are based on a 1024x1024 grid
  // We need to scale them down to our target size and flip the Y axis
  const scale = size / 1024;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`scale(${scale}, ${-scale}) translate(0, -900)`}>
          {/* Outline strokes */}
          {charData.strokes.map((path, i) => (
            <Path key={`outline-${i}`} d={path} fill={outlineColor} />
          ))}

          {/* Animated filled strokes */}
          {charData.strokes.map((path, i) => {
            // For a pure dasharray animation we would need path length,
            // Since we don't have it easily in RN SVG without extra libs,
            // A simpler approach using opacity sequence is used if path length isn't available
            // But actually native opacity animation works decently well as a stand-in
            const opacity = strokeProgress.current[i] || new Animated.Value(1);
            return <AnimatedPath key={`fill-${i}`} d={path} fill={color} fillOpacity={opacity} />;
          })}
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
