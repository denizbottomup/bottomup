import type { Dict } from './schema';

export const id: Dict = {
  meta: {
    title: 'BottomUP — Marketplace copy trading sosial dengan AI',
    description:
      'BottomUP adalah App Store smart money: manajemen portofolio AI, copy trading otomatis, dan bot trading kripto — setiap sinyal diaudit Foxy AI.',
    keywords:
      'social trading, copy trading, copy trading otomatis, manajemen portofolio AI, bot trading kripto, AI trading agent, AI risk firewall, BottomUP, Foxy AI, OKX copy trading',
    og_image_alt: 'BottomUP — Marketplace copy trading dilindungi AI',
  },
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
  partners: {
    exchanges: 'Mitra exchange & ekosistem',
    backed_by: 'Didukung oleh',
  },
  intro: {
    label: 'Tonton intro',
    headline_1: '60 detik tentang',
    headline_2: 'cara BottomUP bekerja.',
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
  ps: {
    label: 'Tesis kami',
    headline_1: 'Trading retail rusak.',
    headline_2: 'Kami bangun ulang.',
    subtitle:
      'Manajemen portofolio otomatis yang memungkinkan siapa pun mengikuti trader elite dan AI agent di marketplace terdesentralisasi — diaudit menyeluruh oleh firewall risiko milik kami.',
    before: 'Sebelum BottomUP',
    with: 'Dengan BottomUP',
    rows: [
      {
        problem_title: 'Kamu menyalin trade buruk',
        problem_body:
          'Trader-mu revenge trade 50x leverage — kamu juga. Tanpa filter, tanpa pendapat kedua, tanpa rem.',
        solution_title: 'Chief of Risk berbasis AI',
        solution_body:
          'Foxy AI mengaudit setiap sinyal lewat 225 sumber data dan memblokir yang tidak lolos — meski dikirim oleh trader-mu.',
      },
      {
        problem_title: 'Alpha kamu tersebar',
        problem_body:
          'Trader top di Telegram. Bot di Discord. Sinyal di tiga exchange. Lebih banyak ganti tab daripada eksekusi.',
        solution_title: 'Satu app, semua strategi',
        solution_body:
          'Trader manusia, bot algoritmik, dan AI agent — semua di satu marketplace. Langganan pakai Credits, order jalan 24/7 di wallet-mu.',
      },
      {
        problem_title: 'Pasar terpisah, kamu terpisah',
        problem_body:
          'Crypto satu app, saham lain, forex lain lagi. Tidak bisa jalankan tesis cross-asset tanpa lima login.',
        solution_title: 'Multi-aset dari satu terminal',
        solution_body:
          'Crypto sudah ada. Saham, forex, dan komoditas tiba Q1 2027 di jalur yang sama — satu akun, satu tampilan portofolio.',
      },
    ],
  },
  foxy: {
    label: 'Foxy AI · Firewall Risiko',
    headline_1: 'Setiap trade',
    headline_2: 'diaudit',
    headline_3: 'sebelum masuk wallet-mu.',
    subtitle:
      'Foxy adalah AI milik kami yang dilatih pada 225 sumber data. Saat trader, bot, atau agent mempublikasikan sinyal, Foxy memberi nilai 0–100 berdasarkan teknik, fundamental, berita, kedalaman order book, dan pola risiko pembuat. Jika nilainya merah — trade diblokir, meskipun kamu berlangganan.',
    pillars: [
      { title: 'Audit', body: 'Setiap sinyal yang masuk dicegat dan diberi skor di 225 sumber sebelum eksekusi.' },
      { title: 'Blokir', body: 'Trade yang melewati amplop risiko dihentikan di firewall — bukan setelah rugi.' },
      { title: 'Optimalkan', body: 'Order masuk/keluar disesuaikan untuk mengurangi slippage dan menaikkan P&L net.' },
      { title: 'Simulasikan', body: 'Bangun portofolio, simulasikan performa tim pada harga live sebelum mempertaruhkan modal asli.' },
    ],
    signal_flow: 'Alur sinyal',
    trader_node: 'Trader / Bot / AI agent',
    trader_node_sub: 'publikasikan sinyal',
    foxy_node: 'Firewall Foxy AI',
    foxy_node_sub: 'skor risiko 0–100 · 225 sumber',
    decision_bad: 'Risiko > ambang',
    decision_bad_body: 'Diblokir ✕',
    decision_ok: 'Risiko OK',
    decision_ok_body: 'Dioptimalkan ✓',
    wallet_node: 'Wallet-mu',
    wallet_node_sub: 'eksekusi hanya jika Foxy menyetujui',
    stat: '✓ Foxy memblokir 1.247 sinyal berisiko dalam 30 hari terakhir di seluruh marketplace.',
  },
  mkt: {
    label: 'Marketplace',
    headline_1: 'Tiga jenis strategi.',
    headline_2: 'Satu marketplace.',
    subtitle:
      'Creator membuka toko. User berlangganan dengan BottomUP Credits. Strategi dieksekusi 24/7 langsung di wallet yang terhubung — setiap order diaudit Foxy dulu.',
    golive: 'Go-live marketplace · Mei 2026',
    shops: [
      {
        kind: 'Trader manusia',
        tagline: 'Ikuti analis yang mencantumkan namanya di tiap panggilan.',
        bullets: [
          'Kurva P&L terverifikasi, win rate, dan profil risiko',
          'Setup live dengan entry / stop / TP',
          'Creator mendapat 25% langganan + volume',
        ],
      },
      {
        kind: 'Bot algoritmik',
        tagline: 'Strategi tervetting dan backtested jalan 24/7.',
        bullets: [
          'Sumber strategi transparan, bukan black-box',
          'Langganan sekali, eksekusi saat kamu tidur',
          'Foxy matikan bot menyimpang seketika',
        ],
      },
      {
        kind: 'AI agent',
        tagline: 'Agent otonom dengan mandat khusus.',
        bullets: [
          'Alpha scout, rebalancer, hedger, pemburu airdrop',
          'Tipe agent baru tiap 2 bulan',
          'Didukung MCP Suite',
        ],
      },
    ],
    credits_label: 'BottomUP Credits · cara kerja ekonomi mikro',
    steps: [
      { title: 'Beli Credits', body: 'Kartu kredit atau crypto. Credits adalah mata uang universal di setiap toko.' },
      { title: 'Langganan toko', body: 'Pilih trader, bot, atau agent yang kamu percaya. Batalkan kapan saja.' },
      { title: 'Foxy audit sinyal', body: 'Setiap order diberi skor 0–100 sebelum keluar dari firewall.' },
      { title: 'Wallet eksekusi', body: 'Order yang disetujui langsung ke wallet terhubung, 24/7.' },
    ],
  },
  lb: {
    label: 'Papan peringkat live',
    headline_1: '$10.000 di hari pertama.',
    headline_2: 'Sekarang mereka di mana?',
    subtitle:
      'Setiap trader mulai bulan dengan $10.000 virtual. Tap kartu untuk dashboard analitik lengkap — kurva equity, distribusi R, P&L bulanan, breakdown per coin.',
    disclaimer:
      'Hasil simulasi. Performa hipotetis punya keterbatasan inheren. Performa masa lalu bukan indikasi hasil di masa depan.',
    cta: 'Jelajahi marketplace →',
    empty: 'Belum ada trade yang ditutup bulan ini — cek lagi nanti.',
    balance_label: 'Saldo virtual',
    from_label: 'dari $10.000 bulan ini',
    trades: 'Trade',
    wins: 'Menang',
    win_rate: 'Win rate',
    live: 'Live',
    drawdown: 'Drawdown',
    view_full: 'Lihat analitik lengkap →',
    followers: 'pengikut',
  },
  mcp: {
    label: 'MCP Suite',
    headline_1: 'Sembilan',
    headline_2: 'Modular Crypto Processors, bekerja bersama.',
    subtitle:
      'Setiap MCP adalah AI agent khusus yang mengubah kekacauan informasi menjadi insight. Jalan bersamaan dengan Foxy — trade-mu datang sudah diaudit, diukur waktunya, dan selaras dengan strategi.',
    cards: [
      { title: 'Mitigasi risiko', body: 'Menandai revenge trading, leverage berlebihan, dan ukuran posisi tidak aman di setiap trader — real-time.' },
      { title: 'Timing trade', body: 'Mengawasi kedalaman order book, peristiwa makro (FOMC, CPI, ETF), dan slippage historis untuk merekomendasikan jendela terbaik.' },
      { title: 'Pencocokan', body: 'Membuat profil selera risikomu dan memasangkan dengan gaya kompatibel — scalper, momentum, atau swing jangka panjang.' },
      { title: 'Riset token', body: 'Memeriksa kesehatan kontrak, aktivitas dev, perilaku whale, dan lonjakan sosial. Menghasilkan hipotesis, bukan kebisingan.' },
      { title: 'Scout launch & airdrop', body: 'Memonitor deploy baru, aktivitas testnet, dan buzz Telegram. Memberi kabar alpha awal dan mengidentifikasi wallet yang eligible.' },
      { title: 'Rebalancing portofolio', body: 'Mendeteksi over-exposure dan risiko korelasi sektor saat pasar bergerak. Menyarankan hedge atau rotasi sebelum drawdown.' },
      { title: 'Scan regulasi', body: 'Menarik feed berita, update kebijakan exchange, dan sinyal hukum regional. Memperingatkan risiko kepatuhan — delisting, sanksi — sebelum menyakitkan.' },
      { title: 'Divergensi sentimen', body: 'Menangkap alpha tersembunyi saat on-chain bullish tapi Twitter/Reddit bearish. Sempurna untuk posisi awal.' },
      { title: 'Watchdog manipulasi', body: 'Melacak aktivitas wallet influencer, timing promosi, dan pola amplifikasi. Menandai pump terkoordinasi dan hype viral berbayar.' },
    ],
  },
  pulse: {
    label: 'Konteks pasar live',
    headline_1: 'Data yang sama yang',
    headline_2: 'Foxy',
    headline_3: 'gunakan.',
    subtitle:
      'CoinGlass, CoinGecko, dan futures Binance memberi makan firewall Foxy secara real-time. Kamu lihat permukaan yang sama: Fear & Greed, BTC dominance, funding antar-exchange, bias long/short, liquidation 24j, dan perubahan open interest.',
    auto: 'Auto-refresh · cache 5 menit',
    fg: 'Fear & Greed Index',
    dom: 'BTC Dominance',
    funding: 'Top funding (abs)',
    liq_24h: 'Likuidasi 24j',
    ls: 'Rasio Long / Short',
    ls_sub: 'Binance · 1j',
    oi: 'Open interest (24j)',
    no_data: 'Tidak ada data',
    liq_table: 'Likuidasi per coin · 24j terakhir',
    table_coin: 'Coin',
    table_long: 'Long',
    table_short: 'Short',
    table_total: 'Total',
    table_split: 'Long/Short',
  },
  news: {
    label: 'News feed',
    headline_1: 'Berita crypto, dengan',
    headline_2: 'sentimen.',
    subtitle:
      'Setiap berita diberi label positif/negatif dan terhubung dengan coin yang terpengaruh. Buka di sini — tanpa tab baru, tanpa kehilangan konteks.',
    no_summary: 'Tidak ada ringkasan tambahan untuk artikel ini.',
  },
  pr: {
    label: 'Harga',
    headline_1: 'Satu trade buruk yang diblokir',
    headline_2: 'menutupi setahun.',
    subtitle:
      'Langganan membuka marketplace, firewall Foxy, dan seluruh MCP Suite. Toko individu dibayar dengan BottomUP Credits — creator mendapat 25% dari pendapatan yang mereka hasilkan.',
    most_popular: 'Paling populer',
    billed_monthly: 'Ditagih bulanan, diperpanjang',
    billed_upfront: '{total} dibayar di muka',
    save_17: 'Hemat 17%',
    save_25: 'Hemat 25%',
    plans: [
      {
        name: 'Bulanan',
        cta: 'Mulai bulanan',
        features: [
          'Akses penuh marketplace — trader, bot, AI agent',
          'Firewall Foxy AI di setiap sinyal',
          'Dashboard pasar live (CoinGlass + Binance)',
          'Simulasi portofolio pada harga live',
          'Chat komunitas · 7 kanal',
          'Notifikasi web + push',
        ],
      },
      {
        name: '3 Bulan',
        cta: 'Mulai kuartalan',
        features: [
          'Semua di Bulanan',
          'Copy trading OKX — eksekusi satu klik',
          'MCP Suite — semua 9 AI agent',
          'Laporan performa kuartalan',
          'Dukungan prioritas',
        ],
      },
      {
        name: '6 Bulan',
        cta: 'Mulai 6 bulan',
        features: [
          'Semua di kuartalan',
          'Reward $BUP dari volume',
          'Akses awal ke TradFi (Q1 2027)',
          'Konsultasi strategi 1:1',
          'Badge komunitas founders',
        ],
      },
    ],
    footer:
      'Semua paket ditagih dalam USD dan otomatis diperpanjang di akhir periode kecuali dibatalkan. Batalkan dari akun atau app store. Periode parsial tidak di-prorata. Bukan pengganti nasihat investasi — lihat Pengungkapan Risiko. Copy-trading tidak tersedia untuk penduduk AS.',
  },
  faq: {
    label: 'Pertanyaan umum',
    headline_1: 'Semua pertanyaan investor dan',
    headline_2: 'trader.',
    headline_3: '',
    items: [
      {
        q: 'Apakah BottomUP adalah nasihat investasi?',
        a: 'Tidak. BottomUP bukan penasihat investasi terdaftar, broker-dealer, atau money services business. Semua di platform — sinyal, vered Foxy AI, output MCP, saldo papan peringkat — hanya informasional dan edukatif. Performa masa lalu (nyata atau simulasi) bukan indikasi hasil di masa depan. Setiap keputusan dan setiap rugi adalah milikmu. Lihat Pengungkapan Risiko.',
      },
      {
        q: 'Apakah copy trading tersedia untuk penduduk AS?',
        a: 'Belum. OKX tidak melayani akun ritel di AS, jadi BottomUP tidak dapat meneruskan order copy-trade live untuk penduduk AS. Fitur sosial, analitik, dan simulasi tetap terbuka. Jika kami meluncurkan integrasi broker yang sesuai untuk AS, akan kami umumkan.',
      },
      {
        q: 'BottomUP dalam satu kalimat?',
        a: 'App Store-nya smart money — marketplace tempat kamu berlangganan trader manusia, bot algoritmik, dan AI agent, dengan setiap sinyal diaudit oleh firewall AI milik kami sebelum masuk wallet.',
      },
      {
        q: 'Apa bedanya Foxy AI dengan copy trading biasa?',
        a: 'Copy trading tradisional hanya meneruskan apapun yang dikirim trader (atau bot). Jika revenge trade 50x, kamu juga. Foxy mencegat setiap sinyal, memberi skor 0–100 di 225 sumber, dan memblokir di firewall jika risiko tinggi — meski berlangganan. Audit, bukan cermin.',
      },
      {
        q: 'Apa itu MCP?',
        a: 'Modular Crypto Processors — sembilan AI agent khusus berjalan berdampingan dengan Foxy: mitigasi risiko, timing, pencocokan, riset token, scout airdrop, rebalancing, scan regulasi, divergensi sentimen, dan watchdog manipulasi.',
      },
      {
        q: 'Apa saja yang bisa dilanggan di marketplace?',
        a: 'Tiga jenis toko: trader manusia dengan setup live, bot algoritmik tervetting 24/7, dan AI agent otonom (scout, rebalancer, hedger). Credits mendaftarkanmu di ketiganya.',
      },
      {
        q: 'Bagaimana copy trading OKX bekerja?',
        a: 'Hubungkan API OKX (Read + Trade, jangan pernah Withdraw). Saat creator yang kamu langgani mempublikasikan sinyal, Foxy mengaudit, mengoptimalkan entry/exit, dan worker kami menempatkan order yang sama di akunmu. Kontrol penuh — cabut API di OKX atau putuskan dari BottomUP kapan saja.',
      },
      {
        q: 'Apa itu BottomUP Credits?',
        a: 'Mata uang universal marketplace. Beli dengan kartu atau crypto, gunakan untuk berlangganan di toko mana pun. Creator mendapat 25% pendapatan yang dihasilkan + 10% dari referral. Platform mengambil 30%; sisanya mendanai infrastruktur dan rebate.',
      },
      {
        q: 'Apakah token $BUP sudah live?',
        a: 'Belum. $BUP diluncurkan bersama marketplace di 2026 dengan mekanisme trade-to-earn — utilitas mencakup pembelian marketplace, akses back-testing, fitur Foxy penuh, dan reward volume. Info selengkapnya di pitch deck dan whitepaper.',
      },
      {
        q: 'Cara mulai hari ini?',
        a: 'Daftar gratis di bupcore.ai — email, Google, Apple, atau telepon. Akunmu sinkron dengan iOS dan Android seketika. Jelajahi toko, coba mode simulasi Foxy, dan saat siap go live hubungkan OKX.',
      },
    ],
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
  ft: {
    tagline:
      'App Store-nya smart money. Trader elite, AI agent, dan bot algoritmik — satu marketplace, dilindungi Foxy AI.',
    product: 'Produk',
    account: 'Akun',
    legal: 'Legal',
    nav_foxy: 'Foxy AI',
    nav_marketplace: 'Marketplace',
    nav_mcp: 'MCP Suite',
    nav_pricing: 'Harga',
    signup: 'Mulai gratis',
    signin: 'Masuk',
    faq: 'FAQ',
    terms: 'Syarat layanan',
    privacy: 'Privasi',
    risk: 'Pengungkapan risiko',
    disclosure:
      'BottomUP, Inc. adalah korporasi Delaware. BottomUP bukan penasihat investasi terdaftar, broker-dealer, commodity pool operator, commodity trading advisor, atau money services business. Semua konten di Layanan — sinyal, vered Foxy AI, dan strategi creator — disediakan hanya untuk tujuan informasi dan edukasi serta bukan nasihat investasi, hukum, atau pajak yang dipersonalisasi. Performa masa lalu, performa simulasi, dan hasil hipotetis (termasuk angka "portofolio virtual $10.000") bukan indikasi hasil di masa depan. Perdagangan aset crypto, terutama dengan leverage atau derivatif, melibatkan risiko kerugian total tinggi. Fungsi copy-trading saat ini tidak ditawarkan kepada penduduk AS. Penduduk wilayah yang disanksi OFAC tidak memenuhi syarat.',
    copy: '© {year} BottomUP, Inc. · Hak cipta dilindungi.',
    address: '1209 Orange St, Wilmington, DE 19801, AS',
  },
};
