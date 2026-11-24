# ARPE Fiscalização — App Android Offline-First

Aplicação Android independente (**React Native + Expo + TypeScript**) para coleta de campo offline das 6 modalidades regulatórias da ARPE (`CRA`, `CRC`, `SOCICAM` × `Fiscalização`, `Monitoramento`).

## Arquitetura (Clean Architecture)
* `src/domain/` — Entidades, regras puras dos 6 estados, tabela declarativa de concessões e portas/interfaces (100% TypeScript puro, sem React Native).
* `src/application/` — Casos de uso e store Zustand enxuta (sem Base64 de mídia).
* `src/infrastructure/` — Adaptadores plugáveis (`mocks`, `database` SQLite, `media`, `auth` SecureStore, `sync`).
* `src/presentation/` — Design System ARPE, navegação, componentes reutilizáveis e telas mobile-first.
* `.agents/` — Guardião de escopo (`AGENTS.md`) e agente executor (`developer-mobile`).

