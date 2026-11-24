import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react-native";
import {
  CONCESSION_CONFIG,
  COORDENADORES_OFICIAIS,
  RESPONSAVEIS_OFICIAIS,
} from "../../../domain/config/concessionConfig";
import {
  CategoriaRelatorio,
  FiscalizacaoEntity,
  TipoRelatorio,
} from "../../../domain/entities/types";
import {
  DateRangeSelection,
  formatarPeriodoIsoParaBr,
  isoParaBr,
} from "../../../domain/rules/domainRules";
import { ARPE_COLORS, getConcessionTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { toast } from "../../../application/store/useToastStore";
import { SelectSheetField } from "../common/SelectSheetField";
import {
  getTodayIsoLocal,
  PeriodoVistoriaField,
  TimeInputField,
} from "../common/DateTimeField";
import {
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";

interface StepDadosIniciaisProps {
  tipoRelatorio: TipoRelatorio;
  categoriaRelatorio: CategoriaRelatorio;
  initialFiscalizacao?: FiscalizacaoEntity;
  onVoltar: () => void;
  onConfirmarDados: (dados: {
    local: string;
    cidade: string;
    data: string;
    periodo: string;
    hora: string;
    equipe: string[];
    coordenador: string;
  }) => void;
}

function brToIsoSafe(br: string, fallbackIso: string): string {
  const parts = br.trim().split("/");
  if (parts.length !== 3) return fallbackIso;
  const [d, m, y] = parts;
  if (y.length === 4 && m.length === 2 && d.length === 2) return `${y}-${m}-${d}`;
  return fallbackIso;
}

export const StepDadosIniciais: React.FC<StepDadosIniciaisProps> = ({
  tipoRelatorio,
  categoriaRelatorio,
  initialFiscalizacao,
  onVoltar,
  onConfirmarDados,
}) => {
  const cfg = CONCESSION_CONFIG[tipoRelatorio];
  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);
  const isSocicam = tipoRelatorio === "SOCICAM";

  const todayIso = useMemo(() => getTodayIsoLocal(), []);
  const horaAgora = useMemo(
    () =>
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const [range, setRange] = useState<DateRangeSelection>({
    inicioIso: todayIso,
    fimIso: todayIso,
  });
  const [hora, setHora] = useState(cfg.exibeHora ? horaAgora : "");
  const [cidade, setCidade] = useState(cfg.cidadesDisponiveis[0] ?? "");
  const [terminal, setTerminal] = useState(isSocicam ? cfg.localPadrao : "");
  const [equipe, setEquipe] = useState<string[]>([]);
  const [coordenador, setCoordenador] = useState(
    COORDENADORES_OFICIAIS[0]?.nome ?? ""
  );
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (initialFiscalizacao) {
      const perParts = (initialFiscalizacao.periodo || initialFiscalizacao.data)
        .split("-")
        .map((s) => s.trim());
      const iniIso = brToIsoSafe(perParts[0] || initialFiscalizacao.data, todayIso);
      const fimIso = brToIsoSafe(perParts[1] || perParts[0] || initialFiscalizacao.data, iniIso);
      setRange({ inicioIso: iniIso, fimIso });
      setHora(cfg.exibeHora ? initialFiscalizacao.hora || horaAgora : "");
      setCidade(initialFiscalizacao.cidade || cfg.cidadesDisponiveis[0] || "");
      setTerminal(
        isSocicam ? initialFiscalizacao.local || cfg.localPadrao : ""
      );
      const eqList = (initialFiscalizacao.pessoalResponsavel || "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => RESPONSAVEIS_OFICIAIS.some((r) => r.nome === s));
      setEquipe(eqList);
      setCoordenador(
        initialFiscalizacao.coordenador || COORDENADORES_OFICIAIS[0]?.nome || ""
      );
      setErro("");
      return;
    }
    setRange({ inicioIso: todayIso, fimIso: todayIso });
    setHora(cfg.exibeHora ? horaAgora : "");
    setCidade(cfg.cidadesDisponiveis[0] ?? "");
    setTerminal(isSocicam ? cfg.localPadrao : "");
    setEquipe([]);
    setCoordenador(COORDENADORES_OFICIAIS[0]?.nome ?? "");
    setErro("");
  }, [
    initialFiscalizacao,
    tipoRelatorio,
    cfg.exibeHora,
    cfg.cidadesDisponiveis,
    cfg.localPadrao,
    isSocicam,
    horaAgora,
    todayIso,
  ]);

  const handleSubmit = () => {
    if (!range.inicioIso) {
      const msg = "Selecione o período da vistoria na agenda.";
      setErro(msg);
      toast.error("Período obrigatório", msg);
      return;
    }
    if (isSocicam && !terminal) {
      const msg = "Selecione o terminal rodoviário.";
      setErro(msg);
      toast.error("Terminal obrigatório", msg);
      return;
    }
    if (!isSocicam && !cidade) {
      const msg = "Selecione o município.";
      setErro(msg);
      toast.error("Município obrigatório", msg);
      return;
    }
    if (equipe.length === 0) {
      const msg = "Selecione ao menos um integrante da equipe técnica.";
      setErro(msg);
      toast.error("Equipe obrigatória", msg);
      return;
    }

    const rangeFinal: DateRangeSelection = {
      inicioIso: range.inicioIso,
      fimIso: range.fimIso ?? range.inicioIso,
    };

    setErro("");
    onConfirmarDados({
      local: isSocicam ? terminal : cfg.localPadrao,
      cidade: isSocicam ? terminal : cidade,
      data: isoParaBr(rangeFinal.inicioIso!),
      periodo: formatarPeriodoIsoParaBr(rangeFinal),
      hora: cfg.exibeHora ? hora.trim() || horaAgora : "",
      equipe,
      coordenador,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <FadeSlideView delay={0} distance={6} style={styles.headerWrap}>
        <View style={styles.topRow}>
          <Pressable onPress={onVoltar} style={styles.backBtn}>
            <ArrowLeft size={16} color={ARPE_COLORS.textSecondary} />
            <Text style={styles.backText}>Trocar relatório</Text>
          </Pressable>
          <View
            style={[
              styles.modalityBadge,
              {
                backgroundColor: theme.primarySoft,
                borderColor: theme.primaryBorder,
              },
            ]}
          >
            <Text style={[styles.modalityBadgeText, { color: theme.primary }]}>
              {tipoRelatorio} · {categoriaRelatorio}
            </Text>
          </View>
        </View>

        <View style={styles.headerBlock}>
          <Text style={styles.stepTag}>PASSO 2 DE 3</Text>
          <Text style={styles.title}>
            {categoriaRelatorio === "Monitoramento"
              ? "Informações do Monitoramento"
              : "Informações da Fiscalização"}
          </Text>
        </View>
      </FadeSlideView>

      <FadeSlideView delay={35} distance={8} style={styles.fieldsStack}>
        <PeriodoVistoriaField
          range={range}
          accentColor={theme.primary}
          accentSoft={theme.primarySoft}
          onChangeRange={(next) => {
            setRange(next);
            if (erro) setErro("");
          }}
        />

        {cfg.exibeHora && (
          <TimeInputField
            value={hora}
            accentColor={theme.primary}
            onChange={setHora}
          />
        )}

        {isSocicam ? (
          <SelectSheetField
            label="Terminal Rodoviário *"
            placeholder="Selecione o terminal..."
            options={cfg.locaisSugeridos.map((t) => ({ value: t, label: t }))}
            value={terminal}
            onChange={(v) => {
              setTerminal(v);
              if (erro) setErro("");
            }}
            accentColor={theme.primary}
            accentSoft={theme.primarySoft}
            leftIcon={<Building2 size={16} color={theme.primary} />}
          />
        ) : (
          <SelectSheetField
            label="Cidade (Município) *"
            placeholder="Selecione o município..."
            options={cfg.cidadesDisponiveis.map((c) => ({ value: c, label: c }))}
            value={cidade}
            onChange={(v) => {
              setCidade(v);
              if (erro) setErro("");
            }}
            accentColor={theme.primary}
            accentSoft={theme.primarySoft}
            leftIcon={<MapPin size={16} color={theme.primary} />}
          />
        )}

        <SelectSheetField
          multiple
          label="Equipe Técnica (Pessoal Responsável) *"
          placeholder="Selecione os responsáveis..."
          options={RESPONSAVEIS_OFICIAIS.map((r) => ({
            value: r.nome,
            label: r.nome,
            subtitle: r.funcao,
          }))}
          values={equipe}
          onChange={(vals) => {
            setEquipe(vals);
            if (erro) setErro("");
          }}
          accentColor={theme.primary}
          accentSoft={theme.primarySoft}
          leftIcon={<Users size={16} color={theme.primary} />}
        />

        <SelectSheetField
          label="Coordenador(a)"
          placeholder="Selecione o coordenador..."
          options={COORDENADORES_OFICIAIS.map((c) => ({
            value: c.nome,
            label: c.nome,
            subtitle: c.funcao,
          }))}
          value={coordenador}
          onChange={setCoordenador}
          accentColor={theme.primary}
          accentSoft={theme.primarySoft}
          leftIcon={<UserCheck size={16} color={theme.primary} />}
        />
      </FadeSlideView>

      {erro !== "" && (
        <FadeSlideView animKey={erro} distance={4} duration={150}>
          <Text style={styles.errorText}>{erro}</Text>
        </FadeSlideView>
      )}

      <FadeSlideView delay={75} distance={8}>
        <AnimatedScalePressable
          onPress={handleSubmit}
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.primaryBtnText}>
            {initialFiscalizacao
              ? "Salvar e voltar para Coleta"
              : "Ir para Coleta de NC / PA"}
          </Text>
          <ArrowRight size={18} color={ARPE_COLORS.white} />
        </AnimatedScalePressable>
      </FadeSlideView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ARPE_COLORS.surface },
  content: { padding: SPACING.xl, paddingBottom: 36, gap: SPACING.lg },
  headerWrap: { gap: SPACING.md },
  fieldsStack: { gap: SPACING.lg },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
  },
  backText: { fontSize: 13, fontWeight: "600", color: ARPE_COLORS.textSecondary },
  modalityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  modalityBadgeText: { fontSize: 11.5, fontWeight: "800" },
  headerBlock: { gap: 4 },
  stepTag: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textMuted,
  },
  title: { fontSize: 21, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  errorText: { fontSize: 12.5, fontWeight: "700", color: "#dc2626" },
  primaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 8,
    borderRadius: RADII.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "800", color: ARPE_COLORS.white },
});
