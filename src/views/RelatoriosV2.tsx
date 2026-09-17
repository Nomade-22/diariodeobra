'use client';

import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClientes, useFuncionarios, useRegistros, Registro } from '@/hooks/useApi';
import { resolvePhotoSrc } from '@/lib/photos';
import {
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  CalendarDays,
  Users,
  CheckCircle2,
} from 'lucide-react';

type Activity = {
  id: string;
  time: string;
  description: string;
  employees: string;
  ofos: string;
  observation: string;
};

type Photo = {
  id: string;
  src: string;
  label: string;
  activity: string;
  employees: string;
  include: boolean;
};

type DayReport = {
  key: string;
  dateLabel: string;
  client: string;
  schedule: string;
  headcount: number;
  team: string;
  ofos: string;
  activities: Activity[];
  photos: Photo[];
};

type Draft = {
  title: string;
  number: string;
  period: string;
  client: string;
  days: DayReport[];
};

const selectClass = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30';
const textareaClass = 'min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y';

function formatDatePT(value: string) {
  const p = value?.split('-');
  return p?.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value || 'Sem data';
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((v): v is string => Boolean(v?.trim())).map((v) => v.trim()))];
}

function buildTime(r: Registro) {
  if (r.chegada && r.saida) return `${r.chegada} às ${r.saida}`;
  if (r.chegada) return `Entrada ${r.chegada}`;
  if (r.saida) return `Saída ${r.saida}`;
  return 'Horário não informado';
}

function buildSchedule(records: Registro[]) {
  const arrivals = records.map((r) => r.chegada).filter(Boolean).sort();
  const departures = records.map((r) => r.saida).filter(Boolean).sort();
  if (!arrivals.length && !departures.length) return 'Não informado';
  if (arrivals.length && departures.length) return `${arrivals[0]} às ${departures[departures.length - 1]}`;
  return arrivals[0] || departures[departures.length - 1] || 'Não informado';
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function reportNumber(dates: string[]) {
  if (!dates.length) return `RDO-${Date.now()}`;
  const compact = (v: string) => v.replaceAll('-', '');
  return dates.length === 1 ? `RDO-${compact(dates[0])}` : `RDO-${compact(dates[0])}-${compact(dates[dates.length - 1])}`;
}

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export default function RelatoriosV2Page() {
  const { registros, loading: loadingRegistros } = useRegistros();
  const { funcionarios, loading: loadingFuncionarios } = useFuncionarios();
  const { clientes, loading: loadingClientes } = useClientes();

  const [day, setDay] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const filtered = useMemo(() => {
    const selectedClient = clientes.find((c) => String(c.id) === clienteId);
    const selectedFuncionario = funcionarioId ? Number(funcionarioId) : null;
    return registros.filter((r) => {
      const matchesDate = day ? r.data === day : (!startDate || r.data >= startDate) && (!endDate || r.data <= endDate);
      const matchesClient = !clienteId || r.cliente_id === Number(clienteId) || r.cliente_nome === selectedClient?.nome || r.of_customer_name === selectedClient?.nome;
      const matchesEmployee = !selectedFuncionario || r.funcionarios?.some((f) => f.id === selectedFuncionario);
      return matchesDate && matchesClient && matchesEmployee;
    });
  }, [registros, clientes, day, startDate, endDate, clienteId, funcionarioId]);

  const clearFilters = () => {
    setDay('');
    setStartDate('');
    setEndDate('');
    setClienteId('');
    setFuncionarioId('');
    setDraft(null);
  };

  const generateDraft = () => {
    const sorted = [...filtered].sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.chegada || '').localeCompare(b.chegada || ''));
    const grouped = new Map<string, Registro[]>();
    sorted.forEach((r) => grouped.set(r.data || 'sem-data', [...(grouped.get(r.data || 'sem-data') || []), r]));

    const days: DayReport[] = Array.from(grouped.entries()).map(([key, records]) => {
      const team = unique(records.flatMap((r) => r.funcionarios?.map((f) => f.nome) || []));
      const clients = unique(records.map((r) => r.cliente_nome || r.of_customer_name || null));
      const ofs = unique(records.map((r) => r.of_number || null));

      const activities: Activity[] = records.map((r, i) => {
        const employees = unique(r.funcionarios?.map((f) => f.nome) || []);
        return {
          id: `${r.id}-${i}`,
          time: buildTime(r),
          description: r.trabalho || 'Atividade sem descrição',
          employees: employees.length ? employees.join(', ') : 'Não informado',
          ofos: r.of_number ? `${r.of_number}${r.of_title ? ` - ${r.of_title}` : ''}` : '',
          observation: r.observacoes || '',
        };
      });

      const photos: Photo[] = [];
      records.forEach((r) => {
        const employees = unique(r.funcionarios?.map((f) => f.nome) || []).join(', ') || 'Não informado';
        [
          [r.foto_inicio_key, 'Início'],
          [r.foto_fim_key, 'Fim'],
          [r.foto_observacoes_key, 'Observação'],
        ].forEach(([photoKey, label], photoIndex) => {
          if (!photoKey) return;
          photos.push({
            id: `${r.id}-${photoIndex}-${photoKey}`,
            src: resolvePhotoSrc(photoKey),
            label: String(label),
            activity: r.trabalho || 'Atividade sem descrição',
            employees,
            include: true,
          });
        });
      });

      return {
        key,
        dateLabel: key === 'sem-data' ? 'Sem data' : formatDatePT(key),
        client: clients.join(', ') || 'Não informado',
        schedule: buildSchedule(records),
        headcount: team.length,
        team: team.join(', ') || 'Não informado',
        ofos: ofs.join(', ') || 'Não informado',
        activities,
        photos,
      };
    });

    const dates = days.map((d) => d.key).filter((d) => d !== 'sem-data').sort();
    const allClients = unique(days.map((d) => d.client === 'Não informado' ? null : d.client));
    setDraft({
      title: 'RELATÓRIO DIÁRIO DE OBRA',
      number: reportNumber(dates),
      period: dates.length === 1 ? formatDatePT(dates[0]) : dates.length ? `${formatDatePT(dates[0])} a ${formatDatePT(dates[dates.length - 1])}` : 'Não informado',
      client: allClients.join(', ') || 'Não informado',
      days,
    });
  };

  const updateDay = (dayIndex: number, key: keyof Pick<DayReport, 'dateLabel' | 'client' | 'schedule' | 'headcount' | 'team' | 'ofos'>, value: string | number) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      days[dayIndex] = { ...days[dayIndex], [key]: value } as DayReport;
      return { ...current, days };
    });
  };

  const updateActivity = (dayIndex: number, activityIndex: number, key: keyof Omit<Activity, 'id'>, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      const activities = [...days[dayIndex].activities];
      activities[activityIndex] = { ...activities[activityIndex], [key]: value };
      days[dayIndex] = { ...days[dayIndex], activities };
      return { ...current, days };
    });
  };

  const togglePhoto = (dayIndex: number, photoId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      days[dayIndex] = {
        ...days[dayIndex],
        photos: days[dayIndex].photos.map((p) => p.id === photoId ? { ...p, include: !p.include } : p),
      };
      return { ...current, days };
    });
  };

  const preparePrint = async () => {
    if (!draft || preparing) return;
    setPreparing(true);
    setPrintMode(true);
    await nextPaint();

    const images = Array.from(document.querySelectorAll<HTMLImageElement>('.report-print-area img'));
    const decodePromise = Promise.all(images.map(async (img) => {
      try {
        if (!img.complete) await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
        if (typeof img.decode === 'function') await img.decode().catch(() => undefined);
      } catch { /* segue com a impressão */ }
    }));

    await Promise.race([decodePromise, new Promise((resolve) => setTimeout(resolve, 6000))]);
    const cleanup = () => {
      setPrintMode(false);
      setPreparing(false);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    setTimeout(() => {
      if (document.visibilityState === 'visible') cleanup();
    }, 1500);
  };

  const loading = loadingRegistros || loadingFuncionarios || loadingClientes;
  if (loading) {
    return <Layout adminOnly><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;
  }

  return (
    <Layout adminOnly>
      <style jsx global>{`
        .report-print-area { position: fixed; left: -300vw; top: 0; width: 210mm; pointer-events: none; }
        .report-sheet { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: white; color: #0f172a; }
        .letterhead-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0; }
        .report-sheet-content { position: relative; z-index: 1; height: 100%; box-sizing: border-box; padding: 58mm 14mm 18mm 24mm; }
        .report-title { margin: 0 0 3px; text-align: center; font-size: 16px; font-weight: 800; color: #173f78; letter-spacing: .04em; }
        .report-subtitle { text-align: center; font-size: 8.5px; color: #64748b; margin-bottom: 7px; }
        .report-rule { height: 2px; background: #1f4d86; margin-bottom: 8px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 9px; }
        .summary > div { min-height: 34px; padding: 5px 7px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .summary > div:nth-child(3n) { border-right: 0; }
        .summary > div:nth-last-child(-n+3) { border-bottom: 0; }
        .rlabel { font-size: 6.5px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
        .rvalue { margin-top: 2px; font-size: 9px; line-height: 1.2; font-weight: 600; }
        .section-title { margin: 7px 0 5px; color: #173f78; font-size: 9px; font-weight: 800; text-transform: uppercase; }
        .activity-card { border: 1px solid #dbe3ee; border-left: 3px solid #234d82; border-radius: 5px; padding: 5px 7px; margin-bottom: 5px; break-inside: avoid; }
        .activity-meta { font-size: 7px; color: #64748b; display: flex; justify-content: space-between; gap: 8px; }
        .activity-text { font-size: 9px; font-weight: 600; line-height: 1.3; white-space: pre-wrap; margin-top: 2px; }
        .activity-people, .activity-note { font-size: 7.5px; color: #334155; margin-top: 2px; line-height: 1.25; }
        .activity-note { border-top: 1px dashed #dbe3ee; padding-top: 3px; }
        .photo-grid-small { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .photo-card-small { border: 1px solid #dbe3ee; border-radius: 6px; padding: 4px; background: white; break-inside: avoid; }
        .photo-card-small img { width: 100%; height: 31mm; object-fit: cover; border-radius: 4px; background: #f8fafc; }
        .photo-caption-small { font-size: 6.5px; line-height: 1.25; margin-top: 3px; color: #334155; }
        .photo-grid-page { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .photo-card-page { border: 1px solid #dbe3ee; border-radius: 6px; padding: 5px; background: white; break-inside: avoid; }
        .photo-card-page img { width: 100%; height: 48mm; object-fit: cover; border-radius: 4px; background: #f8fafc; }
        .photo-caption-page { font-size: 7px; line-height: 1.25; margin-top: 4px; color: #334155; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; pointer-events: auto !important; }
          .report-sheet { page-break-after: always; break-after: page; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .report-sheet:last-child { page-break-after: auto; break-after: auto; }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
          <div>
            <h2 className="text-2xl font-bold">Relatórios</h2>
            <p className="text-muted-foreground">Relatório por dia, com atividades, equipe e fotos do mesmo dia.</p>
          </div>
        </div>

        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 font-semibold"><Filter className="w-5 h-5 text-primary" />Filtros</div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-1"><span className="text-sm font-medium">Dia específico</span><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Cliente</span><select className={selectClass} value={clienteId} onChange={(e) => setClienteId(e.target.value)}><option value="">Todos os clientes</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
            <label className="space-y-1"><span className="text-sm font-medium">Data inicial</span><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={Boolean(day)} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Data final</span><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={Boolean(day)} /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Funcionário</span><select className={selectClass} value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}><option value="">Todos os funcionários</option>{funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <span className="text-sm text-muted-foreground"><strong className="text-foreground">{filtered.length}</strong> registro(s) encontrado(s)</span>
            <div className="flex gap-2"><Button variant="outline" onClick={clearFilters}>Limpar</Button><Button onClick={generateDraft} disabled={!filtered.length} className="gap-2"><RefreshCw className="w-4 h-4" />Gerar relatório</Button></div>
          </div>
        </CardContent></Card>

        {draft && <>
          <Card><CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Relatório preparado</div>
                <p className="text-xs text-muted-foreground mt-1">A prévia A4 completa só é montada ao gerar o PDF, para deixar esta tela mais rápida.</p>
              </div>
              <Button onClick={preparePrint} disabled={preparing} className="gap-2">
                {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {preparing ? 'Preparando PDF...' : 'Gerar PDF / Imprimir'}
              </Button>
            </div>

            <div className="grid gap-4 border-t pt-4">
              {draft.days.map((d, di) => <div key={d.key} className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap"><h3 className="font-bold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />{d.dateLabel}</h3><span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" />{d.headcount} funcionário(s)</span></div>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="space-y-1"><span className="text-xs font-medium">Cliente</span><Input value={d.client} onChange={(e) => updateDay(di, 'client', e.target.value)} /></label>
                  <label className="space-y-1"><span className="text-xs font-medium">Horário</span><Input value={d.schedule} onChange={(e) => updateDay(di, 'schedule', e.target.value)} /></label>
                  <label className="space-y-1"><span className="text-xs font-medium">Quantidade de funcionários</span><Input type="number" min={0} value={d.headcount} onChange={(e) => updateDay(di, 'headcount', Math.max(0, Number(e.target.value) || 0))} /></label>
                  <label className="space-y-1"><span className="text-xs font-medium">OF / OS</span><Input value={d.ofos} onChange={(e) => updateDay(di, 'ofos', e.target.value)} /></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-xs font-medium">Equipe do dia</span><Input value={d.team} onChange={(e) => updateDay(di, 'team', e.target.value)} /></label>
                </div>

                <div className="space-y-3 border-t pt-3">
                  <div className="font-medium text-sm">Atividades</div>
                  {d.activities.map((a, ai) => <div key={a.id} className="rounded-lg border bg-background p-3 grid md:grid-cols-2 gap-3">
                    <label className="space-y-1"><span className="text-xs font-medium">Horário</span><Input value={a.time} onChange={(e) => updateActivity(di, ai, 'time', e.target.value)} /></label>
                    <label className="space-y-1"><span className="text-xs font-medium">Funcionários</span><Input value={a.employees} onChange={(e) => updateActivity(di, ai, 'employees', e.target.value)} /></label>
                    <label className="space-y-1 md:col-span-2"><span className="text-xs font-medium">O que foi feito</span><textarea className={textareaClass} value={a.description} onChange={(e) => updateActivity(di, ai, 'description', e.target.value)} /></label>
                    <label className="space-y-1 md:col-span-2"><span className="text-xs font-medium">Observação</span><textarea className={textareaClass} value={a.observation} onChange={(e) => updateActivity(di, ai, 'observation', e.target.value)} /></label>
                  </div>)}
                </div>

                {!!d.photos.length && <div className="border-t pt-3 space-y-2">
                  <div className="font-medium text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" />Fotos do dia</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{d.photos.map((p) => <label key={p.id} className={`border rounded-lg p-2 cursor-pointer ${p.include ? 'border-primary bg-primary/5' : 'opacity-50'}`}><img src={p.src} alt={p.label} loading="lazy" decoding="async" className="w-full h-20 object-cover rounded mb-1" /><div className="flex gap-2 text-xs"><input type="checkbox" checked={p.include} onChange={() => togglePhoto(di, p.id)} /><span>{p.label}</span></div></label>)}</div>
                </div>}
              </div>)}
            </div>
          </CardContent></Card>

          {printMode && <div className="report-print-area">
            {draft.days.flatMap((d) => {
              const selectedPhotos = d.photos.filter((p) => p.include);
              const canEmbedPhotos = d.activities.length <= 3;
              const embeddedPhotos = canEmbedPhotos ? selectedPhotos.slice(0, 3) : [];
              const remainingPhotos = selectedPhotos.slice(embeddedPhotos.length);
              const activityPages = chunk(d.activities, 4);
              const pages = activityPages.length ? activityPages : [[] as Activity[]];

              const detailPages = pages.map((activitiesOnPage, pageIndex) => <section className="report-sheet" key={`${d.key}-detail-${pageIndex}`}>
                <img src="/folha-timbrada-multprest.webp" alt="" className="letterhead-layer" loading="eager" decoding="sync" />
                <div className="report-sheet-content">
                  <h1 className="report-title">{draft.title}</h1>
                  <div className="report-subtitle">{draft.number} • {d.dateLabel}{pageIndex ? ' • Continuação' : ''}</div>
                  <div className="report-rule" />
                  {pageIndex === 0 && <div className="summary">
                    <div><div className="rlabel">Data</div><div className="rvalue">{d.dateLabel}</div></div>
                    <div><div className="rlabel">Cliente</div><div className="rvalue">{d.client}</div></div>
                    <div><div className="rlabel">Horário</div><div className="rvalue">{d.schedule}</div></div>
                    <div><div className="rlabel">Funcionários</div><div className="rvalue">{d.headcount}</div></div>
                    <div><div className="rlabel">Equipe do dia</div><div className="rvalue">{d.team}</div></div>
                    <div><div className="rlabel">OF / OS</div><div className="rvalue">{d.ofos}</div></div>
                  </div>}
                  <div className="section-title">{pageIndex ? 'Atividades - continuação' : 'Atividades do dia'}</div>
                  {activitiesOnPage.map((a) => <div key={a.id} className="activity-card">
                    <div className="activity-meta"><span><strong>Horário:</strong> {a.time}</span>{a.ofos && <span><strong>OF/OS:</strong> {a.ofos}</span>}</div>
                    <div className="activity-text">{a.description}</div>
                    <div className="activity-people"><strong>Funcionário(s):</strong> {a.employees}</div>
                    {a.observation && <div className="activity-note"><strong>Observação:</strong> {a.observation}</div>}
                  </div>)}
                  {pageIndex === 0 && embeddedPhotos.length > 0 && <>
                    <div className="section-title">Fotos do dia</div>
                    <div className="photo-grid-small">{embeddedPhotos.map((p) => <div className="photo-card-small" key={p.id}><img src={p.src} alt="" loading="eager" decoding="async" /><div className="photo-caption-small"><strong>{p.label}</strong><br />{p.activity}<br /><strong>Funcionário(s):</strong> {p.employees}</div></div>)}</div>
                  </>}
                </div>
              </section>);

              const photoPages = chunk(remainingPhotos, 6).map((photoChunk, pageIndex) => <section className="report-sheet" key={`${d.key}-photos-${pageIndex}`}>
                <img src="/folha-timbrada-multprest.webp" alt="" className="letterhead-layer" loading="eager" decoding="sync" />
                <div className="report-sheet-content">
                  <h1 className="report-title">REGISTRO FOTOGRÁFICO</h1>
                  <div className="report-subtitle">{draft.number} • {d.dateLabel} • {d.client}</div>
                  <div className="report-rule" />
                  <div className="photo-grid-page">{photoChunk.map((p) => <div className="photo-card-page" key={p.id}><img src={p.src} alt="" loading="eager" decoding="async" /><div className="photo-caption-page"><strong>{p.label}</strong><br />{p.activity}<br /><strong>Funcionário(s):</strong> {p.employees}</div></div>)}</div>
                </div>
              </section>);

              return [...detailPages, ...photoPages];
            })}
          </div>}
        </>}
      </div>
    </Layout>
  );
}
