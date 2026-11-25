import { AccessRequestEntity } from "../../src/domain/entities/authTypes";
import {
  AVATAR_PALETTE,
  extrairIniciaisAvatar,
  filtrarSolicitacoesPendentes,
  montarEmailSintetico,
  normalizarUsuarioLogin,
  obterCorAvatar,
  obterLabelPerfil,
  podeAcessarPainelAdm,
  podeAprovarAcessos,
  validarDecisaoAcesso,
  validarForcaSenha,
  validarFormatoUsuario,
} from "../../src/domain/rules/authRules";

describe("Domínio Auth — Login Sem E-mail, Senha Forte e RBAC (BDD)", () => {
  it("Dado um login corporativo com maiúsculas/espaços, Quando normalizar e montar identificador interno, Então gera usuário limpo e @arpe.internal", () => {
    expect(normalizarUsuarioLogin("  Pedro.Souza ")).toBe("pedro.souza");
    expect(validarFormatoUsuario("Pedro.Souza")).toBe(true);
    expect(validarFormatoUsuario("joao silva")).toBe(false);
    expect(validarFormatoUsuario("ab")).toBe(false);
    expect(montarEmailSintetico("Pedro.Souza")).toBe("pedro.souza@arpe.internal");
  });

  it("Dado senhas fracas e fortes, Quando validar força de senha, Então exige mínimo 10 caracteres com maiúscula, minúscula e número", () => {
    expect(validarForcaSenha("123456").ok).toBe(false);
    expect(validarForcaSenha("senhamuitolonga").ok).toBe(false);
    expect(validarForcaSenha("Arpe2026!#").ok).toBe(true);
  });

  it("Dado os 3 perfis (adm, coordenador, analista), Quando checar permissão de aprovação de contas, Então libera apenas ADM e Coordenador", () => {
    expect(podeAprovarAcessos("adm")).toBe(true);
    expect(podeAprovarAcessos("coordenador")).toBe(true);
    expect(podeAprovarAcessos("analista")).toBe(false);
    expect(podeAcessarPainelAdm("adm")).toBe(true);
    expect(podeAcessarPainelAdm("coordenador")).toBe(false);
    expect(podeAcessarPainelAdm("analista")).toBe(false);
    expect(obterLabelPerfil("adm")).toBe("Administrador (ADM)");
    expect(obterLabelPerfil("coordenador")).toBe("Coordenador");
    expect(obterLabelPerfil("analista")).toBe("Analista");
  });

  it("Dado solicitações pendentes e já decididas, Quando filtrar e validar decisão por perfil, Então apenas ADM/Coordenador decidem pendentes", () => {
    const lista: AccessRequestEntity[] = [
      {
        id: "req-1",
        usuario: "maria.silva",
        nomeCompleto: "Maria Silva",
        roleSolicitado: "analista",
        status: "pendente",
        criadoEm: "2026-11-25T14:00:00Z",
      },
      {
        id: "req-2",
        usuario: "joao.lima",
        nomeCompleto: "João Lima",
        roleSolicitado: "coordenador",
        status: "aprovada",
        criadoEm: "2026-11-25T13:00:00Z",
      },
    ];

    const pendentes = filtrarSolicitacoesPendentes(lista);
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].id).toBe("req-1");

    expect(validarDecisaoAcesso("analista", lista[0]).ok).toBe(false);
    expect(validarDecisaoAcesso("coordenador", lista[0]).ok).toBe(true);
    expect(validarDecisaoAcesso("adm", lista[1]).ok).toBe(false);
  });

  it("Dado nome simples ou composto, Quando gerar iniciais e cor do avatar, Então gera 1 ou 2 letras ignorando preposições e cor determinística", () => {
    expect(extrairIniciaisAvatar("Pedro")).toBe("P");
    expect(extrairIniciaisAvatar("Pedro Souza")).toBe("PS");
    expect(extrairIniciaisAvatar("Maria da Silva Souza")).toBe("MS");
    expect(extrairIniciaisAvatar("", "coord.teste")).toBe("C");

    const cor1 = obterCorAvatar("coord.teste");
    const cor2 = obterCorAvatar("  Coord.Teste ");
    expect(cor1).toBe(cor2);
    expect(AVATAR_PALETTE).toContain(cor1);
  });
});
