"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Loader2, CheckCircle2, Camera, Upload, Clock } from "lucide-react";
import { Registro, Funcionario, Cliente } from "@/hooks/useApi";
import { resolvePhotoSrc } from "@/lib/photos";
import { uploadPhoto } from "@/lib/uploadPhoto";

interface EditRegistroModalProps {
  registro: Registro;
  funcionarios: Funcionario[];
  clientes: Cliente[];
  onSave: (id: number, data: {
    cliente_id: number;
    funcionario_ids: number[];
    data: string;
    chegada: string;
    saida: string;
    trabalho: string;
    observacoes: string;
    foto_inicio_key?: string;
    foto_fim_key?: string;
    foto_observacoes_key?: string;
  }) => Promise<void>;
  onClose: () => void;
}

function PhotoField({ 
  label, 
  currentKey, 
  onKeyChange 
}: { 
  label: string; 
  currentKey: string | null;
  onKeyChange: (key: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(
    currentKey ? resolvePhotoSrc(currentKey) : null
  );
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const key = await uploadPhoto(file);
      onKeyChange(key);
    } catch (error) {
      setPreview(currentKey ? resolvePhotoSrc(currentKey) : null);
      if (inputRef.current) inputRef.current.value = "";
      const message = error instanceof Error ? error.message : "Falha desconhecida no upload.";
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onKeyChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <Label className="text-sm mb-2 block">{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className="w-full h-32 object-cover rounded-lg border" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="w-3 h-3" />
          </Button>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
          <Button type="button" variant="ghost" size="sm">
            <Upload className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function EditRegistroModal({ registro, funcionarios, clientes, onSave, onClose }: EditRegistroModalProps) {
  const [selectedFuncionarios, setSelectedFuncionarios] = useState<number[]>(
    registro.funcionarios?.map(f => f.id) || []
  );
  const [selectedCliente, setSelectedCliente] = useState(registro.cliente_id?.toString() || "");
  const [data, setData] = useState(registro.data || "");
  const [chegada, setChegada] = useState(registro.chegada || "");
  const [saida, setSaida] = useState(registro.saida || "");
  const [trabalho, setTrabalho] = useState(registro.trabalho || "");
  const [observacoes, setObservacoes] = useState(registro.observacoes || "");
  const [fotoInicioKey, setFotoInicioKey] = useState<string | null>(registro.foto_inicio_key || null);
  const [fotoFimKey, setFotoFimKey] = useState<string | null>(registro.foto_fim_key || null);
  const [fotoObsKey, setFotoObsKey] = useState<string | null>(registro.foto_observacoes_key || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const toggleFuncionario = (id: number) => {
    setSelectedFuncionarios(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFuncionarios.length === 0 || !selectedCliente) {
      alert("Selecione ao menos um funcionário e um cliente.");
      return;
    }

    setSaving(true);
    try {
      await onSave(registro.id, {
        cliente_id: parseInt(selectedCliente),
        funcionario_ids: selectedFuncionarios,
        data,
        chegada,
        saida,
        trabalho,
        observacoes,
        foto_inicio_key: fotoInicioKey || undefined,
        foto_fim_key: fotoFimKey || undefined,
        foto_observacoes_key: fotoObsKey || undefined,
      });
      onClose();
    } catch {
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Editar Registro</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Data */}
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} className="mt-1" />
          </div>

          {/* Funcionários */}
          <div>
            <Label className="mb-2 block">Funcionários</Label>
            <div className="grid grid-cols-2 gap-2">
              {funcionarios.map(func => (
                <label
                  key={func.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                    selectedFuncionarios.includes(func.id) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={selectedFuncionarios.includes(func.id)}
                    onCheckedChange={() => toggleFuncionario(func.id)}
                  />
                  {func.nome}
                </label>
              ))}
            </div>
          </div>

          {/* Cliente */}
          <div>
            <Label className="mb-2 block">Cliente / Obra</Label>
            <RadioGroup value={selectedCliente} onValueChange={setSelectedCliente}>
              <div className="grid grid-cols-2 gap-2">
                {clientes.map(cliente => (
                  <label
                    key={cliente.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      selectedCliente === cliente.id.toString() ? "border-accent bg-accent/10" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={cliente.id.toString()} />
                    {cliente.nome}
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-green-600" /> Chegada
              </Label>
              <Input type="time" value={chegada} onChange={e => setChegada(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-red-500" /> Saída
              </Label>
              <Input type="time" value={saida} onChange={e => setSaida(e.target.value)} />
            </div>
          </div>

          {/* Trabalho */}
          <div>
            <Label>Trabalho realizado</Label>
            <Textarea
              value={trabalho}
              onChange={e => setTrabalho(e.target.value)}
              className="mt-1 min-h-[80px]"
              placeholder="Descreva o trabalho..."
            />
          </div>

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="mt-1 min-h-[60px]"
              placeholder="Observações adicionais..."
            />
          </div>

          {/* Fotos */}
          <div className="grid grid-cols-3 gap-3">
            <PhotoField label="Foto início" currentKey={fotoInicioKey} onKeyChange={setFotoInicioKey} />
            <PhotoField label="Foto fim" currentKey={fotoFimKey} onKeyChange={setFotoFimKey} />
            <PhotoField label="Foto obs." currentKey={fotoObsKey} onKeyChange={setFotoObsKey} />
          </div>
        </form>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
