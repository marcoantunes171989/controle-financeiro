import { Badge } from '../ui/Badge';
import { StatusLancamento } from '../../types';

interface StatusBadgeProps {
  status: StatusLancamento;
}

const config: Record<StatusLancamento, { variant: 'green' | 'red' | 'amber' | 'gray'; label: string }> = {
  pago: { variant: 'green', label: 'Pago' },
  recebido: { variant: 'green', label: 'Recebido' },
  pendente: { variant: 'amber', label: 'Pendente' },
  vencido: { variant: 'red', label: 'Vencido' },
  cancelado: { variant: 'gray', label: 'Cancelado' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { variant, label } = config[status] ?? { variant: 'gray', label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}
