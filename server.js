```javascript
/*
================================================================================
CTO: Servidor da "Colmeia", v2.3 - EDIÇÃO APRIMORADA
================================================================================
Diretiva: Fase 2.3 - Implementar melhorias de performance, usabilidade e
          capacidades analíticas, e incorporar considerações de produção.
Status:
- [CONCLUÍDO] Novo modelo "Análise de Tendência de Mercado" adicionado ao Córtex.
- [CONCLUÍDO] Cache de consultas em memória implementado para endpoints de análise.
- [CONCLUÍDO] Endpoint de resultados de tabela aprimorado para suportar
             exportação de dados completos.
- [CONCLUÍDO] Tratamento de erros aprimorado e mais seguro para produção.
- [CONCEITUAL] Considerações de segurança (HTTPS, CSRF/XSS) adicionadas.
- [CONCEITUAL] Considerações de escalabilidade (filas de mensagens, workers) adicionadas.
- [CONCEITUAL] Considerações de testes adicionadas.

**Instruções de Setup:**
1.  Salve este código como `server.js`.
2.  Crie um arquivo `.env` na mesma pasta com o seguinte conteúdo (ajuste os valores):
    ```dotenv
    # Server Configuration
    HIVE_PORT=8080

    # Database (PostgreSQL)
    DB_HOST=localhost
    DB_USER=postgres
    DB_PASSWORD=your_postgres_password
    DB_NAME=chimera_db
    DB_PORT=5432

    # Security
    JWT_SECRET=UM_SEGREDO_MUUITO_FORTE_E_LONGO_PARA_SEUS_TOKENS_JWT_ALMIR_FELIX_BILHAO
    GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY_HERE
    ```
3.  Execute no terminal (na pasta do `server.js`):
    ```bash
    npm init -y
    npm install express cors sequelize pg pg-hstore dotenv bcryptjs jsonwebtoken winston morgan express-validator uuid @google/generative-ai ws
    ```
    (`ws` é para suporte a WebSocket, `pg` e `pg-hstore` para PostgreSQL com Sequelize).
4.  Certifique-se de que o seu servidor PostgreSQL está rodando e o banco de dados `chimera_db` foi criado.
5.  Rode o servidor: `node server.js`
6.  O servidor irá criar um usuário padrão na primeira execução:
    -   **Username:** operator
    -   **Password:** password123
    Use essas credenciais para fazer login na interface React.

---
**Considerações de Segurança para Produção (Backend):**
*   **HTTPS:** Em produção, este servidor Express deve ser executado atrás de um proxy reverso (ex: Nginx, Caddy) configurado para servir HTTPS. Isso criptografa todo o tráfego HTTP e WebSocket (`wss://`), protegendo dados em trânsito.
*   **Sanitização de Entrada:** Embora `express-validator` garanta a validade dos dados, para campos de texto livre que serão exibidos na UI (como mensagens de agentes ou descrições de campanhas), é crucial usar bibliotecas de sanitização (ex: `dompurify` para HTML) no backend antes de persistir no DB ou enviar ao frontend, prevenindo ataques de Cross-Site Scripting (XSS).
*   **CSRF (Cross-Site Request Forgery):** Para aplicações que usam sessões baseadas em cookies, é essencial implementar proteção CSRF (ex: pacote `csurf`). Com JWTs stateless, o risco é menor, mas ainda é uma boa prática considerar, especialmente se houver fluxos híbridos.
*   **Rate Limiting:** Para prevenir ataques de força bruta ou DDoS, implemente middlewares de rate limiting (ex: `express-rate-limit`) nas rotas de autenticação e outras rotas sensíveis.
*   **Header de Segurança:** Configurar headers HTTP de segurança (Helmet.js) como X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.

**Considerações de Escalabilidade e Confiabilidade (Backend):**
*   **Filas de Mensagens:** Para um sistema de despacho de tarefas robusto e escalável, a comunicação entre o servidor da Colmeia e os Agentes, e entre os Agentes e a lógica de processamento de resultados complexos (como Gemini), deveria usar um sistema de filas de mensagens (ex: RabbitMQ, Kafka). Isso garante a entrega de mensagens, re-tentativas em caso de falha, e permite que o processamento seja distribuído por múltiplos workers.
*   **Serviços de Agendamento:** Para missões que precisam ser executadas em intervalos regulares ou em horários específicos, um serviço de agendamento dedicado (ex: usando cron jobs, ou um orquestrador como Apache Airflow, ou mesmo pacotes Node.js como `node-cron` com persistência para a rede de agentes) seria mais robusto do que o polling simples.
*   **Microsserviços/Workers:** A lógica de execução das tarefas dos agentes (atualmente simulada dentro do próprio agente) e o processamento de insights de IA (como a chamada ao Gemini) poderiam ser desmembrados em microsserviços ou workers especializados. Isso permite escalabilidade independente e melhor resiliência.

**Estratégia de Testes (Backend):**
*   **Testes Unitários:** Testes isolados para funções e módulos individuais (ex: validações, helpers, lógica de negócios pura) usando frameworks como Jest ou Mocha/Chai.
*   **Testes de Integração:** Testes que verificam a interação entre componentes (ex: rotas da API com o banco de dados, middleware com controladores). Supertest pode ser usado para testar rotas Express.
*   **Testes E2E (End-to-End):** Testes que simulam cenários de usuário completos, do frontend ao backend e DB, para garantir que o sistema funciona como um todo.

================================================================================
*/

const http = require('http');
const url = require('url');
const { WebSocketServer } = require('ws');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');
const { body, validationResult, param, query } = require('express-validator');
const { Sequelize, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Importar para gerar UUIDs de agentes
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Importar o SDK Gemini
require('dotenv').config();

// --- 1. Configuração de Logging (Winston) ---
// Configuração detalhada de logging para produção:
// - Logs de erro em arquivo separado.
// - Logs combinados (info, warn, error) em outro arquivo.
// - Logs no console para desenvolvimento.
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error', handleExceptions: true, maxsize: 5242880, maxFiles: 5 }), // 5MB, 5 arquivos
        new winston.transports.File({ filename: 'combined.log', maxsize: 5242880, maxFiles: 5 }),
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
            level: 'info'
        }),
    ],
    exitOnError: false, // Não sair em exceções não tratadas, deixá-las serem logadas.
});

// Captura exceções não tratadas do processo Node.js
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Em produção, você pode querer encerrar o processo aqui após um certo tempo
    // para que um gerenciador de processos (PM2, Kubernetes) possa reiniciá-lo.
    // process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Em produção, isso é um erro grave. Encerre o processo para garantir um estado limpo.
    process.exit(1);
});


// --- 2. Configuração do Servidor Express ---
const app = express();
const PORT = process.env.HIVE_PORT || 8080;

// Configuração de CORS para produção: definir um 'origin' específico.
// Para este demo, '*' é usado, mas em produção seria a URL do frontend.
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json()); // Habilita parsing de JSON no corpo da requisição
app.use(express.urlencoded({ extended: true })); // Habilita parsing de URL-encoded (para formulários simples, se necessário)

// Logging de acesso HTTP usando Morgan, roteando para Winston
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// NOVO: Cache em memória simples para API
// Este cache é um MVP simples. Para produção em larga escala, soluções como Redis seriam mais adequadas.
const apiCache = new Map();
function cacheMiddleware(durationInSeconds) {
    return (req, res, next) => {
        const key = req.originalUrl;
        // Skip cache for 'all=true' requests to ensure fresh export data
        if (req.query.all === 'true') {
            logger.debug(`[CACHE] Bypass para exportação completa: ${key}`); // Mudar para debug para não poluir logs info
            return next();
        }

        const cachedResponse = apiCache.get(key);
        if (cachedResponse) {
            logger.debug(`[CACHE] HIT para a chave: ${key}`);
            // Parse and stringify to ensure a fresh copy and prevent direct modification of cached object
            return res.send(JSON.parse(cachedResponse));
        }

        logger.debug(`[CACHE] MISS para a chave: ${key}`);
        const originalSend = res.send.bind(res);
        res.send = (body) => {
            if (res.statusCode === 200 && body) {
                // Store stringified body to prevent mutation and for consistent storage
                apiCache.set(key, JSON.stringify(body));
                setTimeout(() => {
                    apiCache.delete(key);
                    logger.debug(`[CACHE] Expirou a chave: ${key}`);
                }, durationInSeconds * 1000);
            }
            originalSend(body);
        };
        next();
    };
}

// --- 3. Conexão com Banco de Dados (Sequelize) ---
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: (msg) => logger.debug(msg), // Mudar para debug para logs do Sequelize
        pool: { max: 20, min: 0, acquire: 30000, idle: 10000 },
        dialectOptions: {
            // Em produção, especialmente com HTTPS, considere:
            // ssl: {
            //     require: true,
            //     rejectUnauthorized: false // Para provedores de nuvem que podem ter certificados auto-assinados
            // }
        }
    }
);

// --- 4. Definição dos Modelos de Dados (v2.3) ---
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('operator', 'admin'), defaultValue: 'operator' }
}, { tableName: 'Users', timestamps: true });

const Agent = sequelize.define('Agent', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    agentId: { type: DataTypes.UUID, unique: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
    hostname: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('IDLE', 'EXECUTING', 'ERROR', 'OFFLINE'), defaultValue: 'OFFLINE' },
    lastSeen: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    capabilities: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Contém métricas estáticas e dinâmicas. Ex: {"os":"win32","arch":"x64","cpuLoad":5.5,"memoryUsage":0.65}'
    }
}, { tableName: 'Agents', timestamps: true });

const Campaign = sequelize.define('Campaign', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    objective: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('ACTIVE', 'PAUSED', 'COMPLETED'), defaultValue: 'PAUSED' }
}, { tableName: 'Campaigns', timestamps: true });

const MissionTemplate = sequelize.define('MissionTemplate', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    campaignId: { type: DataTypes.INTEGER, allowNull: false }, // FK para Campaign
    objective: { type: DataTypes.STRING, allowNull: false },
    context: { type: DataTypes.JSONB, allowNull: true },
    templateType: {
        type: DataTypes.ENUM(
            'WEB_SCRAPE',
            'API_MONITORING',
            'IMAGE_RECOGNITION',
            'SENTIMENT_ANALYSIS',
            'DATA_PROCESSING',
            'AI_INSIGHTS' // MODIFICATION 1: Added 'AI_INSIGHTS'
        ),
        allowNull: false
    },
    requiredCapabilities: { type: DataTypes.JSONB, allowNull: true, comment: 'Ex: {"gpu": true, "ram_gb": 16}' }
}, { tableName: 'MissionTemplates', timestamps: true });

const MissionExecution = sequelize.define('MissionExecution', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    agentRecordId: { type: DataTypes.INTEGER, allowNull: false }, // FK para Agent
    missionTemplateIdFk: { type: DataTypes.INTEGER, allowNull: true }, // FK para MissionTemplate (null se ad-hoc)
    manual_objective: { type: DataTypes.STRING, allowNull: true }, // Objetivo para missões ad-hoc
    manual_context: { type: DataTypes.JSONB, allowNull: true }, // Contexto para missões ad-hoc
    status: { type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'), defaultValue: 'PENDING' },
    result: { type: DataTypes.JSONB, allowNull: true },
    startTime: { type: DataTypes.DATE, allowNull: true },
    endTime: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'MissionExecutions', timestamps: true });

// Definição das Associações para garantir integridade referencial e facilitar queries
Campaign.hasMany(MissionTemplate, { foreignKey: 'campaignId', onDelete: 'CASCADE' });
MissionTemplate.belongsTo(Campaign, { foreignKey: 'campaignId' });

Agent.hasMany(MissionExecution, { foreignKey: 'agentRecordId' });
MissionExecution.belongsTo(Agent, { foreignKey: 'agentRecordId' });

MissionTemplate.hasMany(MissionExecution, { foreignKey: 'missionTemplateIdFk', allowNull: true });
MissionExecution.belongsTo(MissionTemplate, { foreignKey: 'missionTemplateIdFk' });


// --- 5. Middlewares de Validação e Autenticação ---
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Erro de validação na requisição:', { errors: errors.array(), path: req.path, method: req.method, body: req.body });
        return res.status(400).json({
            message: 'Dados de entrada inválidos.',
            errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
        }); // Mensagens mais amigáveis ao cliente
    }
    next();
};

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                logger.warn(`Tentativa de acesso não autorizado com token inválido: ${err.message}`, { path: req.path });
                return res.status(403).json({ message: 'Token inválido ou expirado.' }); // Forbidden
            }
            req.user = user; // Anexa o payload do usuário à requisição (userId, username, role)
            next();
        });
    } else {
        logger.warn('Tentativa de acesso não autorizado: nenhum token JWT fornecido.', { path: req.path });
        res.status(401).json({ message: 'Token de autenticação não fornecido.' }); // Unauthorized
    }
};

// Middleware para verificar role do usuário (ex: admin)
const authorizeRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== requiredRole) {
            logger.warn(`Acesso negado para usuário '${req.user ? req.user.username : 'N/A'}' (role: ${req.user ? req.user.role : 'N/A'}) na rota ${req.path}. Role requerida: ${requiredRole}.`);
            return res.status(403).json({ message: `Acesso negado. Requer role de '${requiredRole}'.` });
        }
        next();
    };
};

// --- 6. Integração com Google Gemini SDK ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

// Função para gerar insights usando Gemini
async function getGeminiInsights(objective, rawData) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GOOGLE_GEMINI_API_KEY_HERE') {
        logger.warn('GEMINI_API_KEY não configurada. Insights de IA não serão gerados.');
        // MODIFICATION 4: Updated return message for missing API key
        return 'Insight de IA não pôde ser gerado: GEMINI_API_KEY não configurada no servidor. Dados brutos da missão disponíveis.';
    }

    try {
        const prompt = `Gerar um insight conciso, acionável e profissional baseado no seguinte objetivo e dados brutos:

Objetivo: "${objective}"
Dados Brutos: "${rawData}"

Por favor, condense as informações em um ou dois parágrafos, destacando pontos-chave.`;
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        logger.info('Insight de IA gerado com sucesso pelo Gemini.', { objective, dataLength: rawData.length });
        return text;
    } catch (error) {
        logger.error(`Erro ao gerar insight com Gemini: ${error.message}`, { stack: error.stack, objective });
        // Em produção, talvez queira enviar isso para uma fila de processamento secundário para re-tentativa.
        return `Falha ao gerar insight de IA com Gemini: ${error.message}. Dados brutos para referência: ${rawData.substring(0, Math.min(rawData.length, 200))}...`;
    }
}

// --- 7. Módulo Córtex Preditivo (v2.3 - EXPANDIDO) ---
const cortexRouter = express.Router();
cortexRouter.post('/analyze',
    [
        body('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.'),
        body('modelType').isIn(['sentiment_prediction', 'market_trend_analysis']).withMessage('Tipo de modelo preditivo inválido.')
    ],
    validateRequest,
    async (req, res, next) => {
        logger.info(`[CORTEX] Iniciando análise preditiva. Modelo: ${req.body.modelType}, Campanha: ${req.body.campaignId}`, { userId: req.user.userId });
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time

        const { campaignId, modelType } = req.body;

        if (modelType === 'sentiment_prediction') {
            const historicalData = [];
            let lastValue = Math.random() * 0.4;
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                lastValue += (Math.random() - 0.5) * 0.2;
                lastValue = Math.max(-1, Math.min(1, lastValue));
                historicalData.push([date.getTime(), parseFloat(lastValue.toFixed(3))]);
            }
            const predictionData = [];
            const prediction_start = new Date();
            for (let i = 0; i < 15; i++) {
                const date = new Date(prediction_start);
                date.setDate(date.getDate() + i);
                lastValue += (Math.random() - 0.45) * 0.1;
                lastValue = Math.max(-1, Math.min(1, lastValue));
                predictionData.push([date.getTime(), parseFloat(lastValue.toFixed(3))]);
            }
            const finalValue = predictionData[predictionData.length-1][1];
            const initialValue = historicalData[0][1];
            const trend = finalValue > initialValue ? 'POSITIVA' : 'NEGATIVA';
            const percentage = Math.abs(((finalValue - initialValue) / (initialValue || 1)) * 100).toFixed(1);

            res.json({
                series: [
                    { name: 'Sentimento Histórico', data: historicalData },
                    { name: 'Projeção do Córtex', data: predictionData }
                ],
                prediction_start: prediction_start.toISOString(),
                briefing: `ANÁLISE PREDITIVA DE SENTIMENTO DA CAMPANHA ${campaignId}
----------------------------------------------------
MODELO: CORTEX-SENTIMENT-V1.0

O Córtex Preditivo analisou os padrões de sentimento históricos associados à Campanha ID ${campaignId}. A projeção para as próximas 15 semanas indica uma tendência geral ${trend}, com uma variação percentual esperada de aproximadamente ${percentage}%.

RECOMENDAÇÕES ESTRATÉGICAS:
- Se a tendência for positiva, reforce as iniciativas de engajamento e capitalização da boa reputação.
- Se a tendência for negativa, inicie um plano de resposta rápida para mitigar impactos e realinhe a estratégia de comunicação.

FIM DO BRIEFING.`
            });
        }

        // NOVO: Simulação de Análise de Tendência de Mercado
        else if (modelType === 'market_trend_analysis') {
            const historicalData = [];
            let lastValue = 100 + Math.random() * 20; // Initial price/metric
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                lastValue += (Math.random() - 0.5) * 10; // Volatility
                lastValue = Math.max(50, parseFloat(lastValue.toFixed(2)));
                historicalData.push([date.getTime(), lastValue]);
            }

            const predictionData = [];
            const prediction_start = new Date();
            let trendFactor = (Math.random() - 0.3) * 5; // General trend for the future
            for (let i = 0; i < 15; i++) {
                const date = new Date(prediction_start);
                date.setDate(date.getDate() + i);
                lastValue += trendFactor + ((Math.random() - 0.5) * 5);
                lastValue = Math.max(50, parseFloat(lastValue.toFixed(2)));
                predictionData.push([date.getTime(), lastValue]);
            }

            const finalValue = predictionData[predictionData.length-1][1];
            const initialValue = historicalData[0][1];
            const trend = finalValue > initialValue ? 'ALTA' : 'BAIXA';
            const percentage = Math.abs(((finalValue - initialValue) / initialValue) * 100).toFixed(1);

            res.json({
                series: [ { name: 'Tendência Histórica', data: historicalData }, { name: 'Projeção de Mercado', data: predictionData } ],
                prediction_start: prediction_start.toISOString(),
                briefing: `ANÁLISE DE TENDÊNCIA DE MERCADO DA CAMPANHA ${campaignId}
----------------------------------------------------
MODELO: CORTEX-MARKET-V1.1

O Córtex projetou a tendência de mercado para esta campanha com base nos dados históricos.

A projeção indica uma tendência de ${trend}, com uma variação potencial de ${percentage}% nos próximos 15 dias para a métrica observada.

RECOMENDAÇÕES TÁTICAS:
- Se a tendência for de ALTA, avaliar pontos de entrada e reforçar o monitoramento de volatilidade.
- Se de BAIXA, identificar níveis de suporte e preparar estratégias de mitigação de perdas para minimizar riscos.

FIM DO BRIEFING.`
            });
        }
        else {
            res.status(400).json({ message: 'Modelo preditivo solicitado inválido ou não implementado.'});
        }
    }
);

// --- 8. Rotas da API HTTP v2.3 ---
const apiRouter = express.Router();
const authRouter = express.Router();

// 8.1 Rotas de Autenticação (Públicas)
authRouter.post('/login',
    [
        body('username').isString().notEmpty().withMessage('Username é obrigatório.'),
        body('password').isString().notEmpty().withMessage('Password é obrigatória.')
    ],
    validateRequest,
    async (req, res, next) => { // Adicionado 'next' para passar erros para o middleware global
        const { username, password } = req.body;
        try {
            const user = await User.findOne({ where: { username } });
            if (!user) {
                logger.warn(`Tentativa de login falha para username: ${username} (usuário não encontrado).`);
                return res.status(401).json({ message: "Credenciais inválidas." });
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                logger.warn(`Tentativa de login falha para username: ${username} (senha incorreta).`);
                return res.status(401).json({ message: "Credenciais inválidas." });
            }

            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            logger.info(`Usuário '${username}' autenticado com sucesso.`, { userId: user.id });
            res.json({ token, user: { username: user.username, role: user.role } });

        } catch (error) {
            logger.error(`Erro no processo de login para ${username}: ${error.message}`, { stack: error.stack });
            next(error); // Passa o erro para o manipulador de erros global
        }
    }
);

authRouter.post('/register',
    authenticateJWT,
    authorizeRole('admin'),
    [
        body('username').isString().notEmpty().withMessage('Username é obrigatório.').isLength({ min: 3 }).withMessage('Username deve ter pelo menos 3 caracteres.'),
        body('password').isString().notEmpty().withMessage('Password é obrigatória.').isLength({ min: 6 }).withMessage('Password deve ter pelo menos 6 caracteres.'),
        body('role').isIn(['operator', 'admin']).withMessage('Role inválida. Deve ser 'operator' ou 'admin'.')
    ],
    validateRequest,
    async (req, res, next) => { // Adicionado 'next'
        const { username, password, role } = req.body;
        try {
            const existingUser = await User.findOne({ where: { username } });
            if (existingUser) {
                logger.warn(`Tentativa de registro de username duplicado: ${username}`);
                return res.status(409).json({ message: 'Username já existe.' });
            }
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            const newUser = await User.create({ username, passwordHash, role });
            logger.info(`Novo usuário '${username}' com role '${role}' registrado pelo administrador ${req.user.username}.`, { newUserId: newUser.id });
            res.status(201).json({ userId: newUser.id, username: newUser.username, role: newUser.role });
        } catch (error) {
            logger.error(`Erro ao registrar novo usuário: ${error.message}`, { stack: error.stack });
            next(error); // Passa o erro
        }
    }
);

// 8.2 Rotas Protegidas (Todas as rotas daqui em diante usarão o middleware authenticateJWT)
apiRouter.use(authenticateJWT);
apiRouter.use('/cortex', cortexRouter); // Add cortex router under authenticated API

// Agentes
apiRouter.get('/agents', async (req, res, next) => {
    try {
        const agents = await Agent.findAll({
            order: [['lastSeen', 'DESC']],
            include: [{
                model: MissionExecution,
                limit: 5,
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'status', 'manual_objective', 'createdAt', 'result'], // Incluir 'result' para Gemini summary no frontend
                include: MissionTemplate
            }]
        });
        res.json(agents);
    } catch (error) {
        logger.error(`Erro ao listar agentes: ${error.message}`, { stack: error.stack, userId: req.user.userId });
        next(error);
    }
});

apiRouter.get('/agents/:agentId',
    [param('agentId').isUUID().withMessage('ID do agente deve ser um UUID válido.')],
    validateRequest,
    async (req, res, next) => {
    try {
        const agent = await Agent.findOne({
            where: { agentId: req.params.agentId },
            include: [{
                model: MissionExecution,
                order: [['createdAt', 'DESC']],
                limit: 10,
                include: MissionTemplate
            }]
        });
        if (agent) {
            res.json(agent);
        } else {
            logger.warn(`Agente não encontrado: ${req.params.agentId}`, { userId: req.user.userId });
            res.status(404).json({ message: 'Agente não encontrado.' });
        }
    } catch (error) {
        logger.error(`Erro ao buscar detalhes do agente ${req.params.agentId}: ${error.message}`, { stack: error.stack, userId: req.user.userId });
        next(error);
    }
});

// A rota de registro e heartbeat do agente não é protegida por JWT porque o agente ainda não possui um token.
// A validação de `agentId` é feita na rota de heartbeat e task para garantir que apenas agentes conhecidos se comuniquem.
apiRouter.post('/agents/register',
    // Não usar authenticateJWT aqui, pois é para o primeiro contato do agente.
    [
        body('hostname').isString().notEmpty().withMessage('Hostname é obrigatório.'),
        body('capabilities').isObject().withMessage('Capabilities deve ser um objeto válido.')
    ],
    validateRequest,
    async (req, res, next) => {
        const { hostname, capabilities } = req.body;
        try {
            const newAgent = await Agent.create({
                agentId: uuidv4(),
                hostname,
                status: 'IDLE',
                capabilities,
                lastSeen: new Date()
            });
            logger.info(`Novo Agente registrado: ${hostname} (${newAgent.agentId})`, { capabilities: newAgent.capabilities });
            res.status(201).json({ message: 'Agente registrado com sucesso.', agentId: newAgent.agentId });
            broadcastToUIs({ type: 'agent-update', payload: { agentId: newAgent.agentId, status: 'registered' } });
        } catch (error) {
            logger.error(`Erro ao registrar agente ${hostname}: ${error.message}`, { stack: error.stack, requestBody: req.body });
            next(error);
        }
    }
);

apiRouter.post('/agents/heartbeat',
    // Não usar authenticateJWT aqui, pois o agente reporta seu estado.
    [
        body('agentId').isUUID().withMessage('ID do agente deve ser um UUID válido.'),
        body('status').isIn(['IDLE', 'EXECUTING', 'ERROR']).withMessage('Status inválido.').optional(),
        body('capabilities').isObject().withMessage('Capabilities deve ser um objeto válido.').optional()
    ],
    validateRequest,
    async (req, res, next) => {
        const { agentId, status, capabilities } = req.body;
        try {
            const updateData = { lastSeen: new Date() };
            if (status) updateData.status = status;
            if (capabilities) {
                const existingAgent = await Agent.findOne({ where: { agentId }, attributes: ['capabilities'] });
                const mergedCapabilities = { ...existingAgent?.capabilities, ...capabilities };
                updateData.capabilities = mergedCapabilities;
            }

            const [updatedCount] = await Agent.update(updateData, { where: { agentId } });
            if (updatedCount > 0) {
                // logger.debug(`Heartbeat recebido de: ${agentId}, status: ${status || 'N/A'}.`); // Mudar para debug
                res.status(200).json({ message: 'Heartbeat recebido e atualizado.' });
                broadcastToUIs({ type: 'agent-update', payload: { agentId: agentId, status: status } });
            } else {
                logger.warn(`Heartbeat de agente não encontrado: ${agentId}`);
                res.status(404).json({ message: 'Agente não encontrado.' });
            }
        } catch (error) {
            logger.error(`Erro ao processar heartbeat de ${agentId}: ${error.message}`, { stack: error.stack, requestBody: req.body });
            next(error);
        }
    }
);

apiRouter.get('/agents/:agentId/task',
    // Não usar authenticateJWT aqui, pois o agente requisita sua tarefa.
    [param('agentId').isUUID().withMessage('ID do agente deve ser um UUID válido.')],
    validateRequest,
    async (req, res, next) => {
    try {
        const agent = await Agent.findOne({ where: { agentId: req.params.agentId }});
        if (!agent) {
            logger.warn(`Requisição de tarefa de agente não encontrado: ${req.params.agentId}`);
            return res.status(404).json({ message: 'Agente não encontrado.' });
        }

        const mission = await MissionExecution.findOne({
            where: { agentRecordId: agent.id, status: 'PENDING' },
            order: [['createdAt', 'ASC']],
            include: MissionTemplate
        });

        if (mission) {
            mission.status = 'IN_PROGRESS';
            mission.startTime = new Date();
            await mission.save();
            await agent.update({ status: 'EXECUTING' });

            res.json({
                id: mission.id,
                objective: mission.manual_objective || mission.MissionTemplate?.objective,
                context: mission.manual_context || mission.MissionTemplate?.context,
                templateType: mission.MissionTemplate?.templateType
            });
            logger.info(`Tarefa (ID: ${mission.id}, Tipo: ${mission.MissionTemplate?.templateType || 'Ad-hoc'}) atribuída ao agente ${agent.agentId}.`);
            broadcastToUIs({ type: 'mission-update', payload: { missionId: mission.id, status: 'IN_PROGRESS', agentId: agent.agentId } });
        } else {
            res.status(204).send(); // No content for no task
        }
    } catch (error) {
        logger.error(`Erro ao buscar tarefa para agente ${req.params.agentId}: ${error.message}`, { stack: error.stack });
        next(error);
    }
});

// Missões
apiRouter.post('/missions/:missionId/update',
    // Não usar authenticateJWT aqui, pois o agente reporta o resultado da missão.
    [
        param('missionId').isInt().withMessage('ID da missão deve ser um número inteiro.'),
        body('status').isIn(['COMPLETED', 'FAILED']).withMessage('Status de conclusão inválido.'),
        body('result').isObject().withMessage('Resultados devem ser um objeto válido.')
    ],
    validateRequest,
    async (req, res, next) => {
    try {
        const { status, result } = req.body;
        const mission = await MissionExecution.findByPk(req.params.missionId, { include: [Agent, MissionTemplate] });

        if (!mission) {
            logger.warn(`Tentativa de atualização de missão não encontrada: ${req.params.missionId}`);
            return res.status(404).json({ message: 'Execução de missão não encontrada.' });
        }

        // MODIFICATION 3: Updated logic for handling AI_INSIGHTS results
        let finalResult = result; // Initialize finalResult with the original result

        if (status === 'COMPLETED' && mission.MissionTemplate?.templateType === 'AI_INSIGHTS' && result.rawData && result.aiObjective) {
            logger.info(`Processando dados brutos da missão ${mission.id} (Objetivo: ${result.aiObjective}) com Gemini.`);
            const geminiInsight = await getGeminiInsights(result.aiObjective, result.rawData);
            finalResult = { ...result, geminiAnalysis: geminiInsight };
            // Optionally, clean up rawData and aiObjective from finalResult to save database space
            // delete finalResult.rawData;
            // delete finalResult.aiObjective;
        }

        mission.status = status;
        mission.result = finalResult; // Ensure this line uses finalResult
        mission.endTime = new Date();
        await mission.save(); // Save the mission AFTER potentially modifying the result

        if (mission.Agent) {
            await mission.Agent.update({ status: 'IDLE' });
        }

        logger.info(`Missão ${mission.id} atualizada para ${status} pelo Agente ${mission.Agent?.agentId || 'Desconhecido'}.`, { campaignId: mission.MissionTemplate?.campaignId });
        res.status(200).json({ message: 'Missão atualizada com sucesso.' });
        broadcastToUIs({ type: 'mission-result', payload: { missionId: mission.id, status: status, campaignId: mission.MissionTemplate?.campaignId } });
    } catch (error) {
        logger.error(`Erro ao atualizar missão ${req.params.missionId}: ${error.message}`, { stack: error.stack, requestBody: req.body });
        next(error);
    }
});

// Campanhas
apiRouter.get('/campaigns', async (req, res, next) => {
    try {
        const campaigns = await Campaign.findAll({
            include: {
                model: MissionTemplate,
                attributes: ['id', 'objective', 'templateType', 'context', 'requiredCapabilities']
            },
            order: [['createdAt', 'DESC']]
        });
        res.json(campaigns);
    } catch (error) {
        logger.error(`Erro ao listar campanhas: ${error.message}`, { stack: error.stack, userId: req.user.userId });
        next(error);
    }
});

apiRouter.get('/campaigns/:campaignId',
    [param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.')],
    validateRequest,
    async (req, res, next) => {
    try {
        const campaign = await Campaign.findByPk(req.params.campaignId, {
            include: {
                model: MissionTemplate,
                attributes: ['id', 'objective', 'templateType', 'context', 'requiredCapabilities']
            }
        });
        if (campaign) {
            res.json(campaign);
        } else {
            logger.warn(`Campanha não encontrada: ${req.params.campaignId}`, { userId: req.user.userId });
            res.status(404).json({ message: 'Campanha não encontrada.' });
        }
    } catch (error) {
        logger.error(`Erro ao buscar campanha ${req.params.campaignId}: ${error.message}`, { stack: error.stack, userId: req.user.userId });
        next(error);
    }
});


apiRouter.post('/campaigns',
    [
        body('name').isString().notEmpty().trim().withMessage('Nome da campanha é obrigatório.').isLength({ min: 3 }).withMessage('Nome da campanha deve ter pelo menos 3 caracteres.'),
        body('objective').isString().notEmpty().trim().withMessage('Objetivo da campanha é obrigatório.').isLength({ min: 10 }).withMessage('Objetivo da campanha deve ter pelo menos 10 caracteres.')
    ],
    validateRequest,
    async (req, res, next) => {
    try {
        const campaign = await Campaign.create(req.body);
        logger.info(`Nova campanha criada: ${campaign.name} (ID: ${campaign.id})`, { userId: req.user.userId });
        res.status(201).json(campaign);
        broadcastToUIs({ type: 'campaign-update', payload: { campaignId: campaign.id, status: 'created' } });
    } catch (error) {
        logger.error(`Erro ao criar campanha: ${error.message}`, { stack: error.stack, userId: req.user.userId, requestBody: req.body });
        next(error);
    }
});

apiRouter.put('/campaigns/:campaignId/status',
    [
        param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.'),
        body('status').isIn(['ACTIVE', 'PAUSED', 'COMPLETED']).withMessage('Status de campanha inválido.')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const [updatedCount] = await Campaign.update(
                { status: req.body.status },
                { where: { id: req.params.campaignId } }
            );
            if (updatedCount > 0) {
                logger.info(`Status da campanha ${req.params.campaignId} atualizado para ${req.body.status}.`, { userId: req.user.userId });
                res.status(200).json({ message: 'Status da campanha atualizado com sucesso.' });
                broadcastToUIs({ type: 'campaign-update', payload: { campaignId: req.params.campaignId, status: req.body.status } });
            } else {
                logger.warn(`Tentativa de atualizar status de campanha não encontrada: ${req.params.campaignId}`, { userId: req.user.userId });
                res.status(404).json({ message: 'Campanha não encontrada.' });
            }
        } catch (error) {
            logger.error(`Erro ao atualizar status da campanha ${req.params.campaignId}: ${error.message}`, { stack: error.stack, userId: req.user.userId, requestBody: req.body });
            next(error);
        }
    }
);

apiRouter.post('/campaigns/:campaignId/templates',
    [
        param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.'),
        body('objective').isString().notEmpty().withMessage('Objetivo do template é obrigatório.'),
        // MODIFICATION 5: Added 'AI_INSIGHTS' to templateType validation
        body('templateType').isIn(['WEB_SCRAPE', 'API_MONITORING', 'IMAGE_RECOGNITION', 'SENTIMENT_ANALYSIS', 'DATA_PROCESSING', 'AI_INSIGHTS']).withMessage('Tipo de template inválido.'),
        body('context').isObject().optional().withMessage('Contexto deve ser um objeto JSON válido.').custom(value => { // Validação customizada para JSON
            try { JSON.parse(JSON.stringify(value)); return true; } catch (e) { throw new Error('Contexto deve ser um JSON válido.'); }
        }),
        body('requiredCapabilities').isObject().optional().withMessage('Capacidades requeridas devem ser um objeto JSON válido.').custom(value => { // Validação customizada para JSON
            try { JSON.parse(JSON.stringify(value)); return true; } catch (e) { throw new Error('Capacidades requeridas devem ser um JSON válido.'); }
        })
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const campaign = await Campaign.findByPk(req.params.campaignId);
            if (!campaign) {
                logger.warn(`Tentativa de adicionar template a campanha não encontrada: ${req.params.campaignId}`, { userId: req.user.userId });
                return res.status(404).json({ message: 'Campanha não encontrada.' });
            }
            const template = await MissionTemplate.create({
                campaignId: req.params.campaignId,
                objective: req.body.objective,
                context: req.body.context,
                templateType: req.body.templateType,
                requiredCapabilities: req.body.requiredCapabilities
            });
            logger.info(`Novo template de missão '${template.objective}' (Tipo: ${template.templateType}) adicionado à campanha ${campaign.name} (ID: ${template.id}).`, { userId: req.user.userId });
            res.status(201).json(template);
            broadcastToUIs({ type: 'campaign-update', payload: { campaignId: campaign.id, templateId: template.id, status: 'template_added' } });
        } catch (error) {
            logger.error(`Erro ao adicionar template à campanha ${req.params.campaignId}: ${error.message}`, { stack: error.stack, userId: req.user.userId, requestBody: req.body });
            next(error);
        }
    }
);


// Despacho de Missões
apiRouter.post('/dispatch/goal',
    [
        body('targetAgentId').isUUID().withMessage('ID do agente alvo deve ser um UUID válido.'),
        body('objective').isString().notEmpty().withMessage('Objetivo é obrigatório.'),
        body('context').isObject().optional().withMessage('Contexto deve ser um objeto JSON válido.').custom(value => { // Validação customizada para JSON
            try { JSON.parse(JSON.stringify(value)); return true; } catch (e) { throw new Error('Contexto deve ser um JSON válido.'); }
        }),
        body('missionTemplateId').isInt().optional().withMessage('ID do template de missão deve ser um número inteiro.')
    ],
    validateRequest,
    async (req, res, next) => {
    try {
        const { targetAgentId, objective, context, missionTemplateId } = req.body;
        const agent = await Agent.findOne({ where: { agentId: targetAgentId } });

        if (!agent) {
            logger.warn(`Tentativa de despacho de missão para agente não encontrado: ${targetAgentId}`, { userId: req.user.userId });
            return res.status(404).json({ message: 'Agente alvo não encontrado.' });
        }

        let mission;
        let campaignIdForWS = null;
        if (missionTemplateId) {
            const template = await MissionTemplate.findByPk(missionTemplateId);
            if (!template) {
                logger.warn(`Tentativa de despacho com template de missão não encontrado: ${missionTemplateId}`, { userId: req.user.userId });
                return res.status(404).json({ message: 'Modelo de missão não encontrado.' });
            }
            mission = await MissionExecution.create({
                agentRecordId: agent.id,
                missionTemplateIdFk: template.id,
                manual_objective: objective,
                manual_context: context,
                status: 'PENDING'
            });
            campaignIdForWS = template.campaignId;
        } else {
            mission = await MissionExecution.create({
                agentRecordId: agent.id,
                manual_objective: objective,
                manual_context: context,
                status: 'PENDING'
            });
        }
        logger.info(`Missão (ID: ${mission.id}, Objetivo: ${objective}) despachada para Agente ${targetAgentId}.`, { userId: req.user.userId, campaignId: campaignIdForWS });
        res.status(201).json({ message: 'Missão despachada com sucesso.', missionId: mission.id });
        broadcastToUIs({ type: 'mission-dispatched', payload: { missionId: mission.id, agentId: targetAgentId, campaignId: campaignIdForWS } });
    } catch (error) {
        logger.error(`Erro ao despachar missão: ${error.message}`, { stack: error.stack, userId: req.user.userId, requestBody: req.body });
        next(error);
    }
});

// Análises (Endpoints conceituais, retornam dados mockados para demonstração da UI)
apiRouter.get('/analytics/overview', async (req, res, next) => {
    try {
        const totalAgents = await Agent.count();
        const activeCampaigns = await Campaign.count({ where: { status: 'ACTIVE' } });
        const completedMissions = await MissionExecution.count({ where: { status: 'COMPLETED' } });
        const totalMissions = await MissionExecution.count();
        const failedMissions = await MissionExecution.count({ where: { status: 'FAILED' } });
        const errorRate = totalMissions > 0 ? (failedMissions / totalMissions) : 0;

        res.json({
            totalAgents: totalAgents,
            activeCampaigns: activeCampaigns,
            completedMissions: completedMissions,
            errorRate: parseFloat(errorRate.toFixed(4))
        });
    } catch (error) {
        logger.error(`Erro ao buscar overview de analytics: ${error.message}`, { stack: error.stack, userId: req.user.userId });
        next(error);
    }
});

apiRouter.get('/analytics/campaign/:campaignId/sentiment',
    cacheMiddleware(30),
    [param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.')],
    validateRequest,
    async (req, res) => {
    const seriesData = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i)); // Go back 29 days from today
        seriesData.push([date.getTime(), parseFloat((Math.random() * 2 - 1).toFixed(3))]);
    }
    // Simulate real labels based on timestamps for better chart UX
    const labels = seriesData.map(d => new Date(d[0]).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }));

    res.json({ series: [{ name: 'Sentimento', data: seriesData }], labels });
});

// APRIMORADO: Endpoint de tabela com cache e suporte para exportação completa
apiRouter.get('/analytics/campaign/:campaignId/table-results',
    cacheMiddleware(30), // Cache for 30 seconds
    [
        param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.'),
        query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número inteiro positivo.').toInt(),
        query('limit').optional().isInt({ min: 1 }).withMessage('Limite deve ser um número inteiro positivo.').toInt(),
        query('all').optional().isBoolean().withMessage('O parâmetro "all" deve ser um booleano.').toBoolean()
    ],
    validateRequest,
    async (req, res) => {
        const { all, page = 1, limit = 5 } = req.query;
        const totalItems = 28; // Total mock items available

        let itemsToReturn;
        let startIndex = 0;

        if (all) {
            itemsToReturn = Array.from({ length: totalItems }, (_, i) => i); // Indexes for all items
        } else {
            startIndex = (page - 1) * limit;
            const endIndex = Math.min(startIndex + limit, totalItems);
            itemsToReturn = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);
        }

        const generatedData = itemsToReturn.map(globalIndex => ({
            "Produto": `Modelo ${String.fromCharCode(65 + (globalIndex % 26))}-${Math.floor(globalIndex / 26) + 1}`,
            "Preço": `R$ ${(1999 + globalIndex * 150 + Math.random() * 100).toFixed(2)}`,
            "Disponibilidade": Math.random() > 0.2 ? "Em Estoque" : "Esgotado",
            "SKU": `SKU-00${1000 + globalIndex}`
        }));

        res.json({
            total: totalItems,
            page: all ? 1 : parseInt(page),
            data: [{
                agent: `agent-prod-${Math.ceil(Math.random() * 5)}`,
                timestamp: new Date().toISOString(), // Use ISO string for consistency
                result: generatedData
            }]
        });
    }
);

apiRouter.get('/analytics/campaign/:campaignId/image-results',
    cacheMiddleware(60),
    [param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.')],
    validateRequest,
    async (req, res) => {
    const logos = ["Tech Corp", "Innovate Inc.", "Data-Synergy", "QuantumLeap", "Cyber Solutions"];
    const images = Array.from({ length: 8 + Math.floor(Math.random() * 5) }, (_, i) => ({
        sourceUrl: `pixabay-search://image?query=corporate+technology+logo+${logos[i % logos.length].replace(/ /g, '+')}&pick_strategy=random&role=main`,
        result: { logoFound: logos[i % logos.length] }
    }));
    res.json({ images });
});

apiRouter.get('/analytics/campaign/:campaignId/api-monitoring',
    cacheMiddleware(15),
    [param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.')],
    validateRequest,
    async (req, res) => {
    const labels = [];
    const responseTimes = [];
    const statusCodes = [];
    for (let i = 0; i < 15; i++) {
        const time = new Date();
        time.setMinutes(time.getMinutes() - (14 - i) * 5); // Go back 14*5 minutes from now
        labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        const isError = Math.random() > 0.9;
        responseTimes.push(isError ? 1500 + Math.random() * 500 : 80 + Math.random() * 100);
        statusCodes.push(isError ? 503 : 200);
    }
    res.json({ series: [{ name: "Response Time (ms)", data: responseTimes }, { name: "Status Code", data: statusCodes }], labels });
});

// Analytics para Insights de IA
apiRouter.get('/analytics/campaign/:campaignId/ai-insights',
    cacheMiddleware(20), // Cache for 20 seconds
    [param('campaignId').isInt().withMessage('ID da campanha deve ser um número inteiro.')],
    validateRequest,
    async (req, res, next) => {
        try {
            const insights = await MissionExecution.findAll({
                where: {
                    status: 'COMPLETED',
                    // Use associações para filtrar por campaignId e templateType
                    '$MissionTemplate.campaignId$': req.params.campaignId,
                    '$MissionTemplate.templateType$': 'AI_INSIGHTS', // MODIFICATION 7: Corrected templateType filter
                    'result.geminiAnalysis': { [Op.ne]: null } // Apenas resultados com insights gerados
                },
                include: [
                    {
                        model: MissionTemplate,
                        attributes: ['templateType', 'objective'],
                        // where: { templateType: 'AI_INSIGHTS' } // Ensure this filter is also applied if the above is not enough - This is not strictly needed due to the above $...$ filter
                    },
                    { model: Agent, attributes: ['agentId', 'hostname'] }
                ],
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'result', 'createdAt', 'manual_objective'] // Selecionar apenas os atributos necessários
            });

            // MODIFICATION 7: Removed JS-based filtering, rely on Sequelize
            const formattedInsights = insights.map(mission => ({ // Ensure 'insights' is used here
                id: mission.id,
                objective: mission.manual_objective || mission.MissionTemplate.objective,
                geminiAnalysis: mission.result.geminiAnalysis,
                rawData: mission.result.rawData, // Incluído para referência, embora não exibido diretamente
                timestamp: mission.createdAt,
                agentId: mission.Agent.agentId,
                agentHostname: mission.Agent.hostname
            }));

            res.json(formattedInsights);
        } catch (error) {
            logger.error(`Erro ao buscar insights de IA para campanha ${req.params.campaignId}: ${error.message}`, { stack: error.stack, userId: req.user.userId });
            next(error);
        }
    }
);


// --- 9. Inicialização do Servidor (HTTP e WebSocket) ---
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = url.parse(request.url, true);
    if (pathname === '/') {
        if (!query.token) {
            socket.destroy();
            logger.warn(`Upgrade negado: nenhum token WebSocket fornecido do IP ${request.socket.remoteAddress}.`);
            return;
        }
        jwt.verify(query.token, process.env.JWT_SECRET, (err, decoded) => {
            if (err || !decoded.userId) {
                socket.destroy();
                logger.warn(`Upgrade negado: token WebSocket inválido ou expirado do IP ${request.socket.remoteAddress}. Erro: ${err?.message}`);
                return;
            }
            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.tokenData = decoded;
                ws.clientType = query.type || 'unknown';
                wss.emit('connection', ws, request);
            });
        });
    } else {
        socket.destroy();
    }
});

const uiConnections = new Map(); // Store UI WebSocket connections (userId -> ws)

wss.on('connection', (ws, req) => {
    const userId = ws.tokenData.userId;
    logger.info(`Conexão WebSocket estabelecida: Tipo=${ws.clientType}, Usuário=${ws.tokenData.username} (ID: ${userId})`);

    if (ws.clientType === 'ui') {
        uiConnections.set(userId, ws);
    } else {
        // Lidar com outros tipos de clientes (ex: outros servidores, agentes se usassem WS para outras funções)
    }

    ws.on('message', message => {
        logger.info(`Mensagem WebSocket recebida de ${ws.clientType} (User: ${ws.tokenData.username}): ${message}`);
        // Processar mensagens da UI se necessário (ex: comandos em tempo real)
    });

    ws.on('close', () => {
        logger.info(`Conexão WebSocket fechada: Tipo=${ws.clientType}, Usuário=${ws.tokenData.username} (ID: ${userId})`);
        if (ws.clientType === 'ui') {
            uiConnections.delete(userId);
        }
    });

    ws.on('error', error => {
        logger.error(`Erro no WebSocket para ${ws.clientType} (Usuário: ${ws.tokenData.username}): ${error.message}`, { stack: error.stack });
    });
});

// Função para broadcast de mensagens para todas as UIs conectadas via WebSocket
function broadcastToUIs(message) {
    const stringifiedMessage = JSON.stringify(message);
    uiConnections.forEach(ws => {
        if (ws.readyState === ws.OPEN) { // Verifica se a conexão está aberta antes de enviar
            try {
                ws.send(stringifiedMessage);
            } catch (error) {
                logger.error(`Falha ao enviar mensagem WebSocket para UI ${ws.tokenData?.username}: ${error.message}`);
            }
        }
    });
}


// Função para semear dados iniciais no banco de dados (ex: usuário admin, campanhas de demo)
const seedDatabase = async () => {
    try {
        const userCount = await User.count();
        if (userCount === 0) {
            logger.info('[DB Seeder] Nenhum usuário encontrado. Criando usuário "operator" padrão...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            await User.create({ username: 'operator', passwordHash: hashedPassword, role: 'operator' });
            logger.info('[DB Seeder] Usuário "operator" criado com a senha "password123".');
        }

        const campaignCount = await Campaign.count();
        if (campaignCount === 0) {
            logger.info('[DB Seeder] Nenhuma campanha encontrada. Semeando dados de demonstração...');
            const demoCampaign = await Campaign.create({
                name: 'Campanha de Análise Global de Mercado',
                objective: 'Monitorar tendências de mercado, sentimento da marca e atividade de concorrentes em tempo real.',
                status: 'ACTIVE'
            });
            await MissionTemplate.bulkCreate([
                { campaignId: demoCampaign.id, objective: 'Monitoramento de Mídias Sociais - Sentimento', templateType: 'SENTIMENT_ANALYSIS', context: { query: 'AI OR robotics', platforms: ['twitter', 'reddit'] } },
                { campaignId: demoCampaign.id, objective: 'Extração de Preços de Concorrentes', templateType: 'WEB_SCRAPE', context: { targetUrl: 'https://competitor.com/products', selectors: { product: '.item', price: '.price' } }, requiredCapabilities: { has_screen_access: true } },
                { campaignId: demoCampaign.id, objective: 'Reconhecimento de Logos em Eventos', templateType: 'IMAGE_RECOGNITION', context: { imageUrls: ['url1', 'url2'], targets: ['Acme Corp', 'Globex'] }, requiredCapabilities: { gpu: true } },
                { campaignId: demoCampaign.id, objective: 'Monitoramento de Latência da API Externa', templateType: 'API_MONITORING', context: { apiEndpoint: 'https://api.external.com/status', method: 'GET', interval: 300 } },
                // MODIFICATION 6: Added AI_INSIGHTS template to seed data
                {
                    campaignId: demoCampaign.id,
                    objective: 'Análise de Relatórios Financeiros com IA (Semente)',
                    templateType: 'AI_INSIGHTS',
                    context: { dataType: 'financial_report', summaryType: 'key_takeaways_seed_data' },
                    requiredCapabilities: {}
                }
            ]);
            logger.info('[DB Seeder] Campanha e templates de demonstração (incluindo Gemini) criados.');
        }
    } catch (error) {
        logger.error(`[DB Seeder] Erro ao semear o banco de dados: ${error.message}`, { stack: error.stack });
        throw error; // Re-throw para garantir que o servidor não inicie em um estado inconsistente
    }
};

const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info('[DB] Conexão PostgreSQL estabelecida com sucesso.');
        await sequelize.sync({ alter: true }); // `alter: true` para aplicar migrações leves, `force: true` para recriar tudo (NÃO USAR EM PROD!)
        logger.info('[DB] Modelos (v2.3) sincronizados com o banco de dados.');

        await seedDatabase();

        app.use('/api/auth', authRouter);
        app.use('/api', apiRouter);

        // Middleware de tratamento de erros global. Deve ser o último middleware.
        app.use((err, req, res, next) => {
            logger.error(`[GLOBAL_ERROR_HANDLER] Erro inesperado: ${err.message}`, {
                stack: err.stack,
                path: req.path,
                method: req.method,
                userId: req.user ? req.user.userId : 'N/A',
                errorName: err.name,
                errorMessage: err.message,
                errorCode: err.status || res.statusCode // Tenta pegar status se já definido, senão erro padrão
            });
            // Para produção, evite expor detalhes de erro sensíveis ao cliente
            const statusCode = err.status || 500;
            const message = err.message || 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';

            res.status(statusCode).json({
                error: 'Erro interno do servidor.',
                message: process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.' : message // Mensagem genérica em prod
            });
        });

        server.listen(PORT, () => {
            logger.info(`===========================================================
`);
            logger.info(`  Hive Command Server ONLINE (Protocolo Quimera v2.3)
`);
            logger.info(`  Servidor HTTP e WebSocket ouvindo na porta: ${PORT}
`);
            logger.info(`  CÓRTEX PREDITIVO APRIMORADO, CACHE DE CONSULTAS ATIVO.
`);
            logger.info(`  Acesse o frontend em http://localhost:8080 ou configure seu proxy.
`);
            logger.info(`===========================================================
`);
        });
    } catch (error) {
        logger.error(`[FATAL] Não foi possível iniciar o servidor: ${error.message}`, { stack: error.stack });
        process.exit(1); // Encerra o processo em caso de falha crítica na inicialização
    }
};

startServer();
```
