# Backlog Detalhado — App Android Offline-First (ARPE)
**MoSCoW · INVEST · Critérios de Aceite BDD · Tarefas SMART**

> **Documentos Relacionados:**
> * Governança & Stack: [.agents/AGENTS.md](../.agents/AGENTS.md)
> * Visão Macro & Mapa de Ondas: [MOBILE_BACKLOG_EPICOS.md](./MOBILE_BACKLOG_EPICOS.md)

---

## Legenda de Classificação
* **MoSCoW:** `Must Have` (obrigatório para o marco), `Should Have` (alta prioridade, não bloqueia MVP imediato), `Could Have` (desejável se houver folga), `Won't Have` (explicitamente fora deste ciclo).
* **INVEST:** Checklist de qualidade da história (**I**ndependent, **N**egotiable, **V**aluable, **E**stimable, **S**mall, **T**estable).
* **SMART:** Tarefas técnicas com escopo claro (**S**pecific), critério verificável (**M**easurable), viável na stack homologada (**A**chievable), ligada ao valor da US (**R**elevant) e prazo estimado (**T**ime-bound).

---

## Épico 1 — Fundação do App Independente (Expo), Camada de Domínio e Acesso Seguro

### US-1.1 — Bootstrap do Repositório Mobile (Expo) e Camada de Domínio (`src/domain/`)
* **História:** *Como desenvolvedor, quero criar o App Android (React Native + Expo TypeScript) em um repositório Git independente e estruturar a camada pura `src/domain/` espelhando exatamente os contratos JSON e regras dos 6 estados regulatórios do Web, para manter os projetos desacoplados e organizados sem Monorepo.*
* **Prioridade MoSCoW:** **Must Have** *(Bloqueador de todo o projeto)*
* **Validação INVEST:**
  * **I:** Totalmente independente do repositório Web e de nuvem externa.
  * **N:** Organização interna das subpastas de `src/domain/` é negociável.
  * **V:** Garante paridade de contrato JSON e regras CRA/CRC/SOCICAM sem misturar código-fonte com o Web.
  * **E:** Estimável (~3 dias úteis).
  * **S:** Focado apenas no bootstrap do projeto Expo + camada pura `src/domain/` + testes unitários.
  * **T:** Validável via `tsc --noEmit`, testes unitários de `src/domain/` e abertura limpa no Android.
* **Critérios de Aceite (BDD):**
  * **Dado** o novo repositório `arpe-relatorios-mobile` criado fora da pasta do projeto Web;
  * **Quando** `src/domain/` implementar os contratos `FiscalizacaoItem`, `RegistroNcItem`, `calcularCodificacaoCra` e `calcularEstatisticasMonitoramento`;
  * **Então** o app deve compilar sem erros de TypeScript, sem imports de `react-native` dentro de `src/domain/`, e gerar payloads JSON 100% compatíveis com o Web/Backend.
* **Tarefas SMART:**
  1. **Inicializar repositório independente `arpe-relatorios-mobile` com Expo TypeScript (0,5 dia):** Configurar `expo`, `expo-sqlite`, `expo-file-system`, `expo-camera`, `expo-image-manipulator`, `expo-secure-store`, `zustand`, `@react-native-community/netinfo`, `.gitignore` e `.env.example`.
  2. **Implementar camada pura `src/domain/` (1,5 dia):** Criar tipos contratuais, codificação CRA, normalização SOCICAM e cálculo de estatísticas de monitoramento 100% compatíveis com o contrato JSON do Web.
  3. **Criar suíte de testes unitários/BDD em `src/domain/` (0,5 dia):** Configurar Jest/Vitest cobrindo paridade de codificação CRA, regras de terminais SOCICAM e estatísticas.
  4. **Copiar governança mobile para o novo repositório (0,5 dia):** Copiar `.agents/mobile/AGENTS.md` e `.agents/mobile/developer-mobile/SKILL.md` para a pasta `.agents/` do repositório mobile garantindo guarda de escopo desde o commit 1.

### US-1.2 — Autenticação Institucional (Supabase Auth) com Sessão Offline e Cache de Catálogos
* **História:** *Como fiscal da ARPE, quero autenticar com meu e-mail/senha institucional quando estiver online e manter minha sessão + catálogos oficiais em cache no `expo-sqlite`, para trabalhar normalmente em áreas sem sinal.*
* **Prioridade MoSCoW:** **Must Have**
* **Validação INVEST:**
  * **I:** Depende apenas da base do Épico 1 (US-1.1).
  * **N:** Layout da tela de login e tempo de expiração do token podem ser ajustados.
  * **V:** Protege dados regulatórios (LGPD) e libera operação offline para os 10 usuários.
  * **E:** Estimável (~3 dias úteis).
  * **S:** Restrito a login, persistência segura de sessão e cache local de `/api/config/bootstrap`.
  * **T:** Testável desligando Wi-Fi/4G após login e reabrindo o app.
* **Critérios de Aceite (BDD):**
  * **Dado** um fiscal autenticado previamente com internet;
  * **Quando** o aparelho entrar em Modo Avião, o app for fechado e reaberto;
  * **Então** o fiscal deve entrar diretamente na tela inicial sem exigir novo login;
  * **E** os catálogos (responsáveis, coordenadores, contratos, NCs padrão e terminais SOCICAM) devem estar disponíveis a partir do `expo-sqlite`.
* **Tarefas SMART:**
  1. **Provisionar Supabase Auth (Free) com 10 usuários de teste/equipe (0,5 dia):** Configurar autenticação e política RLS básica, sem permitir auto-cadastro público (*sign-up* desabilitado).
  2. **Implementar tela de Login + persistência segura com `expo-secure-store` (1 dia):** Salvar JWT/refresh token criptografado no Android e implementar validação offline de sessão ativa.
  3. **Criar tabela `catalogos_cache` no `expo-sqlite` e sincronização no boot (1 dia):** Baixar `/api/config/bootstrap` quando online, gravar versão/timestamp no SQLite e carregar do SQLite quando offline.
  4. **Validar cenário offline completo em dispositivo físico/emulador (0,5 dia):** Executar teste de Modo Avião + restart do app confirmando disponibilidade de todos os catálogos.

---

## Épico 2 — Coleta Rápida Offline em Campo (Fiscalização — 3 Concessões)

### US-2.1 — Abertura e Gestão de Vistorias de Fiscalização Offline (`CRA`, `CRC`, `SOCICAM`)
* **História:** *Como fiscal em campo, quero criar, editar e listar vistorias de Fiscalização offline escolhendo a concessão (`CRA`, `CRC` ou `SOCICAM`), com formulário adaptado automaticamente às regras daquela concessão, para registrar achados sem risco de erro contratual.*
* **Prioridade MoSCoW:** **Must Have**
* **Validação INVEST:**
  * **I:** Independente de upload para nuvem (100% local em `expo-sqlite`).
  * **N:** Ordem visual dos campos na tela mobile é negociável com os fiscais.
  * **V:** Entrega o núcleo operacional da coleta de campo para todas as 3 concessões.
  * **E:** Estimável (~4 a 5 dias úteis).
  * **S:** Focado apenas na modalidade `Fiscalização` (Monitoramento fica no Épico 5).
  * **T:** Testável para as 3 concessões em Modo Avião, verificando persistência no SQLite e ausência de pista/faixa em SOCICAM.
* **Critérios de Aceite (BDD):**
  * **Dado** que o fiscal está offline e inicia uma nova Fiscalização da concessão **SOCICAM**;
  * **Quando** abrir o formulário de registro de ocorrência;
  * **Então** o app deve exibir o seletor de `Terminal` (TIP, Caruaru, Garanhuns, Petrolina, etc.), setores prediais e `custom_ncs_socicam`;
  * **E** **NÃO** deve exibir campos de `Pista`, `Faixa` ou `Estaca`.
  * **Dado** que o fiscal inicia uma Fiscalização da concessão **CRA**;
  * **Quando** informar subtrecho, estaca inicial/final e salvar uma NC;
  * **Então** o app deve calcular a codificação `CRA.ST{subtrecho}.{estaca_ini}-{estaca_fim}/{ano}.{seq:03d}` usando `src/domain/` e gravar imediatamente no `expo-sqlite`.
* **Tarefas SMART:**
  1. **Modelar e criar migrations no `expo-sqlite` (1 dia):** Criar tabelas `vistorias`, `ocorrencias` e `sync_queue` com índices por `id_vistoria` e `sync_status`.
  2. **Criar tabela declarativa de configuração por concessão (`CONCESSION_MOBILE_CONFIG`) (0,5 dia):** Mapear campos visíveis/obrigatórios de `CRA`, `CRC` e `SOCICAM` sem cascatas de `if/else` (OCP).
  3. **Implementar telas de Lista de Vistorias e Cabeçalho da Vistoria (1,5 dia):** Permitir criar/retomar vistoria offline com seleção de equipe, data/hora automática e contrato padrão da concessão.
  4. **Implementar tela de Registro Rápido de NC/PA (1,5 dia):** Formulário otimizado para uso com uma mão, alternância NC/PA, busca rápida no catálogo de NCs e salvamento automático imediato no SQLite.
  5. **Testar persistência pós-crash (0,5 dia):** Registrar 5 ocorrências em Modo Avião, encerrar o processo do app (*force close*) e confirmar 100% dos dados restaurados na reabertura.

---

## Épico 3 — Motor de Mídia Local e Performance para até 100 Fotos

### US-3.1 — Captura Contínua, Compressão Local (~200 KB) e Galeria Sem OOM
* **História:** *Como fiscal em uma vistoria extensa (até 100 fotos), quero capturar fotos diretamente no app com compressão automática no sandbox privado e navegar pelas miniaturas sem travamentos, para trabalhar o dia inteiro em campo sem estourar memória nem misturar fotos pessoais.*
* **Prioridade MoSCoW:** **Must Have**
* **Validação INVEST:**
  * **I:** Pode ser desenvolvido e testado em paralelo ao formulário do Épico 2.
  * **N:** Dimensão exata (1600px vs 1440px) e qualidade JPEG (78%–82%) são ajustáveis após teste visual no `.docx`.
  * **V:** Viabiliza tecnicamente o envio de 100 fotos em 4G e protege a privacidade (LGPD).
  * **E:** Estimável (~4 dias úteis).
  * **S:** Restrito à captura, compressão, gravação em disco privado, listagem virtualizada e vínculo com NC.
  * **T:** Mensurável por tamanho médio de arquivo (≤ 250 KB/foto), consumo de RAM e ausência de fotos na galeria pública do Android.
* **Critérios de Aceite (BDD):**
  * **Dado** que o fiscal captura uma foto de 4 MB pela câmera do Android dentro do app;
  * **Quando** a captura for confirmada;
  * **Então** o app deve redimensionar para no máximo `1600px` no maior lado (JPEG ~80%, alvo ≤ 250 KB), gravar o arquivo em `FileSystem.documentDirectory/vistorias/{id}/` e salvar apenas o caminho (`local_uri`) no SQLite;
  * **E** a foto **NÃO** deve aparecer na galeria pessoal de fotos do dispositivo;
  * **E** ao abrir uma vistoria com **100 fotos**, a rolagem da galeria deve permanecer fluida sem *crash* (usando lista virtualizada e miniaturas, nunca Base64 em memória).
* **Tarefas SMART:**
  1. **Criar serviço `mediaService.ts` com `expo-image-manipulator` e `expo-file-system` (1 dia):** Implementar pipeline `capturar/importar → comprimir (max 1600px, JPEG 0.8) → gerar miniatura (320px) → mover para sandbox privado`.
  2. **Implementar tela de Câmera Rápida / Importação em Lote (1 dia):** Permitir disparo contínuo de fotos e importação opcional de múltiplas fotos existentes, exibindo contador e tamanho economizado.
  3. **Criar tabela `fotos_midia` no SQLite e vínculo N:1 com ocorrências (1 dia):** Permitir vincular 1 ou várias fotos à mesma NC/PA (`is_relacionado`), preservando ordenação natural.
  4. **Construir Galeria Virtualizada (`FlatList` otimizada) e teste de carga com 100 fotos (1 dia):** Carregar 100 fotos comprimidas (~20 MB total) em aparelho Android real/emulador e validar rolagem estável e ausência de erro de memória.

---

## Épico 4 — Fila de Sincronização Resiliente e Handoff Temporário para o Web

### US-4.1 — Upload Incremental Foto a Foto com Retomada Automática
* **História:** *Como fiscal voltando de campo com sinal 4G instável, quero que o app envie automaticamente as fotos (1 a 3 por vez) e os dados da vistoria para a nuvem temporária, retomando exatamente de onde parou se a internet cair, para nunca perder progresso nem duplicar arquivos.*
* **Prioridade MoSCoW:** **Must Have** *(Fecha o MVP de campo)*
* **Validação INVEST:**
  * **I:** Depende dos Épicos 2 e 3 (dados e fotos locais prontos).
  * **N:** Concorrência de upload (1, 2 ou 3 fotos simultâneas) é ajustável.
  * **V:** Elimina transferência manual via cabo USB/WhatsApp entre celular e computador.
  * **E:** Estimável (~4 dias úteis).
  * **S:** Focado na fila de envio do Mobile para o Storage Temporário + tabela de rascunhos.
  * **T:** Testável cortando a rede no meio do upload de 30–100 fotos e religando.
* **Critérios de Aceite (BDD):**
  * **Dado** uma vistoria offline com 50 fotos na fila (`pending`);
  * **Quando** o aparelho recuperar conexão Wi-Fi/4G;
  * **Então** o motor de sync deve solicitar Presigned URLs autenticadas e enviar foto por foto atualizando cada item para `synced` no SQLite;
  * **E** se a internet cair na foto 27 e voltar depois, o upload deve retomar a partir da foto 28 sem reenviar as 27 já concluídas;
  * **E** ao finalizar todas as fotos, o JSON da vistoria deve ser marcado como `pronto_para_web`.
* **Tarefas SMART:**
  1. **Configurar Bucket Privado Temporário (Cloudflare R2 ou Supabase Storage) com Lifecycle TTL de 15 dias (0,5 dia):** Criar pasta `temp-sync/{user_id}/{vistoria_id}/` bloqueando acesso público direto.
  2. **Criar endpoints de Handoff no Backend/Edge (`POST /api/sync/presign`, `POST /api/sync/session`, `GET /api/sync/sessions`) (1,5 dia):** Protegidos por JWT do Supabase, emitindo Presigned URLs com validade de 10 minutos e persistindo rascunho temporário.
  3. **Implementar `syncEngine.ts` no Mobile com `NetInfo` + Retry Exponencial (1,5 dia):** Processar `sync_queue` em lotes de 2 fotos por vez, com idempotência por `photo_id` e UI de barra de progresso (`Enviando 28/50...`).
  4. **Executar teste de interrupção de rede (0,5 dia):** Simular queda de internet durante upload de 30+ fotos e validar retomada limpa sem duplicidade no bucket.

### US-4.2 — Importação no Web e Expurgo Automático Pós-Emissão do `.docx`
* **História:** *Como analista no escritório, quero importar no site Web uma vistoria enviada pelo Android, revisar os dados, emitir o relatório `.docx` e expurgar automaticamente as fotos temporárias da nuvem, para concluir o relatório rapidamente mantendo o Free Tier sempre livre e conforme à LGPD.*
* **Prioridade MoSCoW:** **Must Have** *(Fecha o MVP de campo)*
* **Validação INVEST:**
  * **I:** Independente das telas de coleta do Mobile (opera no `frontend/` + `backend/`).
  * **N:** Posicionamento do botão "Importar do Campo" na Sidebar/TopHeader é negociável.
  * **V:** Conecta o App Android diretamente ao gerador de `.docx` já validado (194 testes).
  * **E:** Estimável (~3 dias úteis).
  * **S:** Apenas listagem de sessões pendentes, download para o store Web e chamada de limpeza pós-emissão.
  * **T:** Testável gerando um `.docx` real no Web a partir de uma coleta feita no Android e verificando remoção dos arquivos no bucket.
* **Critérios de Aceite (BDD):**
  * **Dado** uma vistoria com status `pronto_para_web` na nuvem temporária;
  * **Quando** o analista clicar em **"Importar do Campo"** no Web e selecionar a vistoria;
  * **Então** o Web deve baixar o JSON e as fotos via Presigned URLs e popular o `useReportStore` na modalidade correta (`CRA`/`CRC`/`SOCICAM`);
  * **E** após a geração bem-sucedida do `.docx` e confirmação do analista, o sistema deve executar `DELETE` nas fotos temporárias daquela vistoria no bucket.
* **Tarefas SMART:**
  1. **Criar modal `ImportarCampoModal.tsx` no Web (1 dia):** Listar vistorias sincronizadas com concessão, data, quantidade de NCs/fotos e botão de importar.
  2. **Implementar hidratador da sessão Web a partir da nuvem temporária (1 dia):** Converter fotos baixadas em `UploadedPhotoItem` e chamar `importarEstadoModalidade` na store sem quebrar a pasta local `geradorBD`.
  3. **Implementar endpoint `DELETE /api/sync/session/{id}/media` e gatilho pós-emissão (1 dia):** Remover objetos do bucket temporário após download do `.docx` e marcar rascunho como `concluido`.

---

## Épico 5 — Fluxo Completo Offline de Monitoramento (CRA, CRC e SOCICAM)

### US-5.1 — Pré-Carga Offline do Relatório Anterior e Auditoria Comparativa em Campo
* **História:** *Como fiscal de Monitoramento, quero baixar previamente no celular (enquanto tenho internet) as NCs pendentes e miniaturas das fotos do relatório anterior de um processo, para auditar cada pendência offline em campo marcando `Sanada`, `Parcialmente Sanada` ou `Pendente`.*
* **Prioridade MoSCoW:** **Should Have** *(Obrigatório para Marco 2 — 6 estados completos)*
* **Validação INVEST:**
  * **I:** Reaproveita o motor de mídia (Épico 3) e a fila de sync (Épico 4).
  * **N:** Modo de visualização "Antes × Depois" (abas vs. lado a lado) é negociável.
  * **V:** Elimina impressão em papel do relatório anterior durante vistorias de monitoramento.
  * **E:** Estimável (~5 dias úteis).
  * **S:** Abrange pré-carga, tela comparativa e rascunho de `Recomendações à SOCICAM`.
  * **T:** Testável com um `.docx` anterior real carregado no Web/Nuvem e auditado em Modo Avião no Android.
* **Critérios de Aceite (BDD):**
  * **Dado** um processo de Monitoramento (`CRA`, `CRC` ou `SOCICAM`) preparado previamente com o relatório anterior;
  * **Quando** o fiscal tocar em **"Baixar para Campo (Offline)"** enquanto conectado e depois entrar em Modo Avião;
  * **Então** todas as NCs pendentes anteriores (com ID, descrição, local/pista e miniatura anterior) devem estar acessíveis offline;
  * **E** para cada NC o fiscal deve conseguir capturar a foto nova, definir `Situação` (`Sanada`, `Parcialmente Sanada`, `Pendente`), preencher `Constatação`, `Posicionamento/Informação` e `Análise da ARPE`;
  * **E** em `SOCICAM Monitoramento`, o app deve exibir o resumo de pendências e permitir preencher `Recomendações à SOCICAM` sincronizado para a Etapa 04 do Web.
* **Tarefas SMART:**
  1. **Criar endpoint de preparação de pacote de Monitoramento (`POST /api/sync/prepare-monitoring`) (1 dia):** Reutilizar `previous_report_audit_service.py` no backend para extrair NCs pendentes + miniaturas leves (≤ 40 KB cada) e disponibilizar para download pelo Mobile.
  2. **Implementar download e cache offline do pacote de Monitoramento no `expo-sqlite` (1 dia):** Salvar `ncs_anteriores` e miniaturas no sandbox privado com indicador visual `"Pronto para Campo (Offline)"`.
  3. **Construir tela de Auditoria Comparativa (`Antes × Depois`) no Mobile (2 dias):** Exibir foto/descrição antiga no topo, botão de captura da nova foto, chips de `Situação`, campos textuais específicos por concessão e campo `Recomendações à SOCICAM`.
  4. **Validar integração de ponta a ponta com o Web (1 dia):** Sincronizar monitoramento do Android para o Web e gerar `.docx` de `SOCICAM`, `CRC` e `CRA` Monitoramento validando Seção 3, Quadro 1 e Seção 5.

---

## Épico 6 — Banco Analítico Permanente (Free) e Gráficos Históricos no Web

### US-6.1 — Gravação Permanente Enxuta (Apenas NCs/PAs) e Dashboard Gerencial (Meses/Anos)
* **História:** *Como coordenador da ARPE, quero que o sistema salve permanentemente apenas os dados estruturados de NCs e PAs (sem fotos) ao emitir um relatório no Web, e disponibilize uma tela de gráficos históricos por mês, ano e concessão, para acompanhar a evolução regulatória sem custos de banco.*
* **Prioridade MoSCoW:** **Should Have** *(Marco 2)*
* **Validação INVEST:**
  * **I:** Independente do App Android (funciona até para relatórios criados 100% no Web!).
  * **N:** Tipos de gráficos iniciais (barras mensais, pizza de saneamento, ranking de NCs) são negociáveis.
  * **V:** Transforma relatórios estáticos em inteligência histórica de longo prazo dentro do Free Tier.
  * **E:** Estimável (~4 dias úteis).
  * **S:** Limitado à tabela `historico_achados`, gravação pós-emissão e 1 tela de dashboard com filtros.
  * **T:** Testável emitindo 3 relatórios em meses/concessões diferentes e validando agregações exatas nos filtros.
* **Critérios de Aceite (BDD):**
  * **Dado** um relatório emitido com sucesso no Web contendo 10 NCs (6 Sanadas, 2 Parciais, 2 Pendentes) e 2 PAs;
  * **Quando** o analista confirmar o registro no histórico;
  * **Então** o PostgreSQL (Supabase Free) deve gravar exatamente os 12 registros na tabela `historico_achados` **sem nenhuma imagem, URL de foto ou dado pessoal de terceiros**;
  * **E** ao abrir a tela **Painel Histórico** no Web e filtrar por concessão e período (ex.: último ano), os gráficos devem refletir os números reais agregados em menos de 1 segundo.
* **Tarefas SMART:**
  1. **Criar tabela `historico_achados` e views agregadas no Supabase PostgreSQL (0,5 dia):** Aplicar schema mínimo definido na Seção 6 de [MOBILE_AGENTS.md](./MOBILE_AGENTS.md) com índices em `(concessao, data_vistoria)` e RLS por usuário autenticado.
  2. **Integrar gravação idempotente pós-emissão no Web (`upsert` por `id_vistoria`) (1 dia):** Evitar duplicação caso o analista gere o mesmo `.docx` duas vezes após um pequeno ajuste de texto.
  3. **Construir tela `HistoricoDashboard.tsx` no Web (2 dias):** Filtros de concessão (`CRA`/`CRC`/`SOCICAM`), modalidade, período (mês/ano) e 3 gráficos limpos: evolução mensal de NCs/PAs, taxa de saneamento e Top 5 categorias de NC.
  4. **Validar projeção de consumo e anonimização (0,5 dia):** Inserir massa simulada de 5.000 registros (~1 ano intenso), verificar tamanho em disco no Supabase (< 5 MB) e auditar ausência de PII.

---

## Épico 7 — Blindagem LGPD, Testes de Estresse em Campo e Distribuição `.apk`

### US-7.1 — Auditoria de Segurança/LGPD, QA de 100 Fotos Offline e Release Controlado (`.apk`)
* **História:** *Como gestor técnico da ARPE, quero validar segurança (JWT, CORS, bucket privado, TTL), executar testes de estresse com 100 fotos offline em Android real e gerar o `.apk` assinado via Expo EAS Build, para entregar o app aos até 10 fiscais com confiabilidade de produção.*
* **Prioridade MoSCoW:** **Must Have** *(Obrigatório antes de uso real em campo — Marco 3)*
* **Validação INVEST:**
  * **I:** Executa sobre o sistema integrado dos épicos anteriores.
  * **N:** Canal interno de distribuição do `.apk` (link protegido / EAS internal distribution) é negociável.
  * **V:** Garante conformidade legal (LGPD) e impede perda de vistorias reais em campo.
  * **E:** Estimável (~3 dias úteis).
  * **S:** Checklist objetivo de segurança, 1 bateria de teste de estresse e 1 pipeline de build `.apk`.
  * **T:** Validável por evidências objetivas (logs de teste, verificação HTTP 401/403 em acessos sem token e instalação do `.apk` em aparelho físico).
* **Critérios de Aceite (BDD):**
  * **Dado** qualquer requisição sem JWT válido para os endpoints de sync ou tentativa de acesso direto a uma URL do bucket de fotos;
  * **Quando** a requisição for disparada;
  * **Então** o servidor/storage deve responder `401 Unauthorized` ou `403 Forbidden`.
  * **Dado** o `.apk` instalado em um celular Android físico em Modo Avião;
  * **Quando** o fiscal registrar **100 fotos** em uma vistoria, reiniciar o aparelho, religar o 4G, interromper o upload na metade e depois concluir o envio + importação no Web;
  * **Então** todas as 100 fotos devem chegar íntegras ao `.docx` gerado no Web e ser removidas do bucket temporário após a emissão.
* **Tarefas SMART:**
  1. **Fechar CORS e endurecer autenticação no Backend (`main.py`) (0,5 dia):** Substituir `allow_origins=["*"]` por `ALLOWED_ORIGINS` por ambiente e exigir JWT em todos os endpoints de sync/histórico.
  2. **Executar bateria de QA em dispositivo Android físico (1 dia):** Validar os cenários de Modo Avião, 100 fotos (~20 MB), *force close*, queda de 4G no meio do sync e ausência de fotos na galeria pessoal do telefone.
  3. **Configurar `eas.json` e gerar primeiro `.apk` de distribuição interna (1 dia):** Configurar perfil `preview`/`production` com variáveis de ambiente seguras (sem segredos hardcoded) e testar instalação limpa em Android.
  4. **Documentar Guia Rápido do Fiscal (1 página) (0,5 dia):** Fluxo visual de pré-campo (baixar monitoramento), coleta offline, sincronização e importação no Web.

---

## O que Fica Explicitamente Fora deste Ciclo (`Won't Have`)
* ❌ Geração de arquivos `.docx` ou `.pdf` dentro do aplicativo Android.
* ❌ Publicação na Google Play Store pública ou versão iOS/App Store (até que haja demanda real).
* ❌ Armazenamento permanente de fotos na nuvem (fotos são estritamente temporárias).
* ❌ Edição colaborativa simultânea em tempo real (tipo Google Docs) na mesma vistoria.

