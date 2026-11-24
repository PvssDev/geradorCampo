# Ordem de Execução — Redesign Mobile em 5 Abas (Visual Limpo)

> **Objetivo:** Reestruturar o aplicativo mobile para eliminar a sobrecarga de informações em uma única tela, separando responsabilidades em **5 abas limpas** na barra inferior (`Início`, `Vistorias`, `Galeria`, `Finalizados` e `Configuração`).
>
> **Como usar este documento:** Execute **uma Parte por vez**, na ordem exata abaixo (`Parte 0` → `Parte 1` → `Parte 2` → `Parte 3` → `Parte 4` → `Parte 5`). Ao concluir cada parte, valide `npm.cmd run typecheck`, `npm.cmd test` e o preview no **Expo Web** (`npm.cmd run web`) antes de avançar.

---

## Mapa Geral das 5 Abas (Bottom Tab Bar)

| Ordem | Aba | Papel Exclusivo | O que NÃO deve aparecer nela |
| :---: | :--- | :--- | :--- |
| **1** | **Início** | Fluxo guiado (1 passo por vez) para preencher relatório, tirar foto, classificar NC/PA, relacionar e finalizar | Toggle de modo offline/online; lista de sessões em aberto no dispositivo |
| **2** | **Vistorias** | Listar apenas sessões **em aberto** (não finalizadas), retomar edição e apagar em lote (modo seleção) | Seletor de tipo de relatório no topo; toggle offline/online; sessões já finalizadas |
| **3** | **Galeria** | Galeria **local** de fotos separadas por cor da modalidade, com filtro por sessão e botão de compartilhar filtrado | Fotos de galeria pública do celular; controles de sincronização |
| **4** | **Finalizados** | Sessões finalizadas, balãozinho de Wi-Fi (3 estados), auto-sync, standby individual e opção de reabrir | Sessões em aberto; formulário de criação |
| **5** | **Configuração** | Perfil da equipe, ajustes gerais do app e informações de armazenamento local/LGPD | Toggle duplicado de rede/sync |

---

## Parte 0 — Fundação de Domínio, Store e Navegação (Pré-requisito Obrigatório)

> **Por que fazer primeiro:** Todas as 5 abas dependem dos novos estados de ciclo de vida (`em_aberto` vs `finalizada`), do modo de rede em 3 estados, do standby individual e da regra de relacionamento único (1:1) por ocorrência.

### Arquivos a alterar
* `src/domain/entities/types.ts`
* `src/domain/rules/domainRules.ts`
* `src/application/store/useMobileStore.ts`
* `src/infrastructure/mocks/mockData.ts`
* `src/presentation/navigation/RootNavigator.tsx`
* `__tests__/domain/domainRules.test.ts`

### Especificação Técnica
1. **Novos Tipos em `src/domain/entities/types.ts`:**
   * `SessionLifecycleStatus = "em_aberto" | "finalizada"`
   * `NetworkMode = "online" | "disconnected" | "offline_manual"`
   * `RelacionamentoOcorrenciaEntity`:
     * `ocorrenciaDestinoNumero: number` (vínculo com registro criado na sessão)
     * `sigla: TipoAchado` (`"NC" | "PA"`)
     * `faixa?: string` *(apenas rodovias `CRA`/`CRC`; nunca em `SOCICAM`)*
     * `codificacao?: string` *(opcional em rodovias)*
   * Em `OcorrenciaEntity`: adicionar `readonly relacionamento?: RelacionamentoOcorrenciaEntity;`
   * Em `VistoriaSessionEntity`: adicionar `readonly lifecycleStatus: SessionLifecycleStatus;` e `readonly syncStandby: boolean;`
2. **Regras Puras em `src/domain/rules/domainRules.ts`:**
   * `podeRelacionarOcorrencia(ocorrencia)`: retorna `false` se `ocorrencia.relacionamento` já estiver preenchido (**regra 1:1 — no máximo 1 relação por ocorrência**).
   * `podeAutoSincronizar(vistoria, networkMode)`: retorna `true` somente se `networkMode === "online"` && `vistoria.lifecycleStatus === "finalizada"` && `!vistoria.syncStandby` && `vistoria.syncStatus !== "synced"`.
3. **Ações no Zustand (`useMobileStore.ts`):**
   * `networkMode: NetworkMode` (substituindo o booleano simples `isOnline` para suportar os 3 estados).
   * `setNetworkMode(mode: NetworkMode)`
   * `finalizarVistoria(vistoriaId: string, nomeIdRelatorio: string)` → atualiza `idFiscalizacao`, muda `lifecycleStatus` para `"finalizada"` e dispara auto-sync se `networkMode === "online"`.
   * `reabrirVistoria(vistoriaId: string)` → muda `lifecycleStatus` para `"em_aberto"` e reseta `syncStandby: false`.
   * `excluirVistorias(vistoriaIds: string[])` → remove sessões selecionadas do estado.
   * `relacionarOcorrencia(vistoriaId: string, ocorrenciaNumero: number, dados: RelacionamentoOcorrenciaEntity)` → aplica validação 1:1 antes de gravar.
   * `toggleStandbyVistoria(vistoriaId: string)` → alterna `syncStandby` na sessão finalizada.
   * `executarAutoSyncFinalizados()` → sobe automaticamente todas as sessões elegíveis segundo `podeAutoSincronizar`.
4. **Bottom Tab Bar (`RootNavigator.tsx`):**
   * Atualizar para 5 abas fixas na base: `Início`, `Vistorias`, `Galeria`, `Finalizados`, `Configuração`.
   * Badge discreto em `Vistorias` (qtd em aberto) e `Finalizados` (qtd pendente de sync).

### Critérios de Aceite (BDD)
* **Dado** uma ocorrência que já possui relacionamento, **Quando** tentar adicionar um segundo relacionamento, **Então** a regra de domínio bloqueia a operação.
* **Dado** uma sessão finalizada com `syncStandby = true`, **Quando** o modo de rede estiver `"online"`, **Então** o auto-sync ignora essa sessão.
* **Checks:** `npm.cmd run typecheck` e `npm.cmd test` 100% verdes.

---

## Parte 1 — Aba `Início` (Fluxo Guiado Passo a Passo · Zero Poluição)

> **Foco UX:** O usuário só se preocupa em preencher. **Uma coisa por vez na tela**, sem indicadores de rede/offline e sem lista de sessões antigas.

### Arquivos a criar/alterar
* `src/presentation/screens/InicioWizardScreen.tsx` *(nova tela limpa substituindo o papel atual de coleta/home)*
* `src/presentation/components/inicio/StepModalidade.tsx`
* `src/presentation/components/inicio/StepDadosIniciais.tsx`
* `src/presentation/components/inicio/StepColetaOcorrencias.tsx`
* `src/presentation/components/inicio/FotoPreviewModal.tsx`
* `src/presentation/components/inicio/OcorrenciaDetalheRelacaoModal.tsx`
* `src/presentation/components/inicio/FinalizarRelatorioModal.tsx`

### Fluxo Detalhado (Etapa por Etapa)
1. **Passo 1 — Escolha do Relatório (Tela Inteira):**
   * Cards limpos ocupando a tela para escolher a combinação entre os 6 estados:
     * Concessão: `CRA`, `CRC`, `SOCICAM`
     * Modalidade: `Fiscalização`, `Monitoramento`
   * Ao selecionar, avança automaticamente para o Passo 2.
2. **Passo 2 — Dados Necessários do Cabeçalho:**
   * Exibe apenas os campos essenciais da modalidade escolhida (Local/Terminal, Cidade, Equipe, Coordenador).
   * **Regra crítica:** Em `SOCICAM`, **nunca** exibir Pista ou Faixa.
   * Botão principal **"Iniciar Coleta"** cria a sessão em aberto e avança para o Passo 3.
3. **Passo 3 — Preenchimento de NC/PA + Foto Comprobatória:**
   * **Cabeçalho minimalista:** apenas chips discretos com **Total de Ocorrências** e **Total de Fotos** da sessão atual (e botão voltar/trocar).
   * **Aba/Botão intuitivo de Tirar Foto Comprobatória (simulado por enquanto):**
     1. Usuário toca em **"Tirar Foto Comprobatória"**.
     2. Abre **pré-visualização da foto capturada** (`FotoPreviewModal`) mostrando como ela ficou, com botões **Refazer** e **Confirmar Foto**.
     3. Ao confirmar a foto, vai direto para o formulário limpo de classificação:
        * Tipo: **Não Conformidade (`NC`)** ou **Ponto de Atenção (`PA`)**
        * Se rodovia (`CRA` ou `CRC`): **Pista** e **Faixa**
        * Se terminal (`SOCICAM`): **Setor Predial** *(nunca Pista/Faixa)*
        * Descrição / Observações + salvar ocorrência vinculada à foto.
   * **Lista de Ocorrências abaixo:**
     * Mostra cards enxutos das ocorrências já registradas nesta sessão.
     * Ao **clicar em uma ocorrência**, abre o modal de detalhe (`OcorrenciaDetalheRelacaoModal`) com:
       * Dados da ocorrência + miniatura da foto.
       * Botão **"Relacionar com outro registro"**:
         * Permite selecionar outro registro criado na sessão.
         * **Lógica espelhada do Web (rodovias):** pede apenas **Faixa**, **Codificação (opcional)** e **Sigla (`NC` ou `PA`)**.
         * **Trava 1:1:** só pode relacionar **uma única vez por ocorrência**. Se já houver relacionamento, exibe o selo do vínculo e **não permite** adicionar outro.
4. **Rodapé Fixo — Botão `Finalizar Relatório`:**
   * **Passo A (Modal de Nome/ID):** Ao clicar em **Finalizar Relatório**, abre janela pedindo o **Nome do Relatório (ID)** (pré-preenchido com sugestão editável).
   * **Passo B (Modal de Confirmação):** Após escrever o nome e tocar em **Finalizar**, abre confirmação explícita (*"Tem certeza que deseja finalizar o relatório [ID]?"*).
   * **Resultado:** A sessão sai de `Vistorias` (em aberto), vai para `Finalizados` e a aba `Início` volta limpa para o Passo 1.

### Critérios de Aceite (BDD)
* **Dado** que o usuário está na aba `Início`, **Então** não vê badge de offline/online nem lista de sessões anteriores.
* **Dado** que o usuário tirou uma foto simulada, **Quando** confirmar na pré-visualização, **Então** é direcionado para classificar NC/PA (com Pista/Faixa apenas em rodovias).
* **Dado** que o usuário preencheu o ID e confirmou "Tem certeza?" ao finalizar, **Então** a sessão desaparece de `Vistorias` e aparece em `Finalizados`.

---

## Parte 2 — Aba `Vistorias` (Sessões em Aberto no Dispositivo)

> **Foco UX:** Reaproveitar a visualização limpa de sessões que antes ficava na Home, removendo toda poluição do topo e adicionando exclusão segura em lote.

### Arquivos a criar/alterar
* `src/presentation/screens/VistoriasAbertasScreen.tsx` *(substitui o antigo papel da `HomeVistoriasScreen`)*

### Especificação Técnica
1. **Cabeçalho Limpo:**
   * Título **"Vistorias em Aberto"** + contador discreto.
   * **SEM** seletor de tipo de relatório no topo.
   * **SEM** ícone/botão de alternar modo Offline/Online.
   * Botão **"Selecionar"** (ou ícone lixeira) para entrar no modo seleção.
2. **Lista de Sessões:**
   * Filtra estritamente `vistorias.filter((v) => v.lifecycleStatus === "em_aberto")`.
   * Estado vazio amigável com atalho para ir à aba `Início`.
   * Ao tocar em um card (fora do modo seleção): define como `activeVistoriaId` e navega para a aba `Início` direto no Passo 3 (coleta da sessão).
3. **Modo Seleção e Exclusão Segura:**
   * Ao ativar **Modo Seleção**, cada card exibe checkbox e permite marcar **1 ou mais sessões**.
   * Barra de ação inferior/superior mostra **"Apagar (N)"** e **"Cancelar"**.
   * Ao clicar em **Apagar (N)**, abre **modal de confirmação** (*"Tem certeza que deseja apagar N sessão(ões) em aberto? Esta ação não pode ser desfeita."*).
   * Ao confirmar, chama `excluirVistorias(idsSelecionados)` e encerra o modo seleção.

### Critérios de Aceite (BDD)
* **Dado** 2 sessões em aberto e 1 finalizada, **Quando** abrir a aba `Vistorias`, **Então** apenas as 2 em aberto são exibidas.
* **Dado** o modo seleção ativo com 2 itens marcados, **Quando** confirmar a exclusão no modal, **Então** ambas são removidas do dispositivo.

---

## Parte 3 — Aba `Galeria` (Fotos Locais por Cor + Filtro + Compartilhar)

> **Foco UX:** Repositório visual local (privado do app) para consultar e compartilhar evidências sem poluir a tela de preenchimento.

### Arquivos a criar/alterar
* `src/presentation/screens/GaleriaLocalScreen.tsx`

### Especificação Técnica
1. **Separação Visual por Cores da Modalidade:**
   * Todas as fotos tiradas nas sessões do app são exibidas em grade limpa, agrupadas ou identificadas com borda/selo na cor oficial de `getConcessionTheme(tipoRelatorio, categoriaRelatorio)`:
     * `CRA Fiscalização` (`#2563eb`), `CRA Monitoramento` (`#dc2626`)
     * `CRC Fiscalização` (`#0095c4`), `CRC Monitoramento` (`#e11d48`)
     * `SOCICAM Fiscalização` (`#5b52c6`), `SOCICAM Monitoramento` (`#ea580c`)
2. **Filtro por Sessão:**
   * Barra/dropdown de filtro no topo listando **"Todas as sessões"** e cada sessão existente (por ID do relatório).
   * Ao selecionar uma sessão, a grade exibe **somente** as fotos daquela sessão.
3. **Botão `Compartilhar` (Escopo Filtrado):**
   * Botão **"Compartilhar (N fotos)"** no topo/barra de ações.
   * Compartilha **exclusivamente** o conjunto de fotos atualmente filtrado na tela (usando Share nativo / feedback simulado no Web, sem salvar automaticamente na galeria pública).

### Critérios de Aceite (BDD)
* **Dado** fotos de `CRA` e `SOCICAM`, **Quando** abrir a aba `Galeria`, **Então** cada foto exibe a identificação de cor da sua modalidade.
* **Dado** o filtro aplicado à sessão `FISC-CRA-01` (4 fotos de 10 totais), **Quando** clicar em **Compartilhar**, **Então** apenas as 4 fotos filtradas entram no pacote de compartilhamento.

---

## Parte 4 — Aba `Finalizados` (Auto-Sync + Wi-Fi 3 Estados + Standby + Reabrir)

> **Foco UX:** Centralizar todo o controle de conectividade e envio para o banco **exclusivamente aqui**, deixando o restante do app livre de distrações.

### Arquivos a criar/alterar
* `src/presentation/screens/FinalizadosScreen.tsx` *(evolui/substitui `SyncQueueScreen`)*
* `src/presentation/components/finalizados/WifiStatusPill.tsx`
* `src/presentation/components/finalizados/FinalizadoDetalheModal.tsx`

### Especificação Técnica
1. **Balãozinho de Wi-Fi (Exclusivo desta aba — 3 Estados):**
   * 🟢 **Conectado (`online` — Verde):** Conectado à internet; dispara automaticamente o envio (`executarAutoSyncFinalizados`) de todas as sessões finalizadas pendentes que não estejam em standby.
   * 🔴 **Desconectado (`disconnected` — Vermelho):** Sem sinal de internet no momento (aguardando rede para retomar automaticamente).
   * ⚪ **Offline Manual (`offline_manual` — Cinza):** Opção acionada **propositalmente pelo usuário** (visível apenas na aba `Finalizados`).
     * Ao ativar o modo **Offline Manual (Cinza)**, **abre imediatamente um modal/aviso** informando: *"Modo Offline ativado. O aplicativo não tentará se conectar nem enviar relatórios finalizados até você reativar o modo Online."*
2. **Cards de Sessões Finalizadas + Standby Individual:**
   * Filtra estritamente `vistorias.filter((v) => v.lifecycleStatus === "finalizada")`.
   * Cada card mostra: ID do relatório, modalidade (cor), data, progresso de envio (`fotosEnviadas/totalFotos`) e status (`Sincronizado`, `Enviando`, `Pendente`, `Em Standby`).
   * **Botão `Standby` (Impedir / Retomar envio):**
     * Permite ao usuário bloquear o upload automático daquela sessão específica.
     * Enquanto estiver em **Standby**, o auto-sync ignora a sessão até o usuário tocar em **"Liberar Envio"** novamente.
3. **Visão Geral do Finalizado + Botão `Reabrir Finalizado`:**
   * Ao tocar em um card finalizado, abre `FinalizadoDetalheModal` com a **visão geral completa** (dados do cabeçalho, resumo de NCs/PAs, lista de ocorrências e contagem de fotos).
   * No final da visão geral: botão **"Reabrir Finalizado"**.
   * Ao clicar e confirmar: muda `lifecycleStatus` para `"em_aberto"`, sai da aba `Finalizados` e volta para a aba `Vistorias` para o usuário poder editar novamente.

### Critérios de Aceite (BDD)
* **Dado** o usuário na aba `Finalizados`, **Quando** ativar o modo Offline (cinza), **Então** um alerta explica que nenhum envio será tentado.
* **Dado** o modo Online (verde) com 2 sessões finalizadas (1 normal e 1 em Standby), **Quando** o auto-sync rodar, **Então** apenas a sessão normal é enviada e a em Standby permanece pausada.
* **Dado** uma sessão finalizada aberta em Visão Geral, **Quando** clicar em **Reabrir Finalizado**, **Então** ela volta para a aba `Vistorias` editável.

---

## Parte 5 — Aba `Configuração` (Ajustes Limpos + Revisão Final)

> **Foco UX:** Manter a 5ª aba enxuta para preferências de equipe e informações técnicas/privacidade, sem duplicar controles que agora pertencem a `Finalizados`.

### Arquivos a alterar
* `src/presentation/screens/AjustesScreen.tsx` *(renomear título visual para "Configuração")*
* Limpeza de telas obsoletas (`HomeVistoriasScreen.tsx`, `NovaVistoriaScreen.tsx`, `NovaOcorrenciaScreen.tsx`, `SyncQueueScreen.tsx` após confirmação de que nada mais as importa).

### Especificação Técnica
* Exibir dados do perfil/equipe, versão do aplicativo e resumo de conformidade (armazenamento local no sandbox privado, zero dados sensíveis em banco analítico).
* Remover qualquer controle redundante de modo offline/online desta aba.
* Rodar validação completa final: `npm.cmd run typecheck`, `npm.cmd test`, teste visual no **Expo Web** (`npm.cmd run web`) e revisão de regressão nos 6 estados.

---

## Resumo da Ordem de Execução & Perfil Gemini Sugerido

| Etapa | Escopo | Perfil Gemini Recomendado |
| :--- | :--- | :--- |
| **Parte 0** | Domínio (`types`, `rules`, BDD), Store Zustand e 5 abas no `RootNavigator` | **Carbon** *(múltiplos arquivos de domínio + contrato + testes)* |
| **Parte 1** | Aba `Início` (wizard passo a passo, preview foto, relação 1:1, finalizar 2 etapas) | **Carbon** *(fluxo multi-etapas + 6 estados + vários componentes)* |
| **Parte 2** | Aba `Vistorias` (sessões em aberto + modo seleção múltipla + exclusão segura) | **Neon** *(1 tela bem delimitada)* |
| **Parte 3** | Aba `Galeria` (fotos locais por cor + filtro por sessão + compartilhar filtrado) | **Neon** *(1 tela bem delimitada)* |
| **Parte 4** | Aba `Finalizados` (Wi-Fi 3 estados + auto-sync + standby + visão geral/reabrir) | **Carbon** *(regras de sync/standby + modais + transição de estado)* |
| **Parte 5** | Aba `Configuração`, limpeza de arquivos legados e validação final | **Neon** *(ajustes pontuais + verificação final)* |

