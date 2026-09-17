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
  ClipboardCheck,
  CalendarDays,
  Users,
} from 'lucide-react';

type ReportActivity = {
  id: string;
  time: string;
  description: string;
  employees: string;
  ofos: string;
  observation: string;
};

type ReportPhoto = {
  id: string;
  src: string;
  label: string;
  activity: string;
  employees: string;
  include: boolean;
};

type ReportDay = {
  key: string;
  dateLabel: string;
  client: string;
  schedule: string;
  headcount: number;
  team: string;
  ofos: string;
  activities: ReportActivity[];
  photos: ReportPhoto[];
};

type ReportDraft = {
  title: string;
  number: string;
  period: string;
  client: string;
  days: ReportDay[];
};

const selectClass =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30';

const textareaClass =
  'min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y';

function formatDatePT(dateStr: string): string {
  const parts = dateStr?.split('-');
  if (parts?.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr || 'Sem data';
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

function buildTime(registro: Registro): string {
  if (registro.chegada && registro.saida) return `${registro.chegada} às ${registro.saida}`;
  if (registro.chegada) return `Entrada ${registro.chegada}`;
  if (registro.saida) return `Saída ${registro.saida}`;
  return 'Horário não informado';
}

function chunk<T>(items: T[], size: number): T[][] {
  if (!items.length) return [];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function makeReportNumber(dates: string[]): string {
  if (!dates.length) return `RDO-${Date.now()}`;
  const compact = (value: string) => value.replaceAll('-', '');
  return dates.length === 1
    ? `RDO-${compact(dates[0])}`
    : `RDO-${compact(dates[0])}-${compact(dates[dates.length - 1])}`;
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

    const grouped = new Map<string, Registro[]>();
    sorted.forEach((registro) => {
      const key = registro.data || 'sem-data';
      const existing = grouped.get(key) || [];
      existing.push(registro);
      grouped.set(key, existing);
    });

    const reportDays: ReportDay[] = Array.from(grouped.entries()).map(([key, dayRecords]) => {
      const teamNames = unique(dayRecords.flatMap((r) => r.funcionarios?.map((f) => f.nome) || []));
      const clientsFound = unique(dayRecords.map((r) => r.cliente_nome || r.of_customer_name || null));
      const ofsFound = unique(dayRecords.map((r) => r.of_number || null));

      const activities: ReportActivity[] = dayRecords.map((r, index) => {
        const employees = unique(r.funcionarios?.map((f) => f.nome) || []);
        return {
          id: `${r.id}-${index}`,
          time: buildTime(r),
          description: r.trabalho || 'Atividade sem descrição',
          employees: employees.length ? employees.join(', ') : 'Não informado',
          ofos: r.of_number ? `${r.of_number}${r.of_title ? ` - ${r.of_title}` : ''}` : '',
          observation: r.observacoes || '',
        };
      });

      const photos: ReportPhoto[] = [];
      dayRecords.forEach((r) => {
        const employees = unique(r.funcionarios?.map((f) => f.nome) || []).join(', ');
        const photoItems = [
          { key: r.foto_inicio_key, label: 'Início' },
          { key: r.foto_fim_key, label: 'Fim' },
          { key: r.foto_observacoes_key, label: 'Observação' },
        ];
        photoItems.forEach((item, photoIndex) => {
          if (!item.key) return;
          photos.push({
            id: `${r.id}-${photoIndex}-${item.key}`,
            src: resolvePhotoSrc(item.key),
            label: item.label,
            activity: r.trabalho || 'Atividade sem descrição',
            employees: employees || 'Não informado',
            include: true,
          });
        });
      });

      return {
        key,
        dateLabel: key === 'sem-data' ? 'Sem data' : formatDatePT(key),
        client: clientsFound.length ? clientsFound.join(', ') : 'Não informado',
        schedule: buildSchedule(dayRecords),
        headcount: teamNames.length,
        team: teamNames.length ? teamNames.join(', ') : 'Não informado',
        ofos: ofsFound.length ? ofsFound.join(', ') : 'Não informado',
        activities,
        photos,
      };
    });

    const actualDates = reportDays.map((item) => item.key).filter((value) => value !== 'sem-data').sort();
    const allClients = unique(reportDays.map((item) => item.client === 'Não informado' ? null : item.client));
    const period = actualDates.length === 0
      ? 'Não informado'
      : actualDates.length === 1
        ? formatDatePT(actualDates[0])
        : `${formatDatePT(actualDates[0])} a ${formatDatePT(actualDates[actualDates.length - 1])}`;

    setDraft({
      title: 'RELATÓRIO DIÁRIO DE OBRA',
      number: makeReportNumber(actualDates),
      period,
      client: allClients.length ? allClients.join(', ') : 'Não informado',
      days: reportDays,
    });
  };

  const updateDraftField = (key: 'title' | 'number' | 'period' | 'client', value: string) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const updateDay = (dayIndex: number, key: keyof Pick<ReportDay, 'dateLabel' | 'client' | 'schedule' | 'headcount' | 'team' | 'ofos'>, value: string | number) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      days[dayIndex] = { ...days[dayIndex], [key]: value } as ReportDay;
      return { ...current, days };
    });
  };

  const updateActivity = (dayIndex: number, activityIndex: number, key: keyof Omit<ReportActivity, 'id'>, value: string) => {
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
        photos: days[dayIndex].photos.map((photo) => photo.id === photoId ? { ...photo, include: !photo.include } : photo),
      };
      return { ...current, days };
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
        .report-preview-stack { display: flex; flex-direction: column; gap: 24px; align-items: center; }
        .report-sheet {
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          position: relative;
          overflow: hidden;
          background: #fff;
          color: #111827;
          box-shadow: 0 12px 32px rgba(15, 23, 42, .16);
        }
        .letterhead-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          z-index: 0;
          pointer-events: none;
        }
        .report-sheet-content {
          position: relative;
          z-index: 1;
          padding: 58mm 14mm 18mm 24mm;
          height: 100%;
          box-sizing: border-box;
        }
        .report-title {
          text-align: center;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: .04em;
          color: #173f78;
          margin: 0 0 4px;
        }
        .report-subtitle {
          text-align: center;
          font-size: 10px;
          color: #64748b;
          margin-bottom: 10px;
        }
        .report-blue-rule { height: 2px; background: #1f4d86; margin-bottom: 10px; }
        .report-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .report-summary-cell { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; min-height: 39px; }
        .report-summary-cell:nth-child(odd) { border-right: 1px solid #e2e8f0; }
        .report-summary-cell:nth-last-child(-n+2) { border-bottom: 0; }
        .report-label { font-size: 7px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
        .report-value { font-size: 10px; font-weight: 600; color: #0f172a; margin-top: 2px; line-height: 1.25; }
        .report-section-title {
          font-size: 10px;
          font-weight: 800;
          color: #173f78;
          text-transform: uppercase;
          letter-spacing: .04em;
          margin: 10px 0 6px;
        }
        .report-activity {
          border: 1px solid #dbe3ee;
          border-left: 4px solid #234d82;
          border-radius: 6px;
          padding: 7px 9px;
          margin-bottom: 6px;
          break-inside: avoid;
        }
        .report-activity-top { display: flex; justify-content: space-between; gap: 10px; font-size: 8px; color: #64748b; margin-bottom: 4px; }
        .report-activity-description { font-size: 10px; line-height: 1.35; font-weight: 600; white-space: pre-wrap; }
        .report-activity-employees { font-size: 8.5px; margin-top: 4px; color: #334155; }
        .report-activity-observation { font-size: 8.5px; margin-top: 4px; color: #475569; padding-top: 4px; border-top: 1px dashed #cbd5e1; white-space: pre-wrap; }
        .report-photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .report-photo-card { border: 1px solid #dbe3ee; border-radius: 6px; padding: 6px; background: #fff; break-inside: avoid; }
        .report-photo-card img { width: 100%; height: 68mm; object-fit: contain; background: #f8fafc; border-radius: 4px; }
        .report-photo-caption { font-size: 8px; line-height: 1.3; margin-top: 5px; color: #334155; }
        .report-photo-caption strong { color: #173f78; }
        @media (max-width: 900px) {
          .report-sheet { transform-origin: top center; transform: scale(.78); margin-bottom: -64mm; }
        }
        @media (max-width: 700px) {
          .report-sheet { transform: scale(.48); margin-bottom: -154mm; }
        }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area { position: absolute !important; inset: 0 !important; width: 210mm !important; margin: 0 !important; padding: 0 !important; }
          .report-preview-stack { display: block !important; }
          .report-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            transform: none !important;
            page-break-after: always;
            break-after: page;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .report-sheet:last-child { page-break-after: auto; break-after: auto; }
          .letterhead-layer { display: block !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
            <p className="text-muted-foreground">Relatório organizado dia por dia, com equipe, atividade e fotos do mesmo dia.</p>
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
                <span className="text-xs text-muted-foreground">Se preencher um dia, o período abaixo é ignorado.</span>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium">Cliente</span>
                <select className={selectClass} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Todos os clientes</option>
                  {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
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
                  {funcionarios.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">{filteredRegistros.length}</strong> registro(s) encontrado(s)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
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
                    <Input value={draft.title} onChange={(e) => updateDraftField('title', e.target.value)} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Número do relatório</span>
                    <Input value={draft.number} onChange={(e) => updateDraftField('number', e.target.value)} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Período</span>
                    <Input value={draft.period} onChange={(e) => updateDraftField('period', e.target.value)} />
                  </label>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">Cliente geral do relatório</span>
                    <Input value={draft.client} onChange={(e) => updateDraftField('client', e.target.value)} />
                  </label>
                </div>

                <div className="border-t pt-5 space-y-5">
                  <div className="flex items-center gap-2 font-semibold">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    Informações por dia
                  </div>

                  {draft.days.map((reportDay, dayIndex) => (
                    <div key={reportDay.key} className="rounded-xl border bg-muted/20 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="font-bold text-lg">Dia {reportDay.dateLabel}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {reportDay.headcount} funcionário(s)
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <label className="space-y-1">
                          <span className="text-xs font-medium">Data</span>
                          <Input value={reportDay.dateLabel} onChange={(e) => updateDay(dayIndex, 'dateLabel', e.target.value)} />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-medium">Cliente</span>
                          <Input value={reportDay.client} onChange={(e) => updateDay(dayIndex, 'client', e.target.value)} />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-medium">Horário do dia</span>
                          <Input value={reportDay.schedule} onChange={(e) => updateDay(dayIndex, 'schedule', e.target.value)} />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-medium">Quantidade de funcionários</span>
                          <Input type="number" min={0} value={reportDay.headcount} onChange={(e) => updateDay(dayIndex, 'headcount', Math.max(0, Number(e.target.value) || 0))} />
                        </label>
                        <label className="space-y-1 md:col-span-2">
                          <span className="text-xs font-medium">Funcionários / equipe do dia</span>
                          <Input value={reportDay.team} onChange={(e) => updateDay(dayIndex, 'team', e.target.value)} />
                        </label>
                        <label className="space-y-1 md:col-span-2">
                          <span className="text-xs font-medium">OF / OS do dia</span>
                          <Input value={reportDay.ofos} onChange={(e) => updateDay(dayIndex, 'ofos', e.target.value)} />
                        </label>
                      </div>

                      <div className="space-y-3 border-t pt-4">
                        <div className="font-medium text-sm">Atividades do dia</div>
                        {reportDay.activities.map((activity, activityIndex) => (
                          <div key={activity.id} className="rounded-lg border bg-background p-3 space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <label className="space-y-1">
                                <span className="text-xs font-medium">Horário</span>
                                <Input value={activity.time} onChange={(e) => updateActivity(dayIndex, activityIndex, 'time', e.target.value)} />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs font-medium">OF / OS</span>
                                <Input value={activity.ofos} onChange={(e) => updateActivity(dayIndex, activityIndex, 'ofos', e.target.value)} />
                              </label>
                              <label className="space-y-1 md:col-span-2">
                                <span className="text-xs font-medium">O que foi feito</span>
                                <textarea className={textareaClass} value={activity.description} onChange={(e) => updateActivity(dayIndex, activityIndex, 'description', e.target.value)} />
                              </label>
                              <label className="space-y-1 md:col-span-2">
                                <span className="text-xs font-medium">Funcionário(s) desta atividade</span>
                                <Input value={activity.employees} onChange={(e) => updateActivity(dayIndex, activityIndex, 'employees', e.target.value)} />
                              </label>
                              <label className="space-y-1 md:col-span-2">
                                <span className="text-xs font-medium">Observação desta atividade</span>
                                <textarea className={textareaClass} value={activity.observation} onChange={(e) => updateActivity(dayIndex, activityIndex, 'observation', e.target.value)} />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>

                      {reportDay.photos.length > 0 && (
                        <div className="space-y-3 border-t pt-4">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            Fotos do dia - marque somente as que devem entrar no PDF
                          </div>
                          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {reportDay.photos.map((photo) => (
                              <label key={photo.id} className={`rounded-lg border p-2 cursor-pointer ${photo.include ? 'border-primary bg-primary/5' : 'opacity-55'}`}>
                                <img src={photo.src} alt={photo.label} className="w-full h-28 object-cover rounded-md mb-2" />
                                <div className="flex items-start gap-2">
                                  <input type="checkbox" checked={photo.include} onChange={() => togglePhoto(dayIndex, photo.id)} className="mt-1" />
                                  <div className="text-xs min-w-0">
                                    <div className="font-semibold">{photo.label}</div>
                                    <div className="truncate text-muted-foreground">{photo.activity}</div>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="report-print-area">
              <div className="report-preview-stack">
                {draft.days.flatMap((reportDay) => {
                  const activityPages = chunk(reportDay.activities, 5);
                  const normalizedActivityPages = activityPages.length ? activityPages : [[] as ReportActivity[]];
                  const selectedPhotos = reportDay.photos.filter((photo) => photo.include);
                  const photoPages = chunk(selectedPhotos, 4);

                  const detailPages = normalizedActivityPages.map((activitiesOnPage, pageIndex) => (
                    <section className="report-sheet" key={`${reportDay.key}-detail-${pageIndex}`}>
                      <img src="/report-letterhead.webp" alt="Folha timbrada Multprest" className="letterhead-layer" />
                      <div className="report-sheet-content">
                        <h1 className="report-title">{draft.title}</h1>
                        <div className="report-subtitle">
                          {draft.number} • {reportDay.dateLabel}{pageIndex > 0 ? ' • Continuação' : ''}
                        </div>
                        <div className="report-blue-rule" />

                        {pageIndex === 0 && (
                          <div className="report-summary-grid">
                            <div className="report-summary-cell"><div className="report-label">Data</div><div className="report-value">{reportDay.dateLabel}</div></div>
                            <div className="report-summary-cell"><div className="report-label">Cliente</div><div className="report-value">{reportDay.client}</div></div>
                            <div className="report-summary-cell"><div className="report-label">Horário</div><div className="report-value">{reportDay.schedule}</div></div>
                            <div className="report-summary-cell"><div className="report-label">Quantidade de funcionários</div><div className="report-value">{reportDay.headcount}</div></div>
                            <div className="report-summary-cell"><div className="report-label">Equipe do dia</div><div className="report-value">{reportDay.team}</div></div>
                            <div className="report-summary-cell"><div className="report-label">OF / OS</div><div className="report-value">{reportDay.ofos}</div></div>
                          </div>
                        )}

                        <div className="report-section-title">{pageIndex === 0 ? 'Atividades do dia' : 'Atividades do dia - continuação'}</div>
                        {activitiesOnPage.map((activity, activityIndex) => (
                          <div className="report-activity" key={`${activity.id}-${activityIndex}`}>
                            <div className="report-activity-top">
                              <span><strong>Horário:</strong> {activity.time}</span>
                              {activity.ofos && <span><strong>OF/OS:</strong> {activity.ofos}</span>}
                            </div>
                            <div className="report-activity-description">{activity.description}</div>
                            <div className="report-activity-employees"><strong>Funcionário(s):</strong> {activity.employees}</div>
                            {activity.observation && <div className="report-activity-observation"><strong>Observação:</strong> {activity.observation}</div>}
                          </div>
                        ))}
                      </div>
                    </section>
                  ));

                  const photosPages = photoPages.map((photosOnPage, photoPageIndex) => (
                    <section className="report-sheet" key={`${reportDay.key}-photos-${photoPageIndex}`}>
                      <img src="/report-letterhead.webp" alt="Folha timbrada Multprest" className="letterhead-layer" />
                      <div className="report-sheet-content">
                        <h1 className="report-title">REGISTRO FOTOGRÁFICO</h1>
                        <div className="report-subtitle">{draft.number} • {reportDay.dateLabel} • {reportDay.client}</div>
                        <div className="report-blue-rule" />
                        <div className="report-photo-grid">
                          {photosOnPage.map((photo) => (
                            <div className="report-photo-card" key={photo.id}>
                              <img src={photo.src} alt={photo.label} />
                              <div className="report-photo-caption">
                                <strong>{photo.label}</strong> - {reportDay.dateLabel}<br />
                                {photo.activity}<br />
                                <span><strong>Funcionário(s):</strong> {photo.employees}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  ));

                  return [...detailPages, ...photosPages];
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
