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
  CheckCircle2,
} from 'lucide-react';

type Activity = {
  id: string;
  sequence: number;
  title: string;
  description: string;
  observation: string;
};

type Photo = {
  id: string;
  src: string;
  label: string;
  caption: string;
  include: boolean;
};

type DayReport = {
  key: string;
  dateLabel: string;
  schedule: string;
  fronts: string;
  status: string;
  activities: Activity[];
  photos: Photo[];
};

type Draft = {
  title: string;
  subtitle: string;
  number: string;
  revision: string;
  period: string;
  emission: string;
  days: DayReport[];
};

type PrintPage = {
  id: string;
  day: DayReport;
  activities: Activity[];
  photos: Photo[];
  continuation: boolean;
  showDocumentHeader: boolean;
  kind: 'detail' | 'photos';
};

const selectClass =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30';
const textareaClass =
  'min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y';

function formatDatePT(value: string) {
  const parts = value?.split('-');
  return parts?.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : value || 'Sem data';
}

function todayPT() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function unique(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim())
    ),
  ];
}

function buildSchedule(records: Registro[]) {
  const arrivals = records.map((record) => record.chegada).filter(Boolean).sort();
  const departures = records.map((record) => record.saida).filter(Boolean).sort();

  if (!arrivals.length && !departures.length) return 'Não informado';
  if (arrivals.length && departures.length) {
    return arrivals[0] + ' às ' + departures[departures.length - 1];
  }
  return arrivals[0] || departures[departures.length - 1] || 'Não informado';
}

function splitActivityText(
  rawValue: string | null | undefined,
  fallbackTitle: string
) {
  const raw = rawValue?.trim() || '';
  if (!raw) {
    return { title: fallbackTitle, description: 'Atividade sem descrição.' };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1 && lines[0].length <= 70) {
    return {
      title: lines[0].replace(/\s*[-–—:]\s*$/, '') || fallbackTitle,
      description: lines.slice(1).join('\n'),
    };
  }

  const separated = raw.match(/^(.{3,70}?)\s+(?:-|–|—|:)\s+(.+)$/s);
  if (separated) {
    return {
      title: separated[1].trim() || fallbackTitle,
      description: separated[2].trim() || raw,
    };
  }

  return { title: fallbackTitle, description: raw };
}

function reportNumber(dates: string[]) {
  if (!dates.length) return 'RDO-' + Date.now();

  const split = (value: string) => {
    const parts = value.split('-');
    return {
      year: parts[0] || '',
      dm: (parts[2] || '') + (parts[1] || ''),
    };
  };

  const first = split(dates[0]);
  const last = split(dates[dates.length - 1]);

  if (dates.length === 1) return 'RDO-' + first.dm + '-' + first.year;
  if (first.year === last.year) {
    return 'RDO-' + first.dm + '-' + last.dm + '-' + first.year;
  }
  return 'RDO-' + first.dm + first.year + '-' + last.dm + last.year;
}

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function buildPrintPages(draft: Draft | null): PrintPage[] {
  if (!draft) return [];

  const pages: PrintPage[] = [];

  draft.days.forEach((day) => {
    const selectedPhotos = day.photos.filter((photo) => photo.include);
    const activityChunks = chunk(day.activities, 3);
    const normalizedActivities = activityChunks.length
      ? activityChunks
      : ([[]] as Activity[][]);

    const firstPagePhotos = selectedPhotos.slice(0, 2);
    const remainingPhotos = selectedPhotos.slice(firstPagePhotos.length);

    normalizedActivities.forEach((activities, pageIndex) => {
      pages.push({
        id: day.key + '-detail-' + pageIndex,
        day,
        activities,
        photos: pageIndex === 0 ? firstPagePhotos : [],
        continuation: pageIndex > 0,
        showDocumentHeader: pages.length === 0,
        kind: 'detail',
      });
    });

    chunk(remainingPhotos, 4).forEach((photos, pageIndex) => {
      pages.push({
        id: day.key + '-photos-' + pageIndex,
        day,
        activities: [],
        photos,
        continuation: true,
        showDocumentHeader: false,
        kind: 'photos',
      });
    });
  });

  return pages;
}

const nextPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

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
    const selectedClient = clientes.find(
      (client) => String(client.id) === clienteId
    );
    const selectedEmployee = funcionarioId ? Number(funcionarioId) : null;

    return registros.filter((record) => {
      const matchesDate = day
        ? record.data === day
        : (!startDate || record.data >= startDate) &&
          (!endDate || record.data <= endDate);

      const matchesClient =
        !clienteId ||
        record.cliente_id === Number(clienteId) ||
        record.cliente_nome === selectedClient?.nome ||
        record.of_customer_name === selectedClient?.nome;

      const matchesEmployee =
        !selectedEmployee ||
        record.funcionarios?.some(
          (employee) => employee.id === selectedEmployee
        );

      return matchesDate && matchesClient && matchesEmployee;
    });
  }, [
    registros,
    clientes,
    day,
    startDate,
    endDate,
    clienteId,
    funcionarioId,
  ]);

  const printPages = useMemo(() => buildPrintPages(draft), [draft]);

  const clearFilters = () => {
    setDay('');
    setStartDate('');
    setEndDate('');
    setClienteId('');
    setFuncionarioId('');
    setDraft(null);
  };

  const generateDraft = () => {
    const sorted = [...filtered].sort(
      (a, b) =>
        (a.data || '').localeCompare(b.data || '') ||
        (a.chegada || '').localeCompare(b.chegada || '')
    );

    const grouped = new Map<string, Registro[]>();
    sorted.forEach((record) => {
      const key = record.data || 'sem-data';
      grouped.set(key, [...(grouped.get(key) || []), record]);
    });

    const days: DayReport[] = Array.from(grouped.entries()).map(
      ([key, records]) => {
        const activities: Activity[] = records.map((record, index) => {
          const fallbackTitle =
            record.of_title?.trim() || 'Atividade ' + (index + 1);
          const parsed = splitActivityText(record.trabalho, fallbackTitle);

          return {
            id: String(record.id) + '-' + index,
            sequence: index + 1,
            title: parsed.title,
            description: parsed.description,
            observation: record.observacoes || '',
          };
        });

        const photos: Photo[] = [];
        let photoSequence = 0;

        records.forEach((record, recordIndex) => {
          const fallbackTitle =
            record.of_title?.trim() || 'Atividade ' + (recordIndex + 1);
          const parsed = splitActivityText(record.trabalho, fallbackTitle);
          const caption =
            parsed.title &&
            !/^Atividade \d+$/i.test(parsed.title)
              ? parsed.title + ': ' + parsed.description
              : parsed.description;

          [
            record.foto_inicio_key,
            record.foto_fim_key,
            record.foto_observacoes_key,
          ].forEach((photoKey) => {
            if (!photoKey) return;

            photoSequence += 1;
            photos.push({
              id:
                String(record.id) +
                '-' +
                photoSequence +
                '-' +
                photoKey,
              src: resolvePhotoSrc(photoKey),
              label:
                'Foto ' + String(photoSequence).padStart(2, '0'),
              caption:
                caption ||
                'Registro fotográfico da atividade executada.',
              include: true,
            });
          });
        });

        const fronts = unique(
          activities
            .map((activity) => activity.title)
            .filter((title) => !/^Atividade \d+$/i.test(title))
        );

        return {
          key,
          dateLabel:
            key === 'sem-data' ? 'Sem data' : formatDatePT(key),
          schedule: buildSchedule(records),
          fronts: fronts.join(' | ') || 'Serviços diversos',
          status: 'Serviços executados',
          activities,
          photos,
        };
      }
    );

    const dates = days
      .map((reportDay) => reportDay.key)
      .filter((value) => value !== 'sem-data')
      .sort();

    setDraft({
      title: 'RELATÓRIO DIÁRIO DE OBRA',
      subtitle:
        'Registro de execução e acompanhamento de serviços',
      number: reportNumber(dates),
      revision: '00',
      period:
        dates.length === 1
          ? formatDatePT(dates[0])
          : dates.length
            ? formatDatePT(dates[0]) +
              ' a ' +
              formatDatePT(dates[dates.length - 1])
            : 'Não informado',
      emission: todayPT(),
      days,
    });
  };

  const updateDraftField = (
    key: keyof Pick<
      Draft,
      'title' | 'subtitle' | 'number' | 'revision' | 'period' | 'emission'
    >,
    value: string
  ) => {
    setDraft((current) =>
      current ? { ...current, [key]: value } : current
    );
  };

  const updateDay = (
    dayIndex: number,
    key: keyof Pick<
      DayReport,
      'dateLabel' | 'schedule' | 'fronts' | 'status'
    >,
    value: string
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      days[dayIndex] = { ...days[dayIndex], [key]: value };
      return { ...current, days };
    });
  };

  const updateActivity = (
    dayIndex: number,
    activityIndex: number,
    key: keyof Pick<Activity, 'title' | 'description' | 'observation'>,
    value: string
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      const activities = [...days[dayIndex].activities];
      activities[activityIndex] = {
        ...activities[activityIndex],
        [key]: value,
      };
      days[dayIndex] = { ...days[dayIndex], activities };
      return { ...current, days };
    });
  };

  const updatePhoto = (
    dayIndex: number,
    photoId: string,
    key: keyof Pick<Photo, 'label' | 'caption'>,
    value: string
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      days[dayIndex] = {
        ...days[dayIndex],
        photos: days[dayIndex].photos.map((photo) =>
          photo.id === photoId ? { ...photo, [key]: value } : photo
        ),
      };
      return { ...current, days };
    });
  };

  const togglePhoto = (dayIndex: number, photoId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const days = [...current.days];
      days[dayIndex] = {
        ...days[dayIndex],
        photos: days[dayIndex].photos.map((photo) =>
          photo.id === photoId
            ? { ...photo, include: !photo.include }
            : photo
        ),
      };
      return { ...current, days };
    });
  };

  const preparePrint = async () => {
    if (!draft || preparing) return;

    setPreparing(true);
    setPrintMode(true);
    await nextPaint();

    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        '.report-print-area img'
      )
    );

    await Promise.race([
      Promise.all(
        images.map(async (image) => {
          try {
            if (!image.complete) {
              await new Promise<void>((resolve) => {
                const done = () => resolve();
                image.addEventListener('load', done, { once: true });
                image.addEventListener('error', done, { once: true });
              });
            }
            if (typeof image.decode === 'function') {
              await image.decode().catch(() => undefined);
            }
          } catch {
            // A impressão continua mesmo que uma imagem não consiga ser decodificada.
          }
        })
      ),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);

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

  const loading =
    loadingRegistros || loadingFuncionarios || loadingClientes;

  if (loading) {
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
        .report-print-area {
          position: fixed;
          left: -300vw;
          top: 0;
          width: 210mm;
          pointer-events: none;
        }
        .report-sheet {
          width: 210mm;
          height: 297mm;
          position: relative;
          overflow: hidden;
          background: white;
          color: #1f2937;
          font-family: Arial, Helvetica, sans-serif;
        }
        .report-letterhead {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          z-index: 0;
        }
        .report-content {
          position: relative;
          z-index: 1;
          height: 100%;
          box-sizing: border-box;
          padding: 55mm 13mm 20mm 22mm;
        }
        .document-title {
          margin: 0;
          color: #214f84;
          font-size: 15px;
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: .01em;
        }
        .document-subtitle {
          margin-top: 3px;
          margin-bottom: 5px;
          color: #64748b;
          font-size: 7.5px;
        }
        .document-meta {
          display: grid;
          grid-template-columns: 24% 26% 24% 26%;
          border-top: 1px solid #c8d2df;
          border-left: 1px solid #c8d2df;
          margin-bottom: 6px;
        }
        .document-meta > div {
          min-height: 20px;
          border-right: 1px solid #c8d2df;
          border-bottom: 1px solid #c8d2df;
          padding: 3px 5px;
          box-sizing: border-box;
          font-size: 7px;
          display: flex;
          align-items: center;
        }
        .document-meta .meta-label {
          background: #e8eef5;
          color: #214f84;
          font-weight: 700;
        }
        .document-meta .meta-value {
          color: #334155;
          font-weight: 600;
        }
        .day-bar,
        .section-bar {
          background: #214f84;
          color: white;
          font-weight: 800;
          text-transform: uppercase;
        }
        .day-bar {
          padding: 4px 7px;
          font-size: 8.5px;
          margin-top: 5px;
        }
        .day-meta {
          display: grid;
          grid-template-columns: 15% 35% 15% 35%;
          border-bottom: 1px solid #d7dee8;
          margin-bottom: 7px;
        }
        .day-meta > div {
          min-height: 22px;
          padding: 4px 5px;
          box-sizing: border-box;
          font-size: 7px;
          display: flex;
          align-items: center;
          line-height: 1.2;
        }
        .day-meta .day-label {
          color: #214f84;
          font-weight: 800;
        }
        .day-meta .day-value {
          color: #334155;
          font-weight: 600;
        }
        .section-bar {
          padding: 4px 7px;
          font-size: 8.5px;
          margin: 6px 0 4px;
        }
        .activity-row {
          display: grid;
          grid-template-columns: 10mm 1fr;
          background: #f0f4f8;
          border-bottom: 5px solid white;
          break-inside: avoid;
        }
        .activity-number {
          background: #e5edf5;
          color: #214f84;
          font-size: 8px;
          font-weight: 800;
          display: flex;
          justify-content: center;
          padding-top: 6px;
        }
        .activity-body {
          padding: 5px 7px 6px;
          min-height: 25px;
        }
        .activity-title {
          color: #214f84;
          font-size: 8.5px;
          font-weight: 800;
          margin-bottom: 2px;
        }
        .activity-description {
          color: #263342;
          font-size: 7.4px;
          line-height: 1.25;
          white-space: pre-wrap;
        }
        .activity-observation {
          margin-top: 3px;
          padding-top: 3px;
          border-top: 1px dashed #cbd5e1;
          color: #5b6573;
          font-size: 6.6px;
          line-height: 1.2;
          white-space: pre-wrap;
        }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-left: 1px solid #d7dee8;
          border-top: 1px solid #d7dee8;
        }
        .photo-card {
          border-right: 1px solid #d7dee8;
          border-bottom: 1px solid #d7dee8;
          padding: 5px;
          background: white;
          break-inside: avoid;
        }
        .photo-card img {
          width: 100%;
          height: 44mm;
          object-fit: contain;
          background: #f8fafc;
          display: block;
        }
        .photo-card.photo-only img {
          height: 67mm;
        }
        .photo-caption {
          margin-top: 4px;
          color: #64748b;
          font-size: 6.2px;
          line-height: 1.2;
        }
        .report-note {
          margin-top: 5px;
          color: #64748b;
          font-size: 6.3px;
        }
        .report-footer {
          position: absolute;
          left: 22mm;
          right: 13mm;
          bottom: 8mm;
          text-align: center;
          color: #214f84;
          font-size: 6.2px;
          z-index: 2;
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          .report-print-area,
          .report-print-area * {
            visibility: visible !important;
          }
          .report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            pointer-events: auto !important;
          }
          .report-sheet {
            page-break-after: always;
            break-after: page;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .report-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Relatórios</h2>
            <p className="text-muted-foreground">
              Gere o relatório no padrão Multprest, revise os campos e somente depois imprima ou salve em PDF.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 font-semibold">
              <Filter className="w-5 h-5 text-primary" />
              Filtros
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm font-medium">Dia específico</span>
                <Input
                  type="date"
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium">Cliente</span>
                <select
                  className={selectClass}
                  value={clienteId}
                  onChange={(event) => setClienteId(event.target.value)}
                >
                  <option value="">Todos os clientes</option>
                  {clientes.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium">Data inicial</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  disabled={Boolean(day)}
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium">Data final</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  disabled={Boolean(day)}
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Funcionário</span>
                <select
                  className={selectClass}
                  value={funcionarioId}
                  onChange={(event) => setFuncionarioId(event.target.value)}
                >
                  <option value="">Todos os funcionários</option>
                  {funcionarios.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{filtered.length}</strong>{' '}
                registro(s) encontrado(s)
              </span>

              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Limpar
                </Button>
                <Button
                  onClick={generateDraft}
                  disabled={!filtered.length}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Emitir relatório
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
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      Relatório emitido para revisão
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Todos os campos abaixo podem ser ajustados antes da impressão. As alterações feitas aqui não alteram o registro original do diário de obra.
                    </p>
                  </div>

                  <Button
                    onClick={preparePrint}
                    disabled={preparing}
                    className="gap-2"
                  >
                    {preparing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    {preparing ? 'Preparando...' : 'Imprimir / Salvar PDF'}
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="font-semibold">Dados do documento</div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-medium">Título</span>
                      <Input
                        value={draft.title}
                        onChange={(event) =>
                          updateDraftField('title', event.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium">Subtítulo</span>
                      <Input
                        value={draft.subtitle}
                        onChange={(event) =>
                          updateDraftField('subtitle', event.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium">Documento</span>
                      <Input
                        value={draft.number}
                        onChange={(event) =>
                          updateDraftField('number', event.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium">Revisão</span>
                      <Input
                        value={draft.revision}
                        onChange={(event) =>
                          updateDraftField('revision', event.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium">Período</span>
                      <Input
                        value={draft.period}
                        onChange={(event) =>
                          updateDraftField('period', event.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium">Emissão</span>
                      <Input
                        value={draft.emission}
                        onChange={(event) =>
                          updateDraftField('emission', event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="border-t pt-5 space-y-5">
                  {draft.days.map((reportDay, dayIndex) => (
                    <div
                      key={reportDay.key}
                      className="rounded-xl border bg-muted/20 p-4 space-y-4"
                    >
                      <div className="font-bold flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        Registro diário - {reportDay.dateLabel}
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <label className="space-y-1">
                          <span className="text-xs font-medium">Data</span>
                          <Input
                            value={reportDay.dateLabel}
                            onChange={(event) =>
                              updateDay(
                                dayIndex,
                                'dateLabel',
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium">Horário</span>
                          <Input
                            value={reportDay.schedule}
                            onChange={(event) =>
                              updateDay(
                                dayIndex,
                                'schedule',
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium">Frentes</span>
                          <Input
                            value={reportDay.fronts}
                            onChange={(event) =>
                              updateDay(
                                dayIndex,
                                'fronts',
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium">Status</span>
                          <Input
                            value={reportDay.status}
                            onChange={(event) =>
                              updateDay(
                                dayIndex,
                                'status',
                                event.target.value
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="border-t pt-3 space-y-3">
                        <div className="font-medium text-sm">
                          Atividades executadas
                        </div>

                        {reportDay.activities.map(
                          (activity, activityIndex) => (
                            <div
                              key={activity.id}
                              className="rounded-lg border bg-background p-3 space-y-3"
                            >
                              <label className="space-y-1 block">
                                <span className="text-xs font-medium">
                                  Atividade {activity.sequence} - título
                                </span>
                                <Input
                                  value={activity.title}
                                  onChange={(event) =>
                                    updateActivity(
                                      dayIndex,
                                      activityIndex,
                                      'title',
                                      event.target.value
                                    )
                                  }
                                />
                              </label>

                              <label className="space-y-1 block">
                                <span className="text-xs font-medium">
                                  Descrição
                                </span>
                                <textarea
                                  className={textareaClass}
                                  value={activity.description}
                                  onChange={(event) =>
                                    updateActivity(
                                      dayIndex,
                                      activityIndex,
                                      'description',
                                      event.target.value
                                    )
                                  }
                                />
                              </label>

                              <label className="space-y-1 block">
                                <span className="text-xs font-medium">
                                  Observação
                                </span>
                                <textarea
                                  className={textareaClass}
                                  value={activity.observation}
                                  onChange={(event) =>
                                    updateActivity(
                                      dayIndex,
                                      activityIndex,
                                      'observation',
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                            </div>
                          )
                        )}
                      </div>

                      {reportDay.photos.length > 0 && (
                        <div className="border-t pt-3 space-y-3">
                          <div className="font-medium text-sm flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            Registro fotográfico
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            {reportDay.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className={
                                  'rounded-lg border bg-background p-3 space-y-2 ' +
                                  (photo.include ? '' : 'opacity-55')
                                }
                              >
                                <img
                                  src={photo.src}
                                  alt={photo.label}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-40 object-contain rounded bg-muted"
                                />

                                <label className="flex items-center gap-2 text-xs font-medium">
                                  <input
                                    type="checkbox"
                                    checked={photo.include}
                                    onChange={() =>
                                      togglePhoto(dayIndex, photo.id)
                                    }
                                  />
                                  Incluir no relatório
                                </label>

                                <label className="space-y-1 block">
                                  <span className="text-xs font-medium">
                                    Identificação
                                  </span>
                                  <Input
                                    value={photo.label}
                                    onChange={(event) =>
                                      updatePhoto(
                                        dayIndex,
                                        photo.id,
                                        'label',
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>

                                <label className="space-y-1 block">
                                  <span className="text-xs font-medium">
                                    Legenda
                                  </span>
                                  <textarea
                                    className={textareaClass}
                                    value={photo.caption}
                                    onChange={(event) =>
                                      updatePhoto(
                                        dayIndex,
                                        photo.id,
                                        'caption',
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {printMode && (
              <div className="report-print-area">
                {printPages.map((page, pageIndex) => (
                  <section className="report-sheet" key={page.id}>
                    <img
                      src="/folha-timbrada-multprest.webp"
                      alt=""
                      className="report-letterhead"
                      loading="eager"
                      decoding="sync"
                    />

                    <div className="report-content">
                      {page.showDocumentHeader && (
                        <>
                          <h1 className="document-title">{draft.title}</h1>
                          <div className="document-subtitle">
                            {draft.subtitle}
                          </div>

                          <div className="document-meta">
                            <div className="meta-label">Documento</div>
                            <div className="meta-value">{draft.number}</div>
                            <div className="meta-label">Revisão</div>
                            <div className="meta-value">{draft.revision}</div>
                            <div className="meta-label">Período</div>
                            <div className="meta-value">{draft.period}</div>
                            <div className="meta-label">Emissão</div>
                            <div className="meta-value">{draft.emission}</div>
                          </div>
                        </>
                      )}

                      <div className="day-bar">
                        REGISTRO DIÁRIO - {page.day.dateLabel}
                        {page.continuation ? ' - CONTINUAÇÃO' : ''}
                      </div>

                      <div className="day-meta">
                        <div className="day-label">Data</div>
                        <div className="day-value">
                          {page.day.dateLabel}
                        </div>
                        <div className="day-label">Horário</div>
                        <div className="day-value">
                          {page.day.schedule}
                        </div>
                        <div className="day-label">Frentes</div>
                        <div className="day-value">
                          {page.day.fronts}
                        </div>
                        <div className="day-label">Status</div>
                        <div className="day-value">
                          {page.day.status}
                        </div>
                      </div>

                      {page.kind === 'detail' && (
                        <>
                          <div className="section-bar">
                            ATIVIDADES EXECUTADAS
                          </div>

                          {page.activities.length ? (
                            page.activities.map((activity) => (
                              <div
                                className="activity-row"
                                key={activity.id}
                              >
                                <div className="activity-number">
                                  {activity.sequence}
                                </div>
                                <div className="activity-body">
                                  <div className="activity-title">
                                    {activity.title}
                                  </div>
                                  <div className="activity-description">
                                    {activity.description}
                                  </div>
                                  {activity.observation && (
                                    <div className="activity-observation">
                                      <strong>Observação:</strong>{' '}
                                      {activity.observation}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="activity-row">
                              <div className="activity-number">1</div>
                              <div className="activity-body">
                                <div className="activity-title">
                                  Sem atividade informada
                                </div>
                                <div className="activity-description">
                                  Não há descrição de atividade vinculada a esta data.
                                </div>
                              </div>
                            </div>
                          )}

                          {page.photos.length > 0 && (
                            <>
                              <div className="section-bar">
                                REGISTRO FOTOGRÁFICO
                              </div>
                              <div className="photo-grid">
                                {page.photos.map((photo) => (
                                  <div
                                    className="photo-card"
                                    key={photo.id}
                                  >
                                    <img
                                      src={photo.src}
                                      alt=""
                                      loading="eager"
                                      decoding="async"
                                    />
                                    <div className="photo-caption">
                                      <strong>{photo.label}</strong> -{' '}
                                      {photo.caption}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="report-note">
                                Registros fotográficos vinculados às atividades executadas na data indicada.
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {page.kind === 'photos' && (
                        <>
                          <div className="section-bar">
                            REGISTRO FOTOGRÁFICO
                          </div>
                          <div className="photo-grid">
                            {page.photos.map((photo) => (
                              <div
                                className="photo-card photo-only"
                                key={photo.id}
                              >
                                <img
                                  src={photo.src}
                                  alt=""
                                  loading="eager"
                                  decoding="async"
                                />
                                <div className="photo-caption">
                                  <strong>{photo.label}</strong> -{' '}
                                  {photo.caption}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="report-note">
                            Continuação dos registros fotográficos das atividades executadas.
                          </div>
                        </>
                      )}
                    </div>

                    <div className="report-footer">
                      Multprest Serviços Industriais Ltda. &nbsp;&nbsp;|&nbsp;&nbsp; {draft.number}
                      &nbsp;&nbsp;|&nbsp;&nbsp; Página {pageIndex + 1} de {printPages.length}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
