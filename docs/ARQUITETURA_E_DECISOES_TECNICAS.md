# Arquitetura, Ferramentas e Decisões Técnicas (App Mobile Offline-First)

> **Propósito:** Documentar as ferramentas adotadas no aplicativo Android, as decisões arquiteturais tomadas e a justificativa técnica de cada escolha, garantindo previsibilidade, segurança, conformidade com a LGPD e operação 100% offline em campo.

---

## 1. Visão Geral do Sistema

O aplicativo mobile é uma ferramenta focada em **coleta rápida em campo (100% offline-first)** para equipes de fiscalização e monitoramento em rodovias e terminais de passageiros (com baixa ou nenhuma conectividade 4G).

Seu ciclo operacional é dividido em:
1. **Coleta Offline:** Registro de vistorias, classificações e captura de **14 a 100 fotos por vistoria** diretamente no dispositivo, sem depender de rede.
2. **Sincronização Resiliente:** Envio incremental em segundo plano quando há sinal, com retomada automática em caso de queda de conexão.
3. **Handoff para o Ecossistema Web/Backend:** O aplicativo não gera documentos finais (`.docx`/`.pdf`); ele entrega os dados estruturados e mídias temporárias na nuvem para revisão analítica e compilação oficial no servidor.

---

## 2. Decisões Arquiteturais Principais

### 2.1. Repositório Independente (Polyrepo)
* **O que foi decidido:** Manter o aplicativo mobile em um repositório Git totalmente separado das aplicações Web e Backend, integrando-se exclusivamente por **contratos JSON** e serviços em nuvem.
* **Motivo da decisão:** Evita acoplamento de dependências (`node_modules`, versões de React/Native vs. Web), permite ciclos de build e release independentes e impede que alterações de UI mobile quebrem o ambiente desktop/servidor.

### 2.2. Clean Architecture em 4 Camadas
* **O que foi decidido:** Organizar o código-fonte em `src/domain/`, `src/application/`, `src/infrastructure/` e `src/presentation/`.
* **Motivo da decisão:**
  * `src/domain/` contém exclusivamente **TypeScript puro** (entidades, regras de codificação, validações das modalidades e contratos), sem nenhum import de `react-native` ou I/O. Isso permite rodar testes unitários e BDD em segundos no Node/Jest sem precisar de emulador Android.
  * `src/infrastructure/` isola SQLite, câmera, sistema de arquivos, Secure Store e motor de sincronização, facilitando a substituição de adaptadores sem tocar nas regras de negócio.

### 2.3. Separação de Escopo: Coleta em Campo vs. Emissão de Relatório
* **O que foi decidido:** Proibir a geração de `.docx` ou `.pdf` dentro do celular, mantendo toda a compilação documental no backend Python (`FastAPI` + `python-docx`).
* **Motivo da decisão:** A geração de documentos regulatórios complexos com dezenas de fotos, tabelas e regras gramaticais já é auditada por testes automatizados no backend. Replicar isso no celular aumentaria o peso do app, o consumo de memória e o risco de divergência entre relatórios.

### 2.4. Arquitetura de Nuvem em 2 Níveis (Custo Zero / Free Tier)
* **O que foi decidido:** Separar a nuvem em **Camada Temporária (Handoff)** e **Camada Analítica Permanente**.
* **Motivo da decisão:**
  * **Camada Temporária:** Armazena rascunhos em trânsito e fotos comprimidas em **bucket 100% privado**, com **expurgo automático após emissão do relatório no Web** e **TTL de 7 a 15 dias**. Isso evita estourar limites gratuitos de armazenamento e reduz a superfície de exposição de imagens.
  * **Camada Analítica Permanente:** Persiste no PostgreSQL **apenas metadados estruturados** (datas, trechos/terminais, categorias e status de conformidade — **zero fotos e zero dados pessoais**), permitindo anos de histórico para gráficos dentro do plano gratuito (500 MB).

### 2.5. Build Nativo (`.apk`) e Development Build em vez de Expo Go
* **O que foi decidido:** Utilizar **Expo SDK 52** com compilação nativa local via **Android SDK 35 / Gradle 8.10.2 / NDK 26.1** para geração de `.apk` standalone (e builds de desenvolvimento via USB/`adb`), em vez de depender do aplicativo genérico Expo Go da loja.
* **Motivo da decisão:** O Expo Go da loja é atualizado continuamente para o SDK mais recente e deixa de abrir projetos em SDKs anteriores, além de não reproduzir com fidelidade módulos nativos sensíveis (`expo-sqlite`, `expo-secure-store` no Android Keystore e permissões de câmera). O `.apk` compilado garante paridade real de produção e funcionamento 100% offline.
* **Regra de Assinatura:** Em produção, todas as atualizações devem usar a mesma **Keystore fixa** (armazenada fora do Git) para que o Android permita atualizar o app por cima sem apagar o banco local `expo-sqlite` das vistorias em andamento.

---

## 3. Stack Tecnológica e Motivos de Escolha

### 3.1. Núcleo do Aplicativo e Linguagem
| Ferramenta | Versão | Motivo da Escolha |
| :--- | :--- | :--- |
| **React Native** | `0.76.9` | Renderização nativa no Android com excelente desempenho para listas e câmera, aproveitando o mesmo ecossistema React/TypeScript da equipe. |
| **Expo** | `~52.0.0` | Padroniza acesso a hardware (câmera, SQLite, arquivos, Keystore) com APIs tipadas, *prebuild* reproduzível e gerenciamento simplificado de permissões Android. |
| **TypeScript** | `~5.6.3` | Tipagem estrita (`strict`, zero `any`) garante integridade dos contratos JSON entre mobile e backend, reduzindo erros em tempo de execução no campo. |
| **React** | `18.3.1` | Base declarativa estável compatível com o ecossistema React Native 0.76 e React Navigation 7. |

### 3.2. Persistência Offline, Estado e Conectividade
| Ferramenta | Versão | Motivo da Escolha |
| :--- | :--- | :--- |
| **`expo-sqlite`** | `~15.1.4` | Banco relacional local robusto para armazenar vistorias, ocorrências e a fila de sincronização (`sync_queue`) com transações ACID e queries parametrizadas. |
| **`zustand`** | `^5.0.2` | Gerenciador de estado leve, sem boilerplate e alinhado ao padrão já adotado no frontend Web (sem armazenar imagens em Base64). |
| **`@react-native-community/netinfo`** | `11.4.1` | Detecta mudanças reais de conectividade no Android para disparar ou pausar a fila de upload automaticamente. |

### 3.3. Mídia, Câmera e Armazenamento Seguro
| Ferramenta | Versão | Motivo da Escolha |
| :--- | :--- | :--- |
| **`expo-camera`** | `~16.0.0` | Captura direta de evidências em campo integrada ao fluxo do app, sem depender de apps externos que salvam fotos na galeria pública. |
| **`expo-image-manipulator`** | `~13.0.0` | Compressão e redimensionamento imediatos no dispositivo (**máx. 1600px, JPEG ~80%, ~150–250 KB/foto** + miniatura 320px), viabilizando o envio de até 100 fotos em 4G instável sem *Out-Of-Memory*. |
| **`expo-file-system`** | `~18.0.0` | Grava as fotos comprimidas no **sandbox privado** do aplicativo (`documentDirectory`), permitindo limpeza automática após sincronização e emissão. |
| **`expo-secure-store`** | `~14.0.0` | Armazena tokens JWT e *refresh tokens* criptografados no **Android Keystore**, evitando exposição em texto puro no SQLite ou AsyncStorage. |
| **`expo-asset`** | `~11.0.5` | Requerido pelo `@expo/metro-config` no SDK 52 para resolução e hash de assets estáticos durante o empacotamento do bundle. |

### 3.4. Interface, Navegação e Ícones
| Ferramenta | Versão | Motivo da Escolha |
| :--- | :--- | :--- |
| **`@react-navigation/native` / `native-stack` / `bottom-tabs`** | `^7.0.14` / `^7.2.0` | Navegação nativa fluida com suporte a abas inferiores e pilhas de telas otimizadas para uso com uma mão em campo. |
| **`react-native-screens` & `safe-area-context`** | `~4.4.0` / `4.12.0` | Gerenciamento nativo de telas e áreas seguras (entalhes e barras de navegação do Android). |
| **`lucide-react-native` & `react-native-svg`** | `^0.468.0` / `15.8.0` | Ícones vetoriais leves, consistentes e nítidos em qualquer densidade de tela Android. |
| **`expo-status-bar`** | `~2.0.0` | Controle declarativo da barra de status do sistema operacional. |

### 3.5. Qualidade, Testes e Ambiente de Build
| Ferramenta | Versão | Motivo da Escolha |
| :--- | :--- | :--- |
| **Jest + `ts-jest`** | `^29.7.0` / `^29.2.5` | Execução rápida de testes unitários e BDD (*Dado / Quando / Então*) sobre `src/domain/` em TypeScript puro, sem depender de dispositivo ou emulador. |
| **Android SDK 35 + Build-Tools 35.0.0 + NDK 26.1 + Gradle 8.10.2** | Nativo | Ferramental local para compilar módulos nativos C++/Java/Kotlin e empacotar o `.apk` standalone sem depender de serviços pagos. |
| **ADB (`platform-tools`)** | Nativo | Comunicação direta via USB (`adb install`, `adb reverse`) para instalação e debug local sem depender de túneis externos. |

### 3.6. Infraestrutura em Nuvem (Camada de Integração)
| Serviço | Papel | Motivo da Escolha |
| :--- | :--- | :--- |
| **Supabase Auth + PostgreSQL** | Autenticação JWT, RLS e banco analítico | Autenticação institucional pronta para equipe reduzida (sem *sign-up* aberto), suporte nativo a *Row Level Security* (`auth.uid()`) e plano gratuito suficiente para anos de histórico estruturado. |
| **Storage Privado (Cloudflare R2 / Supabase Storage)** | Tráfego temporário de mídias | Armazenamento privado acessado exclusivamente via **Presigned URLs** de curta validade (≤ 10 min) e política de expiração (TTL) automática. |

---

## 4. Decisões de Cibersegurança (OWASP Mobile) e Privacidade (LGPD)

1. **Zero Secrets no Bundle Mobile:** Chaves privadas (`SERVICE_ROLE_KEY`, segredos S3/R2 ou senhas de banco) nunca são incluídas no código do app. Apenas chaves públicas `EXPO_PUBLIC_*` protegidas por **RLS** no banco são permitidas.
2. **Prevenção contra SQL Injection:** 100% das consultas ao `expo-sqlite` e ao PostgreSQL utilizam parâmetros preparados (`?` / `$1`), sem concatenação de strings.
3. **Tráfego Criptografado e Bucket Privado:** Toda comunicação ocorre via `HTTPS`. Fotos nunca possuem URL pública permanente; o tráfego usa exclusivamente **Presigned URLs** temporárias.
4. **Logs Sanitizados:** É proibido registrar tokens JWT, URLs assinadas, credenciais ou dados pessoais em logs de console ou arquivos.
5. **Privacidade por Padrão (LGPD):**
   * Fotos ficam isoladas no sandbox privado do app (nunca na galeria pessoal do dispositivo).
   * O banco analítico permanente armazena apenas métricas agregáveis de ocorrências, sem imagens, CPFs, nomes de terceiros ou placas de veículos.

---

## 5. Práticas Explicitamente Bloqueadas

* ❌ Armazenar fotos em `Base64` dentro do Zustand, `AsyncStorage` ou JSON de estado (risco de *Out-Of-Memory* com 100 fotos).
* ❌ Fazer upload de fotos brutas da câmera (> 500 KB) sem compressão prévia.
* ❌ Enviar 100 fotos em uma única requisição HTTP monolítica (obrigatório usar fila incremental de 1 a 3 fotos por vez com retomada por item).
* ❌ Espalhar regras de negócio das modalidades dentro dos componentes visuais em `src/presentation/screens/`.
* ❌ Versionar arquivos `.apk`, pastas nativas geradas (`android/`, `ios/`), arquivos `.env` ou keystores (`.jks`, `.p12`) no Git.
