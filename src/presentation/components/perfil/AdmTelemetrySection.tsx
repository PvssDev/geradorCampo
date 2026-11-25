import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import {
  Activity,
  Globe,
  ShieldAlert,
  Smartphone,
  Users,
} from "lucide-react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import {
  AdminTelemetryData,
  TelemetryDayPoint,
} from "../../../infrastructure/auth/adminUserService";
import { ADM_DARK } from "../../theme/admDarkTheme";
import { RADII, SPACING } from "../../theme/tokens";
import { NATIVE_DRIVER } from "../common/MotionPrimitives";
import { AdmSurfaceCard } from "./AdmVisualPrimitives";

interface AdmTelemetrySectionProps {
  readonly data: AdminTelemetryData | null;
  readonly accentColor: string;
}

function formatAcaoCurta(acao: string): string {
  if (acao === "LOGIN_SUCESSO") return "Login autorizado";
  if (acao === "LOGIN_LOCKOUT") return "Conta bloqueada";
  if (acao.includes("FALHA")) return "Tentativa inválida";
  if (acao === "ADM_CRIAR_USUARIO") return "Novo usuário criado";
  if (acao === "ADM_EDITAR_USUARIO") return "Perfil atualizado";
  if (acao === "ADM_DELETAR_USUARIO") return "Usuário removido";
  if (acao === "ADM_RESET_SENHA_USUARIO") return "Senha redefinida";
  if (acao === "SOLICITACAO_APROVADA") return "Acesso aprovado";
  return acao.replace(/_/g, " ").toLowerCase();
}

function formatHoraCurta(iso: string): string {
  if (!iso || iso.length < 16) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildSmoothCurve(
  values: readonly number[],
  width: number,
  height: number,
  maxVal: number
): { line: string; area: string; peakX: number; peakY: number } {
  const padX = 8;
  const padY = 12;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const count = Math.max(values.length, 2);
  const stepX = usableW / (count - 1);

  const pts = values.map((v, i) => ({
    x: padX + i * stepX,
    y: padY + usableH - (v / maxVal) * usableH,
    v,
  }));

  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    line += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  const area = `${line} L ${last.x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;

  let peak = pts[pts.length - 1];
  for (const pt of pts) {
    if (pt.v >= peak.v) peak = pt;
  }
  return { line, area, peakX: peak.x, peakY: peak.y };
}

const DualSplineChart: React.FC<{
  readonly serie: readonly TelemetryDayPoint[];
  readonly accentColor: string;
}> = ({ serie, accentColor }) => {
  const safeSerie =
    serie.length >= 2
      ? serie
      : [
        { dia: "-", mobile: 0, web: 0 },
        { dia: "Hoje", mobile: 0, web: 0 },
      ];
  const W = 300;
  const H = 108;
  const maxVal = Math.max(1, ...safeSerie.map((d) => Math.max(d.mobile, d.web)));
  const mobileCurve = buildSmoothCurve(
    safeSerie.map((d) => d.mobile),
    W,
    H,
    maxVal
  );
  const webCurve = buildSmoothCurve(
    safeSerie.map((d) => d.web),
    W,
    H,
    maxVal
  );

  return (
    <View style={styles.splineWrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="mobileArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0.34" />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="webArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={ADM_DARK.secondarySeries} stopOpacity="0.22" />
            <Stop offset="100%" stopColor={ADM_DARK.secondarySeries} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {[0.25, 0.55, 0.85].map((ratio) => (
          <Line
            key={ratio}
            x1={0}
            y1={H * ratio}
            x2={W}
            y2={H * ratio}
            stroke="rgba(148, 163, 184, 0.14)"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}

        <Path d={webCurve.area} fill="url(#webArea)" />
        <Path d={mobileCurve.area} fill="url(#mobileArea)" />
        <Path
          d={webCurve.line}
          fill="none"
          stroke={ADM_DARK.secondarySeries}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <Path
          d={mobileCurve.line}
          fill="none"
          stroke={accentColor}
          strokeWidth={2.4}
          strokeLinecap="round"
        />

        <Circle
          cx={mobileCurve.peakX}
          cy={mobileCurve.peakY}
          r={5.5}
          fill={accentColor}
          fillOpacity={0.25}
        />
        <Circle
          cx={mobileCurve.peakX}
          cy={mobileCurve.peakY}
          r={3}
          fill={ADM_DARK.bg}
          stroke={accentColor}
          strokeWidth={2}
        />
      </Svg>

      <View style={styles.axisRow}>
        {safeSerie.map((pt) => (
          <Text key={pt.dia} style={styles.axisLabel}>
            {pt.dia}
          </Text>
        ))}
      </View>
    </View>
  );
};

export const AdmTelemetrySection: React.FC<AdmTelemetrySectionProps> = ({
  data,
  accentColor,
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [fade, data]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 950,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(livePulse, {
          toValue: 0.3,
          duration: 950,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

  if (!data) return null;

  const totalSessoes = data.loginsMobile7d + data.loginsWeb7d;

  const kpis = [
    {
      label: "Equipe ativa",
      value: data.equipeAtiva,
      tag: "ATIVO",
      color: ADM_DARK.emerald,
      soft: ADM_DARK.emeraldSoft,
      icon: <Users size={14} color={ADM_DARK.emerald} />,
    },
    {
      label: "Acessos Mobile",
      value: data.loginsMobile7d,
      tag: "7 DIAS",
      color: accentColor,
      soft: `${accentColor}26`,
      icon: <Smartphone size={14} color={accentColor} />,
    },
    {
      label: "Acessos Web",
      value: data.loginsWeb7d,
      tag: "7 DIAS",
      color: ADM_DARK.textSecondary,
      soft: ADM_DARK.secondarySoft,
      icon: <Globe size={14} color={ADM_DARK.textSecondary} />,
    },
    {
      label: "Alertas",
      value: data.alertas7d,
      tag: "AUDIT",
      color: ADM_DARK.danger,
      soft: ADM_DARK.dangerSoft,
      icon: <ShieldAlert size={14} color={ADM_DARK.danger} />,
    },
  ];

  return (
    <Animated.View style={[styles.wrap, { opacity: fade }]}>
      <View style={styles.kpiGrid}>
        {kpis.map((item) => (
          <AdmSurfaceCard key={item.label} style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              {item.icon}
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
            <View style={styles.kpiBottom}>
              <Text style={styles.kpiValue}>{item.value}</Text>
              <View
                style={[
                  styles.kpiPill,
                  { backgroundColor: item.soft, borderColor: `${item.color}50` },
                ]}
              >
                <Text style={[styles.kpiPillText, { color: item.color }]}>
                  {item.tag}
                </Text>
              </View>
            </View>
          </AdmSurfaceCard>
        ))}
      </View>

      <AdmSurfaceCard style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelKicker}>ACESSOS · ÚLTIMOS 7 DIAS</Text>
            <Text style={styles.panelBigValue}>{totalSessoes} sessões</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
              <Text style={styles.legendText}>Mobile</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: ADM_DARK.secondarySeries },
                ]}
              />
              <Text style={styles.legendText}>Web</Text>
            </View>
          </View>
        </View>

        <DualSplineChart serie={data.serieDiaria} accentColor={accentColor} />
      </AdmSurfaceCard>

      <AdmSurfaceCard style={styles.panelCard}>
        <View style={styles.liveHeader}>
          <View style={styles.liveTitleRow}>
            <Activity size={14} color={accentColor} />
            <Text style={styles.panelKicker}>ATIVIDADE RECENTE</Text>
          </View>
          <View style={styles.liveBadge}>
            <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        {data.atividadeRecente.length === 0 ? (
          <Text style={styles.emptyFeed}>
            Sem eventos registrados nos últimos 7 dias.
          </Text>
        ) : (
          data.atividadeRecente.map((ev, idx) => {
            const isAlert = ev.status === "alerta";
            const isMobile = ev.canal === "mobile";
            const color = isAlert
              ? ADM_DARK.danger
              : isMobile
                ? accentColor
                : ADM_DARK.textSecondary;
            const soft = isAlert
              ? ADM_DARK.dangerSoft
              : isMobile
                ? `${accentColor}26`
                : ADM_DARK.secondarySoft;
            return (
              <View key={`${ev.criadoEm}-${idx}`} style={styles.feedRow}>
                <View
                  style={[
                    styles.canalPill,
                    { backgroundColor: soft, borderColor: `${color}45` },
                  ]}
                >
                  <Text style={[styles.canalText, { color }]}>
                    {ev.canal === "mobile" ? "APP" : ev.canal === "web" ? "WEB" : "SYS"}
                  </Text>
                </View>
                <View style={styles.feedInfo}>
                  <Text style={styles.feedUser} numberOfLines={1}>
                    @{ev.usuario}{" "}
                    <Text style={styles.feedAction}>· {formatAcaoCurta(ev.acao)}</Text>
                  </Text>
                </View>
                <Text style={styles.feedTime}>{formatHoraCurta(ev.criadoEm)}</Text>
              </View>
            );
          })
        )}
      </AdmSurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  kpiCard: { width: "48.4%", padding: SPACING.md, gap: 10 },
  kpiTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  kpiLabel: { fontSize: 11.5, fontWeight: "600", color: ADM_DARK.textSecondary, flex: 1 },
  kpiBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
    color: ADM_DARK.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  kpiPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  kpiPillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  panelCard: { padding: SPACING.md, gap: SPACING.md },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  panelKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: ADM_DARK.textMuted,
  },
  panelBigValue: {
    fontSize: 20,
    fontWeight: "800",
    color: ADM_DARK.textPrimary,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  legendRow: { flexDirection: "row", gap: 12, marginTop: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "600", color: ADM_DARK.textSecondary },
  splineWrap: { gap: 6 },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  axisLabel: { fontSize: 9.5, fontWeight: "600", color: ADM_DARK.textMuted },
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    backgroundColor: ADM_DARK.emeraldSoft,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ADM_DARK.emerald },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: ADM_DARK.emerald,
  },
  emptyFeed: { fontSize: 12, color: ADM_DARK.textMuted },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.14)",
  },
  canalPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  canalText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  feedInfo: { flex: 1 },
  feedUser: { fontSize: 12.5, fontWeight: "700", color: ADM_DARK.textPrimary },
  feedAction: { fontWeight: "500", color: ADM_DARK.textSecondary },
  feedTime: {
    fontSize: 11,
    fontWeight: "600",
    color: ADM_DARK.textMuted,
    fontVariant: ["tabular-nums"],
  },
});
