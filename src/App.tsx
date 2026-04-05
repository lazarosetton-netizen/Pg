import { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
// IMPORTAÇÃO CORRIGIDA
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Newspaper, RefreshCw, Globe, History, ShieldCheck, 
  ExternalLink, Clock, AlertCircle, ChevronRight, 
  Search, Loader2, LayoutGrid, TrendingUp, Calendar 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useInView } from 'react-intersection-observer';

// CHAVE DE API FIXA PARA GARANTIR CONEXÃO NO APK
const API_KEY = "AIzaSyCFlkjLQ9M4WoK-qVKQ_P8VPs1iy7Kwce0";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // INICIALIZAÇÃO DA IA CORRIGIDA
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Aja como um correspondente de guerra em Israel. 
        Acesse mentalmente as últimas notícias de: ${NEWS_SOURCES.join(', ')}.
        Gere um JSON com as 5 notícias mais recentes e importantes sobre segurança e geopolítica de Israel.
        Formato do JSON:
        [
          {
            "title": "Título impactante em PT-BR",
            "originalUrl": "url da fonte",
            "contentPt": "Resumo detalhado em 3 parágrafos em PT-BR",
            "analysisPt": "Análise estratégica curta do PG NEWS",
            "sourceName": "Nome da Fonte",
            "timestamp": "Horário atual"
          }
        ]
        Retorne APENAS o JSON, sem markdown.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Limpeza de possíveis marcações de código do Gemini
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanJson);
      
      setNews(data);
    } catch (err: any) {
      console.error("Erro na conexão:", err);
      setError("Falha ao conectar com o satélite de notícias. Verifique sua internet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews, type]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#E4E3E0] opacity-20" />
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Sincronizando com Tel Aviv...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between border-b border-[#E4E3E0]/10 pb-6">
        <div>
          <h2 className="text-2xl font-light tracking-tight capitalize">{type === 'latest' ? 'Tempo Real' : type}</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-40 mt-1">Atualizado via Inteligência Artificial</p>
        </div>
        <button 
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="p-3 rounded-full border border-[#E4E3E0]/10 hover:bg-[#E4E3E0]/5 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200/80 font-light">{error}</p>
        </div>
      )}

      <div className="grid gap-16">
        {news.map((item, index) => (
          <motion.article 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative"
          >
            <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-widest opacity-40">
              <span className="bg-[#E4E3E0] text-[#0E0E0E] px-2 py-0.5 font-bold">{item.sourceName}</span>
              <span>•</span>
              <span>{item.timestamp}</span>
            </div>
            
            <h3 className="text-3xl font-light leading-tight mb-6 group-hover:text-white transition-colors tracking-tight">
              {item.title}
            </h3>

            <div className="grid md:grid-cols-[1fr_250px] gap-8">
              <div className="prose prose-invert max-w-none">
                <p className="text-[#E4E3E0]/70 leading-relaxed text-lg font-light italic">
                  {item.contentPt}
                </p>
              </div>
              
              <div className="p-6 bg-[#E4E3E0]/5 border-l-2 border-[#E4E3E0]/20">
                <div className="flex items-center gap-2 mb-3 text-[9px] font-mono uppercase tracking-widest opacity-50 text-[#E4E3E0]">
                  <ShieldCheck className="w-3 h-3" />
                  Análise Estratégica
                </div>
                <p className="text-xs leading-relaxed opacity-80 font-light italic">
                  {item.analysisPt}
                </p>
              </div>
            </div>

            <a 
              href={item.originalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-8 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-all border-b border-transparent hover:border-[#E4E3E0]/40 pb-1"
            >
              Ver Fonte Original <ExternalLink className="w-3 h-3" />
            </a>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-[#0E0E0E]/80 backdrop-blur-md border-b border-[#E4E3E0]/5 py-6">
      <div className="container mx-auto px-4 flex justify-between items-center max-w-4xl">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-[#E4E3E0] flex items-center justify-center rounded-sm group-hover:rotate-90 transition-transform duration-500">
            <span className="text-[#0E0E0E] font-black text-xs">PG</span>
          </div>
          <span className="font-light tracking-[0.3em] text-sm uppercase">News</span>
        </Link>
        <div className="flex gap-8 text-[10px] font-mono uppercase tracking-widest">
          <Link to="/" className="hover:opacity-50 transition-opacity">Últimas</Link>
          <Link to="/analises" className="hover:opacity-50 transition-opacity">Análises</Link>
          <Link to="/historico" className="hover:opacity-50 transition-opacity">Histórico</Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#0E0E0E] text-[#E4E3E0] selection:bg-[#E4E3E0] selection:text-[#0E0E0E]">
        <Navbar />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Routes>
            <Route path="/" element={<NewsFeed type="latest" />} />
            <Route path="/analises" element={<NewsFeed type="analysis" />} />
            <Route path="/historico" element={<NewsFeed type="history" />} />
          </Routes>
        </main>
        
        <footer className="border-t border-[#E4E3E0]/10 mt-20 py-12 bg-[#0E0E0E]">
          <div className="container mx-auto px-4 text-center">
            <div className="flex justify-center gap-8 mb-8 text-[10px] font-mono uppercase tracking-widest opacity-40">
              <Link to="/">Início</Link>
              <Link to="/analises">Defesa</Link>
              <Link to="/historico">Arquivo</Link>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-20">PG NEWS • Monitoramento Geopolítico</p>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
}
