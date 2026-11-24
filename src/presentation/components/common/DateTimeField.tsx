import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react-native";
import {
  aplicarToquePeriodo,
  DateRangeSelection,
  formatarPeriodoIsoParaBr,
  isoParaBr,
} from "../../../domain/rules/domainRules";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnchoredPopover,
  AnchorRect,
  AnimatedChevron,
  AnimatedValueText,
  FadeSlideView,
} from "./MotionPrimitives";

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export function getTodayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildIso(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function maskTimeHm(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

interface PeriodoVistoriaFieldProps {
  range: DateRangeSelection;
  accentColor: string;
  accentSoft: string;
  onChangeRange: (next: DateRangeSelection) => void;
}

export const PeriodoVistoriaField: React.FC<PeriodoVistoriaFieldProps> = ({
  range,
  accentColor,
  accentSoft,
  onChangeRange,
}) => {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const baseDate = useMemo(() => {
    if (range.inicioIso) {
      const [y, m] = range.inicioIso.split("-").map(Number);
      if (y && m) return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [range.inicioIso]);

  const [viewYear, setViewYear] = useState(baseDate.year);
  const [viewMonth, setViewMonth] = useState(baseDate.month);

  const openPopover = () => {
    setViewYear(baseDate.year);
    setViewMonth(baseDate.month);
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const daysCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const list: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i += 1) list.push(null);
    for (let d = 1; d <= total; d += 1) list.push(d);
    return list;
  }, [viewYear, viewMonth]);

  const navigateMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleDayPress = (day: number) => {
    const iso = buildIso(viewYear, viewMonth, day);
    const nextRange = aplicarToquePeriodo(range, iso);
    onChangeRange(nextRange);
    if (nextRange.inicioIso && nextRange.fimIso) {
      setTimeout(() => setOpen(false), 160);
    }
  };

  const resumo = formatarPeriodoIsoParaBr(range);
  const aguardandoFim = Boolean(range.inicioIso && !range.fimIso);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>PERÍODO DA VISTORIA (INÍCIO E TÉRMINO) *</Text>
        {resumo !== "" && (
          <FadeSlideView animKey={resumo} distance={3} duration={150}>
            <View style={[styles.periodPill, { backgroundColor: accentSoft }]}>
              <Text style={[styles.periodPillText, { color: accentColor }]}>
                {resumo}
              </Text>
            </View>
          </FadeSlideView>
        )}
      </View>

      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={openPopover}
          style={({ pressed }) => [
            styles.trigger,
            pressed && { opacity: 0.92 },
            open && { borderColor: accentColor, backgroundColor: ARPE_COLORS.white },
          ]}
        >
          <Calendar size={16} color={accentColor} />
          <AnimatedValueText
            valueKey={resumo || "empty-range"}
            style={[styles.triggerText, !resumo && styles.placeholder]}
          >
            {resumo || "Toque para selecionar início e término..."}
          </AnimatedValueText>
          <AnimatedChevron
            open={open}
            color={open ? accentColor : ARPE_COLORS.textSecondary}
          />
        </Pressable>
      </View>

      <AnchoredPopover
        visible={open}
        anchor={anchor}
        estimatedHeight={325}
        onClose={() => {
          if (range.inicioIso && !range.fimIso) {
            onChangeRange({ inicioIso: range.inicioIso, fimIso: range.inicioIso });
          }
          setOpen(false);
        }}
      >
        <View style={styles.calendarBox}>
          <View style={[styles.hintBanner, { backgroundColor: accentSoft }]}>
            <Text style={[styles.hintText, { color: accentColor }]}>
              {aguardandoFim
                ? `Início: ${isoParaBr(range.inicioIso!)} · Agora toque na data final`
                : "1º toque: data inicial · 2º toque: data final"}
            </Text>
          </View>

          <View style={styles.monthHeader}>
            <Pressable onPress={() => navigateMonth(-1)} style={styles.navBtn}>
              <ChevronLeft size={16} color={ARPE_COLORS.textPrimary} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MESES_PT[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={() => navigateMonth(1)} style={styles.navBtn}>
              <ChevronRight size={16} color={ARPE_COLORS.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {SEMANA.map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekText}>
                {w}
              </Text>
            ))}
          </View>

          <FadeSlideView
            animKey={`${viewYear}-${viewMonth}`}
            distance={4}
            duration={160}
            style={styles.daysGrid}
          >
            {daysCells.map((day, idx) => {
              if (day === null) {
                return <View key={`e-${idx}`} style={styles.dayCell} />;
              }
              const iso = buildIso(viewYear, viewMonth, day);
              const isStart = range.inicioIso === iso;
              const isEnd = range.fimIso === iso;
              const inBetween =
                Boolean(range.inicioIso && range.fimIso) &&
                iso > range.inicioIso! &&
                iso < range.fimIso!;
              const isEdge = isStart || isEnd;

              return (
                <Pressable
                  key={iso}
                  onPress={() => handleDayPress(day)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    pressed && !isEdge && { backgroundColor: ARPE_COLORS.surfaceMuted, borderRadius: 16 },
                    inBetween && { backgroundColor: accentSoft, borderRadius: 6 },
                    isEdge && { backgroundColor: accentColor, borderRadius: 18 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      inBetween && { color: accentColor, fontWeight: "700" },
                      isEdge && { color: ARPE_COLORS.white, fontWeight: "800" },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </FadeSlideView>

          <Pressable
            onPress={() => {
              const today = getTodayIsoLocal();
              onChangeRange({ inicioIso: today, fimIso: today });
              setOpen(false);
            }}
            style={styles.todayBtn}
          >
            <Text style={[styles.todayBtnText, { color: accentColor }]}>
              Hoje ({isoParaBr(getTodayIsoLocal())})
            </Text>
          </Pressable>
        </View>
      </AnchoredPopover>
    </View>
  );
};

export const TimeInputField: React.FC<{
  value: string;
  accentColor: string;
  onChange: (v: string) => void;
}> = ({ value, accentColor, onChange }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>HORA *</Text>
      <View
        style={[
          styles.trigger,
          focused && {
            borderColor: accentColor,
            backgroundColor: ARPE_COLORS.white,
          },
        ]}
      >
        <Clock size={16} color={accentColor} />
        <TextInput
          value={value}
          onChangeText={(v) => onChange(maskTimeHm(v))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="HH:mm"
          placeholderTextColor={ARPE_COLORS.textMuted}
          keyboardType="numeric"
          maxLength={5}
          style={styles.timeInput}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: ARPE_COLORS.textSecondary,
  },
  periodPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  periodPillText: { fontSize: 10.5, fontWeight: "800" },
  trigger: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1.2,
    borderColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  triggerText: { fontSize: 14, fontWeight: "600", color: ARPE_COLORS.textPrimary },
  placeholder: { color: ARPE_COLORS.textMuted, fontWeight: "500" },
  timeInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: ARPE_COLORS.textPrimary,
  },
  calendarBox: { padding: 6, gap: 8 },
  hintBanner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.sm,
    alignItems: "center",
  },
  hintText: { fontSize: 11.5, fontWeight: "800" },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: RADII.sm,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { fontSize: 13.5, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  weekRow: { flexDirection: "row" },
  weekText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 10.5,
    fontWeight: "700",
    color: ARPE_COLORS.textMuted,
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 2 },
  dayCell: {
    width: "14.28%",
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 13, fontWeight: "600", color: ARPE_COLORS.textPrimary },
  todayBtn: {
    paddingVertical: 6,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: ARPE_COLORS.border,
  },
  todayBtnText: { fontSize: 12, fontWeight: "800" },
});
