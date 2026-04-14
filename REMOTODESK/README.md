# REMOTODESK - Remote Support SaaS

Uma solução de acesso remoto profissional com design premium, focada em simplicidade e performance inicial via JPEG Streaming.

## Estrutura

- **/server**: Servidor de sinalização Node.js.
- **/client**: Painel do técnico em React (Vite).
- **/agent**: Código fonte do agente Windows (C# .NET).

## Como Iniciar

### 1. Servidor
```bash
cd server
npm install
npm start
```

### 2. Painel Web
```bash
cd client
npm install
npm run dev
```

### 3. Agente Windows
- Abra o código em `agent/Program.cs` no Visual Studio.
- Adicione as referências para `System.Drawing` e `System.Windows.Forms`.
- Compile e execute.

## Diferenciais Premium Implementados
- **Design High-Tech**: Interface Dark Mode com Blur e Glitch effects.
- **Latência Zero**: Uso de pacotes voláteis no Socket.io para manter o stream atualizado.
- **Relay Inteligente**: Ponte de comandos do mouse enviada em tempo real para o agente.
