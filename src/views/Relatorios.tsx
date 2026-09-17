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
} from 'lucide-react';

type ReportPhoto = {
  id: string;
  src: string;
  label: string;
  include: boolean;
};

type ReportDraft = {
  title: string;
  reportNumber: string;
  ofNumber: string;
  period: string;
  client: string;
  responsible: string;
  team: string;
  headcount: number;
  schedule: string;
  activities: string;
  observations: string;
  signatureName: string;
  signatureRole: string;
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

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function makeReportNumber(dates: string[]): string {
  const compact = (value: string) => value.replaceAll('-', '');
  if (!dates.length) return `RDO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
  if (dates.length === 1) return `RDO-${compact(dates[0])}`;
  return `RDO-${compact(dates[0])}-${compact(dates[dates.length - 1])}`;
}

function ReportLetterhead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`report-sheet relative bg-white text-slate-900 overflow-hidden ${className}`}>
      <img
        src="/folha-timbrada-multprest.webp"
        alt="Folha timbrada Multprest"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
      />
      <div className="relative z-10 report-content">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value, rightLabel, rightValue }: { label: string; value: string; rightLabel?: string; rightValue?: string }) {
  return (
    <div className="grid grid-cols-2 border-b border-slate-300 last:border-b-0">
      <div className="px-3 py-2 border-r border-slate-300">
        <span className="text-[9px] uppercase tracking-wide font-semibold text-slate-500">{label}</span>
        <div className="text-[11px] font-medium whitespace-pre-wrap break-words">{value || '—'}</div>
      </div>
      <div className="px-3 py-2">
        {rightLabel ? (
          <>
            <span className="text-[9px] uppercase tracking-wide font-semibold text-slate-500">{rightLabel}</span>
            <div className="text-[11px] font-medium whitespace-pre-wrap break-words">{rightValue || '—'}</div>
          </>
        ) : null}
      </div>
    </div>
  );
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
    const clientsFound = unique(sorted.map((r) => r.cliente_nome || r.of_customer_name || null));
    const teamNames = unique(sorted.flatMap((r) => r.funcionarios?.map((f) => f.nome) || []));
    const responsibleNames = unique(sorted.map((r) => r.created_by || null));
    const ofNumbers = unique(sorted.map((r) => r.of_number || null));

    const period = dates.length === 0
      ? 'Não informado'
      : dates.length === 1
        ? formatDatePT(dates[0])
        : `${formatDatePT(dates[0])} a ${formatDatePT(dates[dates.length - 1])}`;

    const activities = sorted
      .map((r, index) => {
        const of = r.of_number ? ` — OF ${r.of_number}${r.of_title ? ` - ${r.of_title}` : ''}` : '';
        const time = r.chegada || r.saida ? ` (${r.chegada || '—'} às ${r.saida || '—'})` : '';
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

    const responsible = responsibleNames.length ? responsibleNames.join(', ') : 'Não informado';

    setDraft({
      title: 'RELATÓRIO DIÁRIO DE OBRA',
      reportNumber: makeReportNumber(dates),
      ofNumber: ofNumbers.length ? ofNumbers.join(', ') : 'Não informado',
      period,
      client: clientsFound.length ? clientsFound.join(', ') : 'Não informado',
      responsible,
      team: teamNames.length ? teamNames.join(', ') : 'Não informado',
      headcount: teamNames.length,
      schedule: buildSchedule(sorted),
      activities: activities || 'Nenhuma atividade encontrada para os filtros selecionados.',
      observations: observations || 'Sem observações.',
      signatureName: responsible === 'Não informado' ? '' : responsible,
      signatureRole: 'Responsável pela obra',
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
  const selectedPhotos = draft?.photos.filter((photo) => photo.include) || [];
  const photoPages = chunk(selectedPhotos, 4);

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
        .report-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          box-shadow: 0 16px 45px rgba(15, 23, 42, 0.14);
        }
        .report-content {
          padding: 68mm 16mm 18mm 22mm;
          min-height: 297mm;
        }
        .report-preline { white-space: pre-line; }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-sheet {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }
          .report-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .report-content {
            padding: 68mm 16mm 18mm 22mm !important;
          }
          .report-photo-block,
          .report-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
            <p className="text-muted-foreground">Filtre os registros, ajuste o conteúdo e exporte na folha timbrada da Multprest.</p>
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
                    <Input value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Nº do relatório</span>
                    <Input value={draft.reportNumber} onChange={(e) => updateDraft('reportNumber', e.target.value)} />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">OF / OS</span>
                    <Input value={draft.ofNumber} onChange={(e) => updateDraft('ofNumber', e.target.value)} />
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

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Nome para assinatura</span>
                    <Input value={draft.signatureName} onChange={(e) => updateDraft('signatureName', e.target.value)} />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Cargo / função da assinatura</span>
                    <Input value={draft.signatureRole} onChange={(e) => updateDraft('signatureRole', e.target.value)} />
                  </label>
                </div>

                {draft.photos.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2 font-medium">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Fotos incluídas no relatório
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {draft.photos.map((photo) => (
                        <label key={photo.id} className={`rounded-lg border p-2 cursor-pointer transition ${photo.include ? 'border-primary bg-primary/5' : 'border-border opacity-60'}`}>
                          <img src={photo.src} alt={photo.label} className="w-full h-28 object-cover rounded-md bg-muted" />
                          <div className="flex items-center gap-2 mt-2">
                            <input type="checkbox" checked={photo.include} onChange={() => togglePhoto(photo.id)} />
                            <span className="text-xs">{photo.label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-semibold text-lg">Pré-visualização na folha timbrada</h3>
                  <p className="text-sm text-muted-foreground">A primeira página contém os dados e as demais organizam até 4 fotos por página.</p>
                </div>
                <Button onClick={() => window.print()} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Exportar / Imprimir PDF
                </Button>
              </div>

              <div className="report-print-area overflow-x-auto pb-4">
                <div className="space-y-4 min-w-[210mm]">
                  <ReportLetterhead>
                    <div className="text-center border-b-2 border-[#244c82] pb-2 mb-3">
                      <h1 className="text-[16px] font-bold tracking-wide text-[#173f73]">{draft.title}</h1>
                    </div>

                    <div className="border border-slate-300 rounded-sm overflow-hidden report-section">
                      <SummaryRow label="Nº do relatório" value={draft.reportNumber} rightLabel="OF / OS" rightValue={draft.ofNumber} />
                      <SummaryRow label="Data / período" value={draft.period} rightLabel="Cliente" rightValue={draft.client} />
                      <SummaryRow label="Horário" value={draft.schedule} rightLabel="Quantidade de funcionários" rightValue={String(draft.headcount)} />
                      <SummaryRow label="Responsável" value={draft.responsible} rightLabel="Registros consolidados" rightValue={String(draft.recordCount)} />
                      <div className="px-3 py-2">
                        <span className="text-[9px] uppercase tracking-wide font-semibold text-slate-500">Equipe</span>
                        <div className="text-[11px] font-medium break-words">{draft.team || '—'}</div>
                      </div>
                    </div>

                    <div className="mt-4 report-section">
                      <div className="text-[10px] font-bold text-[#173f73] uppercase mb-1">Atividades realizadas</div>
                      <div className="border border-slate-300 rounded-sm p-3 text-[10px] leading-4 min-h-[42mm] report-preline break-words">
                        {draft.activities}
                      </div>
                    </div>

                    <div className="mt-3 report-section">
                      <div className="text-[10px] font-bold text-[#173f73] uppercase mb-1">Observações</div>
                      <div className="border border-slate-300 rounded-sm p-3 text-[10px] leading-4 min-h-[20mm] report-preline break-words">
                        {draft.observations}
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-10 items-end report-section">
                      <div className="text-[9px] text-slate-600">
                        <strong>Documento:</strong> {draft.reportNumber}
                      </div>
                      <div className="text-center pt-8">
                        <div className="border-t border-slate-700 pt-1 text-[10px] font-semibold">{draft.signatureName || 'Assinatura'}</div>
                        <div className="text-[9px] text-slate-500">{draft.signatureRole}</div>
                      </div>
                    </div>
                  </ReportLetterhead>

                  {photoPages.map((pagePhotos, pageIndex) => (
                    <ReportLetterhead key={`photos-${pageIndex}`}>
                      <div className="text-center border-b-2 border-[#244c82] pb-2 mb-4">
                        <h2 className="text-[15px] font-bold tracking-wide text-[#173f73]">REGISTRO FOTOGRÁFICO</h2>
                        <div className="text-[9px] text-slate-500 mt-1">{draft.reportNumber} • {draft.period} • {draft.client}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {pagePhotos.map((photo) => (
                          <figure key={photo.id} className="report-photo-block border border-slate-300 rounded-sm p-2 bg-white/95">
                            <img
                              src={photo.src}
                              alt={photo.label}
                              className="w-full h-[73mm] object-contain bg-slate-50"
                            />
                            <figcaption className="text-[9px] text-center mt-1.5 font-medium text-slate-600">{photo.label}</figcaption>
                          </figure>
                        ))}
                      </div>
                    </ReportLetterhead>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
