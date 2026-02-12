# DaVinci: The Polymath AI Entity

## Overview
**DaVinci** is a modular, polyglot AI entity designed for incremental growth. Unlike single-purpose bots, DaVinci is built as a centralized "brain" with a suite of "skills" (services) that allow it to interact with documents, system infrastructure, real-time web data, and personal workflows.

The project is structured as a **monorepo** to leverage the best-in-class performance of **Go** and **Rust**, the AI/ML ecosystem of **Python**, and the interactive capabilities of **TypeScript**.

## Core Philosophy
- **Polymathic:** Capable of mastering diverse domains—from technical document analysis (RAG) to system administration and personal logistics.
- **Contract-First:** Services communicate via strictly defined interfaces (gRPC/Protobuf) to ensure type safety across different languages.
- **Agentic:** Not just a chat interface, but an orchestrator that can call internal tools to observe the system and execute actions.

## Architecture

### 1. The Brain (Orchestration)
The central logic layer that handles intent classification and tool dispatching.
- **Orchestrator (Go):** High-concurrency routing and service management.
- **Registry:** A central catalog of all "tools" DaVinci can call.

### 2. The Senses (Knowledge & Data)
- **ScribeQuery (Go):** A high-performance PDF RAG system using vector embeddings and hybrid search to query technical documentation.
- **System Monitor (Go/Rust):** Real-time telemetry service for monitoring CPU, memory, and local process health.
- **Web Observer (TypeScript):** Browser automation and API integration for real-time data like weather, travel, and news.

### 3. The Hands (Execution)
- **Code Interpreter (Python/Go):** Secure sandboxed environment for executing dynamic logic and data processing.
- **Automation Hub:** Integration points for webhooks, shell commands, and third-party APIs.

## Monorepo Structure

```text
/
├── apps/
│   ├── scribequery/      # PDF RAG Engine (Go)
│   ├── system-agent/     # Telemetry & SysAdmin tools (Rust/Go)
│   ├── ui-dashboard/     # Unified Entity Interface (TS/Next.js)
│   └── brain-proxy/      # LLM Gateway & Orchestrator (Go)
├── libs/
│   ├── proto/            # Cross-language Protobuf definitions
│   ├── shared-go/        # Shared logging, tracing, and DB clients
│   └── shared-ts/        # Type definitions for the frontend
├── infra/                # Docker, Terraform, and Vector DB config
└── tools/                # Monorepo task runners (Turbo/Make)