import { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
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

// Configuração da API KEY - Tenta ler de múltiplas fontes para garantir funcionamento no APK
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (process.env.GEMINI_API_KEY as string);

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
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    if (!API_KEY) {
      setError("Chave de API não configurada. Verifique o arquivo .env");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const genAI = new GoogleGenAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Atue como um analista de inteligência especializado em Israel. 
      Busque as notícias mais recentes de: ${NEWS_SOURCES.join(", ")}.
      Retorne um JSON com 5 itens contendo: title, originalUrl, contentPt (resumo em português), 
      analysisPt (análise geopolítica curta) e sourceName. 
      Foque no contexto de: ${type === 'latest' ? 'últimas notícias' : type === 'analysis' ? 'análises estratégicas' : 'contexto histórico'}.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Limpeza de possíveis marcações de markdown no JSON
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(jsonStr);
      
      setNews(data);
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar notícias em tempo real. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#E4E3E0]" />
      <p className="text-xs font-mono uppercase opacity-50 tracking-widest">Sincronizando com fontes em Israel...</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-lg text-center">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
      <p className="text-sm font-bold text-red-200">{error}</p>
      <button onClick={fetchNews} className="mt-4 text-xs font-mono uppercase underline hover:opacity-70">Tentar novamente</button>
    </div>
  );

  return (
    <div className="grid gap-8">
      {news.map((item, i) => (
        <motion.article 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="group border-b border-[#E4E3E0]/10 pb-8 last:border-0"
        >
          <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">
            <span className="bg-[#E4E3E0]/10 px-2 py-0.5 rounded text-[#E4E3E0]">{item.sourceName}</span>
            <span>•</span>
            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> AGORA</div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-4 group-hover:text-[#E4E3E0]/80 transition-colors">
            {item.title}
          </h2>

          <div className="grid md:grid-cols-[1fr,300px] gap-8">
            <div className="prose prose-invert max-w-none prose-sm text-[#E4E3E0]/80">
              <Markdown>{item.contentPt}</Markdown>
            </div>
            
            <div className="bg-[#E4E3E0]/5 p-4 rounded-lg border border-[#E4E3E0]/10">
              <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Análise PG NEWS
              </h4>
              <p className="text-xs leading-relaxed italic opacity-70">
                {item.analysisPt}
              </p>
            </div>
          </div>

          <a 
            href={item.originalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-[10px] font-mono uppercase tracking-widest border border-[#E4E3E0]/20 px-4 py-2 hover:bg-[#E4E3E0] hover:text-[#0E0E0E] transition-all"
          >
            Ler Fonte Original <ExternalLink className="w-3 h-3" />
          </a>
        </motion.article>
      ))}
    </div>
  );
}

function Navbar() {
  return (
    <nav className="border-b border-[#E4E3E0]/10 py-6 sticky top-0 bg-[#0E0E0E]/80 backdrop-blur-md z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-[#E4E3E0] text-[#0E0E0E] p-1.5 font-black text-xl leading-none">PG</div>
          <span className="font-bold text-lg tracking-tighter uppercase">News <span className="opacity-40">RT</span></span>
        </Link>
        
        <div className="hidden md:flex gap-8 text-[10px] font-mono uppercase tracking-[0.2em]">
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
            <p className="text-[9px] font-mono opacity-20 uppercase tracking-[0.3em]">
              © 2026 PG News Israel • Inteligência e Monitoramento
            </p>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
}
