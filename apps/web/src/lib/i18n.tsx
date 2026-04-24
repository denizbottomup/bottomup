'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const LOCALES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', label: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇦🇪' },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];

interface Dict {
  nav: {
    foxy: string;
    marketplace: string;
    mcp: string;
    traders: string;
    pricing: string;
    signin: string;
    signup: string;
  };
  hero: {
    headline_1: string;
    headline_2: string;
    subtitle: string;
    cta_primary: string;
    cta_secondary: string;
    kpi_volume: string;
    kpi_downloads: string;
    kpi_mau: string;
    kpi_trustpilot: string;
    kpi_volume_sub: string;
    kpi_downloads_sub: string;
    kpi_mau_sub: string;
    kpi_trustpilot_sub: string;
  };
  mobile: {
    label: string;
    headline_1: string;
    headline_2: string;
    headline_3: string;
    body: string;
    bullet_push: string;
    bullet_score: string;
    bullet_copy: string;
    bullet_sim: string;
  };
  final: {
    headline_1: string;
    headline_2: string;
    sub: string;
    cta_primary: string;
    cta_secondary: string;
    disclaimer: string;
  };
}

const en: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Marketplace',
    mcp: 'MCP Suite',
    traders: 'Traders',
    pricing: 'Pricing',
    signin: 'Sign in',
    signup: 'Get started free',
  },
  hero: {
    headline_1: 'The App Store of',
    headline_2: 'Smart Money.',
    subtitle:
      'Automated portfolio management that lets anyone mirror elite traders and AI agents via a decentralized marketplace.',
    cta_primary: 'Start free →',
    cta_secondary: 'How Foxy protects you',
    kpi_volume: 'Trade volume',
    kpi_downloads: 'Downloads',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'Lifetime',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'Excellent',
  },
  mobile: {
    label: 'In your pocket',
    headline_1: 'Signals, simulations, and',
    headline_2: 'live copy trading',
    headline_3: '— all in the app.',
    body: "Follow the traders you picked, see Foxy's verdict next to every setup, and get pushed the moment something new hits the marketplace. No juggling tabs, no missed alerts.",
    bullet_push: 'Real-time push on every new setup',
    bullet_score: 'Foxy AI risk score on every card',
    bullet_copy: 'One-tap copy trade on connected OKX',
    bullet_sim: 'Portfolio simulator with virtual $10,000',
  },
  final: {
    headline_1: 'Copy smart money.',
    headline_2: 'Let Foxy filter the rest.',
    sub: 'Traders, bots, and AI agents run live on the marketplace right now. Every signal audited. Every trade optimized. Sign up in 30 seconds and start browsing shops.',
    cta_primary: 'Get started free →',
    cta_secondary: 'Sign in',
    disclaimer:
      'Not investment advice. Crypto trading carries a high risk of loss. Copy-trading is not available to U.S. persons.',
  },
};

const tr: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Marketplace',
    mcp: 'MCP Seti',
    traders: 'Trader’lar',
    pricing: 'Fiyatlandırma',
    signin: 'Giriş',
    signup: 'Ücretsiz başla',
  },
  hero: {
    headline_1: 'Akıllı Paranın',
    headline_2: 'App Store’u.',
    subtitle:
      'Herkesin, merkeziyetsiz bir marketplace üzerinden elit trader’ları ve AI agent’ları kopyalamasını sağlayan otomatik portföy yönetimi.',
    cta_primary: 'Ücretsiz başla →',
    cta_secondary: 'Foxy seni nasıl korur?',
    kpi_volume: 'İşlem hacmi',
    kpi_downloads: 'İndirme',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'Tüm zamanlar',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU %24',
    kpi_trustpilot_sub: 'Mükemmel',
  },
  mobile: {
    label: 'Cebinde',
    headline_1: 'Sinyaller, simülasyonlar ve',
    headline_2: 'canlı kopya trade',
    headline_3: '— hepsi uygulamada.',
    body: 'Seçtiğin trader’ları takip et, her setup’ın yanında Foxy’nin yorumunu gör, marketplace’e yeni bir şey düşer düşmez bildirim al. Sekme arası geçiş yok, atlanan fırsat yok.',
    bullet_push: 'Her yeni setup’ta anında push bildirim',
    bullet_score: 'Her kartta Foxy AI risk skoru',
    bullet_copy: 'OKX bağlıyken tek dokunuşla kopya trade',
    bullet_sim: '10.000$ sanal kasa ile portföy simülatörü',
  },
  final: {
    headline_1: 'Akıllı parayı kopyala.',
    headline_2: 'Gerisini Foxy filtrelesin.',
    sub: 'Trader’lar, botlar ve AI agent’lar şu an marketplace’te canlı. Her sinyal denetlenir, her işlem optimize edilir. 30 saniyede üye ol, mağazalara göz atmaya başla.',
    cta_primary: 'Ücretsiz başla →',
    cta_secondary: 'Giriş yap',
    disclaimer:
      'Yatırım tavsiyesi değildir. Kripto işlemleri yüksek kayıp riski taşır. Kopya trade, ABD’de ikamet edenlere sunulmaz.',
  },
};

const es: Dict = {
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
  final: {
    headline_1: 'Copia al dinero inteligente.',
    headline_2: 'Deja que Foxy filtre el resto.',
    sub: 'Traders, bots y agentes de IA están operando ahora mismo en el marketplace. Cada señal auditada. Cada operación optimizada. Regístrate en 30 segundos.',
    cta_primary: 'Empezar gratis →',
    cta_secondary: 'Entrar',
    disclaimer:
      'No es asesoramiento de inversión. Operar en cripto conlleva un alto riesgo de pérdida. El copy-trading no está disponible para residentes en EE. UU.',
  },
};

const pt: Dict = {
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
  final: {
    headline_1: 'Copie o smart money.',
    headline_2: 'Deixe a Foxy filtrar o resto.',
    sub: 'Traders, bots e agentes de IA estão operando agora no marketplace. Cada sinal auditado. Cada trade otimizado. Cadastre-se em 30 segundos.',
    cta_primary: 'Começar grátis →',
    cta_secondary: 'Entrar',
    disclaimer:
      'Não é recomendação de investimento. Operar cripto envolve alto risco de perda. O copy-trading não está disponível para residentes nos EUA.',
  },
};

const ru: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Маркетплейс',
    mcp: 'MCP Suite',
    traders: 'Трейдеры',
    pricing: 'Тарифы',
    signin: 'Войти',
    signup: 'Начать бесплатно',
  },
  hero: {
    headline_1: 'App Store',
    headline_2: 'умных денег.',
    subtitle:
      'Автоматизированное управление портфелем: копируйте элитных трейдеров и AI-агентов через децентрализованный маркетплейс.',
    cta_primary: 'Начать бесплатно →',
    cta_secondary: 'Как Foxy защищает вас',
    kpi_volume: 'Объём торгов',
    kpi_downloads: 'Загрузки',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'За всё время',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'Отлично',
  },
  mobile: {
    label: 'В кармане',
    headline_1: 'Сигналы, симуляции и',
    headline_2: 'живой копи-трейдинг',
    headline_3: '— всё в приложении.',
    body: 'Подписывайтесь на своих трейдеров, смотрите вердикт Foxy рядом с каждым сетапом и получайте уведомления сразу, как что-то появляется в маркетплейсе. Никаких переключений между вкладками.',
    bullet_push: 'Push-уведомления по каждому новому сетапу',
    bullet_score: 'Риск-оценка Foxy AI на каждой карточке',
    bullet_copy: 'Копи-трейд в один клик через OKX',
    bullet_sim: 'Симулятор портфеля с виртуальными $10 000',
  },
  final: {
    headline_1: 'Копируйте умные деньги.',
    headline_2: 'Остальное отфильтрует Foxy.',
    sub: 'Трейдеры, боты и AI-агенты уже работают на маркетплейсе. Каждый сигнал проверен. Каждый трейд оптимизирован. Регистрация занимает 30 секунд.',
    cta_primary: 'Начать бесплатно →',
    cta_secondary: 'Войти',
    disclaimer:
      'Не инвестиционный совет. Торговля криптовалютой несёт высокий риск убытков. Копи-трейдинг недоступен для резидентов США.',
  },
};

const vi: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Marketplace',
    mcp: 'Bộ MCP',
    traders: 'Trader',
    pricing: 'Giá',
    signin: 'Đăng nhập',
    signup: 'Bắt đầu miễn phí',
  },
  hero: {
    headline_1: 'App Store của',
    headline_2: 'Smart Money.',
    subtitle:
      'Quản lý danh mục tự động cho phép bất kỳ ai sao chép các trader hàng đầu và AI agent qua một marketplace phi tập trung.',
    cta_primary: 'Bắt đầu miễn phí →',
    cta_secondary: 'Foxy bảo vệ bạn như thế nào',
    kpi_volume: 'Khối lượng giao dịch',
    kpi_downloads: 'Lượt tải',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'Toàn thời gian',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'Xuất sắc',
  },
  mobile: {
    label: 'Trong túi bạn',
    headline_1: 'Tín hiệu, mô phỏng và',
    headline_2: 'copy trade trực tiếp',
    headline_3: '— tất cả trong ứng dụng.',
    body: 'Theo dõi các trader bạn chọn, xem đánh giá Foxy cạnh mỗi setup, nhận push ngay khi marketplace có cái mới. Không cần đảo tab, không bỏ lỡ cơ hội.',
    bullet_push: 'Push thời gian thực cho mỗi setup mới',
    bullet_score: 'Điểm rủi ro Foxy AI trên mỗi thẻ',
    bullet_copy: 'Copy trade một chạm qua OKX',
    bullet_sim: 'Mô phỏng danh mục với $10.000 ảo',
  },
  final: {
    headline_1: 'Sao chép smart money.',
    headline_2: 'Để Foxy lọc phần còn lại.',
    sub: 'Trader, bot và AI agent đang chạy trực tiếp trên marketplace ngay bây giờ. Mỗi tín hiệu được kiểm toán. Đăng ký trong 30 giây.',
    cta_primary: 'Bắt đầu miễn phí →',
    cta_secondary: 'Đăng nhập',
    disclaimer:
      'Không phải tư vấn đầu tư. Giao dịch crypto có rủi ro mất vốn cao. Copy-trading không khả dụng cho cư dân Hoa Kỳ.',
  },
};

const id: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Marketplace',
    mcp: 'Suite MCP',
    traders: 'Trader',
    pricing: 'Harga',
    signin: 'Masuk',
    signup: 'Mulai gratis',
  },
  hero: {
    headline_1: 'App Store-nya',
    headline_2: 'Smart Money.',
    subtitle:
      'Manajemen portofolio otomatis yang memungkinkan siapa pun mengikuti trader elite dan AI agent lewat marketplace terdesentralisasi.',
    cta_primary: 'Mulai gratis →',
    cta_secondary: 'Cara Foxy melindungi kamu',
    kpi_volume: 'Volume trading',
    kpi_downloads: 'Unduhan',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'Sepanjang masa',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'Sangat Baik',
  },
  mobile: {
    label: 'Di sakumu',
    headline_1: 'Sinyal, simulasi, dan',
    headline_2: 'copy trading langsung',
    headline_3: '— semua di aplikasi.',
    body: 'Ikuti trader pilihanmu, lihat penilaian Foxy di tiap setup, dan dapatkan push langsung saat ada sesuatu yang baru di marketplace. Tanpa gonta-ganti tab, tanpa kehilangan peluang.',
    bullet_push: 'Push real-time setiap ada setup baru',
    bullet_score: 'Skor risiko Foxy AI di setiap kartu',
    bullet_copy: 'Copy trade satu sentuh via OKX terhubung',
    bullet_sim: 'Simulator portofolio dengan $10.000 virtual',
  },
  final: {
    headline_1: 'Copy smart money.',
    headline_2: 'Biarkan Foxy menyaring sisanya.',
    sub: 'Trader, bot, dan AI agent sedang aktif di marketplace sekarang. Setiap sinyal diaudit. Daftar dalam 30 detik.',
    cta_primary: 'Mulai gratis →',
    cta_secondary: 'Masuk',
    disclaimer:
      'Bukan nasihat investasi. Trading crypto memiliki risiko kerugian tinggi. Copy-trading tidak tersedia untuk penduduk AS.',
  },
};

const zh: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: '市场',
    mcp: 'MCP 套件',
    traders: '交易员',
    pricing: '价格',
    signin: '登录',
    signup: '免费开始',
  },
  hero: {
    headline_1: '聪明钱的',
    headline_2: 'App Store。',
    subtitle:
      '自动化投资组合管理,让任何人都能通过去中心化市场跟随顶级交易员和 AI agent。',
    cta_primary: '免费开始 →',
    cta_secondary: 'Foxy 如何保护你',
    kpi_volume: '交易额',
    kpi_downloads: '下载量',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: '累计',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: '优秀',
  },
  mobile: {
    label: '尽在掌中',
    headline_1: '信号、模拟和',
    headline_2: '实时跟单',
    headline_3: '— 全在一个 app。',
    body: '关注你选择的交易员,在每个 setup 旁看到 Foxy 的评估,市场有新动作第一时间推送给你。无需来回切换,不错过任何机会。',
    bullet_push: '每个新 setup 都有实时推送',
    bullet_score: '每张卡片都有 Foxy AI 风险评分',
    bullet_copy: '已连接 OKX 时一键跟单',
    bullet_sim: '$10,000 虚拟资金的投资组合模拟器',
  },
  final: {
    headline_1: '跟随聪明钱。',
    headline_2: '其余的交给 Foxy。',
    sub: '交易员、机器人和 AI agent 此刻正在市场上运行。每个信号都被审计。30 秒完成注册。',
    cta_primary: '免费开始 →',
    cta_secondary: '登录',
    disclaimer:
      '不构成投资建议。加密货币交易存在高损失风险。跟单功能不向美国居民开放。',
  },
};

const ko: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: '마켓플레이스',
    mcp: 'MCP 스위트',
    traders: '트레이더',
    pricing: '요금제',
    signin: '로그인',
    signup: '무료로 시작',
  },
  hero: {
    headline_1: '스마트 머니의',
    headline_2: '앱스토어.',
    subtitle:
      '누구나 탈중앙 마켓플레이스에서 엘리트 트레이더와 AI 에이전트를 자동으로 따라 할 수 있는 포트폴리오 관리.',
    cta_primary: '무료로 시작 →',
    cta_secondary: 'Foxy가 보호하는 방식',
    kpi_volume: '거래량',
    kpi_downloads: '다운로드',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: '누적',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: '훌륭함',
  },
  mobile: {
    label: '주머니 속에',
    headline_1: '시그널, 시뮬레이션,',
    headline_2: '실시간 카피 트레이딩',
    headline_3: '— 모두 앱 안에.',
    body: '선택한 트레이더를 팔로우하고, 모든 셋업 옆에서 Foxy의 판단을 확인하며, 마켓플레이스에 새 아이템이 올라오는 순간 푸시 알림을 받으세요. 탭 전환도, 놓친 기회도 없습니다.',
    bullet_push: '새 셋업마다 실시간 푸시',
    bullet_score: '모든 카드에 Foxy AI 리스크 점수',
    bullet_copy: 'OKX 연결 시 원탭 카피 트레이드',
    bullet_sim: '가상 $10,000 포트폴리오 시뮬레이터',
  },
  final: {
    headline_1: '스마트 머니를 카피하세요.',
    headline_2: '나머지는 Foxy가 걸러냅니다.',
    sub: '트레이더, 봇, AI 에이전트가 지금 마켓플레이스에서 실시간으로 운용 중입니다. 모든 시그널이 감사됩니다. 30초 만에 가입하세요.',
    cta_primary: '무료로 시작 →',
    cta_secondary: '로그인',
    disclaimer:
      '투자 조언이 아닙니다. 암호화폐 거래는 높은 손실 위험을 수반합니다. 카피 트레이딩은 미국 거주자에게 제공되지 않습니다.',
  },
};

const ar: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'المتجر',
    mcp: 'حزمة MCP',
    traders: 'المتداولون',
    pricing: 'الأسعار',
    signin: 'تسجيل الدخول',
    signup: 'ابدأ مجاناً',
  },
  hero: {
    headline_1: 'متجر تطبيقات',
    headline_2: 'الأموال الذكية.',
    subtitle:
      'إدارة محافظ آلية تتيح لأي شخص محاكاة كبار المتداولين ووكلاء الذكاء الاصطناعي عبر متجر لامركزي.',
    cta_primary: 'ابدأ مجاناً →',
    cta_secondary: 'كيف يحميك Foxy',
    kpi_volume: 'حجم التداول',
    kpi_downloads: 'التنزيلات',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'إجمالي',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'ممتاز',
  },
  mobile: {
    label: 'في جيبك',
    headline_1: 'إشارات ومحاكاة و',
    headline_2: 'نسخ تداول مباشر',
    headline_3: '— كله في التطبيق.',
    body: 'تابع المتداولين الذين اخترتهم، شاهد حكم Foxy بجانب كل إشارة، واستلم إشعاراً لحظة نزول شيء جديد في المتجر. دون تنقّل بين التبويبات ودون تفويت فرص.',
    bullet_push: 'إشعار فوري مع كل إشارة جديدة',
    bullet_score: 'درجة مخاطر Foxy AI على كل بطاقة',
    bullet_copy: 'نسخ تداول بضغطة واحدة عبر OKX متصل',
    bullet_sim: 'محاكي محفظة بـ 10,000$ افتراضية',
  },
  final: {
    headline_1: 'انسخ الأموال الذكية.',
    headline_2: 'دع Foxy يفلتر الباقي.',
    sub: 'متداولون وروبوتات ووكلاء ذكاء اصطناعي يعملون الآن على المتجر. كل إشارة تخضع للتدقيق. سجل في 30 ثانية.',
    cta_primary: 'ابدأ مجاناً →',
    cta_secondary: 'تسجيل الدخول',
    disclaimer:
      'ليست نصيحة استثمارية. تداول العملات الرقمية ينطوي على مخاطر خسارة عالية. نسخ التداول غير متاح لسكان الولايات المتحدة.',
  },
};

const DICTS: Record<LocaleCode, Dict> = {
  en,
  tr,
  es,
  pt,
  ru,
  vi,
  id,
  zh,
  ko,
  ar,
};

const COOKIE = 'bup-locale';

interface LocaleCtx {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: Dict;
}

const Ctx = createContext<LocaleCtx | null>(null);

function detectLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(COOKIE);
    if (stored && isLocale(stored)) return stored as LocaleCode;
  } catch {
    /* ignore */
  }
  const nav = window.navigator.language.toLowerCase();
  for (const l of LOCALES) {
    if (nav.startsWith(l.code)) return l.code;
  }
  return 'en';
}

function isLocale(code: string): code is LocaleCode {
  return LOCALES.some((l) => l.code === code);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en');

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    try {
      window.localStorage.setItem(COOKIE, code);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({ locale, setLocale, t: DICTS[locale] }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error('useT must be used within a LocaleProvider');
  return ctx;
}
