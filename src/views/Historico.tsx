'use client';

import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  History,
  Search,
  Calendar,
  Clock,
  Users,
  Building2,
  Trash2,
  Loader2,
  Image,
  X,
  Edit2,
  User,
  Timer,
  Briefcase,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { useRegistros, useFuncionarios, useClientes, Registro } from '@/hooks/useApi';
import EditRegistroModal from '@/components/EditRegistroModal';
import { resolvePhotoSrc } from '@/lib/photos';

function PhotoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>
      <img
        src={src}
        alt="Foto ampliada"
        className="max-w-full max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function PhotoThumbnail({ photoKey, label }: { photoKey: string; label: string }) {
  const [showModal, setShowModal] = useState(false);
  const src = resolvePhotoSrc(photoKey);

  return (
    <>
      <div className="relative cursor-pointer group" onClick={() => setShowModal(true)}>
        <img
          src={src}
          alt={label}
          className="w-20 h-20 object-cover rounded-lg border-2 border-border group-hover:border-primary transition-colors"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
          <Image className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {showModal && <PhotoModal src={src} onClose={() => setShowModal(false)} />}
    </>
  );
}

export default function HistoricoPage() {
  const { registros, loading, update, remove } = useRegistros();
  const { funcionarios, loading: loadingFunc } = useFuncionarios();
  const { clientes, loading: loadingClientes } = useClientes();
  const [search, setSearch] = useState('');
  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  // Safe date formatter: YYYY-MM-DD → DD/MM/YYYY without new Date() in render
  const formatDatePT = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Calculate hours between two time strings (HH:MM format)
  const calculateHours = (chegada: string, saida: string): string | null => {
    if (!chegada || !saida) return null;
    const [h1, m1] = chegada.split(':').map(Number);
    const [h2, m2] = saida.split(':').map(Number);
    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;
    if (end <= start) return null;
    const diff = end - start;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}min`;
  };

  const calculateHoursNumeric = (chegada: string, saida: string): number => {
    if (!chegada || !saida) return 0;
    const [h1, m1] = chegada.split(':').map(Number);
    const [h2, m2] = saida.split(':').map(Number);
    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;
    if (end <= start) return 0;
    return (end - start) / 60;
  };

  // Send a single registro to dashboard
  const sendToDashboard = async (registro: Registro) => {
    const funcionarioNames = registro.funcionarios?.map((f) => f.nome) || [];

    const payload = {
      of_number: registro.of_number || '',
      employee_name: funcionarioNames.join(', '),
      entry_date: registro.data || new Date().toISOString().split('T')[0],
      hours_worked: calculateHoursNumeric(registro.chegada || '', registro.saida || ''),
      description: registro.trabalho || '',
      location: registro.cliente_nome || registro.of_customer_name || '',
      weather: '',
      notes: registro.observacoes || '',
    };

    console.log('Enviando para Dashboard:', payload);

    const response = await fetch('https://dashboardmultprest.mocha.app/api/public/diary-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Resposta do Dashboard:', data);

    if (!response.ok) {
      throw new Error('Failed to send to dashboard');
    }
  };

  const handleSendSingle = async (registro: Registro) => {
    setSendingIds((prev) => new Set(prev).add(registro.id));
    try {
      await sendToDashboard(registro);
      setSentIds((prev) => new Set(prev).add(registro.id));
    } catch (error) {
      console.error('Erro ao enviar:', error);
      alert('Erro ao enviar para o Dashboard');
    } finally {
      setSendingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(registro.id);
        return newSet;
      });
    }
  };

  const handleBulkSync = async () => {
    setBulkSending(true);
    let successCount = 0;
    let errorCount = 0;

    for (const registro of registros) {
      if (sentIds.has(registro.id)) continue;

      setSendingIds((prev) => new Set(prev).add(registro.id));
      try {
        await sendToDashboard(registro);
        setSentIds((prev) => new Set(prev).add(registro.id));
        successCount++;
      } catch (error) {
        console.error('Erro ao enviar registro:', registro.id, error);
        errorCount++;
      } finally {
        setSendingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(registro.id);
          return newSet;
        });
      }
    }

    setBulkSending(false);
    alert(`Sincronização concluída!\n${successCount} enviados com sucesso\n${errorCount} com erro`);
  };

  const filteredRegistros = registros.filter(
    (r) =>
      r.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      r.trabalho?.toLowerCase().includes(search.toLowerCase()) ||
      r.funcionarios?.some((f) => f.nome.toLowerCase().includes(search.toLowerCase())) ||
      r.of_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.of_title?.toLowerCase().includes(search.toLowerCase()) ||
      r.of_customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      await remove(id);
    }
  };

  const handleSaveEdit = async (id: number, data: Parameters<typeof update>[1]) => {
    await update(id, data);
  };

  const isLoading = loading || loadingFunc || loadingClientes;

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
      <div className="space-y-6">
        {editingRegistro && (
          <EditRegistroModal
            registro={editingRegistro}
            funcionarios={funcionarios}
            clientes={clientes}
            onSave={handleSaveEdit}
            onClose={() => setEditingRegistro(null)}
          />
        )}

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Histórico</h2>
              <p className="text-muted-foreground">{registros.length} registro(s)</p>
            </div>
          </div>
          <Button
            onClick={handleBulkSync}
            disabled={bulkSending || registros.length === 0}
            className="gap-2"
          >
            {bulkSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar todos ao Dashboard
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, OF, trabalho ou funcionário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        <div className="grid gap-4">
          {filteredRegistros.map((registro) => (
            <Card key={registro.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary to-accent" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      <Calendar className="w-4 h-4" />
                      {registro.data ? formatDatePT(registro.data) : '—'}
                    </div>
                    {(registro.chegada || registro.saida) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" />
                        {registro.chegada || '—'} - {registro.saida || '—'}
                      </div>
                    )}
                    {registro.chegada &&
                      registro.saida &&
                      calculateHours(registro.chegada, registro.saida) && (
                        <div className="flex items-center gap-2 text-sm text-white bg-primary px-3 py-1 rounded-full font-medium">
                          <Timer className="w-4 h-4" />
                          {calculateHours(registro.chegada, registro.saida)}
                        </div>
                      )}
                    {registro.created_by && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        <User className="w-4 h-4" />
                        {registro.created_by}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {sentIds.has(registro.id) ? (
                      <div className="flex items-center gap-1 text-green-600 px-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs">Enviado</span>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => handleSendSingle(registro)}
                        disabled={sendingIds.has(registro.id)}
                        title="Enviar ao Dashboard"
                      >
                        {sendingIds.has(registro.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => setEditingRegistro(registro)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(registro.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* OF Information */}
                  {registro.of_number ? (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ordem de Fabricação</p>
                        <p className="font-medium">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm mr-2">
                            {registro.of_number}
                          </span>
                          {registro.of_title}
                        </p>
                        {registro.of_customer_name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Cliente: {registro.of_customer_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Building2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cliente</p>
                        <p className="font-medium">{registro.cliente_nome || '—'}</p>
                      </div>
                    </div>
                  )}

                  {registro.funcionarios && registro.funcionarios.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Equipe</p>
                        <p className="font-medium">
                          {registro.funcionarios.map((f) => f.nome).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {registro.trabalho && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Trabalho realizado</p>
                      <p className="text-foreground">{registro.trabalho}</p>
                    </div>
                  )}

                  {registro.observacoes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Observações</p>
                      <p className="text-foreground">{registro.observacoes}</p>
                    </div>
                  )}

                  {/* Photos */}
                  {(registro.foto_inicio_key ||
                    registro.foto_fim_key ||
                    registro.foto_observacoes_key) && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Fotos</p>
                      <div className="flex gap-3 flex-wrap">
                        {registro.foto_inicio_key && (
                          <div className="text-center">
                            <PhotoThumbnail photoKey={registro.foto_inicio_key} label="Início" />
                            <p className="text-xs text-muted-foreground mt-1">Início</p>
                          </div>
                        )}
                        {registro.foto_fim_key && (
                          <div className="text-center">
                            <PhotoThumbnail photoKey={registro.foto_fim_key} label="Fim" />
                            <p className="text-xs text-muted-foreground mt-1">Fim</p>
                          </div>
                        )}
                        {registro.foto_observacoes_key && (
                          <div className="text-center">
                            <PhotoThumbnail photoKey={registro.foto_observacoes_key} label="Obs" />
                            <p className="text-xs text-muted-foreground mt-1">Obs</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRegistros.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>{search ? 'Nenhum registro encontrado' : 'Nenhum registro ainda'}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
