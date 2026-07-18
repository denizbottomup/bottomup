/**
 * Yatırımcı profilleri — kaynak: Galata Business Angels üye sayfaları
 * (galatabusinessangels.com/tr/biz/*, Tem 2026'da derlendi). Biyografiler
 * oradaki metinlerden İngilizce'ye özetlenerek aktarıldı; fotoğraflar
 * public/cap-table/ altında yerel kopya. `investorName` cap table'daki
 * işlem kayıtlarıyla birebir eşleşir.
 */

export interface InvestorProfile {
  /** data.ts'teki işlem kayıtlarında geçen isim. */
  investorName: string;
  displayName: string;
  photo: string;
  bio: string;
  sourceUrl: string;
}

export const investorProfiles: InvestorProfile[] = [
  {
    investorName: 'Fethi Saruhan Tan',
    displayName: 'Saruhan Tan',
    photo: '/cap-table/saruhan-tan.jpg',
    bio: 'Retail and hospitality entrepreneur. Long-time board member of the family-founded YKM department store group until exiting in 2013; co-owner of the Big Chefs restaurant chain (23 locations) and chairman of YKM Turizm and Lidya Yazılım. Former president of Türkiye’s United Brands Association (BMD) and an active angel investor across many Turkish startups.',
    sourceUrl: 'https://galatabusinessangels.com/tr/biz/saruhan-tan/',
  },
  {
    investorName: 'Kaan Boyner',
    displayName: 'Kaan Boyner',
    photo: '/cap-table/kaan-boyner.jpg',
    bio: 'CFO of Dore Group, active in textiles and finance. Dual degree in Economics and Computer Science from NYU and an MSc in Industrial Engineering from Columbia; started his career at Morgan Stanley New York in prime brokerage. Board member of the Turkish Textile Employers’ Association and an angel investor with Galata Business Angels.',
    sourceUrl: 'https://galatabusinessangels.com/tr/biz/kaan-boyner/',
  },
  {
    investorName: 'Omer Akarca',
    displayName: 'Ömer Faruk Akarca',
    photo: '/cap-table/omer-akarca.jpg',
    bio: 'Serial entrepreneur and startup advisor. Electrical-electronics engineer (Başkent University) with an entrepreneurship-focused MBA from the University of Illinois at Chicago, where he advised small businesses with the SBA. GBA member since 2010 and a founding member of Entrepreneurs’ Organization (EO) Turkey.',
    sourceUrl: 'https://galatabusinessangels.com/tr/biz/omer-akarca/',
  },
  {
    investorName: 'Varol Civil',
    displayName: 'Varol Civil',
    photo: '/cap-table/varol-civil.jpg',
    bio: 'Veteran banker. CEO of TEB (Türk Ekonomi Bankası) for ten years from 2003 and board member of TEB Group thereafter; earlier a sworn bank auditor at the Treasury and deputy GM at Arab-Türk Bank. Served seven years as vice-chairman of the Banks Association of Türkiye; Endeavor Turkey board member and a licensed angel investor.',
    sourceUrl: 'https://galatabusinessangels.com/tr/biz/varol-civil/',
  },
  {
    investorName: 'Adil Esat Ugurlu',
    displayName: 'Esat Uğurlu',
    photo: '/cap-table/esat-ugurlu.jpg',
    bio: 'E-learning entrepreneur, investor and mentor with 15+ years in the sector. Founder of Globed E-learning and Okuvaryum, whose content and services reach over a million users in four countries. Educated at Tarsus American College and Brandeis University; early career at SecondLife.com and UNESCO Bangkok / iGroup Asia Pacific. TEDx speaker.',
    sourceUrl: 'https://galatabusinessangels.com/tr/biz/esat-ugurlu/',
  },
];
