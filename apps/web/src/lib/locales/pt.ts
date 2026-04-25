import type { Dict } from './schema';

export const pt: Dict = {
  meta: {
    title: 'BottomUP — Marketplace de copy trading social com IA',
    description:
      'BottomUP é a App Store do dinheiro inteligente: gestão de carteira com IA, copy trading automático e bots de trading cripto — auditados pelo Foxy AI.',
    keywords:
      'social trading, copy trading, copy trading automático, gestão de carteira com IA, bots de trading cripto, agentes de trading IA, firewall de risco IA, BottomUP, Foxy AI, OKX copy trading',
    og_image_alt: 'BottomUP — Marketplace de copy trading protegido por IA',
  },
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Marketplace',
    mcp: 'MCP Suite',
    traders: 'Traders',
    pricing: 'Preços',
    signin: 'Entrar',
    signup: 'Começar grátis',
  },
  hero: {
    headline_1: 'A App Store do',
    headline_2: 'Smart Money.',
    subtitle:
      'Gestão automatizada de carteiras que permite a qualquer pessoa copiar traders de elite e agentes de IA via um marketplace descentralizado.',
    cta_primary: 'Começar grátis →',
    cta_secondary: 'Como a Foxy te protege',
    kpi_volume: 'Volume negociado',
    kpi_downloads: 'Downloads',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'Acumulado',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'Excelente',
  },
  partners: {
    exchanges: 'Exchanges e parceiros do ecossistema',
    backed_by: 'Apoiado por',
  },
  intro: {
    label: 'Assista ao intro',
    headline_1: '60 segundos sobre',
    headline_2: 'como a BottomUP funciona.',
  },
  mobile: {
    label: 'No seu bolso',
    headline_1: 'Sinais, simulações e',
    headline_2: 'copy trading ao vivo',
    headline_3: '— tudo no app.',
    body: 'Siga os traders que você escolheu, veja o veredito da Foxy em cada setup e receba notificação assim que algo novo aparece no marketplace. Sem trocar de abas, sem perder oportunidades.',
    bullet_push: 'Push em tempo real em cada novo setup',
    bullet_score: 'Score de risco da Foxy AI em cada card',
    bullet_copy: 'Copy trade com um toque via OKX conectado',
    bullet_sim: 'Simulador de carteira com $10.000 virtuais',
  },
  ps: {
    label: 'A tese',
    headline_1: 'O trading retail está quebrado.',
    headline_2: 'Reconstruímos ele.',
    subtitle:
      'Gestão automatizada de carteiras que permite a qualquer pessoa copiar traders de elite e agentes de IA num marketplace descentralizado — auditado ponta a ponta pelo nosso firewall de risco.',
    before: 'Antes da BottomUP',
    with: 'Com a BottomUP',
    rows: [
      {
        problem_title: 'Você copia trades ruins',
        problem_body:
          'Seu trader faz revenge trade com 50x — e você junto. Sem filtro, sem segunda opinião, sem freio.',
        solution_title: 'Um Chief of Risk com IA',
        solution_body:
          'A Foxy AI audita cada sinal em 225 fontes de dados e bloqueia os que não passam — mesmo que seu trader tenha enviado.',
      },
      {
        problem_title: 'Seu alpha está espalhado',
        problem_body:
          'Os melhores traders no Telegram. Bots no Discord. Sinais em três exchanges. Mais tempo trocando de aba do que executando.',
        solution_title: 'Um app, todas as estratégias',
        solution_body:
          'Traders humanos, bots algorítmicos e agentes IA — todos num marketplace. Assine com Credits, ordens rodam 24/7 na sua wallet.',
      },
      {
        problem_title: 'Mercados em silos, você em silos',
        problem_body:
          'Cripto num app, ações noutro, forex em outro. Impossível montar tese cross-asset sem cinco logins.',
        solution_title: 'Multi-ativo num único terminal',
        solution_body:
          'Cripto hoje. Ações, forex e commodities chegam em Q1 2027 nos mesmos trilhos — uma conta, uma visão de portfólio.',
      },
    ],
  },
  foxy: {
    label: 'Foxy AI · Firewall de Risco',
    headline_1: 'Cada trade',
    headline_2: 'auditado',
    headline_3: 'antes de chegar à sua wallet.',
    subtitle:
      'A Foxy é uma IA proprietária treinada em 225 fontes de dados. Quando um trader, bot ou agente publica um sinal, a Foxy pontua de 0 a 100 contra técnicas, fundamentos, notícias, profundidade do order book e o padrão de risco do creator. Se o score é vermelho, o trade é bloqueado — mesmo que você esteja assinando.',
    pillars: [
      { title: 'Auditar', body: 'Cada sinal que entra é interceptado e pontuado em 225 fontes antes da execução.' },
      { title: 'Bloquear', body: 'Trades que ultrapassam seu envelope de risco param no firewall — não depois da perda.' },
      { title: 'Otimizar', body: 'Ordens de entrada/saída são ajustadas para reduzir slippage e aumentar o P&L líquido.' },
      { title: 'Simular', body: 'Monte uma carteira, simule o desempenho do time a preços ao vivo antes de arriscar capital real.' },
    ],
    signal_flow: 'Fluxo do sinal',
    trader_node: 'Trader / Bot / Agente IA',
    trader_node_sub: 'publica um sinal',
    foxy_node: 'Firewall Foxy AI',
    foxy_node_sub: 'pontua risco 0–100 · 225 fontes',
    decision_bad: 'Risco > limite',
    decision_bad_body: 'Bloqueado ✕',
    decision_ok: 'Risco OK',
    decision_ok_body: 'Otimizado ✓',
    wallet_node: 'Sua wallet',
    wallet_node_sub: 'execução apenas se a Foxy aprovar',
    stat: '✓ A Foxy bloqueou 1.247 sinais de risco nos últimos 30 dias no marketplace.',
  },
  mkt: {
    label: 'O marketplace',
    headline_1: 'Três tipos de estratégia.',
    headline_2: 'Um marketplace.',
    subtitle:
      'Creators abrem lojas. Usuários assinam com BottomUP Credits. Estratégias executam 24/7 na sua wallet conectada — cada ordem passa pela Foxy primeiro.',
    golive: 'Lançamento marketplace · Maio 2026',
    shops: [
      {
        kind: 'Traders humanos',
        tagline: 'Siga analistas que põem o nome em cada call.',
        bullets: [
          'Curva de P&L verificada, win rate e perfil de risco',
          'Setups publicados ao vivo com entrada / stop / TP',
          'Creator recebe 25% da assinatura + volume',
        ],
      },
      {
        kind: 'Bots algorítmicos',
        tagline: 'Estratégias aprovadas e backtestadas rodando 24/7.',
        bullets: [
          'Fonte da estratégia transparente, não black-box',
          'Assine uma vez, executa enquanto você dorme',
          'Foxy corta bots fora do padrão no momento que desviam',
        ],
      },
      {
        kind: 'Agentes IA',
        tagline: 'Agentes autônomos com mandatos especializados.',
        bullets: [
          'Alpha scout, rebalanceador, hedger, caçador de airdrops',
          'Novos tipos de agente a cada 2 meses',
          'Apoiados pela MCP Suite',
        ],
      },
    ],
    credits_label: 'BottomUP Credits · como a micro-economia funciona',
    steps: [
      { title: 'Compre Credits', body: 'Cartão ou cripto. Credits são a moeda universal em toda loja.' },
      { title: 'Assine lojas', body: 'Escolha traders, bots ou agentes em quem confia. Cancele quando quiser.' },
      { title: 'Foxy audita sinais', body: 'Cada ordem recebe score de 0 a 100 antes de sair do firewall.' },
      { title: 'Wallet executa', body: 'Ordens aprovadas vão direto para sua wallet conectada, 24/7.' },
    ],
  },
  lb: {
    label: 'Ranking ao vivo',
    headline_1: '$10.000 no dia 1.',
    headline_2: 'Onde eles estão agora?',
    subtitle:
      'Cada trader começa o mês com $10.000 virtuais. Toque num card para o dashboard completo — curva de equity, distribuição de R, P&L mensal, breakdown por moeda.',
    disclaimer:
      'Resultados simulados. Desempenho hipotético tem limitações inerentes. Desempenho passado não indica resultados futuros.',
    cta: 'Explorar marketplace →',
    empty: 'Sem trades fechados este mês — volte em breve.',
    balance_label: 'Saldo virtual',
    from_label: 'partindo de $10.000 neste mês',
    trades: 'Trades',
    wins: 'Ganhos',
    win_rate: 'Win rate',
    live: 'Ao vivo',
    drawdown: 'Drawdown',
    view_full: 'Ver analítica completa →',
    followers: 'seguidores',
  },
  mcp: {
    label: 'MCP Suite',
    headline_1: 'Nove',
    headline_2: 'Modular Crypto Processors, trabalhando juntos.',
    subtitle:
      'Cada MCP é um agente IA especializado que transforma caos de informação em insight acionável. Rodam contínuo junto à Foxy — seus trades chegam pré-auditados, pré-cronometrados e alinhados à sua estratégia.',
    cards: [
      { title: 'Mitigação de risco', body: 'Sinaliza revenge trading, alavancagem excessiva e tamanhos inseguros em cada trader que você segue — em tempo real.' },
      { title: 'Timing de trade', body: 'Observa profundidade do order book, eventos macro (FOMC, CPI, ETF) e slippage histórico para recomendar a melhor janela de entrada e saída.' },
      { title: 'Matchmaking', body: 'Perfila seu apetite de risco e te combina com estilos compatíveis — scalper, momentum ou swing.' },
      { title: 'Research de token', body: 'Examina saúde do contrato, atividade de devs, movimentação de baleias e picos sociais. Gera hipóteses, não ruído.' },
      { title: 'Scout de launch & airdrop', body: 'Monitora novos deployments, testnet e buzz do Telegram. Avisa do alpha cedo e identifica wallets elegíveis.' },
      { title: 'Rebalanceamento', body: 'Detecta sobreexposição e risco de correlação setorial conforme o mercado se mexe. Sugere hedge ou rotação antes do drawdown.' },
      { title: 'Scan regulatório', body: 'Feeds de notícia, updates de política de exchange e sinais legais regionais. Alerta risco de compliance antes que doa.' },
      { title: 'Divergência de sentimento', body: 'Pega alpha escondido quando on-chain é bullish mas Twitter/Reddit é bearish. Ideal para se posicionar antes da multidão.' },
      { title: 'Watchdog de manipulação', body: 'Rastreia atividade de wallets de influencers, timing de promoções e amplificação. Sinaliza pumps coordenados e hype viral pago.' },
    ],
  },
  pulse: {
    label: 'Contexto de mercado ao vivo',
    headline_1: 'Os mesmos dados que a',
    headline_2: 'Foxy',
    headline_3: 'usa.',
    subtitle:
      'CoinGlass, CoinGecko e futuros da Binance alimentam o firewall Foxy em tempo real. Você vê exatamente a mesma superfície: Fear & Greed, dominância BTC, funding cross-exchange, viés long/short, liquidações 24h e variação de open interest.',
    auto: 'Auto-refresh · cache 5 min',
    fg: 'Fear & Greed Index',
    dom: 'Dominância BTC',
    funding: 'Top funding (abs)',
    liq_24h: 'Liquidações 24h',
    ls: 'Razão Long / Short',
    ls_sub: 'Binance · 1h',
    oi: 'Open interest (24h)',
    no_data: 'Sem dados',
    liq_table: 'Liquidações por moeda · últimas 24h',
    table_coin: 'Moeda',
    table_long: 'Long',
    table_short: 'Short',
    table_total: 'Total',
    table_split: 'Long/Short',
  },
  news: {
    label: 'News feed',
    headline_1: 'Notícias cripto, com',
    headline_2: 'sentimento.',
    subtitle:
      'Cada notícia classificada positiva/negativa e ligada às moedas que movimenta. Abra aqui mesmo — sem nova aba, sem troca de contexto.',
    no_summary: 'Sem resumo adicional disponível.',
  },
  pr: {
    label: 'Preços',
    headline_1: 'Um trade ruim bloqueado',
    headline_2: 'paga o ano.',
    subtitle:
      'Assinaturas abrem o marketplace, o firewall Foxy e a MCP Suite inteira. Lojas individuais são pagas com BottomUP Credits — creators recebem 25% da receita que geram.',
    most_popular: 'Mais popular',
    billed_monthly: 'Cobrado mensalmente, renova',
    billed_upfront: '{total} adiantado',
    save_13: 'Economize 13%',
    save_20: 'Economize 20%',
    free_label: 'Grátis para sempre',
    plans: [
      {
        name: 'Grátis',
        features: [
          '5 auditorias de risco Foxy AI por dia',
          'Veja 20% dos setups publicados pelos traders',
          'Dashboard de mercado ao vivo (Fear & Greed, BTC dominance, funding)',
          'Feed de notícias cripto com sentimento',
          'Chat da comunidade',
        ],
      },
      {
        name: 'Mensal',
        features: [
          'Auditorias de risco Foxy AI ilimitadas',
          'Visibilidade de 100% dos sinais dos traders',
          'Marketplace completo — traders humanos, bots, agentes IA',
          'MCP Suite — todos os 9 agentes IA',
          'Copy trading OKX — execução com um clique',
          'Simulador de portfólio com $10.000 virtuais',
          'Notificações web + push',
        ],
      },
      {
        name: '3 Meses',
        features: [
          'Tudo do Mensal',
          '13% mais barato por mês vs Mensal',
          'Relatório trimestral de performance',
          'Suporte prioritário',
        ],
      },
      {
        name: '6 Meses',
        features: [
          'Tudo do 3 Meses',
          '20% mais barato por mês vs Mensal',
          'Recompensas $BUP por volume operado',
          'Acesso antecipado aos mercados TradFi (Q1 2027)',
          'Consultoria de estratégia 1:1',
          'Badge da comunidade founders',
        ],
      },
    ],
    footer:
      'Todos os planos são cobrados em USD e renovam ao final do período salvo cancelamento. Cancele pela sua conta ou pela app store. Períodos parciais não são proporcionais. Não é substituto para consultoria de investimento — veja a Declaração de Risco. Copy-trading não disponível para residentes dos EUA.',
  },
  faq: {
    label: 'Perguntas frequentes',
    headline_1: 'Tudo que investidores e',
    headline_2: 'traders',
    headline_3: 'perguntam.',
    items: [
      {
        q: 'BottomUP é recomendação de investimento?',
        a: 'Não. BottomUP não é um consultor de investimento registrado, broker-dealer ou money services business. Todo conteúdo — sinais, veredictos Foxy AI, outputs MCP, balanços do leaderboard — é apenas informativo e educacional. Desempenho passado (real ou simulado) não indica resultados futuros. Cada decisão e cada perda é sua. Veja a Declaração de Risco para o quadro completo.',
      },
      {
        q: 'O copy trading está disponível para residentes dos EUA?',
        a: 'Hoje não. A OKX não atende contas retail nos EUA, então a BottomUP não pode rotear ordens de copy trade ao vivo para residentes. Funções sociais, de analítica e simulação seguem abertas. Quando lançarmos uma integração compatível com EUA, anunciamos.',
      },
      {
        q: 'BottomUP, em uma frase?',
        a: 'A App Store do smart money — um marketplace onde você assina traders humanos, bots algorítmicos e agentes IA, com cada sinal auditado pelo nosso firewall proprietário antes de chegar à sua wallet.',
      },
      {
        q: 'Qual a diferença da Foxy AI pro copy trading tradicional?',
        a: 'Copy trading tradicional só replica o que o trader (ou bot) envia. Se ele faz revenge trade 50x, você também. A Foxy intercepta cada sinal, pontua 0–100 em 225 fontes e bloqueia no firewall se o risco é alto — mesmo assinando. Auditoria, não espelho.',
      },
      {
        q: 'O que são os MCPs?',
        a: 'Modular Crypto Processors — nove agentes IA especializados rodando junto à Foxy: mitigação de risco, timing, matchmaking, research, scout de airdrops, rebalanceamento, scan regulatório, divergência de sentimento e watchdog de manipulação. Cada um vira um fluxo de ruído em sinal útil.',
      },
      {
        q: 'O que posso assinar no marketplace?',
        a: 'Três tipos de loja: traders humanos com setups ao vivo, bots algorítmicos aprovados e agentes IA autônomos (scout, rebalanceador, hedger). Credits te assinam em todos.',
      },
      {
        q: 'Como funciona o copy trading na OKX?',
        a: 'Conecte sua API OKX (Read + Trade, nunca Withdraw). Quando um creator que você assina publica um sinal, a Foxy audita, otimiza entrada/saída e nosso worker coloca a mesma ordem na sua conta. Controle total seu — revogue o API na OKX ou desconecte da BottomUP a qualquer momento.',
      },
      {
        q: 'O que são os BottomUP Credits?',
        a: 'A moeda universal do marketplace. Compra com cartão ou cripto, usa em qualquer loja. Creators recebem 25% da receita que geram + 10% de referência. A plataforma pega 30%; o resto financia infra e rebates.',
      },
      {
        q: 'O token $BUP está ativo?',
        a: 'Ainda não. $BUP lança junto ao marketplace em 2026 com trade-to-earn — utilidade em compras, back-testing, Foxy completo e recompensas por volume. Mais no pitch deck e whitepaper.',
      },
      {
        q: 'Como começo hoje?',
        a: 'Cadastre-se grátis em bupcore.ai — email, Google, Apple ou telefone. Sua conta sincroniza com iOS e Android na hora. Explore lojas, teste o modo simulação da Foxy, e quando quiser ir live conecta a OKX.',
      },
    ],
  },
  final: {
    headline_1: 'Copie o smart money.',
    headline_2: 'Deixe a Foxy filtrar o resto.',
    sub: 'Traders, bots e agentes IA estão operando agora no marketplace. Cada sinal auditado. Cada trade otimizado. Cadastre-se em 30 segundos.',
    cta_primary: 'Começar grátis →',
    cta_secondary: 'Entrar',
    disclaimer:
      'Não é recomendação de investimento. Operar cripto envolve alto risco de perda. Copy-trading não disponível para residentes dos EUA.',
  },
  ft: {
    tagline:
      'A App Store do smart money. Traders de elite, agentes IA e bots algorítmicos — um marketplace, protegido pela Foxy AI.',
    product: 'Produto',
    account: 'Conta',
    legal: 'Legal',
    nav_foxy: 'Foxy AI',
    nav_marketplace: 'Marketplace',
    nav_mcp: 'MCP Suite',
    nav_pricing: 'Preços',
    signup: 'Começar grátis',
    signin: 'Entrar',
    faq: 'FAQ',
    terms: 'Termos de serviço',
    privacy: 'Privacidade',
    risk: 'Declaração de risco',
    disclosure:
      'BottomUP, Inc. é uma corporação de Delaware. BottomUP não é um consultor de investimento registrado, broker-dealer, commodity pool operator, commodity trading advisor ou money services business. Todo conteúdo do Serviço — sinais, veredictos Foxy AI e estratégias de creators — é fornecido apenas para fins informativos e educacionais e não constitui aconselhamento individualizado de investimento, jurídico ou tributário. Desempenho passado, simulado e hipotético (incluindo números do "portfólio virtual de $10.000") não indica resultados futuros. Negociar cripto-ativos, em particular com alavancagem ou derivativos, envolve alto risco de perda total. A funcionalidade de copy-trading não está disponível para residentes dos EUA. Residentes em regiões sancionadas pela OFAC são inelegíveis.',
    copy: '© {year} BottomUP, Inc. · Todos os direitos reservados.',
    address: '1209 Orange St, Wilmington, DE 19801, EUA',
  },
};
