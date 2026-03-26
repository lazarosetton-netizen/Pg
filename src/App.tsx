import { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { 
  Newspaper, 
  RefreshCw, 
  Globe, 
  History, 
  ShieldCheck, 
  ExternalLink,
  Clock,
  AlertCircle,
  ChevronRight,
  Search,
  Loader2,
  LayoutGrid,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useInView } from 'react-intersection-observer';

// Types for our news data
interface NewsItem {
  title: string;
  originalUrl: string;
  contentPt: string;
  analysisPt: string;
  sourceName: string;
  timestamp: string;
}

const NEWS_SOURCES = [
  "timesofisrael.com",
  "ynet.co.il",
  "c14.co.il",
  "i24news.tv",
  "kan.org.il",
  "13tv.co.il"
];

function NewsFeed({ type }: { type: 'latest' | 'analysis' | 'history' }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [seenUrls, setSeenUrls] = useState<Set<string>>(new Set());
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Load from cache on mount
  useEffect(() => {
    const cacheKey = `israel_news_cache_${type}`;
    const cachedNews = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(`${cacheKey}_time`);
    
    if (cachedNews && cachedTime) {
      try {
        const parsed = JSON.parse(cachedNews);
        setNews(parsed);
        setLastUpdated(new Date(parseInt(cachedTime)));
        const urls = new Set<string>(parsed.map((item: NewsItem) => item.originalUrl));
        setSeenUrls(urls);
      } catch (e) {
        console.error("Failed to parse cache", e);
      }
    }
  }, [type]);

  const fetchNews = useCallback(async (isInitial = true, isBackground = false) => {
    if (isInitial && !isBackground) {
      setLoading(true);
    } else if (!isInitial) {
      if (loadingMore) return;
      setLoadingMore(true);
    }
    
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' });
      
      let timeframePrompt = "";
      let focusPrompt = "";

      switch (type) {
        case 'latest':
          timeframePrompt = isInitial ? `BREAKING NEWS de AGORA (${now} UTC)` : "notícias de 24-48 horas atrás";
          focusPrompt = "focando na situação geopolítica e conflitos IMEDIATOS";
          break;
        case 'analysis':
          timeframePrompt = "notícias dos últimos 3 dias com forte impacto estratégico";
          focusPrompt = "focando em ANÁLISES PROFUNDAS de longo prazo e implicações estratégicas";
          break;
        case 'history':
          timeframePrompt = isInitial ? "notícias de 7 a 14 dias atrás" : "notícias de 15 a 30 dias atrás";
          focusPrompt = "focando no contexto histórico e na evolução dos eventos";
          break;
      }

      const prompt = `PESQUISA RÁPIDA: ${timeframePrompt} sobre Israel/Oriente Médio. ${focusPrompt}.
      Domínios: ${NEWS_SOURCES.join(', ')}.
      
      ${!isInitial ? `NÃO inclua: ${Array.from(seenUrls).slice(-5).join(', ')}` : ''}

      Retorne JSON com:
      1. title: Título em PT-BR.
      2. originalUrl: URL.
      3. contentPt: Tradução resumida e clara em PT-BR.
      4. analysisPt: Análise geopolítica pró-Israel (fatos/lógica/história) em PT-BR.
      5. sourceName: Fonte.
      6. timestamp: Tempo decorrido.
      
      Limite a 4 notícias para velocidade.`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                originalUrl: { type: Type.STRING },
                contentPt: { type: Type.STRING },
                analysisPt: { type: Type.STRING },
                sourceName: { type: Type.STRING },
                timestamp: { type: Type.STRING }
              },
              required: ["title", "originalUrl", "contentPt", "analysisPt", "sourceName"]
            }
          }
        }
      });

      const result: NewsItem[] = JSON.parse(response.text || "[]");
      const newItems = result.filter(item => !seenUrls.has(item.originalUrl));
      
      if (newItems.length > 0) {
        setNews(prev => {
          const updated = isInitial ? [...newItems, ...prev.filter(p => !newItems.some(n => n.originalUrl === p.originalUrl))] : [...prev, ...newItems];
          const cacheKey = `israel_news_cache_${type}`;
          localStorage.setItem(cacheKey, JSON.stringify(updated.slice(0, 20)));
          localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
          return updated;
        });
        
        setSeenUrls(prev => {
          const next = new Set(prev);
          newItems.forEach(item => next.add(item.originalUrl));
          return next;
        });
      }
      
      if (isInitial) setLastUpdated(new Date());
    } catch (err) {
      console.error("Erro ao buscar notícias:", err);
      if (news.length === 0) setError("Erro ao carregar. Tente novamente.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loadingMore, seenUrls, news.length, type]);

  useEffect(() => {
    const cacheKey = `israel_news_cache_${type}`;
    const hasCache = localStorage.getItem(cacheKey);
    fetchNews(true, !!hasCache);
    
    const interval = setInterval(() => {
      if (!document.hidden && type === 'latest') {
        fetchNews(true, true);
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [type]);

  useEffect(() => {
    if (inView && !loading && !loadingMore && news.length > 0) {
      fetchNews(false);
    }
  }, [inView, loading, loadingMore, news.length, fetchNews]);

  const Skeleton = () => (
    <div className="animate-pulse grid md:grid-cols-[1fr_350px] gap-8 border-b border-[#141414]/10 pb-12">
      <div className="space-y-6">
        <div className="h-4 w-24 bg-[#141414]/10 rounded" />
        <div className="h-12 w-full bg-[#141414]/10 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-[#141414]/10 rounded" />
          <div className="h-4 w-full bg-[#141414]/10 rounded" />
          <div className="h-4 w-2/3 bg-[#141414]/10 rounded" />
        </div>
      </div>
      <div className="h-64 w-full bg-[#141414]/5 rounded" />
    </div>
  );

  return (
    <div className="grid gap-12">
      {loading && news.length === 0 ? (
        <div className="space-y-12">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <>
          {loading && news.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-mono opacity-40 uppercase tracking-widest mb-4 animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              Sincronizando {type === 'latest' ? 'feed' : 'seção'}...
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {news.map((item, index) => (
              <motion.article 
                key={item.originalUrl + index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`group grid gap-8 border-b border-[#141414]/10 pb-12 last:border-0 ${type === 'analysis' ? 'md:grid-cols-[350px_1fr]' : 'md:grid-cols-[1fr_350px]'}`}
              >
                {/* Main Content */}
                <div className={`space-y-6 ${type === 'analysis' ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-center gap-3">
                    <span className="bg-[#141414] text-[#E4E3E0] text-[10px] font-mono px-2 py-0.5 uppercase tracking-tighter">
                      {item.sourceName}
                    </span>
                    {item.timestamp && (
                      <span className="text-[10px] font-mono opacity-40 uppercase">
                        {item.timestamp}
                      </span>
                    )}
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold tracking-tighter leading-[0.9] group-hover:text-[#141414]/80 transition-colors">
                    {item.title}
                  </h2>

                  <div className="prose prose-sm max-w-none text-[#141414]/80 leading-relaxed font-serif italic text-lg">
                    <Markdown>{item.contentPt}</Markdown>
                  </div>

                  <a 
                    href={item.originalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border-b border-[#141414] pb-1 hover:gap-3 transition-all"
                  >
                    Ver fonte original <ExternalLink size={12} />
                  </a>
                </div>

                {/* Analysis Sidebar */}
                <aside className={`bg-[#141414] text-[#E4E3E0] p-6 rounded-sm space-y-6 self-start ${type === 'analysis' ? 'order-1 border-l-4 border-blue-500' : 'order-2'}`}>
                  <div className="flex items-center gap-2 border-b border-[#E4E3E0]/20 pb-3">
                    <ShieldCheck size={18} className="text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">
                      {type === 'analysis' ? 'Análise Estratégica' : 'Análise Geopolítica'}
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <History size={16} className="shrink-0 opacity-40 mt-1" />
                      <div className="text-sm leading-relaxed font-mono text-[#E4E3E0]/90">
                        <Markdown>{item.analysisPt}</Markdown>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E4E3E0]/10">
                    <p className="text-[9px] font-mono opacity-40 uppercase leading-tight">
                      Baseado em fatos históricos, dados e lógica de soberania nacional.
                    </p>
                  </div>
                </aside>
              </motion.article>
            ))}
          </AnimatePresence>

          {/* Loading More Indicator / Trigger */}
          <div ref={loadMoreRef} className="py-12 flex justify-center">
            {loadingMore ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin opacity-40" />
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Carregando mais conteúdo...</p>
              </div>
            ) : (
              <div className="h-4 w-full" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/', label: 'Últimas', icon: LayoutGrid },
    { path: '/analises', label: 'Análises', icon: TrendingUp },
    { path: '/historico', label: 'Histórico', icon: Calendar },
  ];

  return (
    <nav className="sticky top-[73px] z-40 bg-[#E4E3E0]/95 backdrop-blur-md border-b border-[#141414] px-6 py-2">
      <div className="max-w-6xl mx-auto flex gap-8">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link 
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all py-2 border-b-2 ${isActive ? 'border-[#141414] opacity-100' : 'border-transparent opacity-40 hover:opacity-100'}`}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#E4E3E0] border-b border-[#141414] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] text-[#E4E3E0] p-2 rounded-sm relative">
              <Globe size={24} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#E4E3E0] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold uppercase tracking-tighter leading-none">Israel News</h1>
                <span className="bg-red-500 text-white text-[8px] font-bold px-1 rounded-xs animate-pulse">LIVE</span>
              </div>
              <p className="text-[10px] font-mono opacity-60 uppercase tracking-widest">Real-Time Geopolitical Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer"
            >
              <RefreshCw size={14} />
              Reset
            </button>
          </div>
        </header>

        <Navigation />

        <main className="max-w-6xl mx-auto p-6">
          {/* Sources Bar */}
          <div className="mb-8 border-b border-[#141414]/20 pb-4 overflow-x-auto">
            <div className="flex gap-6 whitespace-nowrap">
              <span className="text-[10px] font-mono opacity-40 uppercase self-center">Fontes:</span>
              {NEWS_SOURCES.map(source => (
                <span key={source} className="text-[11px] font-mono opacity-60 hover:opacity-100 transition-opacity cursor-default italic">
                  {source}
                </span>
              ))}
            </div>
          </div>

          <Routes>
            <Route path="/" element={<NewsFeed type="latest" />} />
            <Route path="/analises" element={<NewsFeed type="analysis" />} />
            <Route path="/historico" element={<NewsFeed type="history" />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="mt-20 border-t border-[#141414] p-12 bg-[#141414] text-[#E4E3E0]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe size={20} />
                <span className="font-bold uppercase tracking-tighter">Israel News Real-Time</span>
              </div>
              <p className="text-sm opacity-60 leading-relaxed max-w-md">
                Monitoramento contínuo da situação geopolítica no Oriente Médio. 
                Traduções e análises fundamentadas em dados históricos e soberania estatal.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Links Rápidos</h4>
                <ul className="text-xs space-y-1 font-bold uppercase tracking-wider">
                  <li><Link to="/" className="hover:underline">Últimas</Link></li>
                  <li><Link to="/analises" className="hover:underline">Análises</Link></li>
                  <li><Link to="/historico" className="hover:underline">Histórico</Link></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Contato</h4>
                <p className="text-xs font-bold uppercase tracking-wider">contato@israelnews.rt</p>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-[#E4E3E0]/10 flex flex-col md:flex-row justify-between gap-4">
            <p className="text-[10px] font-mono opacity-40 uppercase">© 2026 Israel News Real-Time. Todos os direitos reservados.</p>
            <div className="flex gap-6 text-[10px] font-mono opacity-40 uppercase">
              <a href="#" className="hover:text-[#E4E3E0]">Privacidade</a>
              <a href="#" className="hover:text-[#E4E3E0]">Termos</a>
            </div>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
}
