import {
  calcularRecorteQuadradoCentral,
  ehUriFotoReal,
  formatarCoordenadasGms,
  formatarDataHoraMarcaDagua,
  montarLinhasMarcaDagua,
} from "../../src/domain/rules/watermarkRules";

describe("watermarkRules — Padrão de Foto Quadrada 1:1 e Marca d'Água ARPE", () => {
  it("Dado data e hora de captura, Quando formatar linha 1, Então replica exatamente o padrão '19 de ago. de 2026 10:04:02'", () => {
    const dataRef = new Date(2026, 7, 19, 10, 4, 2);
    expect(formatarDataHoraMarcaDagua(dataRef)).toBe(
      "19 de ago. de 2026 10:04:02"
    );
  });

  it("Dado coordenadas decimais da PE-009, Quando converter para GMS, Então formata graus/minutos sem zero à esquerda e segundos com vírgula e 5 casas", () => {
    const lat = -(8 + 15 / 60 + 24.92071 / 3600);
    const lon = -(35 + 0 / 60 + 20.64628 / 3600);

    expect(formatarCoordenadasGms({ latitude: lat, longitude: lon })).toBe(
      `8°15'24,92071"S 35°0'20,64628"W`
    );
  });

  it("Dado fiscal em Modo Avião sem sinal GPS, Quando montar marca d'água, Então usa a cidade da vistoria como fallback offline", () => {
    const resultado = montarLinhasMarcaDagua({
      dataHora: new Date(2026, 7, 19, 10, 4, 2),
      coordenadas: null,
      municipioGps: null,
      cidadeVistoria: "Cabo de Santo Agostinho",
      localVistoria: "Rodovia PE-009",
    });

    expect(resultado.todasLinhas).toEqual([
      "19 de ago. de 2026 10:04:02",
      "Sem sinal GPS",
      "Cabo de Santo Agostinho",
    ]);
  });

  it("Dado uma foto bruta 4000x3000 da câmera, Quando calcular recorte 1:1, Então centraliza em 3000x3000 e redimensiona para 1440x1440", () => {
    const spec = calcularRecorteQuadradoCentral(4000, 3000, 1440);
    expect(spec).toEqual({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 3000,
      resizeSide: 1440,
    });
  });

  it("Dado URIs de foto, Quando validar ehUriFotoReal, Então distingue arquivos reais do sandbox dos mocks legados", () => {
    expect(ehUriFotoReal("file:///data/user/0/br.gov.pe.arpe/files/arpe_galeria/FOTO_001.jpg")).toBe(true);
    expect(ehUriFotoReal("sandbox://vistorias/v-1/FOTO_001.jpg")).toBe(false);
    expect(ehUriFotoReal("")).toBe(false);
  });
});
