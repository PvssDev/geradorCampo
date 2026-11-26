import React, { useEffect, useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Image,
  StyleSheet,
  View,
} from "react-native";

interface ZoomablePhotoCanvasProps {
  readonly uri: string;
  readonly width: number;
  readonly height: number;
  readonly resetKey: string;
  readonly onSingleTap: () => void;
  readonly onZoomStateChange: (zoomed: boolean) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_DELAY_MS = 240;

function distanciaToques(
  touches: readonly { pageX: number; pageY: number }[]
): number {
  if (touches.length < 2) return 0;
  return Math.hypot(
    touches[0].pageX - touches[1].pageX,
    touches[0].pageY - touches[1].pageY
  );
}

/**
 * Canvas de foto com zoom por pinça (2 dedos), arraste quando ampliada
 * e alternância rápida 1x <-> 2.5x por toque duplo.
 */
export const ZoomablePhotoCanvas: React.FC<ZoomablePhotoCanvasProps> = ({
  uri,
  width,
  height,
  resetKey,
  onSingleTap,
  onZoomStateChange,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const txAnim = useRef(new Animated.Value(0)).current;
  const tyAnim = useRef(new Animated.Value(0)).current;

  const currentScaleRef = useRef(1);
  const currentTxRef = useRef(0);
  const currentTyRef = useRef(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchBaseScaleRef = useRef(1);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panBaseOffsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const lastTapTsRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampOffset = (offset: number, scale: number, axisSize: number) => {
    const maxOffset = Math.max(0, ((scale - 1) * axisSize) / 2);
    return Math.max(-maxOffset, Math.min(maxOffset, offset));
  };

  const applyTransform = (scale: number, tx: number, ty: number, animate = false) => {
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    const clampedTx = clampOffset(tx, clampedScale, width);
    const clampedTy = clampOffset(ty, clampedScale, height);

    currentScaleRef.current = clampedScale;
    currentTxRef.current = clampedTx;
    currentTyRef.current = clampedTy;
    onZoomStateChange(clampedScale > 1.04);

    if (animate) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: clampedScale,
          useNativeDriver: true,
          bounciness: 3,
        }),
        Animated.spring(txAnim, {
          toValue: clampedTx,
          useNativeDriver: true,
          bounciness: 3,
        }),
        Animated.spring(tyAnim, {
          toValue: clampedTy,
          useNativeDriver: true,
          bounciness: 3,
        }),
      ]).start();
      return;
    }

    scaleAnim.setValue(clampedScale);
    txAnim.setValue(clampedTx);
    tyAnim.setValue(clampedTy);
  };

  useEffect(() => {
    applyTransform(1, 0, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const handleTouchStart = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    movedRef.current = false;

    if (touches.length >= 2) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      pinchStartDistRef.current = distanciaToques(touches);
      pinchBaseScaleRef.current = currentScaleRef.current;
      panStartRef.current = null;
      return;
    }

    pinchStartDistRef.current = null;
    if (touches.length === 1) {
      panStartRef.current = { x: touches[0].pageX, y: touches[0].pageY };
      panBaseOffsetRef.current = {
        x: currentTxRef.current,
        y: currentTyRef.current,
      };
    }
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    if (touches.length >= 2) {
      movedRef.current = true;
      const dist = distanciaToques(touches);
      if (!pinchStartDistRef.current) {
        pinchStartDistRef.current = dist;
        pinchBaseScaleRef.current = currentScaleRef.current;
        return;
      }
      const nextScale =
        pinchBaseScaleRef.current * (dist / Math.max(1, pinchStartDistRef.current));
      applyTransform(nextScale, currentTxRef.current, currentTyRef.current, false);
      return;
    }

    if (
      touches.length === 1 &&
      currentScaleRef.current > 1.04 &&
      panStartRef.current
    ) {
      const dx = touches[0].pageX - panStartRef.current.x;
      const dy = touches[0].pageY - panStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        movedRef.current = true;
      }
      applyTransform(
        currentScaleRef.current,
        panBaseOffsetRef.current.x + dx,
        panBaseOffsetRef.current.y + dy,
        false
      );
    }
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (e.nativeEvent.touches.length > 0) return;

    if (currentScaleRef.current < 1.04) {
      applyTransform(1, 0, 0, true);
    }

    if (movedRef.current) return;

    const now = Date.now();
    if (now - lastTapTsRef.current < DOUBLE_TAP_DELAY_MS) {
      lastTapTsRef.current = 0;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      if (currentScaleRef.current > 1.2) {
        applyTransform(1, 0, 0, true);
      } else {
        applyTransform(DOUBLE_TAP_SCALE, 0, 0, true);
      }
      return;
    }

    lastTapTsRef.current = now;
    singleTapTimerRef.current = setTimeout(() => {
      onSingleTap();
    }, DOUBLE_TAP_DELAY_MS);
  };

  return (
    <View
      style={[styles.stage, { width, height }]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Animated.View
        style={{
          width,
          height: width,
          transform: [
            { translateX: txAnim },
            { translateY: tyAnim },
            { scale: scaleAnim },
          ],
        }}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
