```markdown
# Protocolo Quimera v2.3 - Edição Arsenal de Ação Direta

## Visão Geral Estratégica

O Protocolo Quimera v2.3 é uma plataforma de inteligência e comando operacional de última geração, projetada para fornecer insights preditivos e capacidades de ação direta no campo de batalha digital. Esta "Edição Arsenal de Ação Direta" expande significativamente as funcionalidades do sistema, permitindo que operadores não apenas observem e analisem, mas também executem operações táticas com precisão e segurança aprimoradas.

A plataforma integra um frontend reativo para visualização e comando, um backend robusto para processamento e orquestração, e uma legião de agentes Nexus capazes de executar uma vasta gama de missões.

## Principais Funcionalidades

### 1. Agregador de Inteligência
   - **Painel Analítico Centralizado:** Visualização de dados agregados de diversas missões e campanhas.
   - **Widgets Dinâmicos:** Inclui gráficos de sentimento, tabelas de resultados extraídos, galerias de imagens analisadas, monitoramento de API, insights gerados por IA (Gemini), **Galeria de Screenshots de Navegador**, e **Visualizador de HTML Capturado**.
   - **Exportação de Dados:** Capacidade de exportar dados tabulares para CSV para análise offline.

### 2. Córtex Preditivo
   - **Análise de Sentimento:** Modela e projeta tendências de sentimento com base em dados históricos.
   - **Análise de Tendência de Mercado:** Simula e projeta tendências de mercado para fornecer insights estratégicos adicionais.
   - **Briefings Estratégicos:** Gera relatórios textuais com as conclusões e recomendações das análises preditivas.

### 3. Gestão de Agentes (Legião Nexus)
   - **Roster de Agentes:** Visualização em tempo real do status (Idle, Executing, Offline, Error, Pending Approval), hostname, ID e capacidades de cada agente (incluindo controle de navegador).
   - **Forja de Implantes:** Geração de scripts de implantação customizáveis para novos agentes Nexus.
   - **Detalhes do Agente:** Inspeção do histórico de missões recentes, logs e métricas de sistema de cada agente.

### 4. Gestão de Campanhas e Modelos de Missão
   - **Criação e Gerenciamento de Campanhas:** Definição de objetivos estratégicos e agrupamento de missões.
   - **Modelos de Missão Reutilizáveis:** Criação de templates para diversos tipos de missão, incluindo:
      - Web Scraping (`WEB_SCRAPE`)
      - Monitoramento de API (`API_MONITORING`)
      - Reconhecimento de Imagens (`IMAGE_RECOGNITION`)
      - Análise de Sentimento (`SENTIMENT_ANALYSIS`)
      - Processamento de Dados (`DATA_PROCESSING`)
      - Insights de IA com Gemini (`AI_INSIGHTS`)
      - Instalação de Software (`SOFTWARE_INSTALLATION`) (Ação Direta)
      - Configuração de Sistema (`SYSTEM_CONFIGURATION`) (Ação Direta)
      - **Navegação em Browser (`BROWSER_NAVIGATE`) (Ação Direta)**
      - **Screenshot de Browser (`BROWSER_SCREENSHOT`) (Ação Direta)**
      - **Extrair HTML de Browser (`BROWSER_GET_HTML`) (Ação Direta)**
   - **Console de Despacho Rápido:** Envio de missões ad-hoc para agentes específicos.

### 5. Arsenal de Ação Direta (Expandido)
   Esta edição introduz capacidades para que os agentes executem operações que modificam ativamente sistemas alvo (simuladas no ambiente atual) e controlem navegadores web.

   - **Missões de Instalação de Software:** Agentes podem simular o download de arquivos (via URL fornecida no contexto da missão) e a execução sequencial de passos de um instalador (definidos no contexto).
      *   **Exemplo de Contexto:** `{"download_url": "http://example.com/software.exe", "installer_steps": ["/S /norestart", "--agree-license"]}`
   - **Missões de Configuração de Sistema:** Agentes podem simular a escrita ou modificação de arquivos de configuração em um caminho específico.
      *   **Exemplo de Contexto:** `{"config_file": "/etc/app/settings.conf", "new_content": "parameter=value\nenable_feature=true"}`

   ### Controle de Navegador (Requer Puppeteer no Agente)
   Permite que os agentes controlem um navegador (Chromium via Puppeteer) para executar tarefas web. O agente precisa ter o Puppeteer instalado e acessível em seu ambiente de execução.

   - **Missões de Navegação em Browser (`BROWSER_NAVIGATE`):**
     - **Objetivo:** Navegar para uma URL específica.
     - **Contexto Esperado:** `{"url": "https://www.example.com", "timeout": 60000}` (timeout opcional em ms).
     - **Resultado:** Status de sucesso/falha e URL visitada.
   - **Missões de Screenshot de Browser (`BROWSER_SCREENSHOT`):**
     - **Objetivo:** Capturar um screenshot de uma página web.
     - **Contexto Esperado:** `{"url": "https://www.example.com", "screenshotOptions": {"type": "png", "fullPage": false, "quality": 80}, "timeout": 60000}` (screenshotOptions e timeout opcionais).
     - **Resultado:** Imagem em base64, URL de origem, formato da imagem. Visualizado na "Galeria de Screenshots de Navegador".
   - **Missões de Extração de HTML (`BROWSER_GET_HTML`):**
     - **Objetivo:** Extrair o conteúdo HTML completo de uma página.
     - **Contexto Esperado:** `{"url": "https://www.example.com", "timeout": 60000}` (timeout opcional em ms).
     - **Resultado:** Conteúdo HTML como string, URL de origem. Visualizado no "Visualizador de HTML Capturado".

### 6. Protocolo de Engajamento (NOVO)
   Para garantir segurança e controle sobre operações de alto risco:
   - **Aprovação Mandatória:**
      - Missões baseadas em templates do tipo `SOFTWARE_INSTALLATION` ou `SYSTEM_CONFIGURATION` são automaticamente marcadas como `requiresApproval = true`.
      - Missões ad-hoc despachadas pelo "Console de Despacho Rápido" que contenham palavras-chave críticas (ex: "instalar", "executar", "escrever arquivo", "alterar arquivo", "configurar sistema") em seu objetivo ou contexto JSON são automaticamente definidas com o status inicial `PENDING_APPROVAL`.
   - **Fluxo de Aprovação:**
      - Missões marcadas como `PENDING_APPROVAL` não são atribuídas a nenhum agente.
      - Operadores com permissão de `admin` podem visualizar essas missões na seção "Missões Pendentes de Aprovação" na tela de Gestão de Campanhas.
      - Um `admin` deve aprovar explicitamente a missão para que seu status mude para `PENDING` e ela se torne elegível para ser coletada por um agente.
   - **Controle de Acesso:** A capacidade de aprovar missões é restrita a usuários com la role `admin`.

### 7. Insights de IA com Google Gemini
   - Agentes podem ser despachados em missões do tipo `AI_INSIGHTS`, coletando dados brutos relevantes para um objetivo.
   - O backend processa esses dados utilizando a API do Google Gemini (requer configuração de chave de API) para gerar análises e insights.
   - Esses insights são visualizáveis no "Agregador de Inteligência" e no histórico de missões do agente.

## Estrutura do Projeto

O projeto é fornecido como um único arquivo `index.html` que contém:
- **Frontend:** Código React (JSX) embutido em uma tag `<script type="text/babel">`. Este código define toda a interface do usuário, componentes, lógica de visualização e comunicação com o backend.
- **Backend:** Código Node.js (Express.js) embutido em uma tag `<script type="text/plain" id="backend-code-nodejs">`. Este código define o servidor API, lógica de negócios, interações com o banco de dados e gerenciamento de WebSockets.
- **Estilos:** CSS global e específico para componentes embutido em uma tag `<style>`.

Para execução, o conteúdo do script backend deve ser salvo em um arquivo `server.js`.

## Setup e Execução

### Pré-requisitos
- Node.js (v16 ou superior recomendado)
- Servidor PostgreSQL

### 1. Configuração do Backend
   a. Copie o conteúdo da tag `<script type="text/plain" id="backend-code-nodejs">` do arquivo `index.html` e salve-o como `server.js` em um diretório de projeto.
   b. Crie um arquivo chamado `.env` no mesmo diretório do `server.js` com o seguinte conteúdo (ajuste os valores conforme seu ambiente):

      \`\`\`dotenv
      # Server Configuration
      HIVE_PORT=8080

      # Database (PostgreSQL)
      DB_HOST=localhost
      DB_USER=postgres_user # Substitua pelo seu usuário PostgreSQL
      DB_PASSWORD=your_postgres_password # Substitua pela sua senha
      DB_NAME=chimera_db
      DB_PORT=5432

      # Security
      JWT_SECRET=SEU_SEGREDO_JWT_SUPER_FORTE_E_COMPLEXO_DEVE_SER_LONGO
      GEMINI_API_KEY=SUA_CHAVE_DE_API_DO_GOOGLE_GEMINI_AQUI # Opcional, para funcionalidade de Insights de IA
      \`\`\`
   c. Certifique-se de que o banco de dados `chimera_db` exista no seu servidor PostgreSQL.

### 2. Instalação de Dependências do Servidor
   No diretório do projeto (onde você salvou `server.js`), execute:
   \`\`\`bash
   npm init -y
   npm install express cors sequelize pg pg-hstore dotenv bcryptjs jsonwebtoken winston morgan express-validator uuid @google/generative-ai ws
   \`\`\`

### 3. Requisitos Adicionais do Ambiente do Agente (para Controle de Navegador)
   - Para que um agente Nexus possa executar missões de controle de navegador (`BROWSER_NAVIGATE`, `BROWSER_SCREENSHOT`, `BROWSER_GET_HTML`), o ambiente onde o script `nexus-agent.js` (gerado pela Forja de Implantes) é executado deve ter o Node.js e a biblioteca `puppeteer` instalada.
   - Execute no ambiente do agente: `npm install puppeteer`
   - O agente detectará automaticamente a presença do Puppeteer e reportará a capacidade `has_browser_control`.

### 4. Executando o Servidor Backend
   \`\`\`bash
   node server.js
   \`\`\`
   O servidor iniciará na porta especificada em `HIVE_PORT` (padrão 8080). Na primeira execução, ele criará um usuário padrão.

### 5. Acessando a Interface Frontend
   Abra o arquivo `index.html` diretamente em um navegador web moderno. A interface se conectará ao backend local (http://localhost:8080 por padrão).

### 6. Credenciais e Administração
   - **Usuário Padrão:**
      - Username: \`operator\`
      - Password: \`password123\`
   - **Usuário Admin:** Para funcionalidades de aprovação de missões, um usuário com role \`admin\` é necessário.
      - O sistema cria um usuário \`operator\` por padrão. Para habilitar um \`admin\`:
         1. Faça login como \`operator\`.
         2. Se a API permitir registro de admin por operator (verifique código do \`POST /auth/register\`), use-a.
         3. Alternativamente, modifique manualmente a role do usuário \`operator\` para \`admin\` diretamente no banco de dados na tabela \`Users\`, ou crie um usuário \`admin\` no seeder do \`server.js\` antes da primeira execução.

## Uso da Plataforma

### Navegação
- A interface principal possui abas para:
    - **Agregador de Inteligência:** Visualizar resultados de campanhas, incluindo screenshots e HTML capturado.
    - **Campanhas:** Gerenciar campanhas, modelos de missão e aprovar missões (admin).
    - **Agentes:** Visualizar e gerenciar agentes Nexus.
    - **Córtex Preditivo:** Realizar análises preditivas.

### Criando e Despachando Missões
1.  **Crie uma Campanha:** Na aba "Campanhas".
2.  **Crie Modelos de Missão:** Dentro de uma campanha, defina templates para os tipos de tarefas desejados (e.g., \`WEB_SCRAPE\`, \`SOFTWARE_INSTALLATION\`, \`BROWSER_SCREENSHOT\`).
    - Para \`SOFTWARE_INSTALLATION\` e \`SYSTEM_CONFIGURATION\`, o sistema marcará automaticamente \`requiresApproval\` como verdadeiro. Missões de browser não requerem aprovação por padrão.
3.  **Despache Missões:**
    - Use o "Console de Despacho Rápido" em uma campanha para enviar missões ad-hoc.
    - **Atenção:** Missões ad-hoc com palavras-chave de Ação Direta (instalar, executar, escrever arquivo, etc.) serão automaticamente colocadas em \`PENDING_APPROVAL\`.

### Aprovando Missões (Admin)
1.  Acesse a aba "Campanhas".
2.  Selecione uma campanha.
3.  Na seção "Missões Pendentes de Aprovação", administradores podem revisar e aprovar missões de alto risco.
4.  Após a aprovação, a missão mudará para o status \`PENDING\` e poderá ser coletada por um agente qualificado.

## Documentação de API (Endpoints Relevantes)

#### GET /api/analytics/campaign/:campaignId/mission-results
Busca resultados de missões para uma campanha específica, filtrados por tipo.
- **Query Parameters:**
    - `type` (string, obrigatório): O `templateType` da missão (e.g., `BROWSER_SCREENSHOT`, `AI_INSIGHTS`, `BROWSER_GET_HTML`).
- **Resposta:** Array de objetos de missão formatados, incluindo `id`, `objective`, `templateType`, `status`, `result`, `timestamp`, `agentId`, `agentHostname`.

## Considerações de Segurança e Produção
(Resumo dos pontos destacados nos comentários do código \`server.js\`)
- **HTTPS:** Use um proxy reverso (Nginx, Caddy) para HTTPS em produção.
- **Sanitização de Entrada:** Valide e sanitize todas as entradas do usuário.
- **CSRF:** Implemente proteção CSRF se usar sessões baseadas em cookies.
- **Rate Limiting:** Proteja rotas sensíveis contra abuso.
- **Headers de Segurança:** Utilize headers como os fornecidos pelo Helmet.js.
- **Escalabilidade:** Considere filas de mensagens (RabbitMQ, Kafka) e workers/microsserviços para tarefas intensivas.
- **Testes:** Implemente uma estratégia de testes abrangente (unitários, integração, E2E).

---
```
