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
  CalendarDays,
  Building2,
  Users,
  Image as ImageIcon,
  ClipboardCheck,
} from 'lucide-react';

type ReportPhoto = {
  id: string;
  src: string;
  label: string;
  include: boolean;
};

type ReportDraft = {
  title: string;
  period: string;
  client: string;
  responsible: string;
  team: string;
  headcount: number;
  schedule: string;
  activities: string;
  observations: string;
  recordCount: number;
  photos: ReportPhoto[];
};

const selectClass =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30';

const textareaClass =
  'min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y';

function formatDatePT(dateStr: string): string {
  const parts = dateStr?.split('-');
  if (parts?.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr || '—';
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function buildSchedule(registros: Registro[]): string {
  const arrivals = registros.map((r) => r.chegada).filter(Boolean).sort();
  const departures = registros.map((r) => r.saida).filter(Boolean).sort();
  if (!arrivals.length && !departures.length) return 'Não informado';
  if (arrivals.length && departures.length) return `${arrivals[0]} às ${departures[departures.length - 1]}`;
  return arrivals[0] || departures[departures.length - 1] || 'Não informado';
}

export default function RelatoriosPage() {
  const { registros, loading: loadingRegistros } = useRegistros();
  const { funcionarios, loading: loadingFuncionarios } = useFuncionarios();
  const { clientes, loading: loadingClientes } = useClientes();

  const [day, setDay] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [draft, setDraft] = useState<ReportDraft | null>(null);

  const filteredRegistros = useMemo(() => {
    const selectedClient = clientes.find((c) => String(c.id) === clienteId);
    const selectedFuncionarioId = funcionarioId ? Number(funcionarioId) : null;

    return registros.filter((registro) => {
      const dateMatches = day
        ? registro.data === day
        : (!startDate || registro.data >= startDate) && (!endDate || registro.data <= endDate);

      const clientMatches = !clienteId
        ? true
        : registro.cliente_id === Number(clienteId) ||
          registro.cliente_nome === selectedClient?.nome ||
          registro.of_customer_name === selectedClient?.nome;

      const employeeMatches = !selectedFuncionarioId
        ? true
        : registro.funcionarios?.some((f) => f.id === selectedFuncionarioId);

      return dateMatches && clientMatches && employeeMatches;
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
    const sorted = [...filteredRegistros].sort((a, b) => {
      const byDate = (a.data || '').localeCompare(b.data || '');
      if (byDate !== 0) return byDate;
      return (a.chegada || '').localeCompare(b.chegada || '');
    });

    const dates = unique(sorted.map((r) => r.data)).sort();
    const clientsFound = unique(
      sorted.map((r) => r.cliente_nome || r.of_customer_name || null)
    );
    const teamNames = unique(
      sorted.flatMap((r) => r.funcionarios?.map((f) => f.nome) || [])
    );
    const responsibleNames = unique(sorted.map((r) => r.created_by || null));

    const period = dates.length === 0
      ? 'Não informado'
      : dates.length === 1
        ? formatDatePT(dates[0])
        : `${formatDatePT(dates[0])} a ${formatDatePT(dates[dates.length - 1])}`;

    const activities = sorted
      .map((r, index) => {
        const of = r.of_number
          ? ` — OF ${r.of_number}${r.of_title ? ` - ${r.of_title}` : ''}`
          : '';
        const time = r.chegada || r.saida
          ? ` (${r.chegada || '—'} às ${r.saida || '—'})`
          : '';
        return `${index + 1}. ${r.trabalho || 'Atividade sem descrição'}${of}${time}`;
      })
      .join('\n');

    const observations = unique(sorted.map((r) => r.observacoes || null)).join('\n');

    const photos: ReportPhoto[] = [];
    sorted.forEach((r) => {
      const photoItems = [
        { key: r.foto_inicio_key, label: `Início - ${formatDatePT(r.data)}` },
        { key: r.foto_fim_key, label: `Fim - ${formatDatePT(r.data)}` },
        { key: r.foto_observacoes_key, label: `Observação - ${formatDatePT(r.data)}` },
      ];
      photoItems.forEach((item, photoIndex) => {
        if (!item.key) return;
        photos.push({
          id: `${r.id}-${photoIndex}-${item.key}`,
          src: resolvePhotoSrc(item.key),
          label: item.label,
          include: true,
        });
      });
    });

    setDraft({
      title: 'RELATÓRIO DIÁRIO DE OBRA',
      period,
      client: clientsFound.length ? clientsFound.join(', ') : 'Não informado',
      responsible: responsibleNames.length ? responsibleNames.join(', ') : 'Não informado',
      team: teamNames.length ? teamNames.join(', ') : 'Não informado',
      headcount: teamNames.length,
      schedule: buildSchedule(sorted),
      activities: activities || 'Nenhuma atividade encontrada para os filtros selecionados.',
      observations: observations || 'Sem observações.',
      recordCount: sorted.length,
      photos,
    });
  };

  const updateDraft = <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const togglePhoto = (id: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        photos: current.photos.map((photo) =>
          photo.id === id ? { ...photo, include: !photo.include } : photo
        ),
      };
    });
  };

  const isLoading = loadingRegistros || loadingFuncionarios || loadingClientes;

  if (isLoading) {
    return (
      <Layout adminOnly>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout adminOnly>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .report-photo-block { break-inside: avoid; page-break-inside: avoid; }
          .report-section { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
            <p className="text-muted-foreground">Filtre os registros, ajuste o conteúdo e exporte o relatório.</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 font-semibold">
              <Filter className="w-5 h-5 text-primary" />
              Filtros
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Dia específico</span>
                <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
                <span className="text-xs text-muted-foreground">Se preenchido, o período abaixo é ignorado.</span>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium">Cliente</span>
                <select className={selectClass} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Todos os clientes</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium">Data inicial</span>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={Boolean(day)} />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium">Data final</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={Boolean(day)} />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium">Funcionário</span>
                <select className={selectClass} value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
                  <option value="">Todos os funcionários</option>
                  {funcionarios.map((funcionario) => (
                    <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">{filteredRegistros.length}</strong> registro(s) encontrado(s)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
                <Button onClick={generateDraft} disabled={filteredRegistros.length === 0} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Gerar / Atualizar relatório
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {draft && (
          <>
            <Card>
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 font-semibold">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    Editor do relatório
                  </div>
                  <Button onClick={() => window.print()} className="gap-2">
                    <Printer className="w-4 h-4" />
                    Exportar / Imprimir PDF
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">Título</span>
                    <Input value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Data / período</span>
                    <Input value={draft.period} onChange={(e) => updateDraft('period', e.target.value)} />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Cliente</span>
                    <Input value={draft.client} onChange={(e) => updateDraft('client', e.target.value)} />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Horário</span>
                    <Input value={draft.schedule} onChange={(e) => updateDraft('schedule', e.target.value)} />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Quantidade de funcionários</span>
                    <Input
                      type="number"
                      min={0}
                      value={draft.headcount}
                      onChange={(e) => updateDraft('headcount', Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>

                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">Equipe</span>
                    <Input value={draft.team} onChange={(e) => updateDraft('team', e.target.value)} />
                  </label>

                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">Responsável pelo registro</span>
                    <Input value={draft.responsible} onChange={(e) => updateDraft('responsible', e.target.value)} />
                  </label>

                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">Atividades realizadas</span>
                    <textarea className={textareaClass} value={draft.activities} onChange={(e) => updateDraft('activities', e.target.value)} />
                  </label>

                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">Observações</span>
                    <textarea className={textareaClass} value={draft.observations} onChange={(e) => updateDraft('observations', e.target.value)} />
                  </label>
                </div>

                {draft.photos.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2 font-medium">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Fotos para exportação
                    </div>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {draft.photos.map((photo) => (
                        <label key={photo.id} className={`border rounded-lg overflow-hidden cursor-pointer ${photo.include ? 'border-primary' : 'opacity-50'}`}>
                          <img src={photo.src} alt={photo.label} className="w-full h-28 object-cover bg-muted" />
                          <div className="p-2 flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={photo.include} onChange={() => togglePhoto(photo.id)} />
                            <span>{photo.label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="report-print-area bg-white text-slate-900 border rounded-xl shadow-sm overflow-hidden">
              <div className="p-8 sm:p-10 space-y-6">
                <div className="text-center border-b-2 border-slate-800 pb-5">
                  <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">Multprest Serviços Industriais Ltda</p>
                  <h1 className="text-2xl font-bold mt-2">{draft.title}</h1>
                </div>

                <div className="report-section grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Data / período</p>
                    <p className="font-semibold">{draft.period}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Cliente</p>
                    <p className="font-semibold">{draft.client}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Horário</p>
                    <p className="font-semibold">{draft.schedule}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Quantidade de funcionários</p>
                    <p className="font-semibold">{draft.headcount}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Equipe</p>
                    <p className="font-semibold">{draft.team}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Responsável pelo registro</p>
                    <p className="font-semibold">{draft.responsible}</p>
                  </div>
                </div>

                <div className="report-section border-t pt-5">
                  <h2 className="font-bold text-base mb-2">Atividades realizadas</h2>
                  <p className="whitespace-pre-line text-sm leading-6">{draft.activities}</p>
                </div>

                <div className="report-section border-t pt-5">
                  <h2 className="font-bold text-base mb-2">Observações</h2>
                  <p className="whitespace-pre-line text-sm leading-6">{draft.observations}</p>
                </div>

                {draft.photos.some((photo) => photo.include) && (
                  <div className="border-t pt-5">
                    <h2 className="font-bold text-base mb-3">Registro fotográfico</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {draft.photos.filter((photo) => photo.include).map((photo) => (
                        <figure key={photo.id} className="report-photo-block border rounded-lg overflow-hidden">
                          <img src={photo.src} alt={photo.label} className="w-full h-56 object-cover" />
                          <figcaption className="px-3 py-2 text-xs text-slate-600 border-t">{photo.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 text-xs text-slate-500 flex justify-between gap-4">
                  <span>{draft.recordCount} registro(s) utilizado(s) na composição deste relatório.</span>
                  <span>Diário de Obra - Multprest</span>
                </div>
              </div>
            </div>
          </>
        )}

        {!draft && (
          <div className="border border-dashed rounded-xl py-12 px-6 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-primary/60" />
            <p className="font-medium text-foreground">Selecione os filtros e gere o relatório.</p>
            <p className="text-sm mt-1">Você pode usar apenas um filtro ou combinar dia, período, cliente e funcionário.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
