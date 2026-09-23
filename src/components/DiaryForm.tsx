"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Camera, Clock, FileText, Upload, CheckCircle2, Loader2, X, User } from "lucide-react";
import { useFuncionarios, useClientes, useRegistros } from "@/hooks/useApi";
import { uploadPhoto } from "@/lib/uploadPhoto";

interface PhotoUploadProps {
  label: string;
  description?: string;
  preview: string | null;
  onFileChange: (file: File | null) => void;
  uploading?: boolean;
}

function PhotoUpload({ label, description, preview, onFileChange, uploading }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  };

  const handleRemove = () => {
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div>
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
          <img
            src={preview}
            alt={label}
            className="w-full h-48 object-cover rounded-xl border-2 border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        >
          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-2">{description || "Clique para tirar foto ou fazer upload"}</p>
          <Button type="button" variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Adicionar foto
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DiaryForm() {
  const { funcionarios, loading: loadingFunc } = useFuncionarios();
  const { clientes, loading: loadingClientes } = useClientes();
  const { create: createRegistro } = useRegistros();

  const [selectedFuncionarios, setSelectedFuncionarios] = useState<number[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [responsavel, setResponsavel] = useState("");

  const [chegada, setChegada] = useState("");
  const [saida, setSaida] = useState("");
  const [trabalho, setTrabalho] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [integrationSuccess, setIntegrationSuccess] = useState(false);
  const [integrationError, setIntegrationError] = useState(false);

  // Photo states
  const [fotoInicio, setFotoInicio] = useState<File | null>(null);
  const [fotoInicioPreview, setFotoInicioPreview] = useState<string | null>(null);
  const [fotoFim, setFotoFim] = useState<File | null>(null);
  const [fotoFimPreview, setFotoFimPreview] = useState<string | null>(null);
  const [fotoObs, setFotoObs] = useState<File | null>(null);
  const [fotoObsPreview, setFotoObsPreview] = useState<string | null>(null);

  const handleFotoChange = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    setFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const toggleFuncionario = (id: number) => {
    setSelectedFuncionarios((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setSelectedFuncionarios([]);
    setSelectedCliente("");
    setResponsavel("");

    setChegada("");
    setSaida("");
    setTrabalho("");
    setObservacoes("");
    setFotoInicio(null);
    setFotoInicioPreview(null);
    setFotoFim(null);
    setFotoFimPreview(null);
    setFotoObs(null);
    setFotoObsPreview(null);
  };

  // Calculate hours worked from chegada and saida
  const calculateHoursWorked = (chegada: string, saida: string): number => {
    if (!chegada || !saida) return 0;
    const [h1, m1] = chegada.split(":").map(Number);
    const [h2, m2] = saida.split(":").map(Number);
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    return Math.round(((minutes2 - minutes1) / 60) * 100) / 100;
  };

  // Send data to external dashboard
  const sendToDashboard = async (funcionarioNames: string[]) => {
    const cliente = clientes.find(c => c.id === parseInt(selectedCliente));
    const entryDate = new Date().toISOString().split("T")[0];
    const hoursWorked = calculateHoursWorked(chegada, saida);

    const payload = {
      of_number: "",
      employee_name: funcionarioNames.join(", "),
      entry_date: entryDate,
      hours_worked: hoursWorked,
      description: trabalho,
      location: cliente?.nome || "",
      weather: "",
      notes: observacoes,
    };

    console.log("Enviando para Dashboard:", payload);

    try {
      const response = await fetch("https://dashboardmultprest.mocha.app/api/public/diary-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Resposta do Dashboard:", data);

      if (!response.ok) {
        throw new Error("Failed to send to dashboard");
      }
      
      return data;
    } catch (error) {
      console.error("Erro ao enviar para Dashboard:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFuncionarios.length === 0) {
      alert("Por favor, selecione ao menos um funcionário.");
      return;
    }

    if (!selectedCliente) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    setSaving(true);
    try {
      // Upload photos first
      let foto_inicio_key: string | undefined;
      let foto_fim_key: string | undefined;
      let foto_observacoes_key: string | undefined;

      if (fotoInicio) {
        foto_inicio_key = await uploadPhoto(fotoInicio);
      }
      if (fotoFim) {
        foto_fim_key = await uploadPhoto(fotoFim);
      }
      if (fotoObs) {
        foto_observacoes_key = await uploadPhoto(fotoObs);
      }

      await createRegistro({
        cliente_id: parseInt(selectedCliente),
        funcionario_ids: selectedFuncionarios,
        data: new Date().toISOString().split("T")[0],
        chegada,
        saida,
        trabalho,
        observacoes,
        foto_inicio_key,
        foto_fim_key,
        foto_observacoes_key,
        created_by: responsavel || undefined,
      });
      setSuccess(true);

      // Send to external dashboard
      try {
        const selectedFuncNames = funcionarios
          .filter(f => selectedFuncionarios.includes(f.id))
          .map(f => f.nome);
        
        await sendToDashboard(selectedFuncNames);
        setIntegrationSuccess(true);
        setTimeout(() => setIntegrationSuccess(false), 5000);
      } catch {
        setIntegrationError(true);
        setTimeout(() => setIntegrationError(false), 5000);
      }

      resetForm();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido.";
      alert(`Erro ao salvar registro. ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loadingFunc || loadingClientes;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Novo Registro</h2>
          <p className="text-muted-foreground">Preencha os dados da atividade</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Registro salvo com sucesso!
        </div>
      )}

      {integrationSuccess && (
        <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Dados enviados para o Dashboard com sucesso!
        </div>
      )}

      {integrationError && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <X className="w-5 h-5" />
          Erro ao enviar dados para o Dashboard. O registro local foi salvo.
        </div>
      )}

      {/* Responsável pelo registro */}
      <Card className="border-l-4 border-l-slate-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-slate-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              <User className="w-4 h-4" />
            </span>
            Responsável pelo registro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Seu nome..."
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className="h-12"
          />
        </CardContent>
      </Card>

      {/* Funcionários */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Funcionários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {funcionarios.map((func) => (
              <label
                key={func.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedFuncionarios.includes(func.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={selectedFuncionarios.includes(func.id)}
                  onCheckedChange={() => toggleFuncionario(func.id)}
                />
                <span className="text-sm font-medium">{func.nome}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cliente */}
      <Card className="border-l-4 border-l-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">2</span>
            Cliente / Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedCliente} onValueChange={setSelectedCliente}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {clientes.map((cliente) => (
                <label
                  key={cliente.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCliente === cliente.id.toString()
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <RadioGroupItem value={cliente.id.toString()} />
                  <span className="text-sm">{cliente.nome}</span>
                </label>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            Horários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="chegada" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                Chegada
              </Label>
              <Input
                id="chegada"
                type="time"
                value={chegada}
                onChange={(e) => setChegada(e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saida" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Saída
              </Label>
              <Input
                id="saida"
                type="time"
                value={saida}
                onChange={(e) => setSaida(e.target.value)}
                className="text-lg h-12"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trabalho a ser realizado */}
      <Card className="border-l-4 border-l-blue-400">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-400 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            Trabalho a ser realizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Descreva o trabalho que será executado..."
            value={trabalho}
            onChange={(e) => setTrabalho(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Foto do início */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            Foto do início do trabalho
          </CardTitle>
          <p className="text-sm text-muted-foreground">Foto de como estava o local antes de iniciar os trabalhos</p>
        </CardHeader>
        <CardContent>
          <PhotoUpload
            label="Foto do início"
            preview={fotoInicioPreview}
            onFileChange={(f) => handleFotoChange(f, setFotoInicio, setFotoInicioPreview)}
          />
        </CardContent>
      </Card>

      {/* Foto do fim */}
      <Card className="border-l-4 border-l-teal-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
            Foto do fim do trabalho
          </CardTitle>
          <p className="text-sm text-muted-foreground">Local do trabalho organizado e limpo</p>
        </CardHeader>
        <CardContent>
          <PhotoUpload
            label="Foto do fim"
            preview={fotoFimPreview}
            onFileChange={(f) => handleFotoChange(f, setFotoFim, setFotoFimPreview)}
          />
        </CardContent>
      </Card>

      {/* Observações */}
      <Card className="border-l-4 border-l-gray-400">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">7</span>
            Observações
          </CardTitle>
          <p className="text-sm text-muted-foreground">Qualquer tipo de informação adicional sobre o trabalho a ser executado</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Observações adicionais..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <PhotoUpload
            label="Foto das observações"
            description="Foto das observações (opcional)"
            preview={fotoObsPreview}
            onFileChange={(f) => handleFotoChange(f, setFotoObs, setFotoObsPreview)}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="sticky bottom-4 pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={saving}
          className="w-full h-14 text-lg font-semibold shadow-lg bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Salvar Registro
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
