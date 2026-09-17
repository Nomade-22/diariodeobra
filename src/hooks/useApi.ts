import { useState, useEffect, useCallback } from "react";

export interface Funcionario {
  id: number;
  nome: string;
}

export interface Cliente {
  id: number;
  nome: string;
}

export interface Registro {
  id: number;
  data: string;
  chegada: string;
  saida: string;
  trabalho: string;
  observacoes: string;
  cliente_id: number;
  cliente_nome: string;
  funcionarios: Funcionario[];
  foto_inicio_key?: string;
  foto_fim_key?: string;
  foto_observacoes_key?: string;
  created_by?: string;
  of_id?: number;
  of_number?: string;
  of_title?: string;
  of_customer_name?: string;
}

export interface WorkOrder {
  id: number;
  of_number: string;
  title: string;
  status: string;
  year: number;
  customer_name: string;
}

export interface AppUser {
  id: number;
  username: string;
  nome: string;
  is_admin: number;
  created_at: string;
}

export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const res = await window.fetch("/api/funcionarios");
    const data = await res.json();
    setFuncionarios(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (nome: string) => {
    const res = await window.fetch("/api/funcionarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    const data = await res.json();
    await fetch();
    return data;
  };

  const remove = async (id: number) => {
    await window.fetch(`/api/funcionarios/${id}`, { method: "DELETE" });
    await fetch();
  };

  return { funcionarios, loading, refetch: fetch, create, remove };
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const res = await window.fetch("/api/clientes");
    const data = await res.json();
    setClientes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (nome: string) => {
    const res = await window.fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    const data = await res.json();
    await fetch();
    return data;
  };

  const remove = async (id: number) => {
    await window.fetch(`/api/clientes/${id}`, { method: "DELETE" });
    await fetch();
  };

  return { clientes, loading, refetch: fetch, create, remove };
}

export function useRegistros() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const res = await window.fetch("/api/registros");
    const data = await res.json();
    setRegistros(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (registro: {
    cliente_id?: number;
    funcionario_ids: number[];
    data: string;
    chegada: string;
    saida: string;
    trabalho: string;
    observacoes: string;
    foto_inicio_key?: string;
    foto_fim_key?: string;
    foto_observacoes_key?: string;
    created_by?: string;
    of_id?: number;
    of_number?: string;
    of_title?: string;
    of_customer_name?: string;
  }) => {
    const res = await window.fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro),
    });
    const data = await res.json();
    await fetch();
    return data;
  };

  const update = async (id: number, registro: {
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
  }) => {
    const res = await window.fetch(`/api/registros/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro),
    });
    const data = await res.json();
    await fetch();
    return data;
  };

  const remove = async (id: number) => {
    await window.fetch(`/api/registros/${id}`, { method: "DELETE" });
    await fetch();
  };

  return { registros, loading, refetch: fetch, create, update, remove };
}

export function useWorkOrders(year?: number) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = year 
        ? `/api/work-orders?year=${year}`
        : "/api/work-orders";
      const res = await window.fetch(url);
      if (!res.ok) {
        throw new Error("Erro ao buscar OFs");
      }
      const data = await res.json();
      setWorkOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { workOrders, loading, error, refetch: fetch };
}

export function useAppUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const res = await window.fetch("/api/app-users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (user: { username: string; password: string; nome: string; is_admin: boolean }) => {
    const res = await window.fetch("/api/app-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao criar usuário");
    }
    await fetch();
    return data;
  };

  const update = async (id: number, user: { username: string; password?: string; nome: string; is_admin: boolean }) => {
    const res = await window.fetch(`/api/app-users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar usuário");
    }
    await fetch();
    return data;
  };

  const remove = async (id: number) => {
    const res = await window.fetch(`/api/app-users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao excluir usuário");
    }
    await fetch();
  };

  return { users, loading, refetch: fetch, create, update, remove };
}
