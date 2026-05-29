import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, CheckCircle, Paperclip } from 'lucide-react';
import { Lancamento } from '../../types';
import { fmtMoeda, fmtData, corTipo } from '../../utils/format';
import StatusBadge from './StatusBadge';
import ConfirmDialog from '../ui/ConfirmDialog';

interface LancamentoRowProps {
  lancamento: Lancamento;
  onEdit?: (l: Lancamento) => void;
  onDelete?: (id: string) => void;
  onBaixar?: (l: Lancamento) => void;
  onVerAnexos?: (l: Lancamento) => void;
}

export default function LancamentoRow({ lancamento: l, onEdit, onDelete, onBaixar, onVerAnexos }: LancamentoRowProps) {
  const isCredito = l.tipo === 'credito';
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
        <div className={`p-1.5 rounded-full ${isCredito ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {isCredito ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{l.descricao}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {l.empresa && <span className="text-xs text-slate-500">{l.empresa.nomeFantasia}</span>}
            {l.categoria && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: corTipo(l.tipo) + '20', color: corTipo(l.tipo) }}
              >
                {l.categoria.nome}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className={`text-sm font-semibold ${isCredito ? 'text-emerald-600' : 'text-red-600'}`}>
            {isCredito ? '+' : '-'} {fmtMoeda(l.valor)}
          </p>
          <p className="text-xs text-slate-400">{fmtData(l.dataVencimento)}</p>
        </div>

        <StatusBadge status={l.status} />

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onBaixar && l.status === 'pendente' && (
            <button
              onClick={() => onBaixar(l)}
              className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
              title="Dar baixa"
            >
              <CheckCircle size={14} />
            </button>
          )}
          {onVerAnexos && (
            <button
              onClick={() => onVerAnexos(l)}
              className="p-1 rounded text-slate-400 hover:bg-slate-100"
              title="Anexos"
            >
              <Paperclip size={14} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(l)}
              className="p-1 rounded text-slate-400 hover:bg-slate-100"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="p-1 rounded text-red-400 hover:bg-red-50"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {onDelete && (
        <ConfirmDialog
          open={confirmOpen}
          message={`Deseja excluir o lançamento "${l.descricao}"? Esta ação não pode ser desfeita.`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); onDelete(l.id); }}
        />
      )}
    </>
  );
}
