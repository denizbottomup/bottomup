import type { Dict } from './schema';

export const es: Dict = {
  meta: {
    title: 'BottomUP — Marketplace de copy trading social con IA',
    description:
      'BottomUP es el App Store del dinero inteligente: gestión de carteras con IA, copy trading automático y bots cripto — auditados por Foxy AI.',
    keywords:
      'social trading, copy trading, copy trading automático, gestión de cartera con IA, bots de trading cripto, agentes de trading IA, firewall de riesgo IA, BottomUP, Foxy AI, OKX copy trading',
    og_image_alt: 'BottomUP — Marketplace de copy trading protegido por IA',
  },
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Marketplace',
    mcp: 'MCP Suite',
    traders: 'Traders',
    pricing: 'Precios',
    signin: 'Entrar',
    signup: 'Empezar gratis',
  },
  hero: {
    headline_1: 'La App Store del',
    headline_2: 'Smart Money.',
    subtitle:
      'Gestión automatizada de carteras que permite a cualquiera replicar a traders de élite y agentes de IA a través de un marketplace descentralizado.',
    cta_primary: 'Empezar gratis →',
    cta_secondary: 'Cómo Foxy te protege',
    kpi_volume: 'Volumen operado',
    kpi_downloads: 'Descargas',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'Acumulado',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'Excelente',
  },
  partners: {
    exchanges: 'Exchanges y partners del ecosistema',
    backed_by: 'Respaldado por',
  },
  intro: {
    label: 'Ver el intro',
    headline_1: '60 segundos sobre',
    headline_2: 'cómo funciona BottomUP.',
  },
  mobile: {
    label: 'En tu bolsillo',
    headline_1: 'Señales, simulaciones y',
    headline_2: 'copy trading en vivo',
    headline_3: '— todo en la app.',
    body: 'Sigue a los traders que elegiste, ve el veredicto de Foxy junto a cada setup y recibe una notificación en el momento que aparece algo nuevo en el marketplace. Sin saltar entre pestañas, sin perder oportunidades.',
    bullet_push: 'Push en tiempo real en cada nuevo setup',
    bullet_score: 'Puntaje de riesgo Foxy AI en cada tarjeta',
    bullet_copy: 'Copy trade de un toque en OKX conectado',
    bullet_sim: 'Simulador con cartera virtual de $10.000',
  },
  ps: {
    label: 'La tesis',
    headline_1: 'El trading retail está roto.',
    headline_2: 'Lo reconstruimos.',
    subtitle:
      'Gestión automatizada de carteras que permite a cualquiera replicar a traders de élite y agentes de IA en un marketplace descentralizado — auditado de punta a punta por nuestro firewall de riesgo.',
    before: 'Antes de BottomUP',
    with: 'Con BottomUP',
    rows: [
      {
        problem_title: 'Copias trades malos',
        problem_body:
          'Tu trader abre un revenge trade con 50x de apalancamiento — y tú también. Sin filtro, sin segunda opinión, sin freno.',
        solution_title: 'Un Chief of Risk con IA',
        solution_body:
          'Foxy AI audita cada señal con 225 fuentes de datos y bloquea las que no pasan — aunque tu trader las haya enviado.',
      },
      {
        problem_title: 'Tu alpha está disperso',
        problem_body:
          'Los mejores traders en Telegram. Los bots en Discord. Señales en tres exchanges. Pasas más tiempo cambiando de pestaña que operando.',
        solution_title: 'Una app, todas las estrategias',
        solution_body:
          'Traders humanos, bots y agentes de IA, todos en un marketplace. Te suscribes con Credits, las órdenes corren 24/7 en tu wallet.',
      },
      {
        problem_title: 'Mercados en silos, tú en silos',
        problem_body:
          'Crypto en una app, acciones en otra, forex en otra. No puedes armar una tesis cruzada sin cinco logins.',
        solution_title: 'Multi-activo desde una terminal',
        solution_body:
          'Crypto hoy. Acciones, forex y commodities llegan en Q1 2027 sobre las mismas rieles — una cuenta, una vista de cartera.',
      },
    ],
  },
  foxy: {
    label: 'Foxy AI · Firewall de Riesgo',
    headline_1: 'Cada operación',
    headline_2: 'auditada',
    headline_3: 'antes de llegar a tu wallet.',
    subtitle:
      'Foxy es una IA propietaria entrenada con 225 fuentes de datos. Cuando un trader, bot o agente publica una señal, Foxy la puntúa de 0 a 100 con técnicas, fundamentales, noticias, profundidad del order book y el patrón de riesgo del creador. Si el puntaje es rojo, la operación se bloquea — aunque estés suscrito.',
    pillars: [
      { title: 'Auditar', body: 'Cada señal entrante es interceptada y puntuada en 225 fuentes antes de ejecutarse.' },
      { title: 'Bloquear', body: 'Las operaciones que cruzan tu sobre de riesgo se detienen en el firewall — no después de la pérdida.' },
      { title: 'Optimizar', body: 'Las órdenes de entrada/salida se afinan para reducir slippage y aumentar el P&L neto.' },
      { title: 'Simular', body: 'Construye una cartera, simula el rendimiento de tu equipo a precios en vivo antes de arriesgar capital real.' },
    ],
    signal_flow: 'Flujo de señal',
    trader_node: 'Trader / Bot / Agente IA',
    trader_node_sub: 'publica una señal',
    foxy_node: 'Firewall Foxy AI',
    foxy_node_sub: 'puntúa riesgo 0–100 · 225 fuentes',
    decision_bad: 'Riesgo > umbral',
    decision_bad_body: 'Bloqueado ✕',
    decision_ok: 'Riesgo OK',
    decision_ok_body: 'Optimizado ✓',
    wallet_node: 'Tu wallet',
    wallet_node_sub: 'ejecución sólo si Foxy aprueba',
    stat: '✓ Foxy bloqueó 1.247 señales riesgosas en los últimos 30 días en todo el marketplace.',
  },
  mkt: {
    label: 'El marketplace',
    headline_1: 'Tres tipos de estrategia.',
    headline_2: 'Un marketplace.',
    subtitle:
      'Los creadores abren tiendas. Los usuarios se suscriben con BottomUP Credits. Las estrategias se ejecutan 24/7 directamente en tu wallet conectado — cada orden pasa primero por Foxy.',
    golive: 'Lanzamiento marketplace · Mayo 2026',
    shops: [
      {
        kind: 'Traders humanos',
        tagline: 'Sigue a los analistas que ponen su nombre en cada llamada.',
        bullets: [
          'Curva de P&L verificada, win rate y perfil de riesgo',
          'Setups publicados en vivo con entrada / stop / TP',
          'El creador gana 25% de la suscripción + volumen',
        ],
      },
      {
        kind: 'Bots algorítmicos',
        tagline: 'Estrategias aprobadas y backtesteadas corriendo 24/7.',
        bullets: [
          'Fuente de la estrategia transparente, no caja negra',
          'Suscribete una vez, ejecuta mientras duermes',
          'Foxy corta a los bots que se desvían al instante',
        ],
      },
      {
        kind: 'Agentes IA',
        tagline: 'Agentes autónomos con mandatos especializados.',
        bullets: [
          'Alpha scout, rebalanceador, hedger, cazador de airdrops',
          'Nuevos tipos de agente cada 2 meses',
          'Respaldados por la MCP Suite',
        ],
      },
    ],
    credits_label: 'BottomUP Credits · cómo funciona la micro-economía',
    steps: [
      { title: 'Compra Credits', body: 'Tarjeta o cripto. Los Credits son la moneda universal en cada tienda.' },
      { title: 'Suscríbete a tiendas', body: 'Elige los traders, bots o agentes en los que confías. Cancela cuando quieras.' },
      { title: 'Foxy audita señales', body: 'Cada orden se puntúa de 0 a 100 antes de salir del firewall.' },
      { title: 'Wallet ejecuta', body: 'Las órdenes aprobadas van directo a tu wallet conectado, 24/7.' },
    ],
  },
  lb: {
    label: 'Ranking en vivo',
    headline_1: '$10.000 el día uno.',
    headline_2: '¿Dónde están ahora?',
    subtitle:
      'Cada trader comienza el mes con $10.000 virtuales. Toca una tarjeta para el dashboard completo — curva de equity, distribución de R, P&L mensual, desglose por moneda.',
    disclaimer:
      'Resultados simulados. El desempeño hipotético tiene limitaciones inherentes. El desempeño pasado no indica resultados futuros.',
    cta: 'Explorar el marketplace →',
    empty: 'No hay trades cerrados este mes — vuelve pronto.',
    balance_label: 'Balance virtual',
    from_label: 'desde $10.000 este mes',
    trades: 'Trades',
    wins: 'Ganados',
    win_rate: 'Win rate',
    live: 'En vivo',
    drawdown: 'Drawdown',
    view_full: 'Ver analítica completa →',
    followers: 'seguidores',
  },
  mcp: {
    label: 'MCP Suite',
    headline_1: 'Nueve',
    headline_2: 'Modular Crypto Processors, trabajando juntos.',
    subtitle:
      'Cada MCP es un agente IA especializado que convierte el caos de información en insight accionable. Corren en paralelo con Foxy — tus operaciones llegan pre-auditadas, pre-temporizadas y pre-alineadas con tu estrategia.',
    cards: [
      { title: 'Mitigación de riesgo', body: 'Marca revenge trading, apalancamiento excesivo y tamaños de posición inseguros en cada trader que sigues, en tiempo real.' },
      { title: 'Timing de operación', body: 'Observa profundidad del order book, eventos macro (FOMC, CPI, ETFs) y slippage histórico para recomendar la mejor ventana de entrada y salida.' },
      { title: 'Matchmaking', body: 'Perfila tu apetito de riesgo y te empareja con estilos compatibles — scalper, momentum o swing de largo plazo.' },
      { title: 'Research de tokens', body: 'Examina la salud del contrato, actividad de devs, comportamiento de ballenas y picos sociales. Genera hipótesis, no ruido.' },
      { title: 'Scout de launch & airdrops', body: 'Monitorea nuevos deployments, actividad de testnet y buzz de Telegram. Te avisa del alpha temprano e identifica wallets elegibles para airdrops.' },
      { title: 'Rebalanceo de cartera', body: 'Detecta sobreexposición y riesgo de correlación sectorial según el mercado se mueve. Sugiere hedges o rotación antes del drawdown.' },
      { title: 'Escaneo regulatorio', body: 'Ingesta feeds de noticias, cambios de políticas de exchange y señales legales regionales. Alerta sobre riesgo de compliance — delistings, sanciones — antes de que duela.' },
      { title: 'Divergencia de sentiment', body: 'Captura alpha oculto cuando on-chain es bullish pero Twitter/Reddit es bearish. Ideal para posicionarte antes que la multitud.' },
      { title: 'Watchdog de manipulación', body: 'Rastrea actividad de wallets de influencers, timing de promos y patrones de amplificación. Marca pumps coordinados y hype viral pago.' },
    ],
  },
  pulse: {
    label: 'Contexto de mercado en vivo',
    headline_1: 'Los mismos datos que usa',
    headline_2: 'Foxy.',
    headline_3: '',
    subtitle:
      'CoinGlass, CoinGecko y los futuros de Binance alimentan el firewall Foxy en tiempo real. Ves exactamente la misma superficie: Fear & Greed, dominancia BTC, funding cross-exchange, sesgo long/short, liquidaciones 24h y cambio en open interest.',
    auto: 'Auto-refresh · caché 5 min',
    fg: 'Índice Fear & Greed',
    dom: 'Dominancia BTC',
    funding: 'Top funding (abs)',
    liq_24h: 'Liquidaciones 24h',
    ls: 'Ratio Long / Short',
    ls_sub: 'Binance · 1h',
    oi: 'Open interest (24h)',
    no_data: 'Sin datos',
    liq_table: 'Liquidaciones por moneda · últimas 24h',
    table_coin: 'Moneda',
    table_long: 'Long',
    table_short: 'Short',
    table_total: 'Total',
    table_split: 'Long/Short',
  },
  news: {
    label: 'News feed',
    headline_1: 'Noticias cripto, etiquetadas por',
    headline_2: 'sentimiento.',
    subtitle:
      'Cada noticia etiquetada positiva/negativa y ligada a las monedas que mueve. Ábrelas aquí mismo — sin nueva pestaña, sin cambio de contexto.',
    no_summary: 'No hay resumen adicional disponible.',
  },
  pr: {
    label: 'Precios',
    headline_1: 'Un mal trade bloqueado',
    headline_2: 'paga el año.',
    subtitle:
      'Las suscripciones abren el marketplace, el firewall Foxy y toda la MCP Suite. Las tiendas individuales se pagan con BottomUP Credits — los creadores se llevan 25% de lo que generan.',
    most_popular: 'Más popular',
    billed_monthly: 'Facturación mensual, renueva',
    billed_upfront: '{total} por adelantado',
    save_13: 'Ahorra 13%',
    save_20: 'Ahorra 20%',
    plans: [
      {
        name: 'Mensual',
        cta: 'Empezar mensual',
        features: [
          'Acceso completo al marketplace — traders, bots, agentes IA',
          'Firewall Foxy AI en cada señal',
          'Dashboard de mercado en vivo (CoinGlass + Binance)',
          'Simulación de cartera a precios en vivo',
          'Chat comunitario · 7 canales',
          'Notificaciones web + push',
        ],
      },
      {
        name: '3 Meses',
        cta: 'Empezar trimestral',
        features: [
          'Todo lo del Mensual',
          'Copy trading OKX — ejecución en un clic',
          'MCP Suite — los 9 agentes IA',
          'Reporte trimestral de performance',
          'Soporte prioritario',
        ],
      },
      {
        name: '6 Meses',
        cta: 'Empezar 6 meses',
        features: [
          'Todo lo del trimestral',
          'Recompensas $BUP por volumen operado',
          'Acceso temprano a mercados TradFi (Q1 2027)',
          'Consulta de estrategia 1:1',
          'Insignia de comunidad founders',
        ],
      },
    ],
    footer:
      'Todos los planes se facturan en USD y se renuevan al final del periodo salvo cancelación. Cancela desde tu cuenta o tu app store. No se prorratean periodos parciales. No es sustituto de asesoramiento de inversión — revisa la Declaración de Riesgo. El copy-trading no está disponible para residentes en EE. UU.',
  },
  faq: {
    label: 'Preguntas frecuentes',
    headline_1: 'Todo lo que los inversores y',
    headline_2: 'traders',
    headline_3: 'nos preguntan.',
    items: [
      {
        q: '¿BottomUP es asesoramiento de inversión?',
        a: 'No. BottomUP no es un asesor registrado, broker-dealer ni money services business. Todo en la plataforma — señales, veredictos Foxy AI, outputs MCP, balances del leaderboard — es sólo informativo y educativo. El desempeño pasado (real o simulado) no indica resultados futuros. Cada decisión y cada pérdida es tuya. Revisa la Declaración de Riesgo para la imagen completa.',
      },
      {
        q: '¿El copy trading está disponible para residentes de EE. UU.?',
        a: 'Hoy no. OKX no atiende cuentas retail en Estados Unidos, así que BottomUP no puede rutear órdenes de copy-trade en vivo para ellos. Puedes usar las funciones sociales, de analítica y de simulación. Cuando lancemos una integración compatible con EE. UU., lo anunciaremos.',
      },
      {
        q: '¿BottomUP, en una frase?',
        a: 'La App Store del smart money — un marketplace donde te suscribes a traders humanos, bots algorítmicos y agentes IA, con cada señal auditada por nuestro firewall propietario antes de llegar a tu wallet.',
      },
      {
        q: '¿En qué se diferencia Foxy AI del copy trading normal?',
        a: 'El copy-trading tradicional replica lo que manda el trader (o bot). Si hace revenge trade con 50x, tú también. Foxy intercepta cada señal, la puntúa de 0 a 100 en 225 fuentes y bloquea el trade en el firewall si el riesgo es muy alto — aunque estés suscrito. Auditoría, no espejo.',
      },
      {
        q: '¿Qué son los MCPs?',
        a: 'Modular Crypto Processors — nueve agentes IA especializados corriendo junto a Foxy: mitigación de riesgo, timing, matchmaking, research, scout de airdrops, rebalanceo, escaneo regulatorio, divergencia de sentimiento y watchdog de manipulación. Cada uno transforma un flujo de ruido en señal accionable.',
      },
      {
        q: '¿A qué me puedo suscribir en el marketplace?',
        a: 'Tres tipos: traders humanos con setups en vivo, bots algorítmicos aprobados y agentes IA autónomos (scout, rebalanceador, hedger). Los Credits te suscriben en los tres.',
      },
      {
        q: '¿Cómo funciona el copy trading en OKX?',
        a: 'Conecta tu API OKX (Read + Trade, nunca Withdraw). Cuando un creador al que sigues publica una señal, Foxy la audita, optimiza entrada/salida y nuestro worker coloca la misma orden en tu cuenta. Control total tuyo — revoca el API desde OKX o desconéctate de BottomUP cuando quieras.',
      },
      {
        q: '¿Qué son los BottomUP Credits?',
        a: 'La moneda universal del marketplace. Compra con tarjeta o cripto, úsalos para suscribirte a cualquier tienda. Los creadores reciben 25% del ingreso que generan + 10% de referidos. La plataforma toma 30%; el resto financia infraestructura y rebates.',
      },
      {
        q: '¿El token $BUP ya está en vivo?',
        a: 'Aún no. $BUP sale junto al marketplace en 2026 con mecánicas trade-to-earn — utilidad en compras del marketplace, acceso a backtesting, funciones Foxy completas y recompensas por volumen. Más en el pitch deck y whitepaper.',
      },
      {
        q: '¿Cómo empiezo hoy?',
        a: 'Regístrate gratis en bupcore.ai — email, Google, Apple o teléfono. Tu cuenta sincroniza con iOS y Android al instante. Explora tiendas, prueba el modo simulación de Foxy, y cuando quieras ir live conecta OKX.',
      },
    ],
  },
  final: {
    headline_1: 'Copia al dinero inteligente.',
    headline_2: 'Deja que Foxy filtre el resto.',
    sub: 'Traders, bots y agentes IA están operando ahora mismo en el marketplace. Cada señal auditada. Cada operación optimizada. Regístrate en 30 segundos.',
    cta_primary: 'Empezar gratis →',
    cta_secondary: 'Entrar',
    disclaimer:
      'No es asesoramiento de inversión. Operar en cripto conlleva un alto riesgo de pérdida. El copy-trading no está disponible para residentes en EE. UU.',
  },
  ft: {
    tagline:
      'La App Store del smart money. Traders de élite, agentes IA y bots algorítmicos — un marketplace, protegido por Foxy AI.',
    product: 'Producto',
    account: 'Cuenta',
    legal: 'Legal',
    nav_foxy: 'Foxy AI',
    nav_marketplace: 'Marketplace',
    nav_mcp: 'MCP Suite',
    nav_pricing: 'Precios',
    signup: 'Empezar gratis',
    signin: 'Entrar',
    faq: 'FAQ',
    terms: 'Términos de servicio',
    privacy: 'Privacidad',
    risk: 'Declaración de riesgo',
    disclosure:
      'BottomUP, Inc. es una corporación de Delaware. BottomUP no es un asesor de inversión registrado, broker-dealer, commodity pool operator, commodity trading advisor o money services business. Todo el contenido del Servicio — señales, veredictos Foxy AI y estrategias de creadores — se provee únicamente con fines informativos y educativos y no es asesoramiento de inversión, legal o fiscal individualizado. El desempeño pasado, simulado e hipotético (incluidas las cifras del "portafolio virtual de $10.000") no indica resultados futuros. Operar cripto, y en particular con apalancamiento o derivados, implica un alto riesgo de pérdida total. El copy-trading no está disponible para residentes de EE. UU. Los residentes de regiones sancionadas por la OFAC no son elegibles.',
    copy: '© {year} BottomUP, Inc. · Todos los derechos reservados.',
    address: '1209 Orange St, Wilmington, DE 19801, EE. UU.',
  },
};
