import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, CheckCircle, Loader2, User, Bot, Phone, Mail, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from './VendedoresTab';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qualify-lead-chat`;
const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lead-report`;

interface Props {
  lead: Lead;
  qualificacaoId: string;
  onBack: () => void;
  onReportGenerated: (lead: Lead) => void;
}

export function QualificationChat({ lead, qualificacaoId, onBack, onReportGenerated }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load existing messages
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('mensagens_qualificacao')
        .select('role, content')
        .eq('qualificacao_id', qualificacaoId)
        .order('created_at', { ascending: true });
      if (data && data.length > 0) {
        setMessages(data as Message[]);
        setInitialized(true);
      } else {
        // Start conversation
        startConversation();
      }
    };
    load();
  }, [qualificacaoId]);

  const startConversation = async () => {
    setIsStreaming(true);
    setInitialized(true);
    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [], leadName: lead.nome }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed to start');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantContent += c;
              setMessages([{ role: 'assistant', content: assistantContent }]);
            }
          } catch {}
        }
      }

      // Save message
      if (user && assistantContent) {
        await supabase.from('mensagens_qualificacao').insert({
          qualificacao_id: qualificacaoId,
          vendedor_id: user.id,
          role: 'assistant',
          content: assistantContent,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao iniciar conversa');
    }
    setIsStreaming(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !user) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');

    // Save user message
    await supabase.from('mensagens_qualificacao').insert({
      qualificacao_id: qualificacaoId,
      vendedor_id: user.id,
      role: 'user',
      content: userMsg.content,
    });

    setIsStreaming(true);
    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, leadName: lead.nome }),
      });

      if (!resp.ok || !resp.body) throw new Error('Stream failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantContent += c;
              setMessages([...allMessages, { role: 'assistant', content: assistantContent }]);
            }
          } catch {}
        }
      }

      if (assistantContent) {
        await supabase.from('mensagens_qualificacao').insert({
          qualificacao_id: qualificacaoId,
          vendedor_id: user.id,
          role: 'assistant',
          content: assistantContent,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro na resposta da IA');
    }
    setIsStreaming(false);
  };

  const handleGenerateReport = async () => {
    if (!user) return;
    setIsGeneratingReport(true);
    try {
      const resp = await fetch(REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ chatHistory: messages, leadName: lead.nome }),
      });

      if (!resp.ok) throw new Error('Report generation failed');
      const { report } = await resp.json();

      // Update lead with report
      const fitComercial = report?.fit_comercial?.nivel || null;
      const notaProntidao = report?.nota_prontidao?.nota ?? null;

      await supabase.from('leads').update({
        status: 'Qualificado',
        fit_comercial: fitComercial,
        nota_prontidao: notaProntidao,
        relatorio: report,
      }).eq('id', lead.id);

      // Update qualificacao
      await supabase.from('qualificacoes').update({
        historico_chat: messages,
        relatorio: report,
      }).eq('id', qualificacaoId);

      toast.success('Relatório gerado com sucesso!');
      onReportGenerated({
        ...lead,
        status: 'Qualificado',
        fit_comercial: fitComercial,
        nota_prontidao: notaProntidao,
        relatorio: report,
      });
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar relatório');
    }
    setIsGeneratingReport(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Left panel - Lead info */}
      <div className="w-72 shrink-0 bg-card rounded-lg border border-border p-4 space-y-4 overflow-y-auto">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div>
          <h3 className="font-bold text-lg text-foreground">{lead.nome}</h3>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{lead.telefone}</p>
            {lead.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{lead.email}</p>}
          </div>
        </div>
        {lead.como_chegou && (
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Como chegou</p>
            <p className="text-sm text-foreground">{lead.como_chegou}</p>
          </div>
        )}
        {lead.observacoes_iniciais && (
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1"><StickyNote className="w-3 h-3" />Observações</p>
            <p className="text-sm text-foreground">{lead.observacoes_iniciais}</p>
          </div>
        )}
        <div className="pt-4 border-t border-border">
          <Button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || messages.length < 4}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isGeneratingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Encerrar e Gerar Relatório
          </Button>
          {messages.length < 4 && (
            <p className="text-xs text-muted-foreground mt-1 text-center">Mínimo de 4 mensagens para gerar</p>
          )}
        </div>
      </div>

      {/* Right panel - Chat */}
      <div className="flex-1 flex flex-col bg-card rounded-lg border border-border overflow-hidden">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground">Qualificação — {lead.nome}</h3>
          <p className="text-xs text-muted-foreground">Chat com IA qualificadora</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-2 max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'assistant'
                    ? 'bg-muted/50 text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite a resposta do lead..."
              rows={1}
              className="resize-none min-h-[40px] max-h-[120px]"
              disabled={isStreaming}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isStreaming} size="icon" className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
