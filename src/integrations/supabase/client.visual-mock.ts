// Cliente sintético exclusivo de visualização — Microgate 09-C.
//
// Este módulo NUNCA se conecta a um backend real. Ele substitui
// `./client.ts` apenas quando o bundle do navegador é montado com a flag
// de ambiente `REACT_APP_VISUAL_MOCK=1` (ver craco.config.js). A troca é
// feita no nível do webpack (NormalModuleReplacementPlugin), nunca no Jest:
// a suíte de testes continua usando seus próprios mocks em `__mocks__/`.
//
// Garantias:
// - Nenhuma chamada de rede, nenhum WebSocket, nenhum Realtime.
// - Sessão e usuário fictícios, apenas em memória, descartáveis.
// - Leitura determinística a partir de `src/__visual-fixtures__`.
// - Qualquer operação de escrita (insert/update/delete/storage) falha
//   explicitamente: este microgate não autoriza fluxos de escrita visual.
// - Qualquer tabela ou operação não simulada falha explicitamente, em vez
//   de tentar qualquer fallback para um cliente real.
import {
  fixtureUser,
  fixtureSession,
  empresasFixture,
  categoriasFixture,
  lancamentosFixture,
  anexosFixture,
} from '../../__visual-fixtures__';

type LinhaGenerica = Record<string, unknown>;

function falhaOperacaoNaoSuportada(operacao: string): never {
  throw new Error(
    `[visual-mock] Operação não suportada no ambiente visual sintético: "${operacao}". ` +
      'Este microgate (09-C) só autoriza leitura determinística; escrita e ' +
      'operações não simuladas falham explicitamente, sem fallback para o cliente real.',
  );
}

const TABELAS_SUPORTADAS: Record<string, LinhaGenerica[]> = {
  empresas: empresasFixture as unknown as LinhaGenerica[],
  categorias: categoriasFixture as unknown as LinhaGenerica[],
  lancamentos: lancamentosFixture as unknown as LinhaGenerica[],
  anexos: anexosFixture as unknown as LinhaGenerica[],
};

function ordenarPor(linhas: LinhaGenerica[], coluna: string, ascending: boolean): LinhaGenerica[] {
  const copia = [...linhas];
  copia.sort((a, b) => {
    const valorA = a[coluna];
    const valorB = b[coluna];
    if (valorA === valorB) return 0;
    const comparacao = (valorA as string | number) < (valorB as string | number) ? -1 : 1;
    return ascending ? comparacao : -comparacao;
  });
  return copia;
}

// Builder encadeável mínimo: cada filtro/ordenação retorna um objeto com os
// mesmos métodos (eq/order) mais `then`, para suportar qualquer ordem de
// encadeamento usada pelos hooks reais (ex.: select().eq().order()).
function criarQueryBuilder(linhas: LinhaGenerica[]) {
  const builder = {
    eq(coluna: string, valor: unknown) {
      return criarQueryBuilder(linhas.filter((l) => l[coluna] === valor));
    },
    order(coluna: string, opcoes?: { ascending?: boolean }) {
      return criarQueryBuilder(ordenarPor(linhas, coluna, opcoes?.ascending ?? true));
    },
    then(
      onFulfilled: (value: { data: LinhaGenerica[]; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve({ data: linhas, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function criarConsulta(nomeTabela: string) {
  const linhasDaTabela = TABELAS_SUPORTADAS[nomeTabela];

  return {
    select(_colunas: string = '*') {
      return criarQueryBuilder(linhasDaTabela);
    },
    insert() {
      return falhaOperacaoNaoSuportada(`from('${nomeTabela}').insert(...)`);
    },
    update() {
      return falhaOperacaoNaoSuportada(`from('${nomeTabela}').update(...)`);
    },
    delete() {
      return falhaOperacaoNaoSuportada(`from('${nomeTabela}').delete()`);
    },
  };
}

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session: fixtureSession }, error: null };
    },
    async getUser() {
      return { data: { user: fixtureUser }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: typeof fixtureSession) => void) {
      callback('SIGNED_IN', fixtureSession);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword() {
      return falhaOperacaoNaoSuportada('auth.signInWithPassword(...)');
    },
    async signUp() {
      return falhaOperacaoNaoSuportada('auth.signUp(...)');
    },
    async signOut() {
      return { error: null };
    },
  },
  from(nomeTabela: string) {
    if (!(nomeTabela in TABELAS_SUPORTADAS)) {
      falhaOperacaoNaoSuportada(`from('${nomeTabela}')`);
    }
    return criarConsulta(nomeTabela);
  },
  storage: {
    from() {
      return falhaOperacaoNaoSuportada('storage.from(...)');
    },
  },
};
