import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'en' | 'vi';

const STORAGE_KEY = 'stillhere:locale:v1';

const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    'nav.request': 'Request Verify',
    'nav.cases': 'My Cases',
    'nav.registry': 'Registry',
    'nav.stats': 'Stats',
    'nav.explorer': 'Explorer',
    'nav.vault': 'Vault',
    'nav.api': 'API',
    'nav.how': 'How It Works',
    'nav.trust': 'View my trust profile',
    'nav.connect': 'Connect MetaMask',
    'nav.connecting': 'Connecting...',
    'lang.label': 'Language',
    'lang.en': 'EN',
    'lang.vi': 'VI',
    'home.badge': 'Powered by GenLayer Consensus',
    'home.hero.h1a': 'Protect Loved Ones from',
    'home.hero.h1b': 'Romance Scams On-Chain',
    'home.hero.lead': 'StillHere lets families submit a suspect profile URL and chat pattern to a decentralized AI Jury on GenLayer. Independent validator LLMs read the profile live, weigh the evidence, and reach consensus on an advisory verdict — no single company issues the judgment, no plaintext is stored on-chain.',
    'home.cta.request': 'Request AI Verification',
    'home.cta.how': 'How the Protocol Works',
    'explorer.title': 'Case Explorer',
    'explorer.subtitle': 'Browsable public index of every case submitted to the AI Jury. Search by verdict, requester wallet, submission date, or public URL. Every row deep-links to the on-chain verdict and the Explorer tx.',
    'explorer.filter.label': 'Filter by verdict',
    'explorer.filter.all': 'All verdicts',
    'explorer.search.placeholder': 'Search public URL, requester address, or case id…',
    'explorer.empty': 'No cases match the current filter.',
    'explorer.hint.local': 'Showing cases from your local session. Contract-side aggregation lands once the v0.3.0 contracts are redeployed on studionet.',
    'explorer.header.case': 'Case',
    'explorer.header.verdict': 'Verdict',
    'explorer.header.confidence': 'Conf.',
    'explorer.header.submitted': 'Submitted',
    'explorer.header.requester': 'Requester',
    'explorer.header.share': 'Share',
    'explorer.feed.label': 'Subscribe to public feed',
    'explorer.feed.atom': 'Atom feed',
    'explorer.feed.json': 'JSON feed',
    'explorer.share.copied': 'Share URL copied',
    'annotate.title': 'Community annotations',
    'annotate.subtitle': 'Anyone can attach one short annotation per case — a witness sighting, a corroborating link, a safety tip. One annotation per wallet per case; a global cooldown throttles spam.',
    'annotate.category': 'Category',
    'annotate.body': 'Annotation text (hashed before submission — plaintext is NOT stored on-chain)',
    'annotate.url': 'Evidence URL (optional)',
    'annotate.submit': 'Post annotation',
    'annotate.category.WITNESS': 'Witness — I have also been contacted by this profile',
    'annotate.category.INHERITED_PATTERN': 'Inherited pattern — same phrasing / photos as another case',
    'annotate.category.COUNTER_CONTEXT': 'Counter context — evidence that contradicts the primary verdict',
    'annotate.category.CORROBORATE': 'Corroborate — external evidence supporting the verdict',
    'annotate.category.SAFETY_TIP': 'Safety tip — advisory for readers of this case',
    'annotate.count': 'annotations',
    'annotate.author': 'by',
    'annotate.posted': 'posted',
    'annotate.contract_missing': 'The annotations contract is not deployed on this network. Point VITE_ANNOTATIONS_ADDRESS at a deployment to enable this feature.',
  },
  vi: {
    'nav.request': 'Gửi yêu cầu',
    'nav.cases': 'Vụ của tôi',
    'nav.registry': 'Sổ đăng ký',
    'nav.stats': 'Thống kê',
    'nav.explorer': 'Trình duyệt',
    'nav.vault': 'Kho mã hóa',
    'nav.api': 'API',
    'nav.how': 'Cách hoạt động',
    'nav.trust': 'Xem uy tín của tôi',
    'nav.connect': 'Kết nối MetaMask',
    'nav.connecting': 'Đang kết nối...',
    'lang.label': 'Ngôn ngữ',
    'lang.en': 'EN',
    'lang.vi': 'VI',
    'home.badge': 'Dựa trên đồng thuận GenLayer',
    'home.hero.h1a': 'Bảo vệ người thân khỏi',
    'home.hero.h1b': 'lừa đảo tình cảm — on-chain',
    'home.hero.lead': 'StillHere cho phép gia đình gửi URL hồ sơ nghi vấn và mẫu tin nhắn tới Bồi thẩm AI phi tập trung trên GenLayer. Các validator LLM độc lập đọc hồ sơ trực tiếp, xét chứng cứ, và đạt đồng thuận về một phán quyết mang tính tư vấn — không công ty nào đơn phương ra phán quyết, không lưu văn bản gốc trên chuỗi.',
    'home.cta.request': 'Yêu cầu AI kiểm tra',
    'home.cta.how': 'Giao thức hoạt động ra sao',
    'explorer.title': 'Trình duyệt vụ',
    'explorer.subtitle': 'Chỉ mục công khai duyệt được cho mọi vụ đã gửi lên Bồi thẩm AI. Lọc theo phán quyết, ví người gửi, ngày, hoặc URL công khai. Mỗi hàng đều liên kết trực tiếp tới phán quyết on-chain và tx trên Explorer.',
    'explorer.filter.label': 'Lọc theo phán quyết',
    'explorer.filter.all': 'Tất cả',
    'explorer.search.placeholder': 'Tìm URL công khai, địa chỉ ví, hoặc case id…',
    'explorer.empty': 'Không có vụ nào khớp bộ lọc hiện tại.',
    'explorer.hint.local': 'Đang hiển thị các vụ từ phiên cục bộ của bạn. Chỉ mục toàn cục sẽ hoạt động khi hợp đồng v0.3.0 được redeploy trên studionet.',
    'explorer.header.case': 'Vụ',
    'explorer.header.verdict': 'Phán quyết',
    'explorer.header.confidence': 'Độ tin',
    'explorer.header.submitted': 'Gửi lúc',
    'explorer.header.requester': 'Người gửi',
    'explorer.header.share': 'Chia sẻ',
    'explorer.feed.label': 'Đăng ký nhận feed công khai',
    'explorer.feed.atom': 'Atom feed',
    'explorer.feed.json': 'JSON feed',
    'explorer.share.copied': 'Đã copy đường dẫn chia sẻ',
    'annotate.title': 'Ghi chú cộng đồng',
    'annotate.subtitle': 'Ai cũng có thể đính kèm MỘT ghi chú ngắn cho mỗi vụ — nhân chứng, liên kết chứng thực, hoặc lời khuyên an toàn. Mỗi ví chỉ ghi chú được một lần cho một vụ; cooldown toàn cục chống spam.',
    'annotate.category': 'Loại',
    'annotate.body': 'Nội dung ghi chú (băm trước khi gửi — văn bản gốc KHÔNG lưu on-chain)',
    'annotate.url': 'URL chứng cứ (không bắt buộc)',
    'annotate.submit': 'Đăng ghi chú',
    'annotate.category.WITNESS': 'Nhân chứng — tôi cũng bị hồ sơ này liên lạc',
    'annotate.category.INHERITED_PATTERN': 'Kế thừa mô-típ — cùng câu chữ / ảnh với một vụ khác',
    'annotate.category.COUNTER_CONTEXT': 'Ngữ cảnh phản biện — chứng cứ mâu thuẫn với phán quyết chính',
    'annotate.category.CORROBORATE': 'Chứng thực — chứng cứ bên ngoài ủng hộ phán quyết',
    'annotate.category.SAFETY_TIP': 'Mẹo an toàn — lời khuyên cho người đọc vụ này',
    'annotate.count': 'ghi chú',
    'annotate.author': 'bởi',
    'annotate.posted': 'lúc',
    'annotate.contract_missing': 'Hợp đồng annotations chưa được triển khai trên mạng này. Đặt VITE_ANNOTATIONS_ADDRESS trỏ tới một deploy để bật tính năng.',
  },
};

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx>({
  locale: 'en',
  setLocale: () => {
    /* replaced in Provider */
  },
  t: (k: string) => k,
});

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  // best-effort: detect Vietnamese browsers on first visit
  try {
    const l = (navigator.language || '').toLowerCase();
    if (l.startsWith('vi')) return 'vi';
  } catch {
    /* ignore */
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => readInitialLocale());

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    try {
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = locale;
    } catch {
      /* ignore */
    }
  }, [locale]);

  const t = useCallback((key: string) => STRINGS[locale][key] ?? STRINGS.en[key] ?? key, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useI18n(): I18nCtx {
  return useContext(Ctx);
}

export const LanguageToggle: React.FC = () => {
  const { locale, setLocale, t } = useI18n();
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  return (
    <button
      onClick={() => setLocale(other)}
      aria-label={t('lang.label')}
      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono inline-flex items-center gap-1"
    >
      <span className={locale === 'en' ? 'text-brand-400' : 'text-slate-500'}>{t('lang.en')}</span>
      <span className="text-slate-700">/</span>
      <span className={locale === 'vi' ? 'text-brand-400' : 'text-slate-500'}>{t('lang.vi')}</span>
    </button>
  );
};
