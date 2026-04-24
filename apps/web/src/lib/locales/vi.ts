import type { Dict } from './schema';

export const vi: Dict = {
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
  partners: {
    exchanges: 'Đối tác sàn và hệ sinh thái',
    backed_by: 'Được hậu thuẫn bởi',
  },
  intro: {
    label: 'Xem giới thiệu',
    headline_1: '60 giây về',
    headline_2: 'cách BottomUP hoạt động.',
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
  ps: {
    label: 'Luận điểm',
    headline_1: 'Giao dịch bán lẻ đang hỏng.',
    headline_2: 'Chúng tôi xây lại nó.',
    subtitle:
      'Quản lý danh mục tự động cho phép bất kỳ ai sao chép trader hàng đầu và AI agent qua marketplace phi tập trung — kiểm toán đầu cuối bởi firewall rủi ro của chúng tôi.',
    before: 'Trước BottomUP',
    with: 'Với BottomUP',
    rows: [
      {
        problem_title: 'Bạn sao chép lệnh tệ',
        problem_body:
          'Trader của bạn revenge trade với đòn bẩy 50x — bạn cũng vậy. Không bộ lọc, không ý kiến thứ hai, không điểm dừng.',
        solution_title: 'AI giám đốc rủi ro',
        solution_body:
          'Foxy AI kiểm toán mọi tín hiệu qua 225 nguồn dữ liệu và chặn những lệnh không đạt — ngay cả khi trader của bạn gửi.',
      },
      {
        problem_title: 'Alpha của bạn phân tán',
        problem_body:
          'Trader hàng đầu trên Telegram. Bot dev trên Discord. Tín hiệu trên ba sàn. Bạn mất thời gian đảo tab nhiều hơn thực thi.',
        solution_title: 'Một app, mọi chiến lược',
        solution_body:
          'Trader người, bot thuật toán và AI agent — tất cả trong một marketplace. Đăng ký bằng Credits, lệnh chạy 24/7 trong ví.',
      },
      {
        problem_title: 'Thị trường tách biệt, bạn tách biệt',
        problem_body:
          'Crypto một app, cổ phiếu app khác, forex nơi khác. Không thể chạy luận đề đa tài sản mà không có năm lần đăng nhập.',
        solution_title: 'Đa tài sản từ một terminal',
        solution_body:
          'Crypto đã có. Cổ phiếu, forex và hàng hóa sẽ đến Q1 2027 trên cùng hạ tầng — một tài khoản, một góc nhìn danh mục.',
      },
    ],
  },
  foxy: {
    label: 'Foxy AI · Firewall rủi ro',
    headline_1: 'Mỗi lệnh đều',
    headline_2: 'được kiểm toán',
    headline_3: 'trước khi đến ví bạn.',
    subtitle:
      'Foxy là AI độc quyền được huấn luyện trên 225 nguồn dữ liệu. Khi trader, bot hay agent công bố tín hiệu, Foxy chấm điểm 0–100 dựa trên kỹ thuật, cơ bản, tin tức, độ sâu order book và mẫu rủi ro của tác giả. Điểm đỏ — lệnh bị chặn, dù bạn đã đăng ký.',
    pillars: [
      { title: 'Kiểm toán', body: 'Mọi tín hiệu bị chặn và chấm điểm trên 225 nguồn trước khi thực thi.' },
      { title: 'Chặn', body: 'Lệnh vượt ngưỡng rủi ro bị dừng ở firewall — trước khi lỗ.' },
      { title: 'Tối ưu', body: 'Lệnh vào/ra được điều chỉnh để giảm slippage và tăng P&L ròng.' },
      { title: 'Mô phỏng', body: 'Xây danh mục, mô phỏng hiệu suất đội với giá trực tiếp trước khi cam kết vốn thật.' },
    ],
    signal_flow: 'Luồng tín hiệu',
    trader_node: 'Trader / Bot / AI agent',
    trader_node_sub: 'công bố tín hiệu',
    foxy_node: 'Firewall Foxy AI',
    foxy_node_sub: 'chấm rủi ro 0–100 · 225 nguồn',
    decision_bad: 'Rủi ro > ngưỡng',
    decision_bad_body: 'Đã chặn ✕',
    decision_ok: 'Rủi ro OK',
    decision_ok_body: 'Đã tối ưu ✓',
    wallet_node: 'Ví của bạn',
    wallet_node_sub: 'chỉ thực thi khi Foxy duyệt',
    stat: '✓ Foxy đã chặn 1.247 tín hiệu rủi ro trong 30 ngày qua trên marketplace.',
  },
  mkt: {
    label: 'Marketplace',
    headline_1: 'Ba loại chiến lược.',
    headline_2: 'Một marketplace.',
    subtitle:
      'Creator mở shop. Người dùng đăng ký bằng BottomUP Credits. Chiến lược chạy 24/7 trong ví đã kết nối — mọi lệnh đều qua Foxy trước.',
    golive: 'Mở marketplace · Tháng 5 2026',
    shops: [
      {
        kind: 'Trader người',
        tagline: 'Theo các nhà phân tích ký tên dưới mỗi lệnh.',
        bullets: [
          'Đường P&L xác thực, win rate và hồ sơ rủi ro',
          'Setup công bố trực tiếp với entry / stop / TP',
          'Creator nhận 25% đăng ký + volume',
        ],
      },
      {
        kind: 'Bot thuật toán',
        tagline: 'Chiến lược đã duyệt, back-test, chạy 24/7.',
        bullets: [
          'Nguồn chiến lược minh bạch, không hộp đen',
          'Đăng ký một lần, chạy khi bạn ngủ',
          'Foxy dừng bot lệch chuẩn ngay lập tức',
        ],
      },
      {
        kind: 'AI agent',
        tagline: 'Agent tự chủ với nhiệm vụ chuyên biệt.',
        bullets: [
          'Alpha scout, rebalancer, hedger, săn airdrop',
          'Loại agent mới mỗi 2 tháng',
          'Hỗ trợ bởi MCP Suite',
        ],
      },
    ],
    credits_label: 'BottomUP Credits · cách micro-economy hoạt động',
    steps: [
      { title: 'Mua Credits', body: 'Thẻ hoặc crypto. Credits là tiền tệ chung của mọi shop.' },
      { title: 'Đăng ký shop', body: 'Chọn trader, bot hoặc agent bạn tin tưởng. Hủy bất cứ lúc nào.' },
      { title: 'Foxy kiểm toán', body: 'Mọi lệnh được chấm 0–100 trước khi rời firewall.' },
      { title: 'Ví thực thi', body: 'Lệnh đã duyệt chuyển thẳng đến ví kết nối, 24/7.' },
    ],
  },
  lb: {
    label: 'Bảng xếp hạng trực tiếp',
    headline_1: '$10.000 ngày đầu tiên.',
    headline_2: 'Giờ họ ở đâu?',
    subtitle:
      'Mỗi trader bắt đầu tháng với $10.000 ảo. Nhấn vào thẻ để xem dashboard đầy đủ — đường equity, phân phối R, P&L theo tháng, theo coin.',
    disclaimer:
      'Kết quả mô phỏng. Hiệu suất giả định có giới hạn cố hữu. Hiệu suất quá khứ không dự đoán tương lai.',
    cta: 'Xem marketplace →',
    empty: 'Chưa có lệnh đóng tháng này — quay lại sớm.',
    balance_label: 'Số dư ảo',
    from_label: 'từ $10.000 tháng này',
    trades: 'Lệnh',
    wins: 'Thắng',
    win_rate: 'Win rate',
    live: 'Đang chạy',
    drawdown: 'Drawdown',
    view_full: 'Xem analytics đầy đủ →',
    followers: 'người theo dõi',
  },
  mcp: {
    label: 'MCP Suite',
    headline_1: 'Chín',
    headline_2: 'Modular Crypto Processors, cùng làm việc.',
    subtitle:
      'Mỗi MCP là một AI agent chuyên biệt biến hỗn loạn thông tin thành insight hữu ích. Chạy song song với Foxy — lệnh đến bạn đã được kiểm toán, định thời và khớp với chiến lược.',
    cards: [
      { title: 'Giảm rủi ro', body: 'Đánh dấu revenge trading, đòn bẩy quá mức và kích thước lệnh không an toàn ở mỗi trader — thời gian thực.' },
      { title: 'Timing lệnh', body: 'Theo dõi order book, sự kiện macro (FOMC, CPI, ETF) và slippage lịch sử để đề xuất cửa sổ tốt nhất.' },
      { title: 'Ghép cặp', body: 'Phân tích khẩu vị rủi ro và ghép bạn với phong cách phù hợp — scalper, momentum, swing dài.' },
      { title: 'Nghiên cứu token', body: 'Xem sức khỏe contract, hoạt động dev, ví cá voi và đợt sóng xã hội. Tạo giả thuyết, không nhiễu.' },
      { title: 'Scout launch & airdrop', body: 'Theo dõi deploy mới, testnet và buzz Telegram. Thông báo alpha sớm và xác định ví đủ điều kiện airdrop.' },
      { title: 'Rebalance danh mục', body: 'Phát hiện tập trung quá mức và tương quan ngành khi thị trường biến động. Gợi ý hedge hoặc xoay vòng trước drawdown.' },
      { title: 'Quét quy định', body: 'Kéo feed tin tức, cập nhật chính sách sàn và tín hiệu pháp lý khu vực. Cảnh báo rủi ro tuân thủ — delisting, trừng phạt — trước khi đau.' },
      { title: 'Phân kỳ tâm lý', body: 'Bắt alpha ẩn khi on-chain tăng nhưng Twitter/Reddit giảm. Hoàn hảo cho vị thế sớm trước đám đông.' },
      { title: 'Watchdog thao túng', body: 'Theo dõi ví influencer, timing quảng cáo và mẫu khuếch đại. Đánh dấu pump phối hợp và hype viral trả phí.' },
    ],
  },
  pulse: {
    label: 'Bối cảnh thị trường trực tiếp',
    headline_1: 'Cùng dữ liệu mà',
    headline_2: 'Foxy',
    headline_3: 'sử dụng.',
    subtitle:
      'CoinGlass, CoinGecko và futures Binance cung cấp cho firewall Foxy theo thời gian thực. Bạn thấy cùng bề mặt: Fear & Greed, BTC dominance, funding cross-exchange, bias long/short, liquidation 24h và thay đổi open interest.',
    auto: 'Tự làm mới · cache 5 phút',
    fg: 'Fear & Greed Index',
    dom: 'BTC Dominance',
    funding: 'Top funding (abs)',
    liq_24h: 'Liquidation 24h',
    ls: 'Tỷ lệ Long / Short',
    ls_sub: 'Binance · 1h',
    oi: 'Open interest (24h)',
    no_data: 'Chưa có dữ liệu',
    liq_table: 'Liquidation theo coin · 24h qua',
    table_coin: 'Coin',
    table_long: 'Long',
    table_short: 'Short',
    table_total: 'Tổng',
    table_split: 'Long/Short',
  },
  news: {
    label: 'News feed',
    headline_1: 'Tin tức crypto, gắn',
    headline_2: 'cảm xúc.',
    subtitle:
      'Mỗi tin gắn nhãn tích cực/tiêu cực và liên kết đến các coin bị ảnh hưởng. Mở ngay tại đây — không tab mới, không mất ngữ cảnh.',
    no_summary: 'Không có tóm tắt bổ sung cho bài này.',
  },
  pr: {
    label: 'Giá',
    headline_1: 'Một lệnh xấu bị chặn',
    headline_2: 'bù cả năm.',
    subtitle:
      'Gói đăng ký mở marketplace, firewall Foxy và toàn bộ MCP Suite. Shop riêng dùng BottomUP Credits — creator nhận 25% doanh thu họ tạo.',
    most_popular: 'Phổ biến nhất',
    billed_monthly: 'Thanh toán hàng tháng, gia hạn',
    billed_upfront: '{total} trả trước',
    save_17: 'Tiết kiệm 17%',
    save_25: 'Tiết kiệm 25%',
    plans: [
      {
        name: 'Hàng tháng',
        cta: 'Bắt đầu tháng',
        features: [
          'Toàn quyền marketplace — trader, bot, AI agent',
          'Firewall Foxy AI trên mọi tín hiệu',
          'Dashboard thị trường trực tiếp (CoinGlass + Binance)',
          'Mô phỏng danh mục ở giá trực tiếp',
          'Chat cộng đồng · 7 kênh',
          'Thông báo web + push',
        ],
      },
      {
        name: '3 tháng',
        cta: 'Bắt đầu 3 tháng',
        features: [
          'Toàn bộ gói tháng',
          'OKX copy trading — thực thi một cú nhấp',
          'MCP Suite — toàn bộ 9 agent',
          'Báo cáo hiệu suất quý',
          'Hỗ trợ ưu tiên',
        ],
      },
      {
        name: '6 tháng',
        cta: 'Bắt đầu 6 tháng',
        features: [
          'Toàn bộ gói 3 tháng',
          'Thưởng $BUP theo volume',
          'Truy cập sớm TradFi (Q1 2027)',
          'Tư vấn chiến lược 1:1',
          'Huy hiệu cộng đồng founders',
        ],
      },
    ],
    footer:
      'Mọi gói tính phí bằng USD và tự gia hạn cuối kỳ trừ khi hủy. Hủy từ tài khoản hoặc app store. Không hoàn tiền theo tỷ lệ kỳ dang dở. Không thay thế tư vấn đầu tư — xem Công bố rủi ro. Copy-trading không cung cấp cho cư dân Hoa Kỳ.',
  },
  faq: {
    label: 'Câu hỏi thường gặp',
    headline_1: 'Tất cả câu hỏi của nhà đầu tư và',
    headline_2: 'trader.',
    headline_3: '',
    items: [
      {
        q: 'BottomUP có phải tư vấn đầu tư?',
        a: 'Không. BottomUP không phải cố vấn đầu tư đã đăng ký, broker-dealer hay money services business. Mọi nội dung — tín hiệu, vered Foxy AI, đầu ra MCP, bảng xếp hạng — chỉ mang tính thông tin và giáo dục. Hiệu suất quá khứ (thực hoặc mô phỏng) không đảm bảo tương lai. Mọi quyết định và mọi lỗ là của bạn. Xem Công bố rủi ro.',
      },
      {
        q: 'Copy trading có khả dụng cho cư dân Hoa Kỳ?',
        a: 'Hôm nay thì không. OKX không phục vụ tài khoản bán lẻ tại Hoa Kỳ nên BottomUP không thể định tuyến lệnh copy-trade cho họ. Tính năng social, phân tích và mô phỏng vẫn mở. Khi ra mắt tích hợp tuân thủ Hoa Kỳ, sẽ thông báo.',
      },
      {
        q: 'BottomUP, một câu?',
        a: 'App Store của smart money — marketplace nơi bạn đăng ký trader người, bot thuật toán và AI agent, với mỗi tín hiệu được kiểm toán bởi firewall AI độc quyền của chúng tôi trước khi đến ví.',
      },
      {
        q: 'Foxy AI khác gì copy trading thông thường?',
        a: 'Copy trading truyền thống chỉ sao chép mọi thứ trader (hoặc bot) gửi. Nếu họ revenge trade 50x, bạn cũng vậy. Foxy chặn mỗi tín hiệu, chấm 0–100 qua 225 nguồn và chặn ở firewall nếu rủi ro cao — ngay cả khi đã đăng ký. Kiểm toán, không phải gương.',
      },
      {
        q: 'MCP là gì?',
        a: 'Modular Crypto Processors — chín AI agent chuyên biệt chạy song song với Foxy: giảm rủi ro, timing, ghép cặp, nghiên cứu token, scout airdrop, rebalance, quét quy định, phân kỳ tâm lý, watchdog thao túng.',
      },
      {
        q: 'Có thể đăng ký gì trên marketplace?',
        a: 'Ba loại shop: trader người với setup trực tiếp, bot thuật toán đã duyệt chạy 24/7, và AI agent tự chủ (scout, rebalancer, hedger). Credits cho phép đăng ký cả ba.',
      },
      {
        q: 'Copy trading OKX hoạt động thế nào?',
        a: 'Kết nối API OKX (Read + Trade, không Withdraw). Khi creator bạn đăng ký công bố tín hiệu, Foxy kiểm toán, tối ưu vào/ra và worker của chúng tôi đặt cùng lệnh vào tài khoản bạn. Kiểm soát hoàn toàn — thu hồi API tại OKX hoặc ngắt BottomUP bất cứ lúc nào.',
      },
      {
        q: 'BottomUP Credits là gì?',
        a: 'Tiền tệ chung của marketplace. Mua bằng thẻ hoặc crypto, dùng để đăng ký mọi shop. Creator nhận 25% doanh thu + 10% giới thiệu. Nền tảng lấy 30%; còn lại cho hạ tầng và rebate.',
      },
      {
        q: 'Token $BUP đã có chưa?',
        a: 'Chưa. $BUP ra mắt cùng marketplace năm 2026 với trade-to-earn — tiện ích trong mua hàng marketplace, backtesting, đầy đủ Foxy và thưởng volume. Chi tiết trong pitch deck và whitepaper.',
      },
      {
        q: 'Làm sao để bắt đầu hôm nay?',
        a: 'Đăng ký miễn phí tại bupcore.ai — email, Google, Apple hoặc điện thoại. Tài khoản đồng bộ với iOS và Android ngay. Khám phá shop, thử chế độ mô phỏng Foxy, khi sẵn sàng thì kết nối OKX.',
      },
    ],
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
  ft: {
    tagline:
      'App Store của smart money. Trader hàng đầu, AI agent và bot thuật toán — một marketplace, được bảo vệ bởi Foxy AI.',
    product: 'Sản phẩm',
    account: 'Tài khoản',
    legal: 'Pháp lý',
    nav_foxy: 'Foxy AI',
    nav_marketplace: 'Marketplace',
    nav_mcp: 'MCP Suite',
    nav_pricing: 'Giá',
    signup: 'Bắt đầu miễn phí',
    signin: 'Đăng nhập',
    faq: 'FAQ',
    terms: 'Điều khoản dịch vụ',
    privacy: 'Riêng tư',
    risk: 'Công bố rủi ro',
    disclosure:
      'BottomUP, Inc. là công ty Delaware. BottomUP không phải cố vấn đầu tư đã đăng ký, broker-dealer, commodity pool operator, commodity trading advisor hay money services business. Mọi nội dung trên Dịch vụ — tín hiệu, vered Foxy AI và chiến lược creator — chỉ mang tính thông tin và giáo dục, không phải tư vấn đầu tư, pháp lý hay thuế cá nhân. Hiệu suất quá khứ, mô phỏng và giả định (bao gồm con số "danh mục ảo $10.000") không đảm bảo tương lai. Giao dịch crypto, đặc biệt với đòn bẩy hoặc phái sinh, có rủi ro mất toàn bộ cao. Copy-trading hiện không khả dụng cho cư dân Hoa Kỳ. Cư dân các khu vực bị trừng phạt OFAC không đủ điều kiện.',
    copy: '© {year} BottomUP, Inc. · Đã giữ mọi quyền.',
    address: '1209 Orange St, Wilmington, DE 19801, Hoa Kỳ',
  },
};
